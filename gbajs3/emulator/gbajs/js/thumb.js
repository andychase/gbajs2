class ARMCoreThumb {
	constructor(cpu) {
		this.cpu = cpu;
	}
	constructADC(rd, rm) {
		var cpu = this.cpu;
		var gprs = cpu.gprs;
		return function () {
			cpu.mmu.waitPrefetch(gprs[cpu.PC]);
			var m = (gprs[rm] >>> 0) + !!cpu.cpsrC;
			var oldD = gprs[rd];
			var d = (oldD >>> 0) + m;
			var oldDn = oldD >> 31;
			var dn = d >> 31;
			var mn = m >> 31;
			cpu.cpsrN = dn;
			cpu.cpsrZ = !(d & 0xffffffff);
			cpu.cpsrC = d > 0xffffffff;
			cpu.cpsrV = oldDn == mn && oldDn != dn && mn != dn;
			gprs[rd] = d;
		};
	}
	constructADD1(rd, rn, immediate) {
		var cpu = this.cpu;
		var gprs = cpu.gprs;
		return function () {
			cpu.mmu.waitPrefetch(gprs[cpu.PC]);
			var d = (gprs[rn] >>> 0) + immediate;
			cpu.cpsrN = d >> 31;
			cpu.cpsrZ = !(d & 0xffffffff);
			cpu.cpsrC = d > 0xffffffff;
			cpu.cpsrV =
				!(gprs[rn] >> 31) && ((gprs[rn] >> 31) ^ d) >> 31 && d >> 31;
			gprs[rd] = d;
		};
	}
	constructADD2(rn, immediate) {
		var cpu = this.cpu;
		var gprs = cpu.gprs;
		return function () {
			cpu.mmu.waitPrefetch(gprs[cpu.PC]);
			var d = (gprs[rn] >>> 0) + immediate;
			cpu.cpsrN = d >> 31;
			cpu.cpsrZ = !(d & 0xffffffff);
			cpu.cpsrC = d > 0xffffffff;
			cpu.cpsrV =
				!(gprs[rn] >> 31) &&
				(gprs[rn] ^ d) >> 31 &&
				(immediate ^ d) >> 31;
			gprs[rn] = d;
		};
	}
	constructADD3(rd, rn, rm) {
		var cpu = this.cpu;
		var gprs = cpu.gprs;
		return function () {
			cpu.mmu.waitPrefetch(gprs[cpu.PC]);
			var d = (gprs[rn] >>> 0) + (gprs[rm] >>> 0);
			cpu.cpsrN = d >> 31;
			cpu.cpsrZ = !(d & 0xffffffff);
			cpu.cpsrC = d > 0xffffffff;
			cpu.cpsrV =
				!((gprs[rn] ^ gprs[rm]) >> 31) &&
				(gprs[rn] ^ d) >> 31 &&
				(gprs[rm] ^ d) >> 31;
			gprs[rd] = d;
		};
	}
	constructADD4(rd, rm) {
		var cpu = this.cpu;
		var gprs = cpu.gprs;
		return function () {
			cpu.mmu.waitPrefetch(gprs[cpu.PC]);
			gprs[rd] += gprs[rm];
		};
	}
	constructADD5(rd, immediate) {
		var cpu = this.cpu;
		var gprs = cpu.gprs;
		return function () {
			cpu.mmu.waitPrefetch(gprs[cpu.PC]);
			gprs[rd] = (gprs[cpu.PC] & 0xfffffffc) + immediate;
		};
	}
	constructADD6(rd, immediate) {
		var cpu = this.cpu;
		var gprs = cpu.gprs;
		return function () {
			cpu.mmu.waitPrefetch(gprs[cpu.PC]);
			gprs[rd] = gprs[cpu.SP] + immediate;
		};
	}
	constructADD7(immediate) {
		var cpu = this.cpu;
		var gprs = cpu.gprs;
		return function () {
			cpu.mmu.waitPrefetch(gprs[cpu.PC]);
			gprs[cpu.SP] += immediate;
		};
	}
	constructAND(rd, rm) {
		var cpu = this.cpu;
		var gprs = cpu.gprs;
		return function () {
			cpu.mmu.waitPrefetch(gprs[cpu.PC]);
			gprs[rd] = gprs[rd] & gprs[rm];
			cpu.cpsrN = gprs[rd] >> 31;
			cpu.cpsrZ = !(gprs[rd] & 0xffffffff);
		};
	}
	constructASR1(rd, rm, immediate) {
		var cpu = this.cpu;
		var gprs = cpu.gprs;
		return function () {
			cpu.mmu.waitPrefetch(gprs[cpu.PC]);
			if (immediate == 0) {
				cpu.cpsrC = gprs[rm] >> 31;
				if (cpu.cpsrC) {
					gprs[rd] = 0xffffffff;
				} else {
					gprs[rd] = 0;
				}
			} else {
				cpu.cpsrC = gprs[rm] & (1 << (immediate - 1));
				gprs[rd] = gprs[rm] >> immediate;
			}
			cpu.cpsrN = gprs[rd] >> 31;
			cpu.cpsrZ = !(gprs[rd] & 0xffffffff);
		};
	}
	constructASR2(rd, rm) {
		var cpu = this.cpu;
		var gprs = cpu.gprs;
		return function () {
			cpu.mmu.waitPrefetch(gprs[cpu.PC]);
			var rs = gprs[rm] & 0xff;
			if (rs) {
				if (rs < 32) {
					cpu.cpsrC = gprs[rd] & (1 << (rs - 1));
					gprs[rd] >>= rs;
				} else {
					cpu.cpsrC = gprs[rd] >> 31;
					if (cpu.cpsrC) {
						gprs[rd] = 0xffffffff;
					} else {
						gprs[rd] = 0;
					}
				}
			}
			cpu.cpsrN = gprs[rd] >> 31;
			cpu.cpsrZ = !(gprs[rd] & 0xffffffff);
		};
	}
	constructB1(immediate, condOp) {
		var cpu = this.cpu;
		var gprs = cpu.gprs;
		return function () {
			cpu.mmu.waitPrefetch(gprs[cpu.PC]);
			if (condOp()) {
				gprs[cpu.PC] += immediate;
			}
		};
	}
	constructB2(immediate) {
		var cpu = this.cpu;
		var gprs = cpu.gprs;
		return function () {
			cpu.mmu.waitPrefetch(gprs[cpu.PC]);
			gprs[cpu.PC] += immediate;
		};
	}
	constructBIC(rd, rm) {
		var cpu = this.cpu;
		var gprs = cpu.gprs;
		return function () {
			cpu.mmu.waitPrefetch(gprs[cpu.PC]);
			gprs[rd] = gprs[rd] & ~gprs[rm];
			cpu.cpsrN = gprs[rd] >> 31;
			cpu.cpsrZ = !(gprs[rd] & 0xffffffff);
		};
	}
	constructBL1(immediate) {
		var cpu = this.cpu;
		var gprs = cpu.gprs;
		return function () {
			cpu.mmu.waitPrefetch(gprs[cpu.PC]);
			gprs[cpu.LR] = gprs[cpu.PC] + immediate;
		};
	}
	constructBL2(immediate) {
		var cpu = this.cpu;
		var gprs = cpu.gprs;
		return function () {
			cpu.mmu.waitPrefetch(gprs[cpu.PC]);
			var pc = gprs[cpu.PC];
			gprs[cpu.PC] = gprs[cpu.LR] + (immediate << 1);
			gprs[cpu.LR] = pc - 1;
		};
	}
	constructBX(rd, rm) {
		var cpu = this.cpu;
		var gprs = cpu.gprs;
		return function () {
			cpu.mmu.waitPrefetch(gprs[cpu.PC]);
			cpu.switchExecMode(gprs[rm] & 0x00000001);
			var misalign = 0;
			if (rm == 15) {
				misalign = gprs[rm] & 0x00000002;
			}
			gprs[cpu.PC] = gprs[rm] & (0xfffffffe - misalign);
		};
	}
	constructCMN(rd, rm) {
		var cpu = this.cpu;
		var gprs = cpu.gprs;
		return function () {
			cpu.mmu.waitPrefetch(gprs[cpu.PC]);
			var aluOut = (gprs[rd] >>> 0) + (gprs[rm] >>> 0);
			cpu.cpsrN = aluOut >> 31;
			cpu.cpsrZ = !(aluOut & 0xffffffff);
			cpu.cpsrC = aluOut > 0xffffffff;
			cpu.cpsrV =
				gprs[rd] >> 31 == gprs[rm] >> 31 &&
				gprs[rd] >> 31 != aluOut >> 31 &&
				gprs[rm] >> 31 != aluOut >> 31;
		};
	}
	constructCMP1(rn, immediate) {
		var cpu = this.cpu;
		var gprs = cpu.gprs;
		return function () {
			cpu.mmu.waitPrefetch(gprs[cpu.PC]);
			var aluOut = gprs[rn] - immediate;
			cpu.cpsrN = aluOut >> 31;
			cpu.cpsrZ = !(aluOut & 0xffffffff);
			cpu.cpsrC = gprs[rn] >>> 0 >= immediate;
			cpu.cpsrV = gprs[rn] >> 31 && (gprs[rn] ^ aluOut) >> 31;
		};
	}
	constructCMP2(rd, rm) {
		var cpu = this.cpu;
		var gprs = cpu.gprs;
		return function () {
			cpu.mmu.waitPrefetch(gprs[cpu.PC]);
			var d = gprs[rd];
			var m = gprs[rm];
			var aluOut = d - m;
			var an = aluOut >> 31;
			var dn = d >> 31;
			cpu.cpsrN = an;
			cpu.cpsrZ = !(aluOut & 0xffffffff);
			cpu.cpsrC = d >>> 0 >= m >>> 0;
			cpu.cpsrV = dn != m >> 31 && dn != an;
		};
	}
	constructCMP3(rd, rm) {
		var cpu = this.cpu;
		var gprs = cpu.gprs;
		return function () {
			cpu.mmu.waitPrefetch(gprs[cpu.PC]);
			var aluOut = gprs[rd] - gprs[rm];
			cpu.cpsrN = aluOut >> 31;
			cpu.cpsrZ = !(aluOut & 0xffffffff);
			cpu.cpsrC = gprs[rd] >>> 0 >= gprs[rm] >>> 0;
			cpu.cpsrV =
				(gprs[rd] ^ gprs[rm]) >> 31 && (gprs[rd] ^ aluOut) >> 31;
		};
	}
	constructEOR(rd, rm) {
		var cpu = this.cpu;
		var gprs = cpu.gprs;
		return function () {
			cpu.mmu.waitPrefetch(gprs[cpu.PC]);
			gprs[rd] = gprs[rd] ^ gprs[rm];
			cpu.cpsrN = gprs[rd] >> 31;
			cpu.cpsrZ = !(gprs[rd] & 0xffffffff);
		};
	}
	constructLDMIA(rn, rs) {
		var cpu = this.cpu;
		var gprs = cpu.gprs;
		return function () {
			cpu.mmu.waitPrefetch(gprs[cpu.PC]);
			var address = gprs[rn];
			var total = 0;
			var m, i;
			for (m = 0x01, i = 0; i < 8; m <<= 1, ++i) {
				if (rs & m) {
					gprs[i] = cpu.mmu.load32(address);
					address += 4;
					++total;
				}
			}
			cpu.mmu.waitMulti32(address, total);
			if (!((1 << rn) & rs)) {
				gprs[rn] = address;
			}
		};
	}
	constructLDR1(rd, rn, immediate) {
		var cpu = this.cpu;
		var gprs = cpu.gprs;
		return function () {
			cpu.mmu.waitPrefetch(gprs[cpu.PC]);
			var n = gprs[rn] + immediate;
			gprs[rd] = cpu.mmu.load32(n);
			cpu.mmu.wait32(n);
			++cpu.cycles;
		};
	}
	constructLDR2(rd, rn, rm) {
		var cpu = this.cpu;
		var gprs = cpu.gprs;
		return function () {
			cpu.mmu.waitPrefetch(gprs[cpu.PC]);
			gprs[rd] = cpu.mmu.load32(gprs[rn] + gprs[rm]);
			cpu.mmu.wait32(gprs[rn] + gprs[rm]);
			++cpu.cycles;
		};
	}
	constructLDR3(rd, immediate) {
		var cpu = this.cpu;
		var gprs = cpu.gprs;
		return function () {
			cpu.mmu.waitPrefetch(gprs[cpu.PC]);
			gprs[rd] = cpu.mmu.load32((gprs[cpu.PC] & 0xfffffffc) + immediate);
			cpu.mmu.wait32(gprs[cpu.PC]);
			++cpu.cycles;
		};
	}
	constructLDR4(rd, immediate) {
		var cpu = this.cpu;
		var gprs = cpu.gprs;
		return function () {
			cpu.mmu.waitPrefetch(gprs[cpu.PC]);
			gprs[rd] = cpu.mmu.load32(gprs[cpu.SP] + immediate);
			cpu.mmu.wait32(gprs[cpu.SP] + immediate);
			++cpu.cycles;
		};
	}
	constructLDRB1(rd, rn, immediate) {
		var cpu = this.cpu;
		var gprs = cpu.gprs;
		return function () {
			var n = gprs[rn] + immediate;
			cpu.mmu.waitPrefetch(gprs[cpu.PC]);
			gprs[rd] = cpu.mmu.loadU8(n);
			cpu.mmu.wait(n);
			++cpu.cycles;
		};
	}
	constructLDRB2(rd, rn, rm) {
		var cpu = this.cpu;
		var gprs = cpu.gprs;
		return function () {
			cpu.mmu.waitPrefetch(gprs[cpu.PC]);
			gprs[rd] = cpu.mmu.loadU8(gprs[rn] + gprs[rm]);
			cpu.mmu.wait(gprs[rn] + gprs[rm]);
			++cpu.cycles;
		};
	}
	constructLDRH1(rd, rn, immediate) {
		var cpu = this.cpu;
		var gprs = cpu.gprs;
		return function () {
			var n = gprs[rn] + immediate;
			cpu.mmu.waitPrefetch(gprs[cpu.PC]);
			gprs[rd] = cpu.mmu.loadU16(n);
			cpu.mmu.wait(n);
			++cpu.cycles;
		};
	}
	constructLDRH2(rd, rn, rm) {
		var cpu = this.cpu;
		var gprs = cpu.gprs;
		return function () {
			cpu.mmu.waitPrefetch(gprs[cpu.PC]);
			gprs[rd] = cpu.mmu.loadU16(gprs[rn] + gprs[rm]);
			cpu.mmu.wait(gprs[rn] + gprs[rm]);
			++cpu.cycles;
		};
	}
	constructLDRSB(rd, rn, rm) {
		var cpu = this.cpu;
		var gprs = cpu.gprs;
		return function () {
			cpu.mmu.waitPrefetch(gprs[cpu.PC]);
			gprs[rd] = cpu.mmu.load8(gprs[rn] + gprs[rm]);
			cpu.mmu.wait(gprs[rn] + gprs[rm]);
			++cpu.cycles;
		};
	}
	constructLDRSH(rd, rn, rm) {
		var cpu = this.cpu;
		var gprs = cpu.gprs;
		return function () {
			cpu.mmu.waitPrefetch(gprs[cpu.PC]);
			gprs[rd] = cpu.mmu.load16(gprs[rn] + gprs[rm]);
			cpu.mmu.wait(gprs[rn] + gprs[rm]);
			++cpu.cycles;
		};
	}
	constructLSL1(rd, rm, immediate) {
		var cpu = this.cpu;
		var gprs = cpu.gprs;
		return function () {
			cpu.mmu.waitPrefetch(gprs[cpu.PC]);
			if (immediate == 0) {
				gprs[rd] = gprs[rm];
			} else {
				cpu.cpsrC = gprs[rm] & (1 << (32 - immediate));
				gprs[rd] = gprs[rm] << immediate;
			}
			cpu.cpsrN = gprs[rd] >> 31;
			cpu.cpsrZ = !(gprs[rd] & 0xffffffff);
		};
	}
	constructLSL2(rd, rm) {
		var cpu = this.cpu;
		var gprs = cpu.gprs;
		return function () {
			cpu.mmu.waitPrefetch(gprs[cpu.PC]);
			var rs = gprs[rm] & 0xff;
			if (rs) {
				if (rs < 32) {
					cpu.cpsrC = gprs[rd] & (1 << (32 - rs));
					gprs[rd] <<= rs;
				} else {
					if (rs > 32) {
						cpu.cpsrC = 0;
					} else {
						cpu.cpsrC = gprs[rd] & 0x00000001;
					}
					gprs[rd] = 0;
				}
			}
			cpu.cpsrN = gprs[rd] >> 31;
			cpu.cpsrZ = !(gprs[rd] & 0xffffffff);
		};
	}
	constructLSR1(rd, rm, immediate) {
		var cpu = this.cpu;
		var gprs = cpu.gprs;
		return function () {
			cpu.mmu.waitPrefetch(gprs[cpu.PC]);
			if (immediate == 0) {
				cpu.cpsrC = gprs[rm] >> 31;
				gprs[rd] = 0;
			} else {
				cpu.cpsrC = gprs[rm] & (1 << (immediate - 1));
				gprs[rd] = gprs[rm] >>> immediate;
			}
			cpu.cpsrN = 0;
			cpu.cpsrZ = !(gprs[rd] & 0xffffffff);
		};
	}
	constructLSR2(rd, rm) {
		var cpu = this.cpu;
		var gprs = cpu.gprs;
		return function () {
			cpu.mmu.waitPrefetch(gprs[cpu.PC]);
			var rs = gprs[rm] & 0xff;
			if (rs) {
				if (rs < 32) {
					cpu.cpsrC = gprs[rd] & (1 << (rs - 1));
					gprs[rd] >>>= rs;
				} else {
					if (rs > 32) {
						cpu.cpsrC = 0;
					} else {
						cpu.cpsrC = gprs[rd] >> 31;
					}
					gprs[rd] = 0;
				}
			}
			cpu.cpsrN = gprs[rd] >> 31;
			cpu.cpsrZ = !(gprs[rd] & 0xffffffff);
		};
	}
	constructMOV1(rn, immediate) {
		var cpu = this.cpu;
		var gprs = cpu.gprs;
		return function () {
			cpu.mmu.waitPrefetch(gprs[cpu.PC]);
			gprs[rn] = immediate;
			cpu.cpsrN = immediate >> 31;
			cpu.cpsrZ = !(immediate & 0xffffffff);
		};
	}
	constructMOV2(rd, rn, rm) {
		var cpu = this.cpu;
		var gprs = cpu.gprs;
		return function () {
			cpu.mmu.waitPrefetch(gprs[cpu.PC]);
			var d = gprs[rn];
			cpu.cpsrN = d >> 31;
			cpu.cpsrZ = !(d & 0xffffffff);
			cpu.cpsrC = 0;
			cpu.cpsrV = 0;
			gprs[rd] = d;
		};
	}
	constructMOV3(rd, rm) {
		var cpu = this.cpu;
		var gprs = cpu.gprs;
		return function () {
			cpu.mmu.waitPrefetch(gprs[cpu.PC]);
			gprs[rd] = gprs[rm];
		};
	}
	constructMUL(rd, rm) {
		var cpu = this.cpu;
		var gprs = cpu.gprs;
		return function () {
			cpu.mmu.waitPrefetch(gprs[cpu.PC]);
			cpu.mmu.waitMul(gprs[rm]);
			if (gprs[rm] & 0xffff0000 && gprs[rd] & 0xffff0000) {
				// Our data type is a double--we'll lose bits if we do it all at once!
				var hi = ((gprs[rd] & 0xffff0000) * gprs[rm]) & 0xffffffff;
				var lo = ((gprs[rd] & 0x0000ffff) * gprs[rm]) & 0xffffffff;
				gprs[rd] = (hi + lo) & 0xffffffff;
			} else {
				gprs[rd] *= gprs[rm];
			}
			cpu.cpsrN = gprs[rd] >> 31;
			cpu.cpsrZ = !(gprs[rd] & 0xffffffff);
		};
	}
	constructMVN(rd, rm) {
		var cpu = this.cpu;
		var gprs = cpu.gprs;
		return function () {
			cpu.mmu.waitPrefetch(gprs[cpu.PC]);
			gprs[rd] = ~gprs[rm];
			cpu.cpsrN = gprs[rd] >> 31;
			cpu.cpsrZ = !(gprs[rd] & 0xffffffff);
		};
	}
	constructNEG(rd, rm) {
		var cpu = this.cpu;
		var gprs = cpu.gprs;
		return function () {
			cpu.mmu.waitPrefetch(gprs[cpu.PC]);
			var d = -gprs[rm];
			cpu.cpsrN = d >> 31;
			cpu.cpsrZ = !(d & 0xffffffff);
			cpu.cpsrC = 0 >= d >>> 0;
			cpu.cpsrV = gprs[rm] >> 31 && d >> 31;
			gprs[rd] = d;
		};
	}
	constructORR(rd, rm) {
		var cpu = this.cpu;
		var gprs = cpu.gprs;
		return function () {
			cpu.mmu.waitPrefetch(gprs[cpu.PC]);
			gprs[rd] = gprs[rd] | gprs[rm];
			cpu.cpsrN = gprs[rd] >> 31;
			cpu.cpsrZ = !(gprs[rd] & 0xffffffff);
		};
	}
	constructPOP(rs, r) {
		var cpu = this.cpu;
		var gprs = cpu.gprs;
		return function () {
			cpu.mmu.waitPrefetch(gprs[cpu.PC]);
			++cpu.cycles;
			var address = gprs[cpu.SP];
			var total = 0;
			var m, i;
			for (m = 0x01, i = 0; i < 8; m <<= 1, ++i) {
				if (rs & m) {
					cpu.mmu.waitSeq32(address);
					gprs[i] = cpu.mmu.load32(address);
					address += 4;
					++total;
				}
			}
			if (r) {
				gprs[cpu.PC] = cpu.mmu.load32(address) & 0xfffffffe;
				address += 4;
				++total;
			}
			cpu.mmu.waitMulti32(address, total);
			gprs[cpu.SP] = address;
		};
	}
	constructPUSH(rs, r) {
		var cpu = this.cpu;
		var gprs = cpu.gprs;
		return function () {
			var address = gprs[cpu.SP] - 4;
			var total = 0;
			cpu.mmu.waitPrefetch(gprs[cpu.PC]);
			if (r) {
				cpu.mmu.store32(address, gprs[cpu.LR]);
				address -= 4;
				++total;
			}
			var m, i;
			for (m = 0x80, i = 7; m; m >>= 1, --i) {
				if (rs & m) {
					cpu.mmu.store32(address, gprs[i]);
					address -= 4;
					++total;
					break;
				}
			}
			for (m >>= 1, --i; m; m >>= 1, --i) {
				if (rs & m) {
					cpu.mmu.store32(address, gprs[i]);
					address -= 4;
					++total;
				}
			}
			cpu.mmu.waitMulti32(address, total);
			gprs[cpu.SP] = address + 4;
		};
	}
	constructROR(rd, rm) {
		var cpu = this.cpu;
		var gprs = cpu.gprs;
		return function () {
			cpu.mmu.waitPrefetch(gprs[cpu.PC]);
			var rs = gprs[rm] & 0xff;
			if (rs) {
				var r4 = rs & 0x1f;
				if (r4 > 0) {
					cpu.cpsrC = gprs[rd] & (1 << (r4 - 1));
					gprs[rd] = (gprs[rd] >>> r4) | (gprs[rd] << (32 - r4));
				} else {
					cpu.cpsrC = gprs[rd] >> 31;
				}
			}
			cpu.cpsrN = gprs[rd] >> 31;
			cpu.cpsrZ = !(gprs[rd] & 0xffffffff);
		};
	}
	constructSBC(rd, rm) {
		var cpu = this.cpu;
		var gprs = cpu.gprs;
		return function () {
			cpu.mmu.waitPrefetch(gprs[cpu.PC]);
			var m = (gprs[rm] >>> 0) + !cpu.cpsrC;
			var d = (gprs[rd] >>> 0) - m;
			cpu.cpsrN = d >> 31;
			cpu.cpsrZ = !(d & 0xffffffff);
			cpu.cpsrC = gprs[rd] >>> 0 >= d >>> 0;
			cpu.cpsrV = (gprs[rd] ^ m) >> 31 && (gprs[rd] ^ d) >> 31;
			gprs[rd] = d;
		};
	}
	constructSTMIA(rn, rs) {
		var cpu = this.cpu;
		var gprs = cpu.gprs;
		return function () {
			cpu.mmu.wait(gprs[cpu.PC]);
			var address = gprs[rn];
			var total = 0;
			var m, i;
			for (m = 0x01, i = 0; i < 8; m <<= 1, ++i) {
				if (rs & m) {
					cpu.mmu.store32(address, gprs[i]);
					address += 4;
					++total;
					break;
				}
			}
			for (m <<= 1, ++i; i < 8; m <<= 1, ++i) {
				if (rs & m) {
					cpu.mmu.store32(address, gprs[i]);
					address += 4;
					++total;
				}
			}
			cpu.mmu.waitMulti32(address, total);
			gprs[rn] = address;
		};
	}
	constructSTR1(rd, rn, immediate) {
		var cpu = this.cpu;
		var gprs = cpu.gprs;
		return function () {
			var n = gprs[rn] + immediate;
			cpu.mmu.store32(n, gprs[rd]);
			cpu.mmu.wait(gprs[cpu.PC]);
			cpu.mmu.wait32(n);
		};
	}
	constructSTR2(rd, rn, rm) {
		var cpu = this.cpu;
		var gprs = cpu.gprs;
		return function () {
			cpu.mmu.store32(gprs[rn] + gprs[rm], gprs[rd]);
			cpu.mmu.wait(gprs[cpu.PC]);
			cpu.mmu.wait32(gprs[rn] + gprs[rm]);
		};
	}
	constructSTR3(rd, immediate) {
		var cpu = this.cpu;
		var gprs = cpu.gprs;
		return function () {
			cpu.mmu.store32(gprs[cpu.SP] + immediate, gprs[rd]);
			cpu.mmu.wait(gprs[cpu.PC]);
			cpu.mmu.wait32(gprs[cpu.SP] + immediate);
		};
	}
	constructSTRB1(rd, rn, immediate) {
		var cpu = this.cpu;
		var gprs = cpu.gprs;
		return function () {
			var n = gprs[rn] + immediate;
			cpu.mmu.store8(n, gprs[rd]);
			cpu.mmu.wait(gprs[cpu.PC]);
			cpu.mmu.wait(n);
		};
	}
	constructSTRB2(rd, rn, rm) {
		var cpu = this.cpu;
		var gprs = cpu.gprs;
		return function () {
			cpu.mmu.store8(gprs[rn] + gprs[rm], gprs[rd]);
			cpu.mmu.wait(gprs[cpu.PC]);
			cpu.mmu.wait(gprs[rn] + gprs[rm]);
		};
	}
	constructSTRH1(rd, rn, immediate) {
		var cpu = this.cpu;
		var gprs = cpu.gprs;
		return function () {
			var n = gprs[rn] + immediate;
			cpu.mmu.store16(n, gprs[rd]);
			cpu.mmu.wait(gprs[cpu.PC]);
			cpu.mmu.wait(n);
		};
	}
	constructSTRH2(rd, rn, rm) {
		var cpu = this.cpu;
		var gprs = cpu.gprs;
		return function () {
			cpu.mmu.store16(gprs[rn] + gprs[rm], gprs[rd]);
			cpu.mmu.wait(gprs[cpu.PC]);
			cpu.mmu.wait(gprs[rn] + gprs[rm]);
		};
	}
	constructSUB1(rd, rn, immediate) {
		var cpu = this.cpu;
		var gprs = cpu.gprs;
		return function () {
			cpu.mmu.waitPrefetch(gprs[cpu.PC]);
			var d = gprs[rn] - immediate;
			cpu.cpsrN = d >> 31;
			cpu.cpsrZ = !(d & 0xffffffff);
			cpu.cpsrC = gprs[rn] >>> 0 >= immediate;
			cpu.cpsrV = gprs[rn] >> 31 && (gprs[rn] ^ d) >> 31;
			gprs[rd] = d;
		};
	}
	constructSUB2(rn, immediate) {
		var cpu = this.cpu;
		var gprs = cpu.gprs;
		return function () {
			cpu.mmu.waitPrefetch(gprs[cpu.PC]);
			var d = gprs[rn] - immediate;
			cpu.cpsrN = d >> 31;
			cpu.cpsrZ = !(d & 0xffffffff);
			cpu.cpsrC = gprs[rn] >>> 0 >= immediate;
			cpu.cpsrV = gprs[rn] >> 31 && (gprs[rn] ^ d) >> 31;
			gprs[rn] = d;
		};
	}
	constructSUB3(rd, rn, rm) {
		var cpu = this.cpu;
		var gprs = cpu.gprs;
		return function () {
			cpu.mmu.waitPrefetch(gprs[cpu.PC]);
			var d = gprs[rn] - gprs[rm];
			cpu.cpsrN = d >> 31;
			cpu.cpsrZ = !(d & 0xffffffff);
			cpu.cpsrC = gprs[rn] >>> 0 >= gprs[rm] >>> 0;
			cpu.cpsrV =
				gprs[rn] >> 31 != gprs[rm] >> 31 && gprs[rn] >> 31 != d >> 31;
			gprs[rd] = d;
		};
	}
	constructSWI(immediate) {
		var cpu = this.cpu;
		var gprs = cpu.gprs;
		return function () {
			cpu.irq.swi(immediate);
			cpu.mmu.waitPrefetch(gprs[cpu.PC]);
		};
	}
	constructTST(rd, rm) {
		var cpu = this.cpu;
		var gprs = cpu.gprs;
		return function () {
			cpu.mmu.waitPrefetch(gprs[cpu.PC]);
			var aluOut = gprs[rd] & gprs[rm];
			cpu.cpsrN = aluOut >> 31;
			cpu.cpsrZ = !(aluOut & 0xffffffff);
		};
	}
}
