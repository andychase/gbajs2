class GameBoyAdvanceGPIO {
	constructor(core, rom) {
		this.core = core;
		this.rom = rom;

		this.readWrite = 0;
		this.direction = 0;

		this.device = new GameBoyAdvanceRTC(this); // TODO: Support more devices
	}
	store16(offset, value) {
		switch (offset) {
			case 0xc4:
				this.device.setPins(value & 0xf);
				break;
			case 0xc6:
				this.direction = value & 0xf;
				this.device.setDirection(this.direction);
				break;
			case 0xc8:
				this.readWrite = value & 1;
				break;
			default:
				throw new Error(
					"BUG: Bad offset passed to GPIO: " + offset.toString(16)
				);
		}
		if (this.readWrite) {
			switch (offset) {
				case 0xc4: {
					// The data register mixes output latches and input pin states.
					var old = this.rom.view.getUint16(offset, true);
					old &= ~this.direction;
					this.rom.view.setUint16(
						offset,
						old | (value & this.direction),
						true
					);
					break;
				}
				case 0xc6:
					this.rom.view.setUint16(offset, this.direction, true);
					break;
				case 0xc8:
					this.rom.view.setUint16(offset, this.readWrite, true);
					break;
			}
		}
	}
	store32(offset, value) {
		// The GPIO window is made of adjacent 16-bit registers. A 32-bit ROM
		// write can cover two registers, but the word at 0xC8 must not spill into
		// ordinary ROM bytes at 0xCA.
		this.store16(offset, value & 0xffff);
		if (offset + 2 < 0xca) {
			this.store16(offset + 2, value >>> 16);
		}
	}
	outputPins(nybble) {
		if (this.readWrite) {
			var old = this.rom.view.getUint16(0xc4, true);
			old &= this.direction;
			this.rom.view.setUint16(
				0xc4,
				old | (nybble & ~this.direction & 0xf),
				true
			);
		}
	}
}
class GameBoyAdvanceRTC {
	constructor(gpio) {
		this.gpio = gpio;

		// PINOUT: SCK | SIO | CS | -
		this.pins = 0;
		this.direction = 0;

		this.totalBytes = [
		0, // Force reset
		0, // Empty
		7, // Date/Time
		0, // Force IRQ
		1, // Control register
		0, // Empty
		3, // Time
			0 // Empty
		];
		this.bytesRemaining = 0;

		// Transfer sequence:
		// == Initiate
		// > HI | - | LO | -
		// > HI | - | HI | -
		// == Transfer bit (x8)
		// > LO | x | HI | -
		// > HI | - | HI | -
		// < ?? | x | ?? | -
		// == Terminate
		// >  - | - | LO | -
		this.transferStep = 0;

		this.reading = 0;
		this.bitsRead = 0;
		this.bits = 0;
		this.command = -1;

		this.control = 0x40;
		this.time = [
		0, // Year
		0, // Month
		0, // Day
		0, // Day of week
		0, // Hour
		0, // Minute
			0 // Second
		];
	}
	setPins(nybble) {
		switch (this.transferStep) {
			case 0:
				if ((nybble & 5) == 1) {
					this.transferStep = 1;
				}
				break;
			case 1:
				if (nybble & 4) {
					this.transferStep = 2;
				}
				break;
			case 2:
				// Dropping chip select aborts a transfer regardless of the clock
				// level. Check it before interpreting a low SCK as a data phase.
				if (!(nybble & 4)) {
					this.bitsRead = 0;
					this.bytesRemaining = 0;
					this.command = -1;
					this.transferStep = 0;
					this.gpio.outputPins(2);
				} else if (!(nybble & 1)) {
					this.bits &= ~(1 << this.bitsRead);
					this.bits |= ((nybble & 2) >> 1) << this.bitsRead;
				} else {
					// The CPU drives SIO only while sending command data.
					if (this.direction & 2 && !this.reading) {
						++this.bitsRead;
						if (this.bitsRead == 8) {
							this.processByte();
						}
					} else {
						this.gpio.outputPins(
							5 | (this.sioOutputPin() << 1)
						);
						++this.bitsRead;
						if (this.bitsRead == 8) {
							--this.bytesRemaining;
							if (this.bytesRemaining <= 0) {
								this.command = -1;
							}
							this.bitsRead = 0;
						}
					}
				}
				break;
		}

		this.pins = nybble & 7;
	}
	setDirection(direction) {
		this.direction = direction;
	}
	processByte() {
		--this.bytesRemaining;
		switch (this.command) {
			case -1:
				if ((this.bits & 0x0f) == 0x06) {
					this.command = (this.bits >> 4) & 7;
					this.reading = this.bits & 0x80;

					this.bytesRemaining = this.totalBytes[this.command];
					switch (this.command) {
						case 0:
							this.control = 0;
							break;
						case 2:
						case 6:
							this.updateClock();
							break;
					}
				} else {
					this.gpio.core.WARN(
						"Invalid RTC command byte: " + this.bits.toString(16)
					);
				}
				break;
			case 4:
				// Control
				// Keep the writable control/status bits visible on later reads.
				this.control = this.bits & 0x6a;
				break;
		}
		this.bits = 0;
		this.bitsRead = 0;
		if (!this.bytesRemaining) {
			this.command = -1;
		}
	}
	sioOutputPin() {
		var outputByte = 0;
		switch (this.command) {
			case 4:
				outputByte = this.control;
				break;
			case 2:
			case 6:
				outputByte = this.time[7 - this.bytesRemaining];
				break;
		}
		var output = (outputByte >> this.bitsRead) & 1;
		return output;
	}
	updateClock(date) {
		date = date || new Date();
		// The GBA cartridge RTC stores years 2000-2099 as two BCD digits.
		this.time[0] = this.bcd(date.getFullYear() % 100);
		this.time[1] = this.bcd(date.getMonth() + 1);
		this.time[2] = this.bcd(date.getDate());
		// RTC weekday numbering starts at Sunday (0), matching Date#getDay().
		this.time[3] = date.getDay();
		if (this.control & 0x40) {
			// 24 hour
			this.time[4] = this.bcd(date.getHours());
		} else {
			// GBA RTC 12-hour mode encodes 12 o'clock as 00 and stores PM in bit 7.
			this.time[4] = this.bcd(date.getHours() % 12);
			if (date.getHours() >= 12) {
				this.time[4] |= 0x80;
			}
		}
		this.time[5] = this.bcd(date.getMinutes());
		this.time[6] = this.bcd(date.getSeconds());
	}
	bcd(binary) {
		var counter = binary % 10;
		binary /= 10;
		counter += binary % 10 << 4;
		return counter;
	}
}
