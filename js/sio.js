class GameBoyAdvanceSIO {
	constructor() {
		this.SIO_NORMAL_8 = 0;
		this.SIO_NORMAL_32 = 1;
		this.SIO_MULTI = 2;
		this.SIO_UART = 3;
		this.SIO_GPIO = 8;
		this.SIO_JOYBUS = 12;

		this.BAUD = [9600, 38400, 57600, 115200];
		// Cycles for a multiplayer transfer with only this GBA connected.
		// Values follow the GBA serial transfer timing used by mGBA.
		this.MULTI_TRANSFER_CYCLES = [31976, 8378, 5750, 3140];
		this.NORMAL_TRANSFER_CYCLES_PER_BIT = [64, 8];
	}
	clear() {
		this.mode = this.SIO_GPIO;
		this.sd = false;

		this.irq = false;
		this.nextEvent = 0;
		this.normal = {
			busy: false,
			irq: false
		};
		this.multiplayer = {
			baud: 0,
			si: 0,
			id: 0,
			error: 0,
			busy: 0,
			send: 0,

			states: [0xffff, 0xffff, 0xffff, 0xffff]
		};

		this.linkLayer = null;
	}
	setMode(mode) {
		var previousMode = this.mode;
		if (mode & 0x8) {
			mode &= 0xc;
		} else {
			mode &= 0x3;
		}
		var canceledTransfer =
			(this.mode == this.SIO_MULTI &&
				mode != this.SIO_MULTI &&
				this.multiplayer.busy) ||
			((this.mode == this.SIO_NORMAL_8 ||
				this.mode == this.SIO_NORMAL_32) &&
				mode != this.mode &&
				this.normal.busy);
		if (canceledTransfer) {
			this.nextEvent = 0;
			if (this.mode == this.SIO_MULTI) {
				this.multiplayer.busy = 0;
			} else {
				this.normal.busy = false;
			}
		}
		this.mode = mode;
		if (previousMode == this.SIO_MULTI || mode == this.SIO_MULTI) {
			this.setClockPin(!this.multiplayer.busy);
		}
		if (this.mode == this.SIO_MULTI && !this.linkLayer) {
			// The SD line is ready, but the unconnected SI input is pulled high.
			this.sd = true;
			this.multiplayer.si = 0x0004;
		} else if (this.mode != this.SIO_MULTI) {
			this.sd = false;
		}

		this.core.INFO("Setting SIO mode to " + hex(mode, 1));
		if (canceledTransfer && this.core.irq) {
			this.core.irq.pollNextEvent();
		}
	}
	setClockPin(high) {
		var io = this.core && this.core.io;
		if (!io || !io.registers || typeof io.RCNT != "number") {
			return;
		}
		var index = io.RCNT >> 1;
		io.registers[index] = (io.registers[index] & ~0x0001) | (high ? 1 : 0);
	}
	writeRCNT(value) {
		if (this.mode != this.SIO_GPIO) {
			// In serial modes the low pin-state bits are read-only. Preserve the
			// current SC/SD/SI/SO state, allow the documented writable bits 4-8,
			// and clear reserved bits 9-13.
			var current = this.core.io.registers[this.core.io.RCNT >> 1];
			return (value & 0xc1f0) | (current & 0x000f);
		}

		this.core.STUB("General purpose serial not supported");
		return value;
	}
	writeSIOCNT(value) {
		switch (this.mode) {
			case this.SIO_NORMAL_8:
			case this.SIO_NORMAL_32:
				var normal = this.normal;
				normal.irq = !!(value & 0x4000);
				if (!normal.busy && (value & 0x0080)) {
					normal.busy = true;
					if (value & 0x0001) {
						var bitCount =
							this.mode == this.SIO_NORMAL_32 ? 32 : 8;
						var clock =
							this.NORMAL_TRANSFER_CYCLES_PER_BIT[
								(value >> 1) & 1
							];
						this.nextEvent =
							this.core.cpu.cycles + bitCount * clock;
						this.core.irq.pollNextEvent();
					} else {
						// A slave waits for external clock edges; a standalone unit has no
						// cable clock to finish this transfer.
						this.nextEvent = 0;
					}
				}
				break;
			case this.SIO_MULTI:
				var multiplayer = this.multiplayer;
				var wasBusy = multiplayer.busy;
				multiplayer.baud = value & 0x0003;
				this.irq = !!(value & 0x4000);
				if (this.linkLayer) {
					this.linkLayer.setBaud(this.BAUD[multiplayer.baud]);
				}

				// START is edge-triggered and remains set until the transfer ends.
				if (!wasBusy && (value & 0x0080)) {
					multiplayer.busy = 0x0080;
					multiplayer.error = 0;
					multiplayer.send =
						this.core.io.registers[this.core.io.SIOMLT_SEND >> 1];
					multiplayer.states = [0xffff, 0xffff, 0xffff, 0xffff];
					if (this.linkLayer) {
						this.linkLayer.startMultiplayerTransfer();
					} else {
						this.nextEvent =
							this.core.cpu.cycles +
							this.MULTI_TRANSFER_CYCLES[multiplayer.baud];
						this.core.irq.pollNextEvent();
					}
				}
				this.setClockPin(!multiplayer.busy);
				break;
			case this.SIO_UART:
				this.core.STUB("UART unsupported");
				break;
			case this.SIO_GPIO:
				// This register isn't used in general-purpose mode
				break;
			case this.SIO_JOYBUS:
				this.core.STUB("JOY BUS unsupported");
				break;
		}
	}
	readSIOCNT() {
		var value = (this.mode << 12) & 0xffff;
		switch (this.mode) {
			case this.SIO_NORMAL_8:
			case this.SIO_NORMAL_32:
				var io = this.core.io;
				var control = io.registers[io.SIOCNT >> 1];
				value |= control & 0x400b;
				// An unconnected input data terminal is pulled high.
				value |= 0x0004;
				if (this.normal.busy) {
					value |= 0x0080;
				}
				break;
			case this.SIO_MULTI:
				value |= this.multiplayer.baud;
				value |= this.multiplayer.si;
				value |= !!this.sd << 3;
				value |= this.multiplayer.id << 4;
				value |= this.multiplayer.error;
				value |= this.multiplayer.busy;
				value |= !!this.irq << 14;
				break;
			case this.SIO_UART:
				this.core.STUB("UART unsupported");
				break;
			case this.SIO_GPIO:
				// This register isn't used in general-purpose mode
				break;
			case this.SIO_JOYBUS:
				this.core.STUB("JOY BUS unsupported");
				break;
		}
		return value;
	}
	readRCNT() {
		var io = this.core.io;
		var value = io.registers[io.RCNT >> 1];
		if (this.mode == this.SIO_MULTI) {
			// The multiplayer clock pin is high while idle and low during a
			// transfer. Several games poll RCNT directly while waiting on SIO.
			value = (value & ~0x0001) | (this.multiplayer.busy ? 0 : 1);
		}
		return value;
	}
	updateTimers() {
		if (!this.nextEvent || this.nextEvent > this.core.cpu.cycles) {
			return;
		}

		this.nextEvent = 0;
		if (
			this.mode == this.SIO_NORMAL_8 ||
			this.mode == this.SIO_NORMAL_32
		) {
			if (!this.normal.busy) {
				return;
			}
			this.normal.busy = false;
			var io = this.core.io;
			if (this.mode == this.SIO_NORMAL_8) {
				io.registers[io.SIODATA8 >> 1] = 0x00ff;
			} else {
				io.registers[io.SIODATA32_LO >> 1] = 0xffff;
				io.registers[io.SIODATA32_HI >> 1] = 0xffff;
			}
			if (this.normal.irq) {
				this.core.irq.raiseIRQ(this.core.irq.IRQ_SIO);
			}
			return;
		}
		if (this.mode != this.SIO_MULTI || !this.multiplayer.busy) {
			return;
		}

		this.multiplayer.states = [
			this.multiplayer.send,
			0xffff,
			0xffff,
			0xffff
		];
		this.multiplayer.busy = 0;
		// With no cable attached, the master's SI input stays high throughout
		// synchronization. The GBA reports that missing response as a
		// communication error after the standalone transfer completes.
		if (!this.linkLayer) {
			this.multiplayer.error = 0x0040;
		}
		this.setClockPin(true);

		if (this.irq) {
			this.core.irq.raiseIRQ(this.core.irq.IRQ_SIO);
		}
	}
	freeze() {
		return {
			mode: this.mode,
			sd: this.sd,
			irq: this.irq,
			nextEvent: this.nextEvent,
			normal: {
				busy: this.normal.busy,
				irq: this.normal.irq
			},
			multiplayer: {
				baud: this.multiplayer.baud,
				si: this.multiplayer.si,
				id: this.multiplayer.id,
				error: this.multiplayer.error,
				busy: this.multiplayer.busy,
				send: this.multiplayer.send,
				states: this.multiplayer.states.slice()
			}
		};
	}
	defrost(frost) {
		if (!frost) {
			this.clear();
			return;
		}

		this.mode = frost.mode;
		this.sd = frost.sd;
		this.irq = frost.irq;
		this.nextEvent = frost.nextEvent || 0;
		this.normal = frost.normal || { busy: false, irq: false };
		this.multiplayer = frost.multiplayer || this.multiplayer;
		this.linkLayer = null;
		if (this.mode == this.SIO_MULTI) {
			this.setClockPin(!this.multiplayer.busy);
		}
	}
	read(slot) {
		switch (this.mode) {
			case this.SIO_NORMAL_32:
				if (slot < 2) {
					return this.core.io.registers[
						(this.core.io.SIODATA32_LO >> 1) + slot
					];
				}
				break;
			case this.SIO_MULTI:
				return this.multiplayer.states[slot];
			case this.SIO_UART:
				this.core.STUB("UART unsupported");
				break;
			default:
				this.core.WARN(
					"Reading from transfer register in unsupported mode"
				);
				break;
		}
		return 0;
	}
	readData8() {
		var value = this.core.io.registers[this.core.io.SIODATA8 >> 1];
		return this.mode == this.SIO_NORMAL_8 ? value & 0x00ff : value;
	}
}
