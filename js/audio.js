class GameBoyAdvanceAudio {
	constructor() {
		window.AudioContext = window.AudioContext || window.webkitAudioContext;
		if (window.AudioContext) {
			var self = this;
			this.context = new AudioContext();
			this.bufferSize = 0;
			this.bufferSize = 4096;
			// SOUNDBIAS can raise the emulated PWM rate to 262.144 kHz. Size
			// the source-sample ring for four WebAudio callbacks at that rate;
			// keeping only the default-rate capacity lets high-rate output wrap
			// over unread samples before a callback can consume them.
			var maxSampleRate = 32768 << 3;
			var outputRate = this.context.sampleRate || 32768;
			var requiredSamples = Math.ceil(
				(this.bufferSize << 2) * Math.max(1, maxSampleRate / outputRate)
			);
			this.maxSamples = 1;
			while (this.maxSamples < requiredSamples) {
				this.maxSamples <<= 1;
			}
			this.buffers = [
				new Float32Array(this.maxSamples),
				new Float32Array(this.maxSamples)
			];
			this.sampleMask = this.maxSamples - 1;
			if (this.context.createScriptProcessor) {
				this.jsAudio = this.context.createScriptProcessor(
					this.bufferSize
				);
			} else {
				this.jsAudio = this.context.createJavaScriptNode(
					this.bufferSize
				);
			}
			this.jsAudio.onaudioprocess = function (e) {
				self.audioProcess(e);
			};
		} else {
			this.context = null;
		}

		this.masterEnable = true;
		this.masterVolume = 1.0;

		this.SOUND_MAX = 0x400;
		this.FIFO_MAX = 0x200;
		this.PSG_MAX = 0x080;
	}
	clear() {
		this.fifoA = [];
		this.fifoB = [];
		this.fifoAWriteBuffer = new Array(8).fill(0);
		this.fifoBWriteBuffer = new Array(8).fill(0);
		this.fifoAWriteIndex = 0;
		this.fifoBWriteIndex = 0;
		this.fifoAInternal = [];
		this.fifoBInternal = [];
		this.fifoASample = 0;
		this.fifoBSample = 0;

		this.enabled = false;
		if (this.context) {
			try {
				this.jsAudio.disconnect(this.context.destination);
			} catch (e) {}
		}

		this.enableChannelA = false;
		this.enableChannelB = false;
		this.enableRightChannelA = false;
		this.enableLeftChannelA = false;
		this.enableRightChannelB = false;
		this.enableLeftChannelB = false;

		this.playingChannel3 = false;
		this.playingChannel4 = false;

		this.volumeLeft = 0;
		this.volumeRight = 0;
		this.masterVolumeLeft = 0;
		this.masterVolumeRight = 0;
		this.ratioChannelA = 1;
		this.ratioChannelB = 1;
		this.enabledLeft = 0;
		this.enabledRight = 0;

		this.dmaA = -1;
		this.dmaB = -1;
		this.soundTimerA = 0;
		this.soundTimerB = 0;

		this.soundRatio = 1;
		this.soundBias = 0x200;

		this.squareChannels = new Array();
		for (var i = 0; i < 2; ++i) {
			this.squareChannels[i] = {
				playing: false,
				sample: 0,
				duty: 0.5,
				increment: 0,
				step: 0,
				initialVolume: 0,
				volume: 0,
				frequency: 0,
				interval: 0,
				sweepSteps: 0,
				sweepIncrement: 0,
				sweepInterval: 0,
				doSweep: false,
				raise: 0,
				lower: 0,
				nextStep: 0,
				timed: false,
				length: 0,
				end: 0
			};
		}

		this.waveData = new Uint8Array(32);
		this.channel3Dimension = 0;
		this.channel3Bank = 0;
		this.channel3Volume = 0;
		this.channel3Interval = 0;
		this.channel3Next = 0;
		this.channel3Length = 0;
		this.channel3Timed = false;
		this.channel3End = 0;
		this.channel3Pointer = 0;
		this.channel3Sample = 0;

		this.cpuFrequency = this.core.irq.FREQUENCY;

		this.channel4 = {
			sample: 0,
			lfsr: 0,
			width: 15,
			interval: this.cpuFrequency / 524288,
			increment: 0,
			step: 0,
			initialVolume: 0,
			volume: 0,
			nextStep: 0,
			timed: false,
			length: 0,
			end: 0
		};

		this.nextEvent = 0;

		this.nextSample = 0;
		this.outputPointer = 0;
		this.samplePointer = 0;

		this.backup = 0;
		this.totalSamples = 0;

		this.sampleRate = 32768;
		this.sampleInterval = this.cpuFrequency / this.sampleRate;
		this.resampleRatio = 1;
		if (this.context) {
			this.resampleRatio = this.sampleRate / this.context.sampleRate;
		}

		this.writeSquareChannelFC(0, 0);
		this.writeSquareChannelFC(1, 0);
		this.writeChannel4FC(0);
	}
	freeze() {
		return {
			nextSample: this.nextSample,
			soundBias: this.soundBias,
			fifoA: (this.fifoA || []).slice(),
			fifoB: (this.fifoB || []).slice(),
			fifoASample: this.fifoASample || 0,
			fifoBSample: this.fifoBSample || 0,
			fifoAInternal: (this.fifoAInternal || []).slice(),
			fifoBInternal: (this.fifoBInternal || []).slice(),
			fifoAWriteBuffer: (this.fifoAWriteBuffer || []).slice(),
			fifoBWriteBuffer: (this.fifoBWriteBuffer || []).slice(),
			fifoAWriteIndex: this.fifoAWriteIndex || 0,
			fifoBWriteIndex: this.fifoBWriteIndex || 0
		};
	}
	defrost(frost, soundBias) {
		this.nextSample = frost.nextSample;
		this.fifoA = (frost.fifoA || []).slice();
		this.fifoB = (frost.fifoB || []).slice();
		this.fifoASample = frost.fifoASample || 0;
		this.fifoBSample = frost.fifoBSample || 0;
		this.fifoAInternal = (frost.fifoAInternal || []).slice();
		this.fifoBInternal = (frost.fifoBInternal || []).slice();
		this.fifoAWriteBuffer = new Array(8);
		this.fifoBWriteBuffer = new Array(8);
		for (var i = 0; i < 8; ++i) {
			this.fifoAWriteBuffer[i] =
				((frost.fifoAWriteBuffer || [])[i] || 0) >>> 0;
			this.fifoBWriteBuffer[i] =
				((frost.fifoBWriteBuffer || [])[i] || 0) >>> 0;
		}
		this.fifoAWriteIndex = (frost.fifoAWriteIndex || 0) & 7;
		this.fifoBWriteIndex = (frost.fifoBWriteIndex || 0) & 7;
		if (soundBias === undefined) {
			soundBias = frost.soundBias;
		}
		if (soundBias === undefined) {
			soundBias = 0x200;
		}
		this.soundBias = soundBias & 0xc3fe;
		var resolution = (this.soundBias >>> 14) & 0x3;
		this.sampleRate = 32768 << resolution;
		this.sampleInterval = this.cpuFrequency / this.sampleRate;
		this.resampleRatio = this.context
			? this.sampleRate / this.context.sampleRate
			: 1;
	}
	pause(paused) {
		if (this.context) {
			if (paused) {
				try {
					this.jsAudio.disconnect(this.context.destination);
				} catch (e) {
					// Sigh
				}
			} else if (this.enabled) {
				this.jsAudio.connect(this.context.destination);
			}
		}
	}
	updateTimers() {
		if (!this.enabled) {
			return;
		}

		// A long DMA stall can leave many audio samples and channel steps due.
		// Catch them up iteratively so the delay cannot exhaust the JS call stack.
		while (true) {
			var cycles = this.cpu.cycles;
			if (cycles < this.nextEvent && cycles < this.nextSample) {
				return;
			}

			if (cycles >= this.nextEvent) {
				var channel = this.squareChannels[0];
				this.nextEvent = Infinity;
				if (channel.playing) {
					this.updateSquareChannel(channel, cycles);
				}

				channel = this.squareChannels[1];
				if (channel.playing) {
					this.updateSquareChannel(channel, cycles);
				}

				if (this.playingChannel3) {
					if (cycles >= this.channel3Next) {
						if (this.channel3Write) {
							var sampleBank = this.channel3Bank ? 16 : 0;
							if (
								this.channel3Dimension &&
								this.channel3Pointer >= 32
							) {
								sampleBank ^= 16;
							}
							var sample =
								this.waveData[
									sampleBank + ((this.channel3Pointer & 31) >> 1)
								];
							var sampleShift =
								((this.channel3Pointer & 1) ^ 1) << 2;
							this.channel3Sample =
								(((sample >> sampleShift) & 0xf) - 0x8) / 8;
							this.channel3Pointer++;
							if (this.channel3Dimension) {
								if (this.channel3Pointer >= 64) {
									this.channel3Pointer -= 64;
								}
							} else if (this.channel3Pointer >= 32) {
								this.channel3Pointer -= 32;
							}
						}
						this.channel3Next += this.channel3Interval;
						if (
							this.channel3Interval &&
							this.nextEvent > this.channel3Next
						) {
							this.nextEvent = this.channel3Next;
						}
					}
					if (this.channel3Timed && cycles >= this.channel3End) {
						this.playingChannel3 = false;
					}
				}

				if (this.playingChannel4) {
					if (this.channel4.timed && cycles >= this.channel4.end) {
						this.playingChannel4 = false;
					} else {
						if (cycles >= this.channel4.next) {
							var sample = this.clockChannel4();
							this.channel4.next += this.channel4.interval;
							this.channel4.sample =
								(sample - 0.5) * 2 * this.channel4.volume;
						}
						this.updateEnvelope(this.channel4, cycles);
						if (this.nextEvent > this.channel4.next) {
							this.nextEvent = this.channel4.next;
						}
						if (
							this.channel4.timed &&
							this.nextEvent > this.channel4.end
						) {
							this.nextEvent = this.channel4.end;
						}
					}
				}
			}

			if (cycles >= this.nextSample) {
				this.sample();
				this.nextSample += this.sampleInterval;
			}

			this.nextEvent = Math.ceil(this.nextEvent);
		}
	}
	clockChannel4() {
		var channel = this.channel4;
		// XOR the current low two taps before shifting. Computing feedback from
		// the shifted state locks the polynomial counter at zero after one cycle.
		var feedback = (channel.lfsr ^ (channel.lfsr >>> 1)) & 1;
		channel.lfsr =
			(channel.lfsr >>> 1) | (feedback << (channel.width - 1));
		return channel.lfsr & 1;
	}
	writeEnable(value) {
		this.enabled = !!value;
		this.nextEvent = this.cpu.cycles;
		this.nextSample = this.nextEvent;
		this.updateTimers();
		if (!this.enabled) {
			var io = this.core.io;
			if (io && io.registers) {
				// Turning off SOUNDCNT_X clears all PSG registers through
				// SOUNDCNT_L. SOUNDCNT_H keeps its upper-byte routing and timer
				// fields while resetting the lower-byte volume controls.
				for (
					var offset = io.SOUND1CNT_LO;
					offset <= io.SOUNDCNT_LO;
					offset += 2
				) {
					io.registers[offset >> 1] = 0;
				}
				var soundControlHi = io.SOUNDCNT_HI >> 1;
				io.registers[soundControlHi] &= 0xff00;
				this.writeSoundControlLo(0);
				// Bits 11 and 15 are FIFO reset commands, not persistent control
				// state. The stored register may retain them, so mask them before
				// syncing the audio engine to avoid an unintended FIFO flush.
				this.writeSoundControlHi(io.registers[soundControlHi] & 0x77ff);
			}
			this.resetPSGChannels();
		}
		this.core.irq.pollNextEvent();
		if (this.context) {
			if (value) {
				this.jsAudio.connect(this.context.destination);
			} else {
				try {
					this.jsAudio.disconnect(this.context.destination);
				} catch (e) {}
			}
		}
	}
	resetPSGChannels() {
		for (var i = 0; i < this.squareChannels.length; ++i) {
			var channel = this.squareChannels[i];
			channel.playing = false;
			channel.sample = 0;
			channel.duty = 0.125;
			channel.increment = -1 / 16;
			channel.step = 0;
			channel.initialVolume = 0;
			channel.volume = 0;
			channel.frequency = 0;
			channel.interval = this.cpuFrequency / 64;
			channel.sweepSteps = 0;
			channel.sweepIncrement = 1;
			channel.sweepInterval = 0;
			channel.doSweep = false;
			channel.nextSweep = 0;
			channel.raise = 0;
			channel.lower = 0;
			channel.nextStep = 0;
			channel.timed = false;
			channel.length = 0;
			channel.end = 0;
		}

		this.channel3Write = false;
		this.playingChannel3 = false;
		this.channel3Dimension = 0;
		this.channel3Bank = 0;
		this.channel3Volume = 0;
		this.channel3Interval = 0;
		this.channel3Next = 0;
		this.channel3Length = 0;
		this.channel3Timed = false;
		this.channel3End = 0;
		this.channel3Pointer = 0;
		this.channel3Sample = 0;

		this.playingChannel4 = false;
		this.channel4.sample = 0;
		this.channel4.lfsr = 0x4000;
		this.channel4.width = 15;
		this.channel4.interval = this.cpuFrequency / 524288;
		this.channel4.increment = -1 / 16;
		this.channel4.step = 0;
		this.channel4.initialVolume = 0;
		this.channel4.volume = 0;
		this.channel4.nextStep = 0;
		this.channel4.timed = false;
		this.channel4.length = 0;
		this.channel4.end = 0;
		this.channel4.next = 0;

		this.masterVolumeLeft = 0;
		this.masterVolumeRight = 0;
		this.enabledLeft = 0;
		this.enabledRight = 0;
	}
	stopPSGChannels() {
		for (var i = 0; i < this.squareChannels.length; ++i) {
			this.squareChannels[i].playing = false;
			this.squareChannels[i].sample = 0;
		}
		this.playingChannel3 = false;
		this.channel3Sample = 0;
		this.playingChannel4 = false;
		this.channel4.sample = 0;
	}
	writeSoundBias(value) {
		value &= 0xc3fe;
		var cycles = this.cpu.cycles;
		var oldSampleInterval = this.sampleInterval;
		if (this.enabled) {
			this.updateTimers();
		}
		var lastSampleCycle = this.enabled
			? this.nextSample - oldSampleInterval
			: cycles;
		this.soundBias = value;
		var resolution = (value >>> 14) & 0x3;
		this.sampleRate = 32768 << resolution;
		this.sampleInterval = this.cpuFrequency / this.sampleRate;
		this.resampleRatio = this.context
			? this.sampleRate / this.context.sampleRate
			: 1;
		if (this.enabled) {
			this.nextSample = lastSampleCycle + this.sampleInterval;
			this.updateTimers();
		}
		this.core.irq.pollNextEvent();
	}
	writeSoundControlLo(value) {
		this.masterVolumeRight = value & 0x7;
		this.masterVolumeLeft = (value >> 4) & 0x7;
		this.enabledRight = (value >> 8) & 0xf;
		this.enabledLeft = (value >> 12) & 0xf;

		this.updateTimers();
		this.core.irq.pollNextEvent();
	}
	writeSoundControlHi(value) {
		switch (value & 0x0003) {
			case 0:
				this.soundRatio = 0.25;
				break;
			case 1:
				this.soundRatio = 0.50;
				break;
			case 2:
				this.soundRatio = 1;
				break;
		}
		this.ratioChannelA = (((value & 0x0004) >> 2) + 1) * 0.5;
		this.ratioChannelB = (((value & 0x0008) >> 3) + 1) * 0.5;

		this.enableRightChannelA = value & 0x0100;
		this.enableLeftChannelA = value & 0x0200;
		this.enableChannelA = value & 0x0300;
		this.soundTimerA = value & 0x0400;
		if (value & 0x0800) {
			this.fifoA = [];
			this.fifoAWriteIndex = 0;
			this.fifoAInternal = [];
			this.fifoASample = 0;
		}
		this.enableRightChannelB = value & 0x1000;
		this.enableLeftChannelB = value & 0x2000;
		this.enableChannelB = value & 0x3000;
		this.soundTimerB = value & 0x4000;
		if (value & 0x8000) {
			this.fifoB = [];
			this.fifoBWriteIndex = 0;
			this.fifoBInternal = [];
			this.fifoBSample = 0;
		}
	}
	resetSquareChannel(channel) {
		if (channel.step) {
			channel.nextStep = this.cpu.cycles + channel.step;
		}
		channel.raise = this.cpu.cycles;
		channel.lower = channel.raise + channel.duty * channel.interval;
		channel.end = this.cpu.cycles + channel.length;
		channel.playing = true;
		this.nextEvent = this.cpu.cycles;
		this.updateTimers();
		this.core.irq.pollNextEvent();
	}
	writeSquareChannelSweep(channelId, value) {
		var channel = this.squareChannels[channelId];
		channel.sweepSteps = value & 0x07;
		channel.sweepIncrement = (value & 0x08) ? -1 : 1;
		channel.sweepInterval = ((value >> 4) & 0x7) * this.cpuFrequency / 128;
		channel.doSweep = !!channel.sweepInterval;
		channel.nextSweep = this.cpu.cycles + channel.sweepInterval;
		if (channel.playing) {
			this.updateTimers();
			this.core.irq.pollNextEvent();
		}
	}
	writeSquareChannelDLE(channelId, value) {
		var channel = this.squareChannels[channelId];
		var duty = (value >> 6) & 0x3;
		switch (duty) {
			case 0:
				channel.duty = 0.125;
				break;
			case 1:
				channel.duty = 0.25;
				break;
			case 2:
				channel.duty = 0.5;
				break;
			case 3:
				channel.duty = 0.75;
				break;
		}
		this.writeChannelLE(channel, value);
		if (channel.playing) {
			this.updateTimers();
			this.core.irq.pollNextEvent();
		}
	}
	writeSquareChannelFC(channelId, value) {
		var channel = this.squareChannels[channelId];
		var frequency = value & 2047;
		channel.frequency = frequency;
		channel.interval = (this.cpuFrequency * (2048 - frequency)) / 131072;
		channel.timed = !!(value & 0x4000);

		if (value & 0x8000) {
			channel.volume = channel.initialVolume;
			this.resetSquareChannel(channel);
		} else if (channel.playing) {
			this.updateTimers();
			this.core.irq.pollNextEvent();
		}
	}
	updateSquareChannel(channel, cycles) {
		if (channel.timed && cycles >= channel.end) {
			channel.playing = false;
			return;
		}

		if (channel.doSweep && cycles >= channel.nextSweep) {
			channel.frequency +=
				channel.sweepIncrement *
				(channel.frequency >> channel.sweepSteps);
			if (channel.frequency < 0) {
				channel.frequency = 0;
			} else if (channel.frequency > 2047) {
				channel.frequency = 2047;
				channel.playing = false;
				return;
			}
			channel.interval =
				(this.cpuFrequency * (2048 - channel.frequency)) / 131072;
			channel.nextSweep += channel.sweepInterval;
		}

		if (cycles >= channel.raise) {
			channel.sample = channel.volume;
			channel.lower = channel.raise + channel.duty * channel.interval;
			channel.raise += channel.interval;
		} else if (cycles >= channel.lower) {
			channel.sample = -channel.volume;
			channel.lower += channel.interval;
		}

		this.updateEnvelope(channel, cycles);

		if (this.nextEvent > channel.raise) {
			this.nextEvent = channel.raise;
		}
		if (this.nextEvent > channel.lower) {
			this.nextEvent = channel.lower;
		}
		if (channel.timed && this.nextEvent > channel.end) {
			this.nextEvent = channel.end;
		}
		if (channel.doSweep && this.nextEvent > channel.nextSweep) {
			this.nextEvent = channel.nextSweep;
		}
	}
	writeChannel3Lo(value) {
		this.channel3Dimension = value & 0x20;
		this.channel3Bank = value & 0x40;
		var enable = value & 0x80;
		this.channel3Write = enable;
		if (!enable) {
			this.playingChannel3 = false;
		}
		this.core.irq.pollNextEvent();
	}
	writeChannel3Hi(value) {
		this.channel3Length =
			(this.cpuFrequency * (0x100 - (value & 0xff))) / 256;
		var volume = (value >> 13) & 0x7;
		switch (volume) {
			case 0:
				this.channel3Volume = 0;
				break;
			case 1:
				this.channel3Volume = 1;
				break;
			case 2:
				this.channel3Volume = 0.5;
				break;
			case 3:
				this.channel3Volume = 0.25;
				break;
			default:
				this.channel3Volume = 0.75;
		}
	}
	writeChannel3X(value) {
		this.channel3Interval =
			(this.cpuFrequency * (2048 - (value & 0x7ff))) / 2097152;
		this.channel3Timed = !!(value & 0x4000);
		if (value & 0x8000) {
			// A frequency-only write must not restart the current wave position.
			this.resetChannel3();
		}
	}
	resetChannel3() {
		this.channel3Next = this.cpu.cycles;
		// Triggering channel 3 restarts its 32/64-sample waveform at sample 0.
		this.channel3Pointer = 0;
		this.nextEvent = this.channel3Next;
		this.channel3End = this.cpu.cycles + this.channel3Length;
		this.playingChannel3 = this.channel3Write;
		this.updateTimers();
		this.core.irq.pollNextEvent();
	}
	writeWaveData(offset, data, width) {
		// With the master sound circuit off, SOUND3CNT_L is reset and Wave RAM
		// accesses always address bank 1. While sound is on, software writes the
		// bank opposite the one currently selected for playback.
		var writeBank = this.enabled ? !this.channel3Bank : 1;
		if (writeBank) {
			offset += 16;
		}
		if (width == 2) {
			this.waveData[offset] = data & 0xff;
			data >>= 8;
			++offset;
		}
		this.waveData[offset] = data & 0xff;
	}
	readWaveData(offset) {
		// CPU reads see the accessible bank, not the last value written to the
		// corresponding I/O register. Sound-off access is fixed to bank 1.
		var readBank = this.enabled ? !this.channel3Bank : 1;
		if (readBank) {
			offset += 16;
		}
		return this.waveData[offset] | (this.waveData[offset + 1] << 8);
	}
	writeChannel4LE(value) {
		this.writeChannelLE(this.channel4, value);
		if (this.playingChannel4) {
			this.updateTimers();
			this.core.irq.pollNextEvent();
		}
	}
	writeChannel4FC(value) {
		this.channel4.timed = !!(value & 0x4000);

		var r = value & 0x7;
		if (!r) {
			r = 0.5;
		}
		var s = (value >> 4) & 0xf;
		var interval = (this.cpuFrequency * (r * (2 << s))) / 524288;
		if (interval != this.channel4.interval) {
			this.channel4.interval = interval;
		}

		var width = value & 0x8 ? 7 : 15;
		if (width != this.channel4.width) {
			this.channel4.width = width;
		}

		if (value & 0x8000) {
			this.resetChannel4();
		} else if (this.playingChannel4) {
			this.updateTimers();
			this.core.irq.pollNextEvent();
		}
	}
	resetChannel4() {
		// The hardware starts its 7- or 15-stage polynomial counter at all ones.
		this.channel4.lfsr = (1 << this.channel4.width) - 1;
		this.channel4.volume = this.channel4.initialVolume;
		if (this.channel4.step) {
			this.channel4.nextStep = this.cpu.cycles + this.channel4.step;
		}
		this.channel4.end = this.cpu.cycles + this.channel4.length;
		this.channel4.next = this.cpu.cycles;
		this.nextEvent = this.channel4.next;

		this.playingChannel4 = true;
		this.updateTimers();
		this.core.irq.pollNextEvent();
	}
	writeChannelLE(channel, value) {
		channel.length = this.cpuFrequency * ((0x40 - (value & 0x3f)) / 256);

		if (value & 0x0800) {
			channel.increment = 1 / 16;
		} else {
			channel.increment = -1 / 16;
		}
		channel.initialVolume = ((value >> 12) & 0xf) / 16;

		channel.step = this.cpuFrequency * (((value >> 8) & 0x7) / 64);
	}
	updateEnvelope(channel, cycles) {
		if (channel.step) {
			if (cycles >= channel.nextStep) {
				channel.volume += channel.increment;
				if (channel.volume > 1) {
					channel.volume = 1;
				} else if (channel.volume < 0) {
					channel.volume = 0;
				}
				channel.nextStep += channel.step;
			}

			if (this.nextEvent > channel.nextStep) {
				this.nextEvent = channel.nextStep;
			}
		}
	}
	appendToFifoA(value, byteOffset, byteWidth) {
		this.appendToFifo("A", value, byteOffset, byteWidth);
	}
	appendToFifoB(value, byteOffset, byteWidth) {
		this.appendToFifo("B", value, byteOffset, byteWidth);
	}
	appendToFifo(channel, value, byteOffset, byteWidth) {
		var suffix = channel == "A" ? "A" : "B";
		var fifo = this["fifo" + suffix];
		if (!fifo) {
			fifo = this["fifo" + suffix] = [];
		}
		var writeBufferKey = "fifo" + suffix + "WriteBuffer";
		var writeIndexKey = "fifo" + suffix + "WriteIndex";
		var writeBuffer = this[writeBufferKey];
		if (!writeBuffer) {
			writeBuffer = this[writeBufferKey] = new Array(8).fill(0);
		}
		var writeIndex = this[writeIndexKey] || 0;
		var word = writeBuffer[writeIndex] >>> 0;
		if (byteOffset === undefined) {
			byteOffset = 0;
		}
		if (byteWidth === undefined) {
			byteWidth = 4;
		}
		for (var i = 0; i < byteWidth; ++i) {
			var shift = ((byteOffset + i) & 3) << 3;
			var byte = (value >>> (i << 3)) & 0xff;
			word = (word & ~(0xff << shift)) | (byte << shift);
		}
		word >>>= 0;
		writeBuffer[writeIndex] = word;
		this[writeIndexKey] = (writeIndex + 1) % 8;

		if (fifo.length >= 28) {
			// The eight-slot ring keeps one slot empty to distinguish full from
			// empty, so a CPU/DMA write at seven queued words overruns the FIFO.
			// Hardware drops the queue on overrun; retaining the newest samples
			// would incorrectly hide the fault and shift the audio stream.
			this["fifo" + suffix] = [];
			return;
		}
		for (var sampleIndex = 0; sampleIndex < 4; ++sampleIndex) {
			var sampleByte = (word >>> (sampleIndex << 3)) & 0xff;
			var signedSample = sampleByte << 24;
			fifo.push(signedSample / 0x80000000);
		}
	}
	fifoDma(number, fifoRegister) {
		if (number < 0) {
			return null;
		}
		var dma = this.core.irq.dma[number];
		if (
			!dma ||
			!dma.enable ||
			dma.timing != this.cpu.mmu.DMA_TIMING_CUSTOM ||
			dma.dest != (this.cpu.mmu.BASE_IO | fifoRegister)
		) {
			return null;
		}
		return dma;
	}
	sampleFifoA() {
		// An empty FIFO holds its last DAC sample instead of outputting an
		// undefined value, which would poison the mixed WebAudio buffer with NaN.
		var fifo = this.fifoA || (this.fifoA = []);
		var internal = this.fifoAInternal || (this.fifoAInternal = []);
		// The seven-word ring is separate from the active 32-bit playback word.
		// Its DMA request is checked at timer overflow before the next word moves
		// into that internal buffer. Four of the seven usable FIFO slots must be
		// empty, so three queued words (12 samples) is the low-water mark.
		if (fifo.length <= 12 && this.dmaA >= 0) {
			var dma = this.fifoDma(this.dmaA, this.cpu.irq.io.FIFO_A_LO);
			if (dma) {
				dma.nextCount = 4;
				this.core.mmu.serviceDma(this.dmaA, dma);
			} else {
				this.dmaA = -1;
			}
		}
		if (!internal.length && fifo.length) {
			this.fifoAInternal = fifo.splice(0, 4);
			internal = this.fifoAInternal;
		}
		var sample = internal.shift();
		if (sample !== undefined) {
			this.fifoASample = sample;
		}
	}
	sampleFifoB() {
		var fifo = this.fifoB || (this.fifoB = []);
		var internal = this.fifoBInternal || (this.fifoBInternal = []);
		if (fifo.length <= 12 && this.dmaB >= 0) {
			var dma = this.fifoDma(this.dmaB, this.cpu.irq.io.FIFO_B_LO);
			if (dma) {
				dma.nextCount = 4;
				this.core.mmu.serviceDma(this.dmaB, dma);
			} else {
				this.dmaB = -1;
			}
		}
		if (!internal.length && fifo.length) {
			this.fifoBInternal = fifo.splice(0, 4);
			internal = this.fifoBInternal;
		}
		var sample = internal.shift();
		if (sample !== undefined) {
			this.fifoBSample = sample;
		}
	}
	scheduleFIFODma(number, info) {
		// A DMA channel can feed only the FIFO selected by its current
		// destination. Drop any previous association before reusing the channel.
		if (this.dmaA == number) {
			this.dmaA = -1;
		}
		if (this.dmaB == number) {
			this.dmaB = -1;
		}
		switch (info.dest) {
			case this.cpu.mmu.BASE_IO | this.cpu.irq.io.FIFO_A_LO:
				info.dstControl = 2;
				// FIFO requests always transfer four 32-bit words, regardless of
				// the transfer width programmed in DMA CNT_HI.
				info.width = 4;
				this.dmaA = number;
				break;
			case this.cpu.mmu.BASE_IO | this.cpu.irq.io.FIFO_B_LO:
				info.dstControl = 2;
				info.width = 4;
				this.dmaB = number;
				break;
			default:
				this.core.WARN(
					"Tried to schedule FIFO DMA for non-FIFO destination"
				);
				break;
		}
	}
	sample() {
		var sampleLeft = 0;
		var sampleRight = 0;
		var sample;
		var channel;

		channel = this.squareChannels[0];
		if (channel.playing) {
			sample = channel.sample * this.soundRatio * this.PSG_MAX;
			if (this.enabledLeft & 0x1) {
				sampleLeft += sample;
			}
			if (this.enabledRight & 0x1) {
				sampleRight += sample;
			}
		}

		channel = this.squareChannels[1];
		if (channel.playing) {
			sample = channel.sample * this.soundRatio * this.PSG_MAX;
			if (this.enabledLeft & 0x2) {
				sampleLeft += sample;
			}
			if (this.enabledRight & 0x2) {
				sampleRight += sample;
			}
		}

		if (this.playingChannel3) {
			sample =
				this.channel3Sample *
				this.soundRatio *
				this.channel3Volume *
				this.PSG_MAX;
			if (this.enabledLeft & 0x4) {
				sampleLeft += sample;
			}
			if (this.enabledRight & 0x4) {
				sampleRight += sample;
			}
		}

		if (this.playingChannel4) {
			sample = this.channel4.sample * this.soundRatio * this.PSG_MAX;
			if (this.enabledLeft & 0x8) {
				sampleLeft += sample;
			}
			if (this.enabledRight & 0x8) {
				sampleRight += sample;
			}
		}
		// SOUNDCNT_L applies independently to the PSG mix; Direct Sound is
		// controlled by SOUNDCNT_H and must bypass these volume multipliers.
		sampleLeft *= this.masterVolumeLeft + 1;
		sampleRight *= this.masterVolumeRight + 1;

		if (this.enableChannelA) {
			sample = this.fifoASample * this.FIFO_MAX * this.ratioChannelA;
			if (this.enableLeftChannelA) {
				sampleLeft += sample;
			}
			if (this.enableRightChannelA) {
				sampleRight += sample;
			}
		}

		if (this.enableChannelB) {
			sample = this.fifoBSample * this.FIFO_MAX * this.ratioChannelB;
			if (this.enableLeftChannelB) {
				sampleLeft += sample;
			}
			if (this.enableRightChannelB) {
				sampleRight += sample;
			}
		}

		var samplePointer = this.samplePointer;
		sampleLeft *= this.masterVolume / this.SOUND_MAX;
		sampleLeft = Math.max(Math.min(sampleLeft, 1), -1);
		sampleRight *= this.masterVolume / this.SOUND_MAX;
		sampleRight = Math.max(Math.min(sampleRight, 1), -1);
		if (this.buffers) {
			this.buffers[0][samplePointer] = sampleLeft;
			this.buffers[1][samplePointer] = sampleRight;
		}
		this.samplePointer = (samplePointer + 1) & this.sampleMask;
	}
	audioProcess(audioProcessingEvent) {
		var left = audioProcessingEvent.outputBuffer.getChannelData(0);
		var right = audioProcessingEvent.outputBuffer.getChannelData(1);
		if (this.masterEnable) {
			var i;
			var o = this.outputPointer;
			for (i = 0; i < this.bufferSize; ++i, o += this.resampleRatio) {
				if (o >= this.maxSamples) {
					o -= this.maxSamples;
				}
				var sampleIndex = o | 0;
				if (sampleIndex == this.samplePointer) {
					++this.backup;
					break;
				}
				var nextSampleIndex = (sampleIndex + 1) & this.sampleMask;
				var fraction = o - sampleIndex;
				var leftSample = this.buffers[0][sampleIndex];
				var rightSample = this.buffers[1][sampleIndex];
				var nextLeftSample =
					nextSampleIndex == this.samplePointer
						? leftSample
						: this.buffers[0][nextSampleIndex];
				var nextRightSample =
					nextSampleIndex == this.samplePointer
						? rightSample
						: this.buffers[1][nextSampleIndex];
				left[i] = leftSample + (nextLeftSample - leftSample) * fraction;
				right[i] =
					rightSample + (nextRightSample - rightSample) * fraction;
			}
			for (; i < this.bufferSize; ++i) {
				left[i] = 0;
				right[i] = 0;
			}
			if (o >= this.maxSamples) {
				o -= this.maxSamples;
			}
			this.outputPointer = o;
			++this.totalSamples;
		} else {
			for (i = 0; i < this.bufferSize; ++i) {
				left[i] = 0;
				right[i] = 0;
			}
		}
	}
}
