class MemoryView {
	constructor(memory, offset) {
		// this.inherit();
		this.buffer = memory;
		this.view = new DataView(
			this.buffer,
			typeof offset === "number" ? offset : 0
		);
		this.mask = memory.byteLength - 1;
		this.resetMask();
	}
	resetMask() {
		this.mask8 = this.mask & 0xffffffff;
		this.mask16 = this.mask & 0xfffffffe;
		this.mask32 = this.mask & 0xfffffffc;
	}
	load8(offset) {
		return this.view.getInt8(offset & this.mask8);
	}
	load16(offset) {
		// Unaligned 16-bit loads are unpredictable...let's just pretend they work
		return this.view.getInt16(offset & this.mask, true);
	}
	loadU8(offset) {
		return this.view.getUint8(offset & this.mask8);
	}
	loadU16(offset) {
		// Unaligned 16-bit loads are unpredictable...let's just pretend they work
		return this.view.getUint16(offset & this.mask, true);
	}
	load32(offset) {
		// Unaligned 32-bit loads are "rotated" so they make some semblance of sense
		var rotate = (offset & 3) << 3;
		var mem = this.view.getInt32(offset & this.mask32, true);
		return (mem >>> rotate) | (mem << (32 - rotate));
	}
	store8(offset, value) {
		this.view.setInt8(offset & this.mask8, value);
	}
	store16(offset, value) {
		this.view.setInt16(offset & this.mask16, value, true);
	}
	store32(offset, value) {
		this.view.setInt32(offset & this.mask32, value, true);
	}
	invalidatePage(address) {}
	replaceData(memory, offset) {
		this.buffer = memory;
		this.view = new DataView(
			this.buffer,
			typeof offset === "number" ? offset : 0
		);
		if (this.icache) {
			this.icache = new Array(this.icache.length);
		}
	}
}
class MemoryBlock extends MemoryView {
	constructor(size, cacheBits) {
		super(new ArrayBuffer(size));
		this.ICACHE_PAGE_BITS = cacheBits;
		this.PAGE_MASK = (2 << this.ICACHE_PAGE_BITS) - 1;
		this.icache = new Array(size >> (this.ICACHE_PAGE_BITS + 1));
	}
	invalidatePage(address) {
		var page =
			this.icache[
				(address & this.mask) >> (this.ICACHE_PAGE_BITS + 1)
			];
		if (page) {
			page.invalid = true;
		}
	}
}

class ROMView extends MemoryView {
	constructor(rom, offset) {
		super(rom, offset);
		this.ICACHE_PAGE_BITS = 10;
		this.PAGE_MASK = (2 << this.ICACHE_PAGE_BITS) - 1;
		this.icache = new Array(rom.byteLength >> (this.ICACHE_PAGE_BITS + 1));
		this.mirrorSize = rom.byteLength == 0x00100000 ? 0x00100000 : 0;
		this.mask = 0x01ffffff;
		this.resetMask();
	}
	// Cartridge reads past the image expose address-derived bus data; a ROM
	// access should never turn an emulated bus read into a DataView exception.
	getReadOffset(offset) {
		if (this.mirrorSize && offset < (this.mirrorSize << 2)) {
			return offset & (this.mirrorSize - 1);
		}
		return offset;
	}
	load8(offset) {
		var readOffset = this.getReadOffset(offset);
		if (readOffset < this.view.byteLength) {
			return this.view.getInt8(readOffset);
		}
		var value = (offset >>> 1) >>> ((offset & 1) << 3);
		return (value & 0xff) << 24 >> 24;
	}
	load16(offset) {
		var alignedOffset = offset & 0xfffffffe;
		var readOffset = this.getReadOffset(alignedOffset);
		if (readOffset + 2 <= this.view.byteLength) {
			return this.view.getInt16(readOffset, true);
		}
		var value = (alignedOffset >>> 1) & 0xffff;
		return (value << 16) >> 16;
	}
	loadU8(offset) {
		var readOffset = this.getReadOffset(offset);
		if (readOffset < this.view.byteLength) {
			return this.view.getUint8(readOffset);
		}
		return ((offset >>> 1) >>> ((offset & 1) << 3)) & 0xff;
	}
	loadU16(offset) {
		var alignedOffset = offset & 0xfffffffe;
		var readOffset = this.getReadOffset(alignedOffset);
		if (readOffset + 2 <= this.view.byteLength) {
			return this.view.getUint16(readOffset, true);
		}
		return (alignedOffset >>> 1) & 0xffff;
	}
	load32(offset) {
		var alignedOffset = offset & 0xfffffffc;
		var readOffset = this.getReadOffset(alignedOffset);
		var value;
		if (readOffset + 4 <= this.view.byteLength) {
			value = this.view.getInt32(readOffset, true);
		} else {
			value =
				((alignedOffset >>> 1) & 0xffff) |
				((((alignedOffset + 2) >>> 1) & 0xffff) << 16);
		}
		var rotate = (offset & 3) << 3;
		return (value >>> rotate) | (value << (32 - rotate));
	}
	store8(offset, value) {}
	store16(offset, value) {
		if (offset < 0xca && offset >= 0xc4) {
			if (!this.gpio) {
				this.gpio = this.mmu.allocGPIO(this);
			}
			this.gpio.store16(offset, value);
		}
	}
	store32(offset, value) {
		if (offset < 0xca && offset >= 0xc4) {
			if (!this.gpio) {
				this.gpio = this.mmu.allocGPIO(this);
			}
			this.gpio.store32(offset, value);
		}
	}
}

