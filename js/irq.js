class GameBoyAdvanceInterruptHandler {
	constructor() {
		// this.inherit();
		this.FREQUENCY = 0x1000000;

		this.cpu = null;
		this.pendingHLEBIOSCalls = [];
		this.enable = false;

		this.IRQ_VBLANK = 0x0;
		this.IRQ_HBLANK = 0x1;
		this.IRQ_VCOUNTER = 0x2;
		this.IRQ_TIMER0 = 0x3;
		this.IRQ_TIMER1 = 0x4;
		this.IRQ_TIMER2 = 0x5;
		this.IRQ_TIMER3 = 0x6;
		this.IRQ_SIO = 0x7;
		this.IRQ_DMA0 = 0x8;
		this.IRQ_DMA1 = 0x9;
		this.IRQ_DMA2 = 0xa;
		this.IRQ_DMA3 = 0xb;
		this.IRQ_KEYPAD = 0xc;
		this.IRQ_GAMEPAK = 0xd;

		this.MASK_VBLANK = 0x0001;
		this.MASK_HBLANK = 0x0002;
		this.MASK_VCOUNTER = 0x0004;
		this.MASK_TIMER0 = 0x0008;
		this.MASK_TIMER1 = 0x0010;
		this.MASK_TIMER2 = 0x0020;
		this.MASK_TIMER3 = 0x0040;
		this.MASK_SIO = 0x0080;
		this.MASK_DMA0 = 0x0100;
		this.MASK_DMA1 = 0x0200;
		this.MASK_DMA2 = 0x0400;
		this.MASK_DMA3 = 0x0800;
		this.MASK_KEYPAD = 0x1000;
		this.MASK_GAMEPAK = 0x2000;
	}
	clear() {
		this.enable = false;
		this.halted = false;
		this.enabledIRQs = 0;
		this.interruptFlags = 0;

		this.dma = new Array();
		for (var i = 0; i < 4; ++i) {
			this.dma.push({
				source: 0,
				dest: 0,
				count: 0,
				nextSource: 0,
				nextDest: 0,
				nextCount: 0,
				srcControl: 0,
				dstControl: 0,
				repeat: false,
				width: 0,
				drq: false,
				timing: 0,
				doIrq: false,
				enable: false,
				nextIRQ: 0,
				busyUntil: 0
			});
		}

		this.timersEnabled = 0;
		this.timers = new Array();
		for (var i = 0; i < 4; ++i) {
			this.timers.push({
				reload: 0,
				oldReload: 0,
				prescaleBits: 0,
				countUp: false,
				doIrq: false,
				enable: false,
				lastEvent: 0,
				nextEvent: 0,
				overflowInterval: 1
			});
		}

		this.nextEvent = 0;
		this.springIRQ = false;
		this.pendingHLEBIOSCalls = [];
		this.resetSP();
	}
	freeze() {
		return {
			enable: this.enable,
			halted: this.halted,
			enabledIRQs: this.enabledIRQs,
			interruptFlags: this.interruptFlags,
			dma: this.dma,
			timers: this.timers,
			nextEvent: this.nextEvent,
			springIRQ: this.springIRQ,
			pendingHLEBIOSCalls: this.pendingHLEBIOSCalls.map(function (pending) {
				return Object.assign({}, pending);
			})
		};
	}
	defrost(frost) {
		this.enable = frost.enable;
		this.halted = !!frost.halted;
		this.enabledIRQs = frost.enabledIRQs;
		this.interruptFlags = frost.interruptFlags;
		this.dma = frost.dma;
		this.timers = frost.timers;
		this.timersEnabled = 0;
		if (this.timers[0].enable) {
			++this.timersEnabled;
		}
		if (this.timers[1].enable) {
			++this.timersEnabled;
		}
		if (this.timers[2].enable) {
			++this.timersEnabled;
		}
		if (this.timers[3].enable) {
			++this.timersEnabled;
		}
		this.nextEvent = frost.nextEvent;
		this.springIRQ = frost.springIRQ;
		this.pendingHLEBIOSCalls = frost.pendingHLEBIOSCalls
			? frost.pendingHLEBIOSCalls.map(function (pending) {
					return Object.assign({}, pending);
				})
			: frost.pendingHLEBIOSCall
				? [Object.assign({}, frost.pendingHLEBIOSCall)]
				: [];
	}
	resumeHLEBIOSCallIfReady() {
		var pending = this.pendingHLEBIOSCalls[
			this.pendingHLEBIOSCalls.length - 1
		];
		if (!pending) {
			return false;
		}
		var nextAddress = this.cpu.gprs[this.cpu.PC] - this.cpu.instructionWidth;
		if (
			this.cpu.mode != pending.resumeMode ||
			this.cpu.execMode != pending.resumeExecMode ||
			nextAddress != pending.resumeAddress
		) {
			return false;
		}
		this.progressHLEBIOSCall(pending);
		return this.isHLEBIOSCallBlocking();
	}
	isHLEBIOSCallBlocking() {
		var pending = this.pendingHLEBIOSCalls[
			this.pendingHLEBIOSCalls.length - 1
		];
		if (!pending || !pending.nonReturning) {
			return false;
		}
		return (
			this.cpu.mode == pending.resumeMode &&
			this.cpu.execMode == pending.resumeExecMode &&
			this.cpu.gprs[this.cpu.PC] - this.cpu.instructionWidth ==
				pending.resumeAddress
		);
	}
	progressHLEBIOSCall(pending) {
		// Advance only to device deadlines. If one accepts an IRQ, keep the BIOS
		// result private until the interrupted call resumes and finishes.
		var cpu = this.cpu;
		if (pending.nonReturning) {
			if (this.nextEvent <= cpu.cycles) {
				this.updateTimers();
				if (
					cpu.mode != pending.resumeMode ||
					cpu.execMode != pending.resumeExecMode
				) {
					return;
				}
			}
			var cyclesToEvent = this.nextEvent - cpu.cycles;
			cpu.cycles +=
				Number.isFinite(cyclesToEvent) && cyclesToEvent > 0
					? cyclesToEvent
					: 1;
			this.updateTimers();
			return;
		}
		while (pending.cyclesRemaining > 0) {
			if (this.nextEvent <= cpu.cycles) {
				this.updateTimers();
				if (
					cpu.mode != pending.resumeMode ||
					cpu.execMode != pending.resumeExecMode
				) {
					return;
				}
				if (this.nextEvent <= cpu.cycles) {
					// A malformed timer deadline must not trap the HLE call in a loop.
					cpu.cycles += pending.cyclesRemaining;
					pending.cyclesRemaining = 0;
					break;
				}
			}

			var cyclesToEvent = this.nextEvent - cpu.cycles;
			if (cyclesToEvent <= pending.cyclesRemaining) {
				cpu.cycles += cyclesToEvent;
				pending.cyclesRemaining -= cyclesToEvent;
				this.updateTimers();
				if (
					cpu.mode != pending.resumeMode ||
					cpu.execMode != pending.resumeExecMode
				) {
					return;
				}
			} else {
				cpu.cycles += pending.cyclesRemaining;
				pending.cyclesRemaining = 0;
			}
		}

		cpu.gprs[0] = pending.quotient;
		cpu.gprs[1] = pending.remainder;
		cpu.gprs[3] = pending.magnitude;
		var pendingIndex = this.pendingHLEBIOSCalls.lastIndexOf(pending);
		if (pendingIndex >= 0) {
			this.pendingHLEBIOSCalls.splice(pendingIndex, 1);
		}
		var bios = this.core && this.core.mmu && this.core.mmu.bios;
		if (bios && typeof bios.recordHLESWIReturn == "function") {
			bios.recordHLESWIReturn(pending.opcode);
		}
	}
	updateTimers() {
		if (this.nextEvent > this.cpu.cycles) {
			return;
		}

		if (this.springIRQ) {
			this.cpu.raiseIRQ();
			this.springIRQ = false;
		}

		// A timer overflow can start a sound FIFO DMA and stall the CPU. When
		// that happens, video, audio, and serial deadlines may have passed while
		// this event batch was running, so catch those devices up before polling
		// for the next CPU wake-up deadline.
		var cyclesBeforeEvents;
		do {
			cyclesBeforeEvents = this.cpu.cycles;
			this.video.updateTimers(this.cpu);
			this.audio.updateTimers();
			if (this.core.sio) {
				this.core.sio.updateTimers();
			}

			var cycles = this.cpu.cycles;
			if (this.timersEnabled) {
				for (var timerIndex = 0; timerIndex < 4; ++timerIndex) {
					var timer = this.timers[timerIndex];
					if (!timer.enable || (timerIndex > 0 && timer.countUp)) {
						continue;
					}
					cycles = Math.max(cycles, this.cpu.cycles);

					var overflowInterval = timer.overflowInterval | 0;
					if (overflowInterval < 1) {
						overflowInterval = 1;
					}
					while (cycles >= timer.nextEvent) {
						var eventCycle = timer.nextEvent;
						timer.nextEvent += overflowInterval;
						this.processTimerOverflow(timerIndex, eventCycle);
						cycles = Math.max(cycles, this.cpu.cycles);
					}
				}
			}

			// A completed one-shot DMA clears enable before its completion IRQ is
			// delivered, so nextIRQ is the authoritative pending-event marker.
			var dma = this.dma[0];
			if (
				dma.doIrq &&
				dma.nextIRQ &&
				this.cpu.cycles >= dma.nextIRQ
			) {
				dma.nextIRQ = 0;
				this.raiseIRQ(this.IRQ_DMA0);
			}

			dma = this.dma[1];
			if (
				dma.doIrq &&
				dma.nextIRQ &&
				this.cpu.cycles >= dma.nextIRQ
			) {
				dma.nextIRQ = 0;
				this.raiseIRQ(this.IRQ_DMA1);
			}

			dma = this.dma[2];
			if (
				dma.doIrq &&
				dma.nextIRQ &&
				this.cpu.cycles >= dma.nextIRQ
			) {
				dma.nextIRQ = 0;
				this.raiseIRQ(this.IRQ_DMA2);
			}

			dma = this.dma[3];
			if (
				dma.doIrq &&
				dma.nextIRQ &&
				this.cpu.cycles >= dma.nextIRQ
			) {
				dma.nextIRQ = 0;
				this.raiseIRQ(this.IRQ_DMA3);
			}
		} while (this.cpu.cycles > cyclesBeforeEvents);

		this.pollNextEvent();
	}
	processTimerOverflow(timerIndex, eventCycle) {
		var timer = this.timers[timerIndex];
		var register = (this.io.TM0CNT_LO + (timerIndex << 2)) >> 1;
		timer.lastEvent = eventCycle;
		if (timerIndex > 0 && timer.countUp) {
			// A count-up timer has no independent deadline; zero remains the
			// sentinel until its preceding timer overflows again.
			timer.nextEvent = 0;
		}
		this.io.registers[register] = timer.reload;
		timer.oldReload = timer.reload;

		if (timer.doIrq) {
			this.raiseIRQ(this.IRQ_TIMER0 + timerIndex);
		}

		if (this.audio.enabled && timerIndex < 2) {
			var selectedTimer = timerIndex == 1;
			if (
				this.audio.enableChannelA &&
				!!this.audio.soundTimerA === selectedTimer
			) {
				this.audio.sampleFifoA();
			}
			if (
				this.audio.enableChannelB &&
				!!this.audio.soundTimerB === selectedTimer
			) {
				this.audio.sampleFifoB();
			}
		}

		if (timerIndex < 3) {
			var nextTimer = this.timers[timerIndex + 1];
			if (nextTimer.enable && nextTimer.countUp) {
				var nextRegister = (this.io.TM0CNT_LO + ((timerIndex + 1) << 2)) >> 1;
				var nextValue = this.io.registers[nextRegister] + 1;
				this.io.registers[nextRegister] = nextValue;
				if (nextValue > 0xffff) {
					this.processTimerOverflow(timerIndex + 1, eventCycle);
				}
			}
		}
	}

	resetSP() {
		this.cpu.switchMode(this.cpu.MODE_SUPERVISOR);
		this.cpu.gprs[this.cpu.SP] = 0x3007fe0;
		this.cpu.switchMode(this.cpu.MODE_IRQ);
		this.cpu.gprs[this.cpu.SP] = 0x3007fa0;
		this.cpu.switchMode(this.cpu.MODE_SYSTEM);
		this.cpu.gprs[this.cpu.SP] = 0x3007f00;
	}
	swi32(opcode) {
		this.swi(opcode >> 16);
	}
	arcTan(angle) {
		angle |= 0;
		var a = -((Math.imul(angle, angle) >> 14));
		var b = (Math.imul(0xa9, a) >> 14) + 0x390;
		b = (Math.imul(b, a) >> 14) + 0x91c;
		b = (Math.imul(b, a) >> 14) + 0xfb6;
		b = (Math.imul(b, a) >> 14) + 0x16aa;
		b = (Math.imul(b, a) >> 14) + 0x2081;
		b = (Math.imul(b, a) >> 14) + 0x3651;
		b = (Math.imul(b, a) >> 14) + 0xa2f9;
		return { angle: Math.imul(angle, b) >> 16, a: a, b: b };
	}
	arcTan2(x, y) {
		var tangent;
		var divide = function (numerator, denominator) {
			return (Math.trunc(Math.imul(numerator, 0x4000) / denominator)) | 0;
		};
		if (!y) {
			return x >= 0 ? 0 : 0x8000;
		}
		if (!x) {
			return y >= 0 ? 0x4000 : 0xc000;
		}
		if (y >= 0) {
			if (x >= 0) {
				if (x >= y) {
					tangent = this.arcTan(divide(y, x));
					this.cpu.gprs[1] = tangent.a;
					return tangent.angle;
				}
			} else if (-x >= y) {
				tangent = this.arcTan(divide(y, x));
				this.cpu.gprs[1] = tangent.a;
				return tangent.angle + 0x8000;
			}
			tangent = this.arcTan(divide(x, y));
			this.cpu.gprs[1] = tangent.a;
			return 0x4000 - tangent.angle;
		}
		if (x <= 0) {
			if (-x > -y) {
				tangent = this.arcTan(divide(y, x));
				this.cpu.gprs[1] = tangent.a;
				return tangent.angle + 0x8000;
			}
		} else if (x >= -y) {
			tangent = this.arcTan(divide(y, x));
			this.cpu.gprs[1] = tangent.a;
			return tangent.angle + 0x10000;
		}
		tangent = this.arcTan(divide(x, y));
		this.cpu.gprs[1] = tangent.a;
		return 0xc000 - tangent.angle;
	}
	getSoundDriverArea(requiredSize, allowBusy) {
		var mmu = this.cpu.mmu;
		var soundArea = mmu.load32(0x03007ff0) >>> 0;
		var region = soundArea >>> mmu.BASE_OFFSET;
		var offset = soundArea & mmu.OFFSET_MASK;
		var regionSize = 0;
		if (region == mmu.REGION_WORKING_RAM) {
			regionSize = mmu.SIZE_WORKING_RAM;
		} else if (region == mmu.REGION_WORKING_IRAM) {
			regionSize = mmu.SIZE_WORKING_IRAM;
		}
		if (
			!regionSize ||
			requiredSize > regionSize ||
			offset > regionSize - requiredSize
		) {
			return 0;
		}
		var identity = mmu.load32(soundArea);
		return identity == 0x68736d53 || (allowBusy && identity == 0x68736d54)
			? soundArea
			: 0;
	}
	soundDriverVSync() {
		var mmu = this.cpu.mmu;
		var soundArea = this.getSoundDriverArea(0x0c);
		if (!soundArea) {
			return;
		}

		var counterAddress = soundArea + 0x04;
		var counter = mmu.loadU8(counterAddress);
		if (counter > 1) {
			mmu.store8(counterAddress, counter - 1);
			return;
		}

		mmu.store8(counterAddress, mmu.loadU8(soundArea + 0x0b));
		this.io.store16(this.io.DMA1CNT_HI, 0);
		this.io.store16(this.io.DMA2CNT_HI, 0);
		this.io.store16(this.io.DMA1CNT_HI, 0xb600);
		this.io.store16(this.io.DMA2CNT_HI, 0xb600);
	}
	soundDriverVSyncOff() {
		var mmu = this.cpu.mmu;
		var soundArea = this.getSoundDriverArea(0x0fb0, true);
		if (!soundArea) {
			return;
		}

		this.io.store16(this.io.DMA1CNT_HI, 0);
		this.io.store16(this.io.DMA2CNT_HI, 0);
		mmu.store8(soundArea + 0x04, 0);
		for (var offset = 0x350; offset < 0x0fb0; offset += 4) {
			mmu.store32(soundArea + offset, 0);
		}
	}
	soundDriverVSyncOn() {
		this.io.store16(this.io.DMA1CNT_HI, 0xb600);
		this.io.store16(this.io.DMA2CNT_HI, 0xb600);
	}
	soundChannelClear() {
		var mmu = this.cpu.mmu;
		var soundArea = this.getSoundDriverArea(0x0fb0);
		if (!soundArea) {
			return;
		}

		// The BIOS uses the identity word as a re-entrancy lock while it clears
		// the PCM voices. Preserve the SoundArea as initialized for later calls.
		mmu.store32(soundArea, 0x68736d54);
		try {
			for (var channel = 0; channel < 12; ++channel) {
				mmu.store8(soundArea + 0x50 + channel * 0x40, 0);
			}

			// The sound driver's CGB channel array is optional. When present,
			// SoundChannelClear also turns off the emulated PSG oscillators.
			if (
				mmu.load32(soundArea + 0x1c) &&
				this.audio &&
				typeof this.audio.stopPSGChannels == "function"
			) {
				this.audio.stopPSGChannels();
				if (typeof this.audio.updateTimers == "function") {
					this.audio.updateTimers();
				}
				if (
					this.core &&
					this.core.irq &&
					typeof this.core.irq.pollNextEvent == "function"
				) {
					this.core.irq.pollNextEvent();
				}
			}
		} finally {
			mmu.store32(soundArea, 0x68736d53);
		}
	}
	divide(numerator, denominator, opcode) {
		numerator |= 0;
		denominator |= 0;
		if (!denominator && Math.abs(numerator) > 1) {
			var cpu = this.cpu;
			var canTrackCall =
				Number.isFinite(cpu.cycles) &&
				Number.isFinite(cpu.mode) &&
				Number.isFinite(cpu.execMode) &&
				Number.isFinite(cpu.instructionWidth) &&
				Number.isFinite(cpu.PC);
			var pending = {
				opcode: opcode,
				nonReturning: true,
				cyclesRemaining: 0,
				resumeMode: canTrackCall ? cpu.mode : null,
				resumeExecMode: canTrackCall ? cpu.execMode : null,
				resumeAddress: canTrackCall
					? cpu.gprs[cpu.PC] - cpu.instructionWidth
					: null
			};
			this.pendingHLEBIOSCalls.push(pending);
			if (canTrackCall) {
				this.progressHLEBIOSCall(pending);
			}
			if (this.core && typeof this.core.WARN == "function") {
				this.core.WARN("BIOS division by zero does not return");
			}
			return;
		}
		var quotient;
		var remainder;
		if (!denominator) {
			quotient = numerator < 0 ? -1 : 1;
			remainder = numerator;
		} else if (numerator == -0x80000000 && denominator == -1) {
			quotient = -0x80000000;
			remainder = 0;
		} else {
			quotient = Math.trunc(numerator / denominator);
			remainder = numerator % denominator;
		}
		var magnitude = Math.abs(quotient);
		// Hardware measurements show a 69-cycle minimum and 13 cycles for
		// each additional quotient bit. INT_MIN / -1 takes its own measured path.
		var cycles = 69;
		if (numerator == -0x80000000 && denominator == -1) {
			cycles = 467;
		} else {
			var quotientBits = 0;
			for (
				var remaining = magnitude;
				remaining >= 2;
				remaining = Math.floor(remaining / 2)
			) {
				++quotientBits;
			}
			cycles += quotientBits * 13;
		}

		var cpu = this.cpu;
		if (
			Number.isFinite(cpu.cycles) &&
			Number.isFinite(cpu.mode) &&
			Number.isFinite(cpu.execMode) &&
			Number.isFinite(cpu.instructionWidth) &&
			Number.isFinite(cpu.PC) &&
			typeof cpu.raiseIRQ == "function"
		) {
			var pending = {
				opcode: opcode,
				quotient: quotient,
				remainder: remainder,
				magnitude: magnitude,
				cyclesRemaining: cycles,
				resumeMode: cpu.mode,
				resumeExecMode: cpu.execMode,
				resumeAddress: cpu.gprs[cpu.PC] - cpu.instructionWidth
			};
			this.pendingHLEBIOSCalls.push(pending);
			this.progressHLEBIOSCall(pending);
			return;
		}
		cpu.gprs[0] = quotient;
		cpu.gprs[1] = remainder;
		cpu.gprs[3] = magnitude;
	}
	multiplyHighUnsigned(a, b) {
		var lowLow = Math.imul(a & 0xffff, b & 0xffff) >>> 0;
		var lowHigh = Math.imul(a & 0xffff, b >>> 16) >>> 0;
		var highLow = Math.imul(a >>> 16, b & 0xffff) >>> 0;
		var highHigh = Math.imul(a >>> 16, b >>> 16) >>> 0;
		var middle =
			(lowLow >>> 16) + (lowHigh & 0xffff) + (highLow & 0xffff);
		return (
			highHigh +
			(lowHigh >>> 16) +
			(highLow >>> 16) +
			(middle >>> 16)
		) >>> 0;
	}
	clearRam(memory, length) {
		new Uint8Array(memory.buffer, 0, length).fill(0);
		if (memory.ICACHE_PAGE_BITS === undefined) {
			return;
		}
		var pageSize = 1 << (memory.ICACHE_PAGE_BITS + 1);
		for (var offset = 0; offset < length; offset += pageSize) {
			memory.invalidatePage(offset);
		}
	}
	bitUnpack(source, dest, info) {
		var mmu = this.cpu.mmu;
		var sourceLength = mmu.loadU16(info);
		var sourceWidth = mmu.loadU8(info + 2);
		var destWidth = mmu.loadU8(info + 3);
		var validSourceWidth = sourceWidth == 1 || sourceWidth == 2 || sourceWidth == 4 || sourceWidth == 8;
		var validDestWidth = destWidth == 1 || destWidth == 2 || destWidth == 4 || destWidth == 8 || destWidth == 16 || destWidth == 32;
		if (!validSourceWidth || !validDestWidth || sourceWidth > destWidth) {
			this.core.WARN("Invalid BitUnPack width");
			return;
		}
		var bias = mmu.load32(info + 4);
		var sourceMask = (1 << sourceWidth) - 1;
		var input = 0;
		var output = 0;
		var bitsAvailable = 0;
		var bitsWritten = 0;
		while (sourceLength > 0 || bitsAvailable) {
			if (!bitsAvailable) {
				input = mmu.loadU8(source++);
				bitsAvailable = 8;
				--sourceLength;
			}
			var value = input & sourceMask;
			input >>>= sourceWidth;
			if (value || bias & 0x80000000) {
				value = (value + (bias & 0x7fffffff)) >>> 0;
			}
			output |= value << bitsWritten;
			bitsAvailable -= sourceWidth;
			bitsWritten += destWidth;
			if (bitsWritten == 32) {
				mmu.store32(dest, output);
				dest += 4;
				bitsWritten = 0;
				output = 0;
			}
		}
		this.cpu.gprs[0] = source;
		this.cpu.gprs[1] = dest;
	}
	unFilter(source, dest, inputWidth, outputWidth) {
		var mmu = this.cpu.mmu;
		source &= 0xfffffffc;
		var remaining = mmu.load32(source) >>> 8;
		source += 4;
		var previous = 0;
		var pendingByte = -1;
		while (remaining > 0) {
			var value = inputWidth == 1 ? mmu.loadU8(source) : mmu.loadU16(source);
			value = (value + previous) & (inputWidth == 1 ? 0xff : 0xffff);
			previous = value;
			if (outputWidth == 1) {
				mmu.store8(dest++, value);
				remaining -= 1;
			} else if (inputWidth == 1) {
				if (pendingByte < 0) {
					pendingByte = value;
				} else {
					mmu.store16(dest, pendingByte | (value << 8));
					dest += 2;
					pendingByte = -1;
					remaining -= 2;
				}
			} else {
				mmu.store16(dest, value);
				dest += 2;
				remaining -= 2;
			}
			source += inputWidth;
		}
		if (pendingByte >= 0) {
			mmu.store16(dest, pendingByte);
			dest += 2;
		}
		this.cpu.gprs[0] = source;
		this.cpu.gprs[1] = dest;
	}
	registerRamReset(regions) {
		var io = this.io;
		var mmu = this.core.mmu;

		// The BIOS always enters forced blank while resetting RAM and devices.
		io.store16(io.DISPCNT, io.DEFAULT_DISPCNT);

		if (regions & 0x01) {
			this.clearRam(
				mmu.memory[mmu.REGION_WORKING_RAM],
				mmu.SIZE_WORKING_RAM
			);
		}
		if (regions & 0x02) {
			this.clearRam(
				mmu.memory[mmu.REGION_WORKING_IRAM],
				mmu.SIZE_WORKING_IRAM - 0x200
			);
		}
		if (regions & 0x1c) {
			this.video.renderPath.clearSubsets(mmu, regions);
		}
		if ((regions & 0x1f) && this.cpu) {
			// A reset may clear the memory currently backing the CPU's
			// prefetched instruction chain. Force the next step to fetch again.
			this.cpu.instruction = null;
			this.cpu.page = null;
			this.cpu.pageRegion = -1;
		}

		if (regions & 0x20) {
			io.store16(io.SIOCNT, 0);
			io.store16(io.RCNT, 0x8000);
			io.store16(io.SIOMLT_SEND, 0);
			io.store16(io.JOYCNT, 0);
			io.store32(io.JOY_RECV, 0);
			io.store32(io.JOY_TRANS, 0);
		}

		if (regions & 0x40) {
			var soundRegisters = [
				io.SOUND1CNT_LO,
				io.SOUND1CNT_HI,
				io.SOUND1CNT_X,
				io.SOUND2CNT_LO,
				io.SOUND2CNT_HI,
				io.SOUND3CNT_LO,
				io.SOUND3CNT_HI,
				io.SOUND3CNT_X,
				io.SOUND4CNT_LO,
				io.SOUND4CNT_HI,
				io.SOUNDCNT_LO,
				io.SOUNDCNT_HI,
				io.SOUNDCNT_X
			];
			for (var i = 0; i < soundRegisters.length; ++i) {
				io.store16(soundRegisters[i], 0);
			}
			io.store16(io.SOUNDBIAS, 0x0200);
			if (this.audio && this.audio.waveData) {
				this.audio.waveData.fill(0);
			}
		}

		if (regions & 0x80) {
			var defaults = [
				[io.DISPSTAT, 0],
				[io.BG0CNT, 0],
				[io.BG1CNT, 0],
				[io.BG2CNT, 0],
				[io.BG3CNT, 0],
				[io.BG0HOFS, 0],
				[io.BG0VOFS, 0],
				[io.BG1HOFS, 0],
				[io.BG1VOFS, 0],
				[io.BG2HOFS, 0],
				[io.BG2VOFS, 0],
				[io.BG3HOFS, 0],
				[io.BG3VOFS, 0],
				[io.BG2PA, 0x0100],
				[io.BG2PB, 0],
				[io.BG2PC, 0],
				[io.BG2PD, 0x0100],
				[io.BG2X_LO, 0],
				[io.BG2X_HI, 0],
				[io.BG2Y_LO, 0],
				[io.BG2Y_HI, 0],
				[io.BG3PA, 0x0100],
				[io.BG3PB, 0],
				[io.BG3PC, 0],
				[io.BG3PD, 0x0100],
				[io.BG3X_LO, 0],
				[io.BG3X_HI, 0],
				[io.BG3Y_LO, 0],
				[io.BG3Y_HI, 0],
				[io.WIN0H, 0],
				[io.WIN1H, 0],
				[io.WIN0V, 0],
				[io.WIN1V, 0],
				[io.WININ, 0],
				[io.WINOUT, 0],
				[io.MOSAIC, 0],
				[io.BLDCNT, 0],
				[io.BLDALPHA, 0],
				[io.BLDY, 0]
			];
			for (var i = 0; i < defaults.length; ++i) {
				io.store16(defaults[i][0], defaults[i][1]);
			}
			for (var offset = io.DMA0SAD_LO; offset <= io.DMA3CNT_HI; offset += 2) {
				io.store16(offset, 0);
			}
			for (var offset = io.TM0CNT_LO; offset <= io.TM3CNT_HI; offset += 2) {
				io.store16(offset, 0);
			}
			io.store16(io.IE, 0);
			io.store16(io.IF, 0xffff);
			io.store16(io.WAITCNT, 0);
			io.store16(io.IME, 0);
		}
	}
	swi(opcode) {
		if (this.core.mmu.bios.real) {
			this.cpu.raiseTrap();
			return;
		}
		var divisionNumerator;
		var divisionDenominator;
		if (opcode == 0x06) {
			divisionNumerator = this.cpu.gprs[0] | 0;
			divisionDenominator = this.cpu.gprs[1] | 0;
		} else if (opcode == 0x07) {
			divisionNumerator = this.cpu.gprs[1] | 0;
			divisionDenominator = this.cpu.gprs[0] | 0;
		}
		var returnsFromSwi = !(
			divisionDenominator === 0 && Math.abs(divisionNumerator) > 1
		);
		if (
			returnsFromSwi &&
			this.core.mmu.bios &&
			typeof this.core.mmu.bios.recordHLESWIReturn == "function"
		) {
			this.core.mmu.bios.recordHLESWIReturn(opcode);
		}

		switch (opcode) {
			case 0x00:
				// SoftReset
				var mem = this.core.mmu.memory[
					this.core.mmu.REGION_WORKING_IRAM
				];
				var flag = mem.loadU8(0x7ffa);
				for (var i = 0x7e00; i < 0x8000; i += 4) {
					mem.store32(i, 0);
				}
				this.resetSP();
				if (!flag) {
					this.cpu.gprs[this.cpu.LR] = 0x08000000;
				} else {
					this.cpu.gprs[this.cpu.LR] = 0x02000000;
				}
				this.cpu.switchExecMode(this.cpu.MODE_ARM);
				this.cpu.instruction.writesPC = true;
				this.cpu.gprs[this.cpu.PC] = this.cpu.gprs[this.cpu.LR];
				break;
			case 0x01:
				// RegisterRamReset
				this.registerRamReset(this.cpu.gprs[0]);
				break;
			case 0x02:
				// Halt
				this.halt();
				break;
			case 0x05:
				// VBlankIntrWait
				this.cpu.gprs[0] = 1;
				this.cpu.gprs[1] = 1;
			// Fall through:
			case 0x04:
				// IntrWait
				if (!this.enable) {
					this.io.store16(this.io.IME, 1);
				}
				if (
					!this.cpu.gprs[0] &&
					this.interruptFlags & this.cpu.gprs[1]
				) {
					return;
				}
				if (this.cpu.gprs[0]) {
					// IntrWait discards only stale flags for the requested sources.
					// Clearing every IF bit can silently lose unrelated DMA/timer IRQs.
					this.dismissIRQs(this.cpu.gprs[1]);
				}
				this.cpu.raiseTrap();
				break;
			case 0x06:
				// Div
				this.divide(this.cpu.gprs[0], this.cpu.gprs[1], opcode);
				break;
			case 0x07:
				// DivArm
				this.divide(this.cpu.gprs[1], this.cpu.gprs[0], opcode);
				break;
			case 0x08:
				// Sqrt
				var root = Math.sqrt(this.cpu.gprs[0] >>> 0);
				this.cpu.gprs[0] = root | 0; // Coerce down to int
				break;
			case 0x09:
				// ArcTan
				var tangent = this.arcTan(this.cpu.gprs[0]);
				this.cpu.gprs[0] = tangent.angle;
				this.cpu.gprs[1] = tangent.a;
				this.cpu.gprs[3] = tangent.b;
				break;
			case 0x0a:
				// ArcTan2
				this.cpu.gprs[0] = this.arcTan2(this.cpu.gprs[0], this.cpu.gprs[1]) & 0xffff;
				this.cpu.gprs[3] = 0x170;
				break;
			case 0x0b:
				// CpuSet
				var source = this.cpu.gprs[0];
				var dest = this.cpu.gprs[1];
				var mode = this.cpu.gprs[2];
				var count = mode & 0x001fffff;
				var fill = mode & 0x01000000;
				var wordsize = mode & 0x04000000 ? 4 : 2;
				if (fill) {
					if (wordsize == 4) {
						source &= 0xfffffffc;
						dest &= 0xfffffffc;
						var word = this.cpu.mmu.load32(source);
						for (var i = 0; i < count; ++i) {
							this.cpu.mmu.store32(dest + (i << 2), word);
						}
					} else {
						source &= 0xfffffffe;
						dest &= 0xfffffffe;
						var word = this.cpu.mmu.load16(source);
						for (var i = 0; i < count; ++i) {
							this.cpu.mmu.store16(dest + (i << 1), word);
						}
					}
				} else {
					if (wordsize == 4) {
						source &= 0xfffffffc;
						dest &= 0xfffffffc;
						for (var i = 0; i < count; ++i) {
							var word = this.cpu.mmu.load32(source + (i << 2));
							this.cpu.mmu.store32(dest + (i << 2), word);
						}
					} else {
						source &= 0xfffffffe;
						dest &= 0xfffffffe;
						for (var i = 0; i < count; ++i) {
							var word = this.cpu.mmu.load16(source + (i << 1));
							this.cpu.mmu.store16(dest + (i << 1), word);
						}
					}
				}
				return;
			case 0x0c:
				// FastCpuSet
				var source = this.cpu.gprs[0] & 0xfffffffc;
				var dest = this.cpu.gprs[1] & 0xfffffffc;
				var mode = this.cpu.gprs[2];
				var count = mode & 0x001fffff;
				count = ((count + 7) >> 3) << 3;
				var fill = mode & 0x01000000;
				if (fill) {
					var word = this.cpu.mmu.load32(source);
					for (var i = 0; i < count; ++i) {
						this.cpu.mmu.store32(dest + (i << 2), word);
					}
				} else {
					for (var i = 0; i < count; ++i) {
						var word = this.cpu.mmu.load32(source + (i << 2));
						this.cpu.mmu.store32(dest + (i << 2), word);
					}
				}
				return;
			case 0x0d:
				// GetBiosChecksum
				this.cpu.gprs[0] = 0xbaae187f;
				this.cpu.gprs[1] = 1;
				this.cpu.gprs[3] = this.core.mmu.SIZE_BIOS;
				break;
			case 0x0e:
				// BgAffineSet
				var i = this.cpu.gprs[2];
				var ox, oy;
				var cx, cy;
				var sx, sy;
				var theta;
				var offset = this.cpu.gprs[0];
				var destination = this.cpu.gprs[1];
				var a, b, c, d;
				var rx, ry;
				while (i--) {
					// [ sx   0  0 ]   [ cos(theta)  -sin(theta)  0 ]   [ 1  0  cx - ox ]   [ A B rx ]
					// [  0  sy  0 ] * [ sin(theta)   cos(theta)  0 ] * [ 0  1  cy - oy ] = [ C D ry ]
					// [  0   0  1 ]   [     0            0       1 ]   [ 0  0     1    ]   [ 0 0  1 ]
					ox = this.core.mmu.load32(offset) / 256;
					oy = this.core.mmu.load32(offset + 4) / 256;
					cx = this.core.mmu.load16(offset + 8);
					cy = this.core.mmu.load16(offset + 10);
					sx = this.core.mmu.load16(offset + 12) / 256;
					sy = this.core.mmu.load16(offset + 14) / 256;
					theta =
						((this.core.mmu.loadU16(offset + 16) >> 8) / 128) *
						Math.PI;
					offset += 20;
					// Rotation
					a = d = Math.cos(theta);
					b = c = Math.sin(theta);
					// Scale
					a *= sx;
					b *= -sx;
					c *= sy;
					d *= sy;
					// Translate
					rx = ox - (a * cx + b * cy);
					ry = oy - (c * cx + d * cy);
					this.core.mmu.store16(destination, (a * 256) | 0);
					this.core.mmu.store16(destination + 2, (b * 256) | 0);
					this.core.mmu.store16(destination + 4, (c * 256) | 0);
					this.core.mmu.store16(destination + 6, (d * 256) | 0);
					this.core.mmu.store32(destination + 8, (rx * 256) | 0);
					this.core.mmu.store32(destination + 12, (ry * 256) | 0);
					destination += 16;
				}
				break;
			case 0x0f:
				// ObjAffineSet
				var i = this.cpu.gprs[2];
				var sx, sy;
				var theta;
				var offset = this.cpu.gprs[0];
				var destination = this.cpu.gprs[1];
				var diff = this.cpu.gprs[3];
				var a, b, c, d;
				while (i--) {
					// [ sx   0 ]   [ cos(theta)  -sin(theta) ]   [ A B ]
					// [  0  sy ] * [ sin(theta)   cos(theta) ] = [ C D ]
					sx = this.core.mmu.load16(offset) / 256;
					sy = this.core.mmu.load16(offset + 2) / 256;
					theta =
						((this.core.mmu.loadU16(offset + 4) >> 8) / 128) *
						Math.PI;
					// Each ObjAffineSource is an 8-byte record. The last halfword is
					// padding, but it is part of the stride when processing arrays.
					offset += 8;
					// Rotation
					a = d = Math.cos(theta);
					b = c = Math.sin(theta);
					// Scale
					a *= sx;
					b *= -sx;
					c *= sy;
					d *= sy;
					this.core.mmu.store16(destination, (a * 256) | 0);
					this.core.mmu.store16(destination + diff, (b * 256) | 0);
					this.core.mmu.store16(
						destination + diff * 2,
						(c * 256) | 0
					);
					this.core.mmu.store16(
						destination + diff * 3,
						(d * 256) | 0
					);
					destination += diff * 4;
				}
				break;
			case 0x10:
				// BitUnPack
				this.bitUnpack(this.cpu.gprs[0], this.cpu.gprs[1], this.cpu.gprs[2]);
				break;
			case 0x11:
				// LZ77UnCompWram
				this.lz77(this.cpu.gprs[0], this.cpu.gprs[1], 1);
				break;
			case 0x12:
				// LZ77UnCompVram
				this.lz77(this.cpu.gprs[0], this.cpu.gprs[1], 2);
				break;
			case 0x13:
				// HuffUnComp
				this.huffman(this.cpu.gprs[0], this.cpu.gprs[1]);
				break;
			case 0x14:
				// RlUnCompWram
				this.rl(this.cpu.gprs[0], this.cpu.gprs[1], 1);
				break;
			case 0x15:
				// RlUnCompVram
				this.rl(this.cpu.gprs[0], this.cpu.gprs[1], 2);
				break;
			case 0x16:
				// Diff8bitUnFilterWram
				this.unFilter(this.cpu.gprs[0], this.cpu.gprs[1], 1, 1);
				break;
			case 0x17:
				// Diff8bitUnFilterVram
				this.unFilter(this.cpu.gprs[0], this.cpu.gprs[1], 1, 2);
				break;
			case 0x18:
				// Diff16bitUnFilter
				this.unFilter(this.cpu.gprs[0], this.cpu.gprs[1], 2, 2);
				break;
			case 0x19:
				// SoundBias
				// The BIOS changes the bias level while preserving the output
				// resolution bits in SOUNDBIAS[15:14]. Clearing them here silently
				// resets games that selected a higher Direct Sound sample rate.
				var soundBias = this.io.loadU16(this.io.SOUNDBIAS) & 0xc000;
				this.io.store16(
					this.io.SOUNDBIAS,
					soundBias | (this.cpu.gprs[0] ? 0x200 : 0)
				);
				break;
			case 0x1d:
				// SoundDriverVSync
				this.soundDriverVSync();
				break;
			case 0x1e:
				// SoundChannelClear
				this.soundChannelClear();
				break;
			case 0x1f:
				// MidiKey2Freq
				var baseFrequency = this.cpu.mmu.load32(this.cpu.gprs[0] + 4) >>> 0;
				var key = this.cpu.gprs[1] >>> 0;
				var fine = this.cpu.gprs[2] & 0xff;
				if (key > 0xb2) {
					key = 0xb2;
					fine = 0;
				}
				var pitchRatios = [
					0x80000000,
					0x879c7c97,
					0x8facd61e,
					0x9837f052,
					0xa14517cc,
					0xaadc0848,
					0xb504f334,
					0xbfc886bb,
					0xcb2ff52a,
					0xd744fccb,
					0xe411f03a,
					0xf1a1bf39
				];
				var keyShift = 14 - Math.floor(key / 12);
				var nextKey = key + 1;
				var nextKeyShift = 14 - Math.floor(nextKey / 12);
				var pitch = pitchRatios[key % 12] >>> keyShift;
				var nextPitch = pitchRatios[nextKey % 12] >>> nextKeyShift;
				var interpolatedPitch =
					pitch + Math.floor(((nextPitch - pitch) * fine) / 256);
				this.cpu.gprs[0] = this.multiplyHighUnsigned(
					baseFrequency,
					interpolatedPitch
				);
				break;
			case 0x25:
				// MultiBoot requires a remote receiver. The standalone HLE BIOS has
				// no multiboot transport, so return the BIOS-defined failure status
				// instead of leaving the parameter pointer in r0 as a false success.
				this.cpu.gprs[0] = 1;
				break;
			case 0x28:
				// SoundDriverVSyncOff
				this.soundDriverVSyncOff();
				break;
			case 0x29:
				// SoundDriverVSyncOn
				this.soundDriverVSyncOn();
				break;
			default:
				this.core.WARN(
					"Unimplemented software interrupt: 0x" + opcode.toString(16)
				);
				break;
		}
	}
	masterEnable(value) {
		this.enable = value;

		if (this.enable && this.enabledIRQs & this.interruptFlags) {
			this.cpu.raiseIRQ();
		}
	}
	setInterruptsEnabled(value) {
		this.enabledIRQs = value;

		if (this.enable && this.enabledIRQs & this.interruptFlags) {
			this.cpu.raiseIRQ();
		}
	}
	pollNextEvent() {
		var nextEvent = this.video.nextEvent;
		var test;

		if (this.audio.enabled) {
			test = this.audio.nextEvent;
			if (!nextEvent || test < nextEvent) {
				nextEvent = test;
			}
		}

		if (this.core.sio) {
			test = this.core.sio.nextEvent;
			if (test && (!nextEvent || test < nextEvent)) {
				nextEvent = test;
			}
		}

		if (this.timersEnabled) {
			var timer = this.timers[0];
			test = timer.nextEvent;
			if (timer.enable && test && (!nextEvent || test < nextEvent)) {
				nextEvent = test;
			}

			timer = this.timers[1];
			test = timer.nextEvent;
			if (timer.enable && test && (!nextEvent || test < nextEvent)) {
				nextEvent = test;
			}
			timer = this.timers[2];
			test = timer.nextEvent;
			if (timer.enable && test && (!nextEvent || test < nextEvent)) {
				nextEvent = test;
			}
			timer = this.timers[3];
			test = timer.nextEvent;
			if (timer.enable && test && (!nextEvent || test < nextEvent)) {
				nextEvent = test;
			}
		}

		// Keep scheduling pending completion IRQs after one-shot channels stop.
		var dma = this.dma[0];
		test = dma.nextIRQ;
		if (
			dma.doIrq &&
			test &&
			(!nextEvent || test < nextEvent)
		) {
			nextEvent = test;
		}

		dma = this.dma[1];
		test = dma.nextIRQ;
		if (
			dma.doIrq &&
			test &&
			(!nextEvent || test < nextEvent)
		) {
			nextEvent = test;
		}

		dma = this.dma[2];
		test = dma.nextIRQ;
		if (
			dma.doIrq &&
			test &&
			(!nextEvent || test < nextEvent)
		) {
			nextEvent = test;
		}

		dma = this.dma[3];
		test = dma.nextIRQ;
		if (
			dma.doIrq &&
			test &&
			(!nextEvent || test < nextEvent)
		) {
			nextEvent = test;
		}

		this.core.ASSERT(
			nextEvent >= this.cpu.cycles,
			"Next event is before present"
		);
		this.nextEvent = nextEvent;
	}
	stepHalt() {
		if (this.enabledIRQs & this.interruptFlags) {
			this.halted = false;
			return false;
		}

		this.pollNextEvent();
		if (!this.nextEvent || this.nextEvent <= this.cpu.cycles) {
			this.cpu.cycles += 1;
		} else {
			this.cpu.cycles = this.nextEvent;
		}
		this.updateTimers();

		if (this.enabledIRQs & this.interruptFlags) {
			this.halted = false;
			return false;
		}
		return true;
	}
	testIRQ() {
		if (this.enable && this.enabledIRQs & this.interruptFlags) {
			this.springIRQ = true;
			this.nextEvent = this.cpu.cycles;
			return true;
		}
		return false;
	}
	raiseIRQ(irqType) {
		this.interruptFlags |= 1 << irqType;
		this.io.registers[this.io.IF >> 1] = this.interruptFlags;

		if (this.enable && this.enabledIRQs & (1 << irqType)) {
			this.cpu.raiseIRQ();
		}
	}
	keypadIRQMatches(control, currentDown) {
		var selected = control & 0x03ff;
		if (!(control & 0x4000) || !selected) {
			return false;
		}
		var pressed = ~currentDown & 0x03ff;
		if (control & 0x8000) {
			return (pressed & selected) == selected;
		}
		return !!(pressed & selected);
	}
	keypadInputChanged(previousDown, currentDown) {
		var control = this.io.registers[this.io.KEYCNT >> 1];
		if (
			!this.keypadIRQMatches(control, previousDown) &&
			this.keypadIRQMatches(control, currentDown)
		) {
			this.raiseIRQ(this.IRQ_KEYPAD);
		}
	}
	keypadControlChanged(previousControl, currentControl) {
		var currentDown = this.io.keypad.currentDown;
		if (
			!this.keypadIRQMatches(previousControl, currentDown) &&
			this.keypadIRQMatches(currentControl, currentDown)
		) {
			this.raiseIRQ(this.IRQ_KEYPAD);
		}
	}
	dismissIRQs(irqMask) {
		this.interruptFlags &= ~irqMask;
		this.io.registers[this.io.IF >> 1] = this.interruptFlags;
	}
	dmaSetSourceAddress(dma, address) {
		this.dma[dma].source = address & 0xfffffffe;
	}
	dmaSetDestAddress(dma, address) {
		this.dma[dma].dest = address & 0xfffffffe;
	}
	dmaSetWordCount(dma, count) {
		this.dma[dma].count = count ? count : dma == 3 ? 0x10000 : 0x4000;
	}
	dmaWriteControl(dma, control) {
		var currentDma = this.dma[dma];
		var wasEnabled = currentDma.enable;
		currentDma.dstControl = (control & 0x0060) >> 5;
		currentDma.srcControl = (control & 0x0180) >> 7;
		currentDma.repeat = !!(control & 0x0200);
		currentDma.width = control & 0x0400 ? 4 : 2;
		currentDma.drq = !!(control & 0x0800);
		currentDma.timing = (control & 0x3000) >> 12;
		currentDma.doIrq = !!(control & 0x4000);
		currentDma.enable = !!(control & 0x8000);
		currentDma.nextIRQ = 0;

		if (currentDma.drq) {
			this.core.WARN("DRQ not implemented");
		}

		if (!wasEnabled && currentDma.enable) {
			currentDma.nextSource = currentDma.source;
			currentDma.nextDest = currentDma.dest;
			currentDma.nextCount = currentDma.count;
			this.cpu.mmu.scheduleDma(dma, currentDma);
		}
	}
	timerSetReload(timer, reload) {
		var currentTimer = this.timers[timer];
		currentTimer.reload = reload & 0xffff;
		currentTimer.overflowInterval =
			(0x10000 - currentTimer.reload) << currentTimer.prescaleBits;
	}
	timerWriteControl(timer, control) {
		var currentTimer = this.timers[timer];
		var oldPrescale = currentTimer.prescaleBits;
		var wasCountUp = currentTimer.countUp;
		var register = (this.io.TM0CNT_LO + (timer << 2)) >> 1;
		var currentCount = this.io.registers[register];
		if (currentTimer.enable && !wasCountUp) {
			currentCount =
				(currentTimer.oldReload +
					((this.cpu.cycles - currentTimer.lastEvent) >> oldPrescale)) &
				0xffff;
		}
		switch (control & 0x0003) {
			case 0x0000:
				currentTimer.prescaleBits = 0;
				break;
			case 0x0001:
				currentTimer.prescaleBits = 6;
				break;
			case 0x0002:
				currentTimer.prescaleBits = 8;
				break;
			case 0x0003:
				currentTimer.prescaleBits = 10;
				break;
		}
		currentTimer.countUp = timer > 0 && !!(control & 0x0004);
		currentTimer.doIrq = !!(control & 0x0040);
		currentTimer.overflowInterval =
			(0x10000 - currentTimer.reload) << currentTimer.prescaleBits;
		var wasEnabled = currentTimer.enable;
		currentTimer.enable = !!(((control & 0x0080) >> 7) << timer);
		if (!wasEnabled && currentTimer.enable) {
			if (!currentTimer.countUp) {
				currentTimer.lastEvent = this.cpu.cycles;
				currentTimer.nextEvent =
					this.cpu.cycles + currentTimer.overflowInterval;
			} else {
				currentTimer.nextEvent = 0;
			}
			this.io.registers[register] = currentTimer.reload;
			currentTimer.oldReload = currentTimer.reload;
			++this.timersEnabled;
		} else if (wasEnabled && !currentTimer.enable) {
			this.io.registers[register] = currentCount;
			--this.timersEnabled;
		} else if (wasEnabled && currentTimer.enable) {
			this.io.registers[register] = currentCount;
			if (currentTimer.countUp) {
				currentTimer.nextEvent = 0;
			} else {
				currentTimer.oldReload = currentCount;
				currentTimer.lastEvent = this.cpu.cycles;
				currentTimer.nextEvent =
					this.cpu.cycles +
					((0x10000 - currentCount) << currentTimer.prescaleBits);
			}
		}

		// We've changed the timers somehow...we need to reset the next event
		this.pollNextEvent();
	}
	timerRead(timer) {
		var currentTimer = this.timers[timer];
		if (currentTimer.enable && !currentTimer.countUp) {
			return (
				currentTimer.oldReload +
				((this.cpu.cycles - currentTimer.lastEvent) >>
					currentTimer.prescaleBits)
			);
		} else {
			return this.io.registers[(this.io.TM0CNT_LO + (timer << 2)) >> 1];
		}
	}
	halt() {
		if (!(this.enabledIRQs & this.interruptFlags)) {
			this.halted = true;
		}
	}
	lz77(source, dest, unitsize) {
		// TODO: move to a different file
		var remaining = (this.cpu.mmu.load32(source) & 0xffffff00) >>> 8;
		// We assume the signature byte (0x10) is correct
		var blockheader;
		var sPointer = source + 4;
		var dPointer = dest;
		var blocksRemaining = 0;
		var block;
		var disp;
		var bytes;
		var buffer = 0;
		var loaded;
		while (remaining > 0) {
			if (blocksRemaining) {
				if (blockheader & 0x80) {
					// Compressed
					block =
						this.cpu.mmu.loadU8(sPointer) |
						(this.cpu.mmu.loadU8(sPointer + 1) << 8);
					sPointer += 2;
					disp =
						dPointer -
						(((block & 0x000f) << 8) | ((block & 0xff00) >> 8)) -
						1;
					bytes = ((block & 0x00f0) >> 4) + 3;
					while (bytes-- && remaining) {
						loaded = this.cpu.mmu.loadU8(disp++);
						if (unitsize == 2) {
							buffer >>= 8;
							buffer |= loaded << 8;
							if (dPointer & 1) {
								this.cpu.mmu.store16(dPointer - 1, buffer);
							}
						} else {
							this.cpu.mmu.store8(dPointer, loaded);
						}
						--remaining;
						++dPointer;
					}
				} else {
					// Uncompressed
					loaded = this.cpu.mmu.loadU8(sPointer++);
					if (unitsize == 2) {
						buffer >>= 8;
						buffer |= loaded << 8;
						if (dPointer & 1) {
							this.cpu.mmu.store16(dPointer - 1, buffer);
						}
					} else {
						this.cpu.mmu.store8(dPointer, loaded);
					}
					--remaining;
					++dPointer;
				}
				blockheader <<= 1;
				--blocksRemaining;
			} else {
				blockheader = this.cpu.mmu.loadU8(sPointer++);
				blocksRemaining = 8;
			}
		}
	}
	huffman(source, dest) {
		source = source & 0xfffffffc;
		var header = this.cpu.mmu.load32(source);
		var remaining = header >>> 8;
		var bits = header & 0xf;
		if (bits != 4 && bits != 8) {
			this.core.WARN("Invalid Huffman symbol width: " + bits);
			return;
		}
		// We assume the signature byte (0x20) is correct
		var tree = [];
		var treesize = (this.cpu.mmu.loadU8(source + 4) << 1) + 1;
		var block = 0;
		var sPointer = source + 5 + treesize;
		var dPointer = dest & 0xfffffffc;
		var i;
		for (i = 0; i < treesize; ++i) {
			tree.push(this.cpu.mmu.loadU8(source + 5 + i));
		}
		var node;
		var offset = 0;
		var bitsRemaining;
		var readBits;
		var bitsSeen = 0;
		node = tree[0];
		while (remaining > 0) {
			var bitstream = this.cpu.mmu.load32(sPointer);
			sPointer += 4;
			for (
				bitsRemaining = 32;
				bitsRemaining > 0 && remaining > 0;
				--bitsRemaining, bitstream <<= 1
			) {
				if (typeof node === "number") {
					// Lazily construct tree
					var next = ((offset - 1) | 1) + ((node & 0x3f) << 1) + 2;
					node = {
						l: next,
						r: next + 1,
						lTerm: node & 0x80,
						rTerm: node & 0x40
					};
					tree[offset] = node;
				}

				if (bitstream & 0x80000000) {
					// Go right
					if (node.rTerm) {
						readBits = tree[node.r];
					} else {
						offset = node.r;
						node = tree[node.r];
						continue;
					}
				} else {
					// Go left
					if (node.lTerm) {
						readBits = tree[node.l];
					} else {
						offset = node.l;
						node = tree[offset];
						continue;
					}
				}

				block |= (readBits & ((1 << bits) - 1)) << bitsSeen;
				bitsSeen += bits;
				offset = 0;
				node = tree[0];
				if (bitsSeen == 32) {
					bitsSeen = 0;
					this.cpu.mmu.store32(dPointer, block);
					dPointer += 4;
					remaining -= 4;
					block = 0;
				}
			}
		}
	}
	rl(source, dest, unitsize) {
		source = source & 0xfffffffc;
		var remaining = (this.cpu.mmu.load32(source) & 0xffffff00) >>> 8;
		var padding = (4 - remaining) & 0x3;
		// We assume the signature byte (0x30) is correct
		var blockheader;
		var block;
		var sPointer = source + 4;
		var dPointer = dest;
		var buffer = 0;
		var lastByte = 0;
		while (remaining > 0) {
			blockheader = this.cpu.mmu.loadU8(sPointer++);
			if (blockheader & 0x80) {
				// Compressed
				blockheader &= 0x7f;
				blockheader += 3;
				block = this.cpu.mmu.loadU8(sPointer++);
				while (blockheader-- && remaining) {
					--remaining;
					lastByte = block;
					if (unitsize == 2) {
						buffer >>= 8;
						buffer |= block << 8;
						if (dPointer & 1) {
							this.cpu.mmu.store16(dPointer - 1, buffer);
						}
					} else {
						this.cpu.mmu.store8(dPointer, block);
					}
					++dPointer;
				}
			} else {
				// Uncompressed
				blockheader++;
				while (blockheader-- && remaining) {
					--remaining;
					block = this.cpu.mmu.loadU8(sPointer++);
					lastByte = block;
					if (unitsize == 2) {
						buffer >>= 8;
						buffer |= block << 8;
						if (dPointer & 1) {
							this.cpu.mmu.store16(dPointer - 1, buffer);
						}
					} else {
						this.cpu.mmu.store8(dPointer, block);
					}
					++dPointer;
				}
			}
		}
		if (unitsize == 2) {
			// VRAM only accepts halfword writes. Flush an odd final byte with a
			// zero high byte, then pad the result to a word boundary.
			if (dPointer & 1) {
				this.cpu.mmu.store16(dPointer - 1, lastByte);
				--padding;
				++dPointer;
			}
			while (padding > 0) {
				this.cpu.mmu.store16(dPointer, 0);
				dPointer += 2;
				padding -= 2;
			}
		} else {
			while (padding--) {
				this.cpu.mmu.store8(dPointer++, 0);
			}
		}
	}
}
