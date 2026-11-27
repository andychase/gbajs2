class MemoryProxy {
	constructor(owner, size, blockSize, ignoreByteWrites) {
		this.owner = owner;
		this.blocks = [];
		this.blockSize = blockSize;
		this.mask = (1 << blockSize) - 1;
		this.size = size;
		this.ignoreByteWrites = !!ignoreByteWrites;
		this.ICACHE_PAGE_BITS = 8;
		this.PAGE_MASK = (2 << this.ICACHE_PAGE_BITS) - 1;
		this.icache = new Array(size >> (this.ICACHE_PAGE_BITS + 1));
		if (blockSize) {
			for (var i = 0; i < (size >> blockSize); ++i) {
				this.blocks.push(new MemoryView(new ArrayBuffer(1 << blockSize)));
			}
		}
		else {
			this.blockSize = 31;
			this.mask = -1;
			this.blocks[0] = new MemoryView(new ArrayBuffer(size));
		}
	}
	combine() {
		if (this.blocks.length > 1) {
			var combined = new Uint8Array(this.size);
			for (var i = 0; i < this.blocks.length; ++i) {
				combined.set(new Uint8Array(this.blocks[i].buffer), i << this.blockSize);
			}
			return combined.buffer;
		}
		else {
			return this.blocks[0].buffer;
		}
	}
	replace(buffer) {
		for (var i = 0; i < this.blocks.length; ++i) {
			this.blocks[i] = new MemoryView(buffer.slice(i << this.blockSize, (i << this.blockSize) + this.blocks[i].buffer.byteLength));
		}
	}
	load8(offset) {
		return this.blocks[offset >> this.blockSize].load8(offset & this.mask);
	}
	load16(offset) {
		return this.blocks[offset >> this.blockSize].load16(offset & this.mask);
	}
	loadU8(offset) {
		return this.blocks[offset >> this.blockSize].loadU8(offset & this.mask);
	}
	loadU16(offset) {
		return this.blocks[offset >> this.blockSize].loadU16(offset & this.mask);
	}
	load32(offset) {
		return this.blocks[offset >> this.blockSize].load32(offset & this.mask);
	}
	store8(offset, value) {
		if (
			this.ignoreByteWrites === true ||
			(typeof this.ignoreByteWrites == 'function' && this.ignoreByteWrites(offset))
		) {
			return;
		}
		if (offset >= this.size) {
			return;
		}
		var blockIndex = offset >> this.blockSize;
		var blockOffset = offset & this.mask;
		var block = this.blocks[blockIndex];
		var byteValue = value & 0xff;
		var halfwordOffset = blockOffset & 0xfffffffe;
		if (block.loadU16(halfwordOffset) == byteValue * 0x101) {
			return;
		}
		this.owner.memoryDirtied(this, blockIndex, blockOffset & ~1, 2);
		block.store8(blockOffset, byteValue);
		block.store8(blockOffset ^ 1, byteValue);
	}
	store16(offset, value) {
		if (offset >= this.size) {
			return;
		}
		var blockIndex = offset >> this.blockSize;
		var blockOffset = offset & this.mask;
		var block = this.blocks[blockIndex];
		if (block.loadU16(blockOffset & 0xfffffffe) == (value & 0xffff)) {
			return;
		}
		this.owner.memoryDirtied(this, blockIndex, blockOffset & ~1, 2);
		return block.store16(blockOffset, value);
	}
	store32(offset, value) {
		if (offset >= this.size) {
			return;
		}
		var blockIndex = offset >> this.blockSize;
		var blockOffset = offset & this.mask;
		var block = this.blocks[blockIndex];
		if (block.load32(blockOffset & 0xfffffffc) == (value | 0)) {
			return;
		}
		this.owner.memoryDirtied(this, blockIndex, blockOffset & ~3, 4);
		return block.store32(blockOffset, value);
	}
	invalidatePage(address) {
		var page =
			this.icache[
				(address % this.size) >> (this.ICACHE_PAGE_BITS + 1)
			];
		if (page) {
			page.invalid = true;
		}
	}
};