class BIOSView extends MemoryView {
	constructor(rom, offset) {
		super(rom, offset);

		this.ICACHE_PAGE_BITS = 16;
		this.PAGE_MASK = (2 << this.ICACHE_PAGE_BITS) - 1;
		this.icache = new Array(1);
		this.lastFetchedOpcode = 0;
		this.hleStartupPending = false;
		this.hleIRQHandoffPending = false;
		this.hleIRQReturnPending = false;
	}
	recordFetchedOpcode(opcode, width) {
		if (width == 2) {
			var halfword = opcode & 0xffff;
			this.lastFetchedOpcode = halfword | (halfword << 16);
		} else {
			this.lastFetchedOpcode = opcode >>> 0;
		}
	}
	recordHLESWIReturn(opcode) {
		// HLE calls skip the BIOS SWI handler, but the hardware leaves its final
		// fetched BIOS opcode on the bus when control returns to the cartridge.
		var address = opcode == 0x00 ? 0x0e4 : 0x0190;
		if (this.real) {
			return;
		}
		if (this.buffer.byteLength >= address + 4) {
			this.recordFetchedOpcode(this.view.getUint32(address, true), 4);
		} else {
			// The built-in HLE BIOS is only a few hundred bytes and does not
			// contain the official SWI return sequence at 0x0190. Preserve the
			// documented BIOS bus value for the common HLE return path.
			this.recordFetchedOpcode(
				opcode == 0x00 ? 0xe129f000 : 0xe3a02004,
				4
			);
		}
	}
	beginHLEBoot() {
		this.lastFetchedOpcode = 0;
		this.hleStartupPending =
			!this.real && this.buffer.byteLength < this.mmu.SIZE_BIOS;
		this.hleIRQHandoffPending = false;
		this.hleIRQReturnPending = false;
	}
	recordHLEStartupExit() {
		if (!this.hleStartupPending || this.real) {
			return;
		}
		// The official BIOS leaves the opcode at 0x00DC+8 on the bus after
		// startup. The compact HLE boot stub does not execute that BIOS path.
		this.lastFetchedOpcode = 0xe129f000;
		this.hleStartupPending = false;
	}
	recordHLEIRQHandoff() {
		if (this.real || this.buffer.byteLength >= this.mmu.SIZE_BIOS) {
			return;
		}
		// The compact HLE vector transfers directly to the game's IRQ routine.
		// Hardware has already prefetched the BIOS return instruction by then.
		this.lastFetchedOpcode = 0xe25ef004;
		this.hleIRQHandoffPending = false;
		this.hleIRQReturnPending = true;
	}
	recordHLEIRQReturn() {
		if (this.real || this.buffer.byteLength >= this.mmu.SIZE_BIOS) {
			return;
		}
		// After the IRQ wrapper restores the interrupted context, the official
		// BIOS leaves the opcode at 0x013C+8 on the bus.
		this.lastFetchedOpcode = 0xe55ec002;
		this.hleIRQReturnPending = false;
	}
	getProtectedWord(offset) {
		var rotate = (offset & 3) << 3;
		var value = this.lastFetchedOpcode;
		return (value >>> rotate) | (value << (32 - rotate));
	}
	loadInstruction16(offset) {
		return this.view.getInt16(offset & 0xfffffffe, true);
	}
	loadInstruction32(offset) {
		return this.view.getInt32(offset & 0xfffffffc, true);
	}
	/**
	 * Checks whether the instruction performing this read is outside the BIOS.
	 * The CPU's PC is pipelined: while an instruction executes it points two
	 * instruction widths past that instruction.
	 */
	_checkProtection() {
		if (!this.mmu) {
			return false;
		}
		var cpu = this.mmu.cpu;
		// Before the first fetch after a reset or branch, the PC is only one
		// instruction width past the fetch address. During execution it is two
		// widths past the current instruction.
		var pipelineWidth =
			(cpu.instruction ? 2 : 1) * cpu.instructionWidth;
		var instructionAddress =
			(cpu.gprs[cpu.PC] - pipelineWidth) >>> 0;
		return instructionAddress >= this.mmu.SIZE_BIOS;
	}

	load8(offset) {
		if (this._checkProtection()) {
			var value = this.getProtectedWord(offset);
			return (value << 24) >> 24;
		}
		if (offset >= this.buffer.byteLength) {
			return -1;
		}
		return this.view.getInt8(offset);
	}
	load16(offset) {
		if (this._checkProtection()) {
			var value = this.getProtectedWord(offset);
			return (value << 16) >> 16;
		}
		if (offset >= this.buffer.byteLength) {
			return -1;
		}
		return this.view.getInt16(offset, true);
	}
	loadU8(offset) {
		if (this._checkProtection()) {
			return this.getProtectedWord(offset) & 0xff;
		}
		if (offset >= this.buffer.byteLength) {
			return -1;
		}
		return this.view.getUint8(offset);
	}
	loadU16(offset) {
		if (this._checkProtection()) {
			return this.getProtectedWord(offset) & 0xffff;
		}
		if (offset >= this.buffer.byteLength) {
			return -1;
		}
		return this.view.getUint16(offset, true);
	}
	load32(offset) {
		var value;
		if (this._checkProtection()) {
			value = this.lastFetchedOpcode;
		} else {
			var alignedOffset = offset & 0xfffffffc;
			if (alignedOffset >= this.buffer.byteLength) {
				return -1;
			}
			value = this.view.getInt32(alignedOffset, true);
		}
		var rotate = (offset & 3) << 3;
		return (value >>> rotate) | (value << (32 - rotate));
	}
	store8(offset, value) {}
	store16(offset, value) {}
	store32(offset, value) {}
}

class BadMemory {
	constructor(mmu, cpu) {
		// this.inherit();
		this.cpu = cpu;
		this.mmu = mmu;
	}
	load8(offset) {
		return this.mmu.load8(
			this.cpu.gprs[this.cpu.PC] -
				this.cpu.instructionWidth +
				(offset & 0x3)
		);
	}
	load16(offset) {
		return this.mmu.load16(
			this.cpu.gprs[this.cpu.PC] -
				this.cpu.instructionWidth +
				(offset & 0x2)
		);
	}
	loadU8(offset) {
		return this.mmu.loadU8(
			this.cpu.gprs[this.cpu.PC] -
				this.cpu.instructionWidth +
				(offset & 0x3)
		);
	}
	loadU16(offset) {
		return this.mmu.loadU16(
			this.cpu.gprs[this.cpu.PC] -
				this.cpu.instructionWidth +
				(offset & 0x2)
		);
	}
	load32(offset) {
		if (this.cpu.execMode == this.cpu.MODE_ARM) {
			return this.mmu.load32(
				this.cpu.gprs[this.cpu.PC] - this.cpu.instructionWidth
			);
		} else {
			var halfword = this.mmu.loadU16(
				this.cpu.gprs[this.cpu.PC] - this.cpu.instructionWidth
			);
			return halfword | (halfword << 16);
		}
	}
	store8(offset, value) {}
	store16(offset, value) {}
	store32(offset, value) {}
	invalidatePage(address) {}
}

