class GameBoyAdvanceVideo {
	constructor() {
		try {
			this.renderPath = new GameBoyAdvanceRenderProxy();
		} catch(err) {
			console.log("Service worker renderer couldn't load. Save states (not save files) may be glitchy")
			this.renderPath = new GameBoyAdvanceSoftwareRenderer();
		}
		if (this.renderPath.worker) {
			this.renderPath.onWorkerError = (error) =>
				this.fallbackToSoftwareRenderer(error);
		}


		this.CYCLES_PER_PIXEL = 4;

		this.HORIZONTAL_PIXELS = 240;
		this.HBLANK_PIXELS = 68;
		this.HDRAW_LENGTH = 1006;
		this.HBLANK_LENGTH = 226;
		this.HORIZONTAL_LENGTH = 1232;

		this.VERTICAL_PIXELS = 160;
		this.VBLANK_PIXELS = 68;
		this.VERTICAL_TOTAL_PIXELS = 228;

		this.TOTAL_LENGTH = 280896;

		this.drawCallback = function () {};
		this.vblankCallback = function () {};
	}
	fallbackToSoftwareRenderer(error) {
		var proxy = this.renderPath;
		if (
			!proxy ||
			!proxy.worker ||
			!proxy.workerFailed ||
			typeof GameBoyAdvanceSoftwareRenderer != "function"
		) {
			return false;
		}

		var mmu = this.cpu && this.cpu.mmu;
		if (!mmu) {
			return false;
		}

		try {
			var renderer = new GameBoyAdvanceSoftwareRenderer();
			renderer.clear(mmu);
			if (proxy.palette && proxy.palette.combine) {
				renderer.palette.overwrite(
					new Uint16Array(proxy.palette.combine())
				);
			}
			if (proxy.vram && proxy.vram.combine) {
				renderer.vram.insert(
					0,
					new Uint16Array(proxy.vram.combine())
				);
			}
			if (proxy.oam && proxy.oam.combine) {
				renderer.oam.overwrite(
					new Uint16Array(proxy.oam.combine())
				);
			}

			var io = this.core && this.core.io;
			var registers = io && io.registers;
			if (registers) {
				var register = (address) => registers[address >> 1] || 0;
				renderer.writeDisplayControl(register(io.DISPCNT));
				for (var bg = 0; bg < 4; ++bg) {
					renderer.writeBackgroundControl(
						bg,
						register(io.BG0CNT + (bg << 1))
					);
					renderer.writeBackgroundHOffset(
						bg,
						register(io.BG0HOFS + (bg << 2))
					);
					renderer.writeBackgroundVOffset(
						bg,
						register(io.BG0VOFS + (bg << 2))
					);
				}
				for (bg = 2; bg < 4; ++bg) {
					var affineOffset = bg == 2 ? io.BG2PA : io.BG3PA;
					renderer.writeBackgroundParamA(
						bg,
						register(affineOffset)
					);
					renderer.writeBackgroundParamB(
						bg,
						register(affineOffset + 2)
					);
					renderer.writeBackgroundParamC(
						bg,
						register(affineOffset + 4)
					);
					renderer.writeBackgroundParamD(
						bg,
						register(affineOffset + 6)
					);
					var refOffset = bg == 2 ? io.BG2X_LO : io.BG3X_LO;
					var refX =
						register(refOffset) |
						(register(refOffset + 2) << 16);
					var refY =
						register(refOffset + 4) |
						(register(refOffset + 6) << 16);
					renderer.writeBackgroundRefX(bg, refX);
					renderer.writeBackgroundRefY(bg, refY);
				}
				renderer.writeWin0H(register(io.WIN0H));
				renderer.writeWin1H(register(io.WIN1H));
				renderer.writeWin0V(register(io.WIN0V));
				renderer.writeWin1V(register(io.WIN1V));
				renderer.writeWinIn(register(io.WININ));
				renderer.writeWinOut(register(io.WINOUT));
				renderer.writeMosaic(register(io.MOSAIC));
				renderer.writeBlendControl(register(io.BLDCNT));
				renderer.writeBlendAlpha(register(io.BLDALPHA));
				renderer.writeBlendY(register(io.BLDY));
			}

			if (proxy.pendingOamPrime) {
				renderer.objOam.overwrite(
					new Uint16Array(proxy.pendingOamPrime)
				);
				renderer.lastObjScanline = this.VERTICAL_TOTAL_PIXELS - 1;
			} else {
				renderer.stageObjOam();
				renderer.lastObjScanline = null;
			}
			renderer.vcount = this.vcount;
			if (proxy.backing) {
				renderer.pixelData = proxy.backing;
			} else if (this.context && this.context.createImageData) {
				renderer.setBacking(
					this.context.createImageData(
						this.HORIZONTAL_PIXELS,
						this.VERTICAL_PIXELS
					)
				);
			}

			this.renderPath = renderer;
			mmu.mmap(mmu.REGION_PALETTE_RAM, renderer.palette);
			mmu.mmap(mmu.REGION_VRAM, renderer.vram);
			mmu.mmap(mmu.REGION_OAM, renderer.oam);
			if (this.cpu) {
				this.cpu.instruction = null;
				this.cpu.page = null;
				this.cpu.pageRegion = -1;
			}
			if (this.core && typeof this.core.WARN == "function") {
				this.core.WARN(
					"Render worker failed; switched to software rendering: " + error
				);
			}
			return true;
		} catch (fallbackError) {
			if (this.core && typeof this.core.ERROR == "function") {
				this.core.ERROR(fallbackError);
			}
			return false;
		}
	}
	clear() {
		this.renderPath.clear(this.cpu.mmu);

		// DISPSTAT
		this.DISPSTAT_MASK = 0xff38;
		this.inHblank = false;
		this.inVblank = false;
		this.vcounter = 0;
		this.vblankIRQ = 0;
		this.hblankIRQ = 0;
		this.vcounterIRQ = 0;
		this.vcountSetting = 0;

		// VCOUNT
		this.vcount = 0;

		this.lastHblank = 0;
		this.nextHblank = this.HDRAW_LENGTH;
		this.nextEvent = this.nextHblank;

		this.nextHblankIRQ = 0;
		this.nextVblankIRQ = 0;
		this.nextVcounterIRQ = 0;
	}
	freeze() {
		return {
			timingVersion: 2,
			inHblank: this.inHblank,
			inVblank: this.inVblank,
			vcounter: this.vcounter,
			vblankIRQ: this.vblankIRQ,
			hblankIRQ: this.hblankIRQ,
			vcounterIRQ: this.vcounterIRQ,
			vcountSetting: this.vcountSetting,
			vcount: this.vcount,
			lastHblank: this.lastHblank,
			nextHblank: this.nextHblank,
			nextEvent: this.nextEvent,
			nextHblankIRQ: this.nextHblankIRQ,
			nextVblankIRQ: this.nextVblankIRQ,
			nextVcounterIRQ: this.nextVcounterIRQ,
			renderPath: this.renderPath.freeze(this.core.encodeBase64)
		};
	}
	defrost(frost) {
		this.inHblank = frost.inHblank;
		this.inVblank = frost.inVblank;
		this.vcounter = frost.vcounter;
		this.vblankIRQ = frost.vblankIRQ;
		this.hblankIRQ = frost.hblankIRQ;
		this.vcounterIRQ = frost.vcounterIRQ;
		this.vcountSetting = frost.vcountSetting;
		this.vcount = frost.vcount;
		if (!frost.timingVersion || frost.timingVersion < 2) {
			// Older states tracked the rendered line one scanline behind VCOUNT.
			this.vcount = (this.vcount + 1) % this.VERTICAL_TOTAL_PIXELS;
			this.inVblank = this.vcount >= this.VERTICAL_PIXELS;
			this.vcounter = this.vcount == this.vcountSetting;
		}
		this.lastHblank = frost.lastHblank;
		this.nextHblank = frost.nextHblank;
		this.nextEvent = frost.nextEvent;
		this.nextHblankIRQ = frost.nextHblankIRQ;
		this.nextVblankIRQ = frost.nextVblankIRQ;
		this.nextVcounterIRQ = frost.nextVcounterIRQ;
		this.updateVcounterIRQDeadline();
		this.renderPath.defrost(frost.renderPath, this.core.decodeBase64);
		if (
			this.vcount === this.VERTICAL_TOTAL_PIXELS - 1 &&
			!this.renderPath.pendingOamPrime &&
			this.renderPath.lastObjScanline !== this.VERTICAL_TOTAL_PIXELS - 1
		) {
			// Older save states do not carry a separate line-zero OAM latch.
			// Reconstruct it from restored OAM if loaded at line 227.
			this.renderPath.primeObjOamForLineZero();
		}
	}
	updateVcounterIRQDeadline() {
		if (
			!this.vcounterIRQ ||
			this.vcountSetting >= this.VERTICAL_TOTAL_PIXELS
		) {
			this.nextVcounterIRQ = 0;
			return;
		}

		// VCOUNT advances at the end of H-Blank. If the comparison is written
		// during H-Blank, the next line transition is already this.nextEvent;
		// otherwise it is the upcoming H-Blank end.
		var linesUntilMatch =
			(this.vcountSetting - this.vcount + this.VERTICAL_TOTAL_PIXELS) %
			this.VERTICAL_TOTAL_PIXELS;
		if (!linesUntilMatch) {
			// A match on the current line has already occurred (or is being
			// signaled by writeDisplayStat), so the next one is a full frame away.
			linesUntilMatch = this.VERTICAL_TOTAL_PIXELS;
		}
		var nextLineTransition = this.inHblank
			? this.nextEvent
			: this.nextEvent + this.HBLANK_LENGTH;
		this.nextVcounterIRQ =
			nextLineTransition +
			(linesUntilMatch - 1) * this.HORIZONTAL_LENGTH;
	}
	setBacking(backing) {
		var pixelData = backing.createImageData(
			this.HORIZONTAL_PIXELS,
			this.VERTICAL_PIXELS
		);
		this.context = backing;

		// Clear backing first
		for (
			var offset = 0;
			offset < this.HORIZONTAL_PIXELS * this.VERTICAL_PIXELS * 4;

		) {
			pixelData.data[offset++] = 0xff;
			pixelData.data[offset++] = 0xff;
			pixelData.data[offset++] = 0xff;
			pixelData.data[offset++] = 0xff;
		}

		this.renderPath.setBacking(pixelData);
	}
	updateTimers(cpu) {
		while (this.nextEvent <= cpu.cycles) {
			var eventCycle = this.nextEvent;
			if (this.inHblank) {
				// End Hblank
				this.inHblank = false;
				this.nextEvent = this.nextHblank;

				++this.vcount;

				switch (this.vcount) {
					case this.VERTICAL_PIXELS:
						this.inVblank = true;
						this.renderPath.finishDraw(this);
						this.nextVblankIRQ = this.nextEvent + this.TOTAL_LENGTH;
						this.cpu.mmu.runVblankDmas(eventCycle);
						if (this.vblankIRQ) {
							this.cpu.irq.raiseIRQ(this.cpu.irq.IRQ_VBLANK);
						}
						this.vblankCallback();
						break;
					case this.VERTICAL_TOTAL_PIXELS - 1:
						// The OBJ engine prepares scanline 0 during the final V-Blank
						// line, so writes after this point must wait until scanline 1.
						this.renderPath.primeObjOamForLineZero();
						break;
					case this.VERTICAL_TOTAL_PIXELS:
						this.vcount = 0;
						this.inVblank = false;
						this.renderPath.startDraw();
						break;
				}

				this.vcounter = this.vcount == this.vcountSetting;
				if (this.vcounter && this.vcounterIRQ) {
					this.cpu.irq.raiseIRQ(this.cpu.irq.IRQ_VCOUNTER);
					this.nextVcounterIRQ += this.TOTAL_LENGTH;
				}
			} else {
				// Begin Hblank
				this.inHblank = true;
				this.lastHblank = this.nextHblank;
				this.nextEvent = this.lastHblank + this.HBLANK_LENGTH;
				this.nextHblank = this.nextEvent + this.HDRAW_LENGTH;
				this.nextHblankIRQ = this.nextHblank;

				if (this.vcount < this.VERTICAL_PIXELS) {
					// The current visible line is complete when Hblank begins.
					this.renderPath.drawScanline(this.vcount);
					this.cpu.mmu.runHblankDmas(eventCycle);
				}
				if (this.hblankIRQ) {
					this.cpu.irq.raiseIRQ(this.cpu.irq.IRQ_HBLANK);
				}
			}
		}
	}
	writeDisplayStat(value) {
		var previousVcounter = this.vcounter;
		this.vblankIRQ = value & 0x0008;
		this.hblankIRQ = value & 0x0010;
		this.vcounterIRQ = value & 0x0020;
		this.vcountSetting = (value & 0xff00) >> 8;
		// DISPSTAT's match flag reflects the current VCOUNT, including a
		// comparator value written during the same scanline.
		this.vcounter = this.vcount == this.vcountSetting;
		if (this.vcounter && !previousVcounter && this.vcounterIRQ) {
			this.cpu.irq.raiseIRQ(this.cpu.irq.IRQ_VCOUNTER);
		}

		this.updateVcounterIRQDeadline();
	}
	readDisplayStat() {
		return this.inVblank | (this.inHblank << 1) | (this.vcounter << 2);
	}
	finishDraw(pixelData) {
		this.context.putImageData(pixelData, 0, 0);
		this.drawCallback();
	}
}