class GameBoyAdvanceRenderProxy {
	constructor() {
		this.worker = new Worker('js/video/worker.js');

		this.currentFrame = 0;
		this.delay = 0;
		this.skipFrame = false;
		this.workerFailed = false;

		this.dirty = null;
		var self = this;
		var handlers = {
			finish: function (data) {
				if (self.workerFailed) {
					return;
				}
				self.backing = data.backing;
				self.caller.finishDraw(self.backing);
				self.delay = Math.max(0, self.delay - 1);
			}
		};
		this.worker.onmessage = function (message) {
			handlers[message.data['type']](message.data);
		};
		this.worker.onerror = function (error) {
			self.failWorker(error);
		};
		this.worker.onmessageerror = function (error) {
			self.failWorker(error);
		};
	}
	failWorker(error) {
		this.workerFailed = true;
		this.skipFrame = true;
		this.delay = 0;
		if (this.worker && typeof this.worker.terminate == "function") {
			try {
				this.worker.terminate();
			} catch (terminateError) {}
		}
		if (this.onWorkerError) {
			this.onWorkerError(error);
		}
	}
	memoryDirtied(mem, block, offset, length) {
		this.dirty = this.dirty || {};
		this.dirty.memory = this.dirty.memory || {};
		if (mem === this.palette) {
			this.dirty.memory.palette = mem.blocks[0].buffer;
		}
		if (mem === this.oam) {
			this.dirty.memory.oam = mem.blocks[0].buffer;
		}
		if (mem === this.vram) {
			// Keep the scanline boundary as the snapshot point, but track changed
			// 256-byte pages so a small VRAM update does not copy an 8 KiB block.
			this.dirty.memory.vram = this.dirty.memory.vram || [];
			var snapshot = this.dirty.memory.vram[block];
			if (!snapshot) {
				snapshot = this.dirty.memory.vram[block] = {
					full: false,
					pages: [],
					pageMask: 0
				};
			}
			if (offset === undefined || length === undefined) {
				snapshot.full = true;
				snapshot.pages.length = 0;
				snapshot.pageMask = 0;
				return;
			}
			if (snapshot.full) {
				return;
			}
			var firstPage = offset >> 8;
			var lastPage = (offset + length - 1) >> 8;
			for (var page = firstPage; page <= lastPage; ++page) {
				var pageBit = 1 << page;
				var alreadyDirty = page < 32
					? !!(snapshot.pageMask & pageBit)
					: snapshot.pages.indexOf(page) >= 0;
				if (!alreadyDirty) {
					snapshot.pages.push(page);
					if (page < 32) {
						snapshot.pageMask |= pageBit;
					}
					var pageCount = mem.blocks[block].buffer.byteLength >> 8;
					// Dense updates are cheaper to transfer as one immutable block.
					if (snapshot.pages.length >= Math.max(1, pageCount >> 1)) {
						snapshot.full = true;
						snapshot.pages.length = 0;
						snapshot.pageMask = 0;
						return;
					}
				}
			}
		}
	}
	configureVRAMAccess() {
		this.vram.ignoreByteWrites = (offset) => {
			var objStart = this.backgroundMode >= 3 && this.backgroundMode <= 5
				? 0x14000
				: 0x10000;
			return offset >= objStart;
		};
	}
	clear(mmu) {
		this.palette = new MemoryProxy(this, mmu.SIZE_PALETTE_RAM, 0);
		this.vram = new MemoryProxy(this, mmu.SIZE_VRAM, 13);
		this.backgroundMode = 0;
		this.configureVRAMAccess();
		this.oam = new MemoryProxy(this, mmu.SIZE_OAM, 0, true);

		this.dirty = null;
		this.scanlineQueue = [];
		this.pendingOamPrime = null;

		this.worker.postMessage({ type: 'clear', SIZE_VRAM: mmu.SIZE_VRAM, SIZE_OAM: mmu.SIZE_OAM });
	}
	freeze(encodeBase64) {
		return {
			'palette': Serializer.prefix(this.palette.combine()),
			'vram': Serializer.prefix(this.vram.combine()),
			'oam': Serializer.prefix(this.oam.combine()),
			'pendingOamPrime': Serializer.prefix(
				this.pendingOamPrime || new ArrayBuffer(0)
			)
		};
	}
	defrost(frost, decodeBase64) {
		this.palette.replace(frost.palette);
		this.memoryDirtied(this.palette, 0);
		this.vram.replace(frost.vram);
		for (var i = 0; i < this.vram.blocks.length; ++i) {
			this.memoryDirtied(this.vram, i);
		}
		this.oam.replace(frost.oam);
		this.memoryDirtied(this.oam, 0);
		this.pendingOamPrime = frost.pendingOamPrime && frost.pendingOamPrime.byteLength
			? frost.pendingOamPrime.slice(0)
			: null;
	}
	writeDisplayControl(value) {
		this.backgroundMode = value & 0x0007;
		this.dirty = this.dirty || {};
		this.dirty.DISPCNT = value;
	}
	writeBackgroundControl(bg, value) {
		this.dirty = this.dirty || {};
		this.dirty.BGCNT = this.dirty.BGCNT || [];
		this.dirty.BGCNT[bg] = value;
	}
	writeBackgroundHOffset(bg, value) {
		this.dirty = this.dirty || {};
		this.dirty.BGHOFS = this.dirty.BGHOFS || [];
		this.dirty.BGHOFS[bg] = value;
	}
	writeBackgroundVOffset(bg, value) {
		this.dirty = this.dirty || {};
		this.dirty.BGVOFS = this.dirty.BGVOFS || [];
		this.dirty.BGVOFS[bg] = value;
	}
	writeBackgroundRefX(bg, value) {
		this.dirty = this.dirty || {};
		this.dirty.BGX = this.dirty.BGX || [];
		this.dirty.BGX[bg] = value;
	}
	writeBackgroundRefY(bg, value) {
		this.dirty = this.dirty || {};
		this.dirty.BGY = this.dirty.BGY || [];
		this.dirty.BGY[bg] = value;
	}
	writeBackgroundParamA(bg, value) {
		this.dirty = this.dirty || {};
		this.dirty.BGPA = this.dirty.BGPA || [];
		this.dirty.BGPA[bg] = value;
	}
	writeBackgroundParamB(bg, value) {
		this.dirty = this.dirty || {};
		this.dirty.BGPB = this.dirty.BGPB || [];
		this.dirty.BGPB[bg] = value;
	}
	writeBackgroundParamC(bg, value) {
		this.dirty = this.dirty || {};
		this.dirty.BGPC = this.dirty.BGPC || [];
		this.dirty.BGPC[bg] = value;
	}
	writeBackgroundParamD(bg, value) {
		this.dirty = this.dirty || {};
		this.dirty.BGPD = this.dirty.BGPD || [];
		this.dirty.BGPD[bg] = value;
	}
	writeWin0H(value) {
		this.dirty = this.dirty || {};
		this.dirty.WIN0H = value;
	}
	writeWin1H(value) {
		this.dirty = this.dirty || {};
		this.dirty.WIN1H = value;
	}
	writeWin0V(value) {
		this.dirty = this.dirty || {};
		this.dirty.WIN0V = value;
	}
	writeWin1V(value) {
		this.dirty = this.dirty || {};
		this.dirty.WIN1V = value;
	}
	writeWinIn(value) {
		this.dirty = this.dirty || {};
		this.dirty.WININ = value;
	}
	writeWinOut(value) {
		this.dirty = this.dirty || {};
		this.dirty.WINOUT = value;
	}
	writeBlendControl(value) {
		this.dirty = this.dirty || {};
		this.dirty.BLDCNT = value;
	}
	writeBlendAlpha(value) {
		this.dirty = this.dirty || {};
		this.dirty.BLDALPHA = value;
	}
	writeBlendY(value) {
		this.dirty = this.dirty || {};
		this.dirty.BLDY = value;
	}
	writeMosaic(value) {
		this.dirty = this.dirty || {};
		this.dirty.MOSAIC = value;
	}
	clearSubsets(mmu, regions) {
		this.dirty = this.dirty || {};
		if (regions & 0x04) {
			this.palette = new MemoryProxy(this, mmu.SIZE_PALETTE_RAM, 0);
			mmu.mmap(mmu.REGION_PALETTE_RAM, this.palette);
			this.memoryDirtied(this.palette, 0);
		}
		if (regions & 0x08) {
			this.vram = new MemoryProxy(this, mmu.SIZE_VRAM, 13);
			this.configureVRAMAccess();
			mmu.mmap(mmu.REGION_VRAM, this.vram);
			for (var i = 0; i < this.vram.blocks.length; ++i) {
				this.memoryDirtied(this.vram, i);
			}
		}
		if (regions & 0x10) {
			this.oam = new MemoryProxy(this, mmu.SIZE_OAM, 0, true);
			mmu.mmap(mmu.REGION_OAM, this.oam);
			this.memoryDirtied(this.oam, 0);
		}
	}
	setBacking(backing) {
		this.backing = backing;
		this.worker.postMessage({ type: 'start', backing: this.backing });
	}
	primeObjOamForLineZero() {
		// Keep the line-227 OAM snapshot separate from the live proxy memory:
		// writes made later in V-Blank apply from line 1, not line 0.
		this.pendingOamPrime = this.oam.blocks[0].buffer.slice(0);
	}
	drawScanline(y) {
		if (!this.skipFrame) {
			var oamPrime = y === 0 ? this.pendingOamPrime : null;
			if (this.dirty || oamPrime) {
				if (this.dirty && this.dirty.memory) {
					if (this.dirty.memory.palette) {
						this.dirty.memory.palette = this.dirty.memory.palette.slice(0);
					}
					if (this.dirty.memory.oam) {
						this.dirty.memory.oam = this.dirty.memory.oam.slice(0);
					}
					if (this.dirty.memory.vram) {
						for (var i = 0; i < 12; ++i) {
							var snapshot = this.dirty.memory.vram[i];
							if (!snapshot) {
								continue;
							}
							if (snapshot.full) {
								this.dirty.memory.vram[i] =
									this.vram.blocks[i].buffer.slice(0);
							} else if (snapshot.pages) {
								var source = this.vram.blocks[i].buffer;
								var patches = [];
								for (var j = 0; j < snapshot.pages.length; ++j) {
									var offset = snapshot.pages[j] << 8;
									patches.push({
										offset: offset,
										buffer: source.slice(offset, offset + 0x100)

									});
								}
								this.dirty.memory.vram[i] = { patches: patches };
							} else if (typeof snapshot.byteLength == "number") {
								this.dirty.memory.vram[i] = snapshot.slice(0);
							}
						}
					}
				}
				this.scanlineQueue.push({
					y: y,
					dirty: this.dirty,
					oamPrime: oamPrime
				});
				this.dirty = null;
				if (oamPrime) {
					this.pendingOamPrime = null;
				}
			}
		}
	}
	startDraw() {
		++this.currentFrame;
		if (this.workerFailed) {
			this.skipFrame = true;
		} else if (this.delay <= 0) {
			this.skipFrame = false;
		}
	}
	finishDraw(caller) {
		this.caller = caller;
		if (!this.skipFrame && !this.workerFailed) {
			var transferables = [];
			var transferred = new Set();
			for (var i = 0; i < this.scanlineQueue.length; ++i) {
				var scanline = this.scanlineQueue[i];
				var dirtyMemory = scanline.dirty && scanline.dirty.memory;
				var buffers = [
					dirtyMemory && dirtyMemory.palette,
					dirtyMemory && dirtyMemory.oam,
					scanline.oamPrime
				];
				if (dirtyMemory && dirtyMemory.vram) {
					for (var block = 0; block < dirtyMemory.vram.length; ++block) {
						var snapshot = dirtyMemory.vram[block];
						if (snapshot && typeof snapshot.byteLength == "number") {
							buffers.push(snapshot);
						} else if (snapshot && snapshot.patches) {
							for (var patch = 0; patch < snapshot.patches.length; ++patch) {
								buffers.push(snapshot.patches[patch].buffer);
							}
						}
					}
				}
				for (var j = 0; j < buffers.length; ++j) {
					var buffer = buffers[j];
					if (buffer && !transferred.has(buffer)) {
						transferred.add(buffer);
						transferables.push(buffer);
					}
				}
			}
			this.worker.postMessage(
				{
					type: 'finish',
					scanlines: this.scanlineQueue,
					frame: this.currentFrame
				},
				transferables
			);
			this.scanlineQueue = [];
			++this.delay;
			if (this.delay > 2) {
				this.skipFrame = true;
			}
		}
	}
};