class NoSavedata {
	load8() { return -1; }
	load16() { return -1; }
	loadU8() { return 0xff; }
	loadU16() { return 0xffff; }
	load32() { return -1; }
	store8() {}
	store16() {}
	store32() {}
	invalidatePage() {}
}

class GameBoyAdvanceMMU {
	constructor() {
		// this.inherit();
		this.REGION_BIOS = 0x0;
		this.REGION_WORKING_RAM = 0x2;
		this.REGION_WORKING_IRAM = 0x3;
		this.REGION_IO = 0x4;
		this.REGION_PALETTE_RAM = 0x5;
		this.REGION_VRAM = 0x6;
		this.REGION_OAM = 0x7;
		this.REGION_CART0 = 0x8;
		this.REGION_CART1 = 0xa;
		this.REGION_CART2 = 0xc;
		this.REGION_CART_SRAM = 0xe;
		this.REGION_CART_SRAM_MIRROR = 0xf;

		this.BASE_BIOS = 0x00000000;
		this.BASE_WORKING_RAM = 0x02000000;
		this.BASE_WORKING_IRAM = 0x03000000;
		this.BASE_IO = 0x04000000;
		this.BASE_PALETTE_RAM = 0x05000000;
		this.BASE_VRAM = 0x06000000;
		this.BASE_OAM = 0x07000000;
		this.BASE_CART0 = 0x08000000;
		this.BASE_CART1 = 0x0a000000;
		this.BASE_CART2 = 0x0c000000;
		this.BASE_CART_SRAM = 0x0e000000;
		this.BASE_CART_SRAM_MIRROR = 0x0f000000;

		this.BASE_MASK = 0x0f000000;
		this.BASE_OFFSET = 24;
		this.OFFSET_MASK = 0x00ffffff;

		this.SIZE_BIOS = 0x00004000;
		this.SIZE_WORKING_RAM = 0x00040000;
		this.SIZE_WORKING_IRAM = 0x00008000;
		this.SIZE_IO = 0x00000400;
		this.SIZE_PALETTE_RAM = 0x00000400;
		this.SIZE_VRAM = 0x00018000;
		this.SIZE_OAM = 0x00000400;
		this.SIZE_CART0 = 0x02000000;
		this.SIZE_CART1 = 0x02000000;
		this.SIZE_CART2 = 0x02000000;
		this.SIZE_CART_SRAM = 0x00008000;
		this.SIZE_CART_FLASH512 = 0x00010000;
		this.SIZE_CART_FLASH1M = 0x00020000;
		this.SIZE_CART_EEPROM = 0x00002000;

		this.DMA_TIMING_NOW = 0;
		this.DMA_TIMING_VBLANK = 1;
		this.DMA_TIMING_HBLANK = 2;
		this.DMA_TIMING_CUSTOM = 3;

		this.DMA_INCREMENT = 0;
		this.DMA_DECREMENT = 1;
		this.DMA_FIXED = 2;
		this.DMA_INCREMENT_RELOAD = 3;

		this.DMA_OFFSET = [1, -1, 0, 1];

		this.WAITSTATES = [0, 0, 2, 0, 0, 0, 0, 0, 4, 4, 4, 4, 4, 4, 4];
		this.WAITSTATES_32 = [0, 0, 5, 0, 0, 1, 1, 0, 7, 7, 9, 9, 13, 13, 8];
		this.WAITSTATES_SEQ = [0, 0, 2, 0, 0, 0, 0, 0, 2, 2, 4, 4, 8, 8, 4];
		this.WAITSTATES_SEQ_32 = [
			0,
			0,
			5,
			0,
			0,
			1,
			1,
			0,
			5,
			5,
			9,
			9,
			17,
			17,
			8
		];
		this.NULLWAIT = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

		for (var i = 15; i < 256; ++i) {
			this.WAITSTATES[i] = 0;
			this.WAITSTATES_32[i] = 0;
			this.WAITSTATES_SEQ[i] = 0;
			this.WAITSTATES_SEQ_32[i] = 0;
			this.NULLWAIT[i] = 0;
		}

		this.ROM_WS = [4, 3, 2, 8];
		this.ROM_WS_SEQ = [
			[2, 1],
			[4, 1],
			[8, 1]
		];

		this.ICACHE_PAGE_BITS = 8;
		this.PAGE_MASK = (2 << this.ICACHE_PAGE_BITS) - 1;

		this.bios = null;
	}
	mmap(region, object) {
		this.memory[region] = object;
	}
	clear() {
		this.badMemory = new BadMemory(this, this.cpu);
		this.noSavedata = new NoSavedata();
		this.memory = [
			this.bios,
			this.badMemory,
			new MemoryBlock(this.SIZE_WORKING_RAM, 9),
			new MemoryBlock(this.SIZE_WORKING_IRAM, 7),
		null, // This is owned by GameBoyAdvanceIO
		null, // This is owned by GameBoyAdvancePalette
		null, // This is owned by GameBoyAdvanceVRAM
		null, // This is owned by GameBoyAdvanceOAM
			this.badMemory,
			this.badMemory,
			this.badMemory,
			this.badMemory,
			this.badMemory,
			this.badMemory,
			this.noSavedata,
			this.noSavedata // Unused
		];
		for (var i = 16; i < 256; ++i) {
			this.memory[i] = this.badMemory;
		}

		this.waitstates = this.WAITSTATES.slice(0);
		this.waitstatesSeq = this.WAITSTATES_SEQ.slice(0);
		this.waitstates32 = this.WAITSTATES_32.slice(0);
		this.waitstatesSeq32 = this.WAITSTATES_SEQ_32.slice(0);
		this.waitstatesPrefetch = this.WAITSTATES_SEQ.slice(0);
		this.waitstatesPrefetch32 = this.WAITSTATES_SEQ_32.slice(0);
		this.waitstates[this.REGION_CART_SRAM_MIRROR] = this.waitstates[
			this.REGION_CART_SRAM
		];
		this.waitstatesSeq[this.REGION_CART_SRAM_MIRROR] = this.waitstatesSeq[
			this.REGION_CART_SRAM
		];
		this.waitstates32[this.REGION_CART_SRAM_MIRROR] = this.waitstates32[
			this.REGION_CART_SRAM
		];
		this.waitstatesSeq32[this.REGION_CART_SRAM_MIRROR] = this.waitstatesSeq32[
			this.REGION_CART_SRAM
		];

		this.cart = null;
		this.save = null;

		this.DMA_REGISTER = [
			this.core.io.DMA0CNT_HI >> 1,
			this.core.io.DMA1CNT_HI >> 1,
			this.core.io.DMA2CNT_HI >> 1,
			this.core.io.DMA3CNT_HI >> 1
		];
	}
	freeze() {
		var frost = {
			ram: Serializer.prefix(this.memory[this.REGION_WORKING_RAM].buffer),
			iram: Serializer.prefix(
				this.memory[this.REGION_WORKING_IRAM].buffer
			)
		};
		if (this.bios) {
			frost.biosLastFetchedOpcode = this.bios.lastFetchedOpcode;
			frost.biosHLEStartupPending = this.bios.hleStartupPending;
			frost.biosHLEIRQHandoffPending = this.bios.hleIRQHandoffPending;
			frost.biosHLEIRQReturnPending = this.bios.hleIRQReturnPending;
		}
		return frost;
	}
	defrost(frost) {
		this.memory[this.REGION_WORKING_RAM].replaceData(frost.ram);
		this.memory[this.REGION_WORKING_IRAM].replaceData(frost.iram);
		if (this.bios) {
			this.bios.lastFetchedOpcode =
				typeof frost.biosLastFetchedOpcode == "number"
					? frost.biosLastFetchedOpcode >>> 0
					: 0;
			this.bios.hleStartupPending =
				typeof frost.biosHLEStartupPending == "boolean"
					? frost.biosHLEStartupPending && !this.bios.real
					: false;
			this.bios.hleIRQHandoffPending =
				typeof frost.biosHLEIRQHandoffPending == "boolean"
					? frost.biosHLEIRQHandoffPending && !this.bios.real
					: false;
			this.bios.hleIRQReturnPending =
				typeof frost.biosHLEIRQReturnPending == "boolean"
					? frost.biosHLEIRQReturnPending && !this.bios.real
				: false;
		}
	}
	loadInstruction16(address) {
		if (this.bios && address >= 0 && address < this.SIZE_BIOS) {
			return this.bios.loadInstruction16(address);
		}
		return this.load16(address);
	}
	loadInstruction32(address) {
		if (this.bios && address >= 0 && address < this.SIZE_BIOS) {
			return this.bios.loadInstruction32(address);
		}
		return this.load32(address);
	}
	loadBios(bios, real) {
		this.bios = new BIOSView(bios);
		this.bios.real = !!real;
		this.bios.mmu = this;
		if (this.memory) {
			this.memory[this.REGION_BIOS] = this.bios;
		}
		if (this.cpu) {
			this.cpu.instruction = null;
			this.cpu.page = null;
			this.cpu.pageRegion = -1;
		}
	}
	loadRom(rom, process) {
		// A GBA cartridge header occupies 0xC0 bytes. Reject truncated files
		// before ROMView or header parsing can read beyond the supplied buffer.
		if (!rom || typeof rom.byteLength != "number" || rom.byteLength < 0xc0) {
			return null;
		}
		var cart = {
			title: null,
			code: null,
			maker: null,
			memory: rom,
			saveType: null
		};

		var lo = new ROMView(rom);
		if (lo.view.getUint8(0xb2) != 0x96) {
			// Not a valid ROM
			return null;
		}
		lo.mmu = this; // Needed for GPIO
		this.memory[this.REGION_CART0] = lo;
		this.memory[this.REGION_CART1] = lo;
		this.memory[this.REGION_CART2] = lo;

		if (rom.byteLength > 0x01000000) {
			var hi = new ROMView(rom, 0x01000000);
			this.memory[this.REGION_CART0 + 1] = hi;
			this.memory[this.REGION_CART1 + 1] = hi;
			this.memory[this.REGION_CART2 + 1] = hi;
		}

		if (process) {
			var name = "";
			for (var i = 0; i < 12; ++i) {
				var c = lo.loadU8(i + 0xa0);
				if (!c) {
					break;
				}
				name += String.fromCharCode(c);
			}
			cart.title = name;

			var code = "";
			for (var i = 0; i < 4; ++i) {
				var c = lo.loadU8(i + 0xac);
				if (!c) {
					break;
				}
				code += String.fromCharCode(c);
			}
			cart.code = code;

			var maker = "";
			for (var i = 0; i < 2; ++i) {
				var c = lo.loadU8(i + 0xb0);
				if (!c) {
					break;
				}
				maker += String.fromCharCode(c);
			}
			cart.maker = maker;

			// Find savedata type
			var state = "";
			var next;
			var terminal = false;
			for (var i = 0xe4; i < rom.byteLength && !terminal; ++i) {
				next = String.fromCharCode(lo.loadU8(i));
				state += next;
				switch (state) {
					case "F":
					case "FL":
					case "FLA":
					case "FLAS":
					case "FLASH":
					case "FLASH_":
					case "FLASH5":
					case "FLASH51":
					case "FLASH512":
					case "FLASH512_":
					case "FLASH1":
					case "FLASH1M":
					case "FLASH1M_":
					case "S":
					case "SR":
					case "SRA":
					case "SRAM":
					case "SRAM_":
					case "E":
					case "EE":
					case "EEP":
					case "EEPR":
					case "EEPRO":
					case "EEPROM":
					case "EEPROM_":
						break;
					case "FLASH_V":
					case "FLASH512_V":
					case "FLASH1M_V":
					case "SRAM_V":
					case "EEPROM_V":
						terminal = true;
						break;
					default:
						state = next;
						break;
				}
			}
			if (terminal) {
				cart.saveType = state;
				switch (state) {
					case "FLASH_V":
					case "FLASH512_V":
						this.save = this.memory[
							this.REGION_CART_SRAM
						] = new FlashSavedata(this.SIZE_CART_FLASH512);
						break;
					case "FLASH1M_V":
						this.save = this.memory[
							this.REGION_CART_SRAM
						] = new FlashSavedata(this.SIZE_CART_FLASH1M);
						break;
					case "SRAM_V":
						this.save = this.memory[
							this.REGION_CART_SRAM
						] = new SRAMSavedata(this.SIZE_CART_SRAM);
						break;
					case "EEPROM_V":
						this.save = this.memory[
							this.REGION_CART2 + 1
						] = new EEPROMSavedata(this.SIZE_CART_EEPROM, this);
						break;
				}
			}
			if (this.save) {
				this.memory[this.REGION_CART_SRAM_MIRROR] = this.memory[
					this.REGION_CART_SRAM
				];
			}
		}

		this.cart = cart;
		return cart;
	}
	loadSavedata(save) {
		if (!this.save) {
			throw new Error("No cartridge save memory is available");
		}
		var input;
		if (Object.prototype.toString.call(save) == "[object ArrayBuffer]") {
			input = new Uint8Array(save);
		} else if (ArrayBuffer.isView(save)) {
			input = new Uint8Array(save.buffer, save.byteOffset, save.byteLength);
		} else {
			throw new TypeError("Savedata must be an ArrayBuffer or byte array");
		}

		var expectedSize = this.save.buffer.byteLength;
		var isValidSmallEEPROM =
			this.save instanceof EEPROMSavedata && input.byteLength == 0x200;
		if (
			!input.byteLength ||
			(input.byteLength < expectedSize && !isValidSmallEEPROM)
		) {
			throw new RangeError(
				"Savedata is too small for this cartridge's " + expectedSize +
				" byte save memory"
			);
		}

		var normalized = new ArrayBuffer(expectedSize);
		var normalizedBytes = new Uint8Array(normalized);
		normalizedBytes.fill(0xff);
		normalizedBytes.set(input.subarray(0, expectedSize));
		this.save.replaceData(normalized);
		// Loading an external save must also make it eligible for browser
		// persistence, including when the player pauses before the next write.
		if (typeof this.save.writePending == "boolean") {
			this.save.writePending = true;
		}
		if (
			input.byteLength != expectedSize &&
			!isValidSmallEEPROM &&
			this.core &&
			typeof this.core.WARN == "function"
		) {
			this.core.WARN(
				"Savedata size " + input.byteLength +
				" bytes does not match this cartridge's " + expectedSize +
				" byte save memory; data was padded or truncated"
			);
		}
	}
	normalizeMemoryOffset(region, offset) {
		offset &= this.OFFSET_MASK;
		if (region == this.REGION_VRAM) {
			// VRAM's 128 KiB mirror maps its upper 32 KiB onto 0x10000-0x17FFF.
			offset &= 0x0001ffff;
			if (offset >= this.SIZE_VRAM) {
				offset -= 0x00008000;
			}
		} else if (region == this.REGION_OAM) {
			offset &= this.SIZE_OAM - 1;
		}
		return offset;
	}
	load8(offset) {
		var region = offset >>> this.BASE_OFFSET;
		return this.memory[region].load8(
			this.normalizeMemoryOffset(region, offset)
		);
	}
	load16(offset) {
		var region = offset >>> this.BASE_OFFSET;
		if (offset & 1) {
			// ARM7TDMI implements an odd-address LDRSH as an LDRSB.
			return this.load8(offset);
		}
		return this.memory[region].load16(
			this.normalizeMemoryOffset(region, offset & 0x00fffffe)
		);
	}
	load32(offset) {
		var region = offset >>> this.BASE_OFFSET;
		return this.memory[region].load32(
			this.normalizeMemoryOffset(region, offset)
		);
	}
	loadU8(offset) {
		var region = offset >>> this.BASE_OFFSET;
		return this.memory[region].loadU8(
			this.normalizeMemoryOffset(region, offset)
		);
	}
	loadU16(offset) {
		var region = offset >>> this.BASE_OFFSET;
		var saveRegion =
			region == this.REGION_CART_SRAM ||
			region == this.REGION_CART_SRAM_MIRROR;
		var readOffset = saveRegion ? offset : offset & 0x00fffffe;
		var value = this.memory[region].loadU16(
			this.normalizeMemoryOffset(region, readOffset)
		);
		// GBA LDRH keeps the odd-address bus rotation in bits 0-7 and 24-31.
		var rotate = (offset & 1) << 3;
		return (value >>> rotate) | (value << (32 - rotate));
	}
	store8(offset, value) {
		var region = offset >>> this.BASE_OFFSET;
		var maskedOffset = this.normalizeMemoryOffset(region, offset);
		var memory = this.memory[region];
		memory.store8(maskedOffset, value);
		memory.invalidatePage(maskedOffset);
	}
	store16(offset, value) {
		var region = offset >>> this.BASE_OFFSET;
		var saveRegion =
			region == this.REGION_CART_SRAM ||
			region == this.REGION_CART_SRAM_MIRROR;
		var maskedOffset = this.normalizeMemoryOffset(
			region,
			saveRegion ? offset : offset & 0x00fffffe
		);
		var memory = this.memory[region];
		memory.store16(maskedOffset, value);
		memory.invalidatePage(maskedOffset);
	}
	store32(offset, value) {
		var region = offset >>> this.BASE_OFFSET;
		var saveRegion =
			region == this.REGION_CART_SRAM ||
			region == this.REGION_CART_SRAM_MIRROR;
		var maskedOffset = this.normalizeMemoryOffset(
			region,
			saveRegion ? offset : offset & 0x00fffffc
		);
		var memory = this.memory[region];
		memory.store32(maskedOffset, value);
		memory.invalidatePage(maskedOffset);
		memory.invalidatePage(maskedOffset + 2);
	}
	waitPrefetch(memory) {
		this.cpu.cycles +=
			1 + this.waitstatesPrefetch[memory >>> this.BASE_OFFSET];
	}
	waitPrefetch32(memory) {
		this.cpu.cycles +=
			1 + this.waitstatesPrefetch32[memory >>> this.BASE_OFFSET];
	}
	wait(memory) {
		this.cpu.cycles += 1 + this.waitstates[memory >>> this.BASE_OFFSET];
	}
	wait32(memory) {
		this.cpu.cycles += 1 + this.waitstates32[memory >>> this.BASE_OFFSET];
	}
	waitSeq(memory) {
		this.cpu.cycles += 1 + this.waitstatesSeq[memory >>> this.BASE_OFFSET];
	}
	waitSeq32(memory) {
		this.cpu.cycles +=
			1 + this.waitstatesSeq32[memory >>> this.BASE_OFFSET];
	}
	waitMul(rs) {
		if ((rs & 0xffffff00) == 0xffffff00 || !(rs & 0xffffff00)) {
			this.cpu.cycles += 1;
		} else if ((rs & 0xffff0000) == 0xffff0000 || !(rs & 0xffff0000)) {
			this.cpu.cycles += 2;
		} else if ((rs & 0xff000000) == 0xff000000 || !(rs & 0xff000000)) {
			this.cpu.cycles += 3;
		} else {
			this.cpu.cycles += 4;
		}
	}
	waitMulti32(memory, seq) {
		this.cpu.cycles += 1 + this.waitstates32[memory >>> this.BASE_OFFSET];
		this.cpu.cycles +=
			(1 + this.waitstatesSeq32[memory >>> this.BASE_OFFSET]) * (seq - 1);
	}
	addressToPage(region, address) {
		var memory = this.memory[region];
		if (!memory) {
			memory = this.memory[region] = new BadMemory(this, this.cpu);
		}
		if (memory.ICACHE_PAGE_BITS === undefined) {
			memory.ICACHE_PAGE_BITS = this.ICACHE_PAGE_BITS;
			memory.PAGE_MASK = (2 << memory.ICACHE_PAGE_BITS) - 1;
		}
		if (!memory.icache) {
			memory.icache = [];
		}
		return address >> (memory.ICACHE_PAGE_BITS + 1);
	}
	accessPage(region, pageId) {
		var memory = this.memory[region];
		var page = memory.icache[pageId];
		if (!page || page.invalid) {
			page = {
				thumb: new Array(1 << memory.ICACHE_PAGE_BITS),
				arm: new Array(1 << (memory.ICACHE_PAGE_BITS - 1)),
				invalid: false
			};
			memory.icache[pageId] = page;
		}
		return page;
	}
	scheduleDma(number, info) {
		switch (info.timing) {
			case this.DMA_TIMING_NOW:
				this.serviceDma(number, info);
				break;
			case this.DMA_TIMING_HBLANK:
				// Handled implicitly
				break;
			case this.DMA_TIMING_VBLANK:
				// Handled implicitly
				break;
			case this.DMA_TIMING_CUSTOM:
				switch (number) {
					case 0:
						this.core.WARN("Discarding invalid DMA0 scheduling");
						break;
					case 1:
					case 2:
						this.cpu.irq.audio.scheduleFIFODma(number, info);
						break;
					case 3:
						// The DMA3 special-event source is not emulated. Avoid the old
						// video-capture hook, which does not exist in this renderer.
						this.core.WARN("DMA3 special timing is not supported");
						break;
				}
		}
	}
	runHblankDmas(eventCycle) {
		var dma;
		if (eventCycle === undefined) {
			eventCycle = this.cpu.cycles;
		}
		var nextDmaCycle = eventCycle;
		for (var i = 0; i < this.cpu.irq.dma.length; ++i) {
			dma = this.cpu.irq.dma[i];
			if (
				dma.enable &&
				dma.timing == this.DMA_TIMING_HBLANK &&
				(!dma.busyUntil || dma.busyUntil <= eventCycle)
			) {
				this.serviceDma(i, dma, nextDmaCycle);
				nextDmaCycle = Math.max(nextDmaCycle, dma.busyUntil);
			}
		}
	}
	runVblankDmas(eventCycle) {
		var dma;
		if (eventCycle === undefined) {
			eventCycle = this.cpu.cycles;
		}
		var nextDmaCycle = eventCycle;
		for (var i = 0; i < this.cpu.irq.dma.length; ++i) {
			dma = this.cpu.irq.dma[i];
			if (
				dma.enable &&
				dma.timing == this.DMA_TIMING_VBLANK &&
				(!dma.busyUntil || dma.busyUntil <= eventCycle)
			) {
				this.serviceDma(i, dma, nextDmaCycle);
				nextDmaCycle = Math.max(nextDmaCycle, dma.busyUntil);
			}
		}
	}
	serviceDma(number, info, startCycle) {
		if (!info.enable) {
			// There was a DMA scheduled that got canceled
			return;
		}

		var width = info.width;
		var sourceOffset = this.DMA_OFFSET[info.srcControl] * width;
		var destOffset = this.DMA_OFFSET[info.dstControl] * width;
		var wordsRemaining = info.nextCount;
		var sourceAddress = info.nextSource >>> 0;
		var destAddress = info.nextDest >>> 0;
		if (width == 4) {
			sourceAddress &= 0xfffffffc;
			destAddress &= 0xfffffffc;
		} else if (width == 2) {
			sourceAddress &= 0xfffffffe;
			destAddress &= 0xfffffffe;
		}
		var sourceStartAddress = sourceAddress;
		var destStartAddress = destAddress;
		var source = sourceAddress & this.OFFSET_MASK;
		var dest = destAddress & this.OFFSET_MASK;
		var sourceRegion = sourceAddress >>> this.BASE_OFFSET;
		var destRegion = destAddress >>> this.BASE_OFFSET;
		var sourceBlock = this.memory[sourceRegion];
		var destBlock = this.memory[destRegion];
		var transferCount = wordsRemaining;
		var sourceLastAddress =
			(sourceStartAddress + Math.max(0, transferCount - 1) * sourceOffset) >>> 0;
		var destLastAddress =
			(destStartAddress + Math.max(0, transferCount - 1) * destOffset) >>> 0;
		// The fast path below holds one memory object for the entire transfer.
		// DMA addresses can cross a 16 MiB bus region, where the mapped object
		// changes (for example, EWRAM to IWRAM). Use MMU accesses for those rare
		// transfers so each halfword/word is resolved against its actual region.
		var crossesRegion =
			(sourceAddress >>> this.BASE_OFFSET) !==
				(sourceLastAddress >>> this.BASE_OFFSET) ||
			(destAddress >>> this.BASE_OFFSET) !==
				(destLastAddress >>> this.BASE_OFFSET);
		// DMA has a three-cycle startup delay and two setup cycles before the
		// first non-sequential bus accesses.
		var transferCycles = transferCount ? 5 : 0;
		var transferStartCycle =
			startCycle === undefined ? this.cpu.cycles : startCycle;
		var sourceView = null;
		var destView = null;
		var sourceMask = 0xffffffff;
		var destMask = 0xffffffff;
		var word;

		if (transferCount) {
			var waitstates = width == 4 ? this.waitstates32 : this.waitstates;
			var waitstatesSeq = width == 4 ? this.waitstatesSeq32 : this.waitstatesSeq;
			var cycleSource = sourceStartAddress;
			var cycleDest = destStartAddress;
			for (var i = 0; i < transferCount; ++i) {
				var cycleSourceRegion = cycleSource >>> this.BASE_OFFSET;
				var cycleDestRegion = cycleDest >>> this.BASE_OFFSET;
				var waitTable = i ? waitstatesSeq : waitstates;
				transferCycles +=
					waitTable[cycleSourceRegion] + waitTable[cycleDestRegion];
				cycleSource += sourceOffset;
				cycleDest += destOffset;
			}
		}

		if (
			!crossesRegion &&
			transferCount &&
			destBlock &&
			destBlock.ICACHE_PAGE_BITS !== undefined
		) {
			var cachePageShift = destBlock.ICACHE_PAGE_BITS + 1;
			var firstDestAddress =
				Math.min(destStartAddress, destLastAddress) & this.OFFSET_MASK;
			var lastDestAddress =
				Math.max(destStartAddress, destLastAddress) & this.OFFSET_MASK;
			var firstPage = firstDestAddress >> cachePageShift;
			var lastPage =
				(lastDestAddress + width - 1) >> cachePageShift;
			for (var page = firstPage; page <= lastPage; ++page) {
				destBlock.invalidatePage(page << cachePageShift);
			}
		}

		if (
			destRegion == this.REGION_WORKING_RAM ||
			destRegion == this.REGION_WORKING_IRAM
		) {
			destView = destBlock.view;
			destMask = destBlock.mask;
		}

		if (
			sourceRegion == this.REGION_WORKING_RAM ||
			sourceRegion == this.REGION_WORKING_IRAM
		) {
			sourceView = sourceBlock.view;
			sourceMask = sourceBlock.mask;
		}

		if (crossesRegion) {
			while (wordsRemaining--) {
				word =
					width == 4
						? this.load32(sourceAddress)
						: this.loadU16(sourceAddress);
				if (width == 4) {
					this.store32(destAddress, word);
				} else {
					this.store16(destAddress, word);
				}
				sourceAddress = (sourceAddress + sourceOffset) >>> 0;
				destAddress = (destAddress + destOffset) >>> 0;
			}
			source = sourceAddress & this.OFFSET_MASK;
			dest = destAddress & this.OFFSET_MASK;
			sourceRegion = sourceAddress >>> this.BASE_OFFSET;
			destRegion = destAddress >>> this.BASE_OFFSET;
		} else if (sourceBlock && destBlock) {
			if (sourceView && destView) {
				if (width == 4) {
					source &= 0xfffffffc;
					dest &= 0xfffffffc;
					while (wordsRemaining--) {
						word = sourceView.getInt32(source & sourceMask, true);
						destView.setInt32(dest & destMask, word, true);
						source += sourceOffset;
						dest += destOffset;
					}
				} else {
					while (wordsRemaining--) {
						word = sourceView.getUint16(source & sourceMask, true);
						destView.setUint16(dest & destMask, word, true);
						source += sourceOffset;
						dest += destOffset;
					}
				}
			} else if (sourceView) {
				if (width == 4) {
					source &= 0xfffffffc;
					dest &= 0xfffffffc;
					while (wordsRemaining--) {
						word = sourceView.getInt32(source & sourceMask, true);
						destBlock.store32(
							this.normalizeMemoryOffset(destRegion, dest),
							word
						);
						source += sourceOffset;
						dest += destOffset;
					}
				} else {
					while (wordsRemaining--) {
						word = sourceView.getUint16(source & sourceMask, true);
						destBlock.store16(
							this.normalizeMemoryOffset(destRegion, dest),
							word
						);
						source += sourceOffset;
						dest += destOffset;
					}
				}
			} else {
				if (width == 4) {
					source &= 0xfffffffc;
					dest &= 0xfffffffc;
					while (wordsRemaining--) {
						word = sourceBlock.load32(
							this.normalizeMemoryOffset(sourceRegion, source)
						);
						destBlock.store32(
							this.normalizeMemoryOffset(destRegion, dest),
							word
						);
						source += sourceOffset;
						dest += destOffset;
					}
				} else {
					while (wordsRemaining--) {
						word = sourceBlock.loadU16(
							this.normalizeMemoryOffset(sourceRegion, source)
						);
						destBlock.store16(
							this.normalizeMemoryOffset(destRegion, dest),
							word
						);
						source += sourceOffset;
						dest += destOffset;
					}
				}
			}
		} else {
			this.core.WARN("Invalid DMA");
		}

		if (info.doIrq) {
			info.nextIRQ = transferStartCycle + transferCycles;
		}
		info.busyUntil = transferStartCycle + transferCycles;
		// DMA owns the bus for the whole transfer. Its data is copied above as a
		// single operation, but the CPU and hardware clocks must still spend the
		// corresponding non-sequential and sequential bus cycles.
		this.cpu.cycles += Math.max(
			0,
			transferStartCycle + transferCycles - this.cpu.cycles
		);

		info.nextSource =
			(sourceStartAddress + sourceOffset * transferCount) >>> 0;
		info.nextDest =
			(destStartAddress + destOffset * transferCount) >>> 0;
		info.nextCount = wordsRemaining;

		// Immediate DMA has no later start condition to wait for. The hardware
		// treats Repeat as ineffective for this timing mode; rescheduling it here
		// would synchronously recurse forever through scheduleDma/serviceDma.
		if (!info.repeat || info.timing == this.DMA_TIMING_NOW) {
			info.enable = false;

			// Clear the enable bit in memory
			var io = this.memory[this.REGION_IO];
			io.registers[this.DMA_REGISTER[number]] &= 0x7fe0;
		} else {
			info.nextCount = info.count;
			if (info.dstControl == this.DMA_INCREMENT_RELOAD) {
				info.nextDest = info.dest;
			}
			this.scheduleDma(number, info);
		}
	}
	adjustTimings(word) {
		var sram = word & 0x0003;
		var ws0 = (word & 0x000c) >> 2;
		var ws0seq = (word & 0x0010) >> 4;
		var ws1 = (word & 0x0060) >> 5;
		var ws1seq = (word & 0x0080) >> 7;
		var ws2 = (word & 0x0300) >> 8;
		var ws2seq = (word & 0x0400) >> 10;
		var prefetch = word & 0x4000;

		this.waitstates[this.REGION_CART_SRAM] = this.ROM_WS[sram];
		this.waitstatesSeq[this.REGION_CART_SRAM] = this.ROM_WS[sram];
		this.waitstates32[this.REGION_CART_SRAM] = this.ROM_WS[sram];
		this.waitstatesSeq32[this.REGION_CART_SRAM] = this.ROM_WS[sram];
		this.waitstates[this.REGION_CART_SRAM_MIRROR] = this.ROM_WS[sram];
		this.waitstatesSeq[this.REGION_CART_SRAM_MIRROR] = this.ROM_WS[sram];
		this.waitstates32[this.REGION_CART_SRAM_MIRROR] = this.ROM_WS[sram];
		this.waitstatesSeq32[this.REGION_CART_SRAM_MIRROR] = this.ROM_WS[sram];

		this.waitstates[this.REGION_CART0] = this.waitstates[
			this.REGION_CART0 + 1
		] = this.ROM_WS[ws0];
		this.waitstates[this.REGION_CART1] = this.waitstates[
			this.REGION_CART1 + 1
		] = this.ROM_WS[ws1];
		this.waitstates[this.REGION_CART2] = this.waitstates[
			this.REGION_CART2 + 1
		] = this.ROM_WS[ws2];

		this.waitstatesSeq[this.REGION_CART0] = this.waitstatesSeq[
			this.REGION_CART0 + 1
		] = this.ROM_WS_SEQ[0][ws0seq];
		this.waitstatesSeq[this.REGION_CART1] = this.waitstatesSeq[
			this.REGION_CART1 + 1
		] = this.ROM_WS_SEQ[1][ws1seq];
		this.waitstatesSeq[this.REGION_CART2] = this.waitstatesSeq[
			this.REGION_CART2 + 1
		] = this.ROM_WS_SEQ[2][ws2seq];

		this.waitstates32[this.REGION_CART0] = this.waitstates32[
			this.REGION_CART0 + 1
		] =
			this.waitstates[this.REGION_CART0] +
			1 +
			this.waitstatesSeq[this.REGION_CART0];
		this.waitstates32[this.REGION_CART1] = this.waitstates32[
			this.REGION_CART1 + 1
		] =
			this.waitstates[this.REGION_CART1] +
			1 +
			this.waitstatesSeq[this.REGION_CART1];
		this.waitstates32[this.REGION_CART2] = this.waitstates32[
			this.REGION_CART2 + 1
		] =
			this.waitstates[this.REGION_CART2] +
			1 +
			this.waitstatesSeq[this.REGION_CART2];

		this.waitstatesSeq32[this.REGION_CART0] = this.waitstatesSeq32[
			this.REGION_CART0 + 1
		] = 2 * this.waitstatesSeq[this.REGION_CART0] + 1;
		this.waitstatesSeq32[this.REGION_CART1] = this.waitstatesSeq32[
			this.REGION_CART1 + 1
		] = 2 * this.waitstatesSeq[this.REGION_CART1] + 1;
		this.waitstatesSeq32[this.REGION_CART2] = this.waitstatesSeq32[
			this.REGION_CART2 + 1
		] = 2 * this.waitstatesSeq[this.REGION_CART2] + 1;

		if (prefetch) {
			this.waitstatesPrefetch[
				this.REGION_CART0
			] = this.waitstatesPrefetch[this.REGION_CART0 + 1] = 0;
			this.waitstatesPrefetch[
				this.REGION_CART1
			] = this.waitstatesPrefetch[this.REGION_CART1 + 1] = 0;
			this.waitstatesPrefetch[
				this.REGION_CART2
			] = this.waitstatesPrefetch[this.REGION_CART2 + 1] = 0;

			this.waitstatesPrefetch32[
				this.REGION_CART0
			] = this.waitstatesPrefetch32[this.REGION_CART0 + 1] = 0;
			this.waitstatesPrefetch32[
				this.REGION_CART1
			] = this.waitstatesPrefetch32[this.REGION_CART1 + 1] = 0;
			this.waitstatesPrefetch32[
				this.REGION_CART2
			] = this.waitstatesPrefetch32[this.REGION_CART2 + 1] = 0;
		} else {
			this.waitstatesPrefetch[
				this.REGION_CART0
			] = this.waitstatesPrefetch[
				this.REGION_CART0 + 1
			] = this.waitstatesSeq[this.REGION_CART0];
			this.waitstatesPrefetch[
				this.REGION_CART1
			] = this.waitstatesPrefetch[
				this.REGION_CART1 + 1
			] = this.waitstatesSeq[this.REGION_CART1];
			this.waitstatesPrefetch[
				this.REGION_CART2
			] = this.waitstatesPrefetch[
				this.REGION_CART2 + 1
			] = this.waitstatesSeq[this.REGION_CART2];

			this.waitstatesPrefetch32[
				this.REGION_CART0
			] = this.waitstatesPrefetch32[
				this.REGION_CART0 + 1
			] = this.waitstatesSeq32[this.REGION_CART0];
			this.waitstatesPrefetch32[
				this.REGION_CART1
			] = this.waitstatesPrefetch32[
				this.REGION_CART1 + 1
			] = this.waitstatesSeq32[this.REGION_CART1];
			this.waitstatesPrefetch32[
				this.REGION_CART2
			] = this.waitstatesPrefetch32[
				this.REGION_CART2 + 1
			] = this.waitstatesSeq32[this.REGION_CART2];
		}
	}
	saveNeedsFlush() {
		return !!(this.save && this.save.writePending);
	}
	flushSave() {
		if (this.save) {
			this.save.writePending = false;
		}
	}
	allocGPIO(rom) {
		return new GameBoyAdvanceGPIO(this.core, rom);
	}
}
