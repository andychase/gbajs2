class GameBoyAdvance {
	constructor() {
		this.LOG_ERROR = 1;
		this.LOG_WARN = 2;
		this.LOG_STUB = 4;
		this.LOG_INFO = 8;
		this.LOG_DEBUG = 16;

		this.SYS_ID = "com.endrift.gbajs";

		this.logLevel = this.LOG_ERROR | this.LOG_WARN;

		this.rom = null;

		this.cpu = new ARMCore();
		this.mmu = new GameBoyAdvanceMMU();
		this.irq = new GameBoyAdvanceInterruptHandler();
		this.io = new GameBoyAdvanceIO();
		this.audio = new GameBoyAdvanceAudio();
		this.video = new GameBoyAdvanceVideo();
		this.keypad = new GameBoyAdvanceKeypad();
		this.sio = new GameBoyAdvanceSIO();

		// TODO: simplify this graph
		this.cpu.mmu = this.mmu;
		this.cpu.irq = this.irq;

		this.mmu.cpu = this.cpu;
		this.mmu.core = this;

		this.irq.cpu = this.cpu;
		this.irq.io = this.io;
		this.irq.audio = this.audio;
		this.irq.video = this.video;
		this.irq.core = this;

		this.io.cpu = this.cpu;
		this.io.audio = this.audio;
		this.io.video = this.video;
		this.io.keypad = this.keypad;
		this.io.sio = this.sio;
		this.io.core = this;

		this.audio.cpu = this.cpu;
		this.audio.core = this;

		this.video.cpu = this.cpu;
		this.video.core = this;

		this.keypad.core = this;

		this.sio.core = this;

		this.keypad.registerHandlers();
		this.doStep = this.waitFrame;
		this.paused = false;
		this.running = false;
		this.runGeneration = 0;

		this.seenFrame = false;
		this.seenSave = false;
		this.lastVblank = 0;

		this.queue = null;
		this.reportFPS = null;
		// Pace emulated frames at the GBA refresh rate (280,896 cycles at
		// 16,777,216 Hz). Carry fractional milliseconds across timers because
		// browser setTimeout implementations may round each delay to an integer.
		this.throttle = (this.video.TOTAL_LENGTH * 1000) / 16777216;
		this.throttleRemainder = 0;

		var self = this;
		window.queueFrame = function (f) {
			var delay = Math.floor(self.throttle);
			self.throttleRemainder += self.throttle - delay;
			if (self.throttleRemainder >= 1) {
				++delay;
				--self.throttleRemainder;
			}
			self.queue = window.setTimeout(f, delay);
		};

		window.URL = window.URL || window.webkitURL;

		this.video.vblankCallback = function () {
			self.seenFrame = true;
		};
	}
	setCanvas(canvas) {
		if (canvas.offsetWidth != 240 || canvas.offsetHeight != 160) {
			var self = this;
			this.indirectCanvas = document.createElement("canvas");
			this.indirectCanvas.setAttribute("height", "160");
			this.indirectCanvas.setAttribute("width", "240");
			this.targetCanvas = canvas;
			this.setCanvasDirect(this.indirectCanvas);
			var targetContext = canvas.getContext("2d");
			this.video.drawCallback = function () {
				targetContext.drawImage(
					self.indirectCanvas,
					0,
					0,
					canvas.width,
					canvas.height
				);
			};
		} else {
			this.setCanvasDirect(canvas);
			var self = this;
		}
	}
	setCanvasDirect(canvas) {
		this.context = canvas.getContext("2d");
		this.video.setBacking(this.context);
	}
	setBios(bios, real) {
		if (real && (!bios || bios.byteLength !== this.mmu.SIZE_BIOS)) {
			throw new RangeError(
				"A real GBA BIOS image must be exactly " +
				this.mmu.SIZE_BIOS +
				" bytes"
			);
		}
		this.mmu.loadBios(bios, real);
	}
	setRom(rom) {
		this.reset();

		this.rom = this.mmu.loadRom(rom, true);
		if (!this.rom) {
			return false;
		}
		this.retrieveSavedata();
		return true;
	}
	hasRom() {
		return !!this.rom;
	}
	loadRomFromFile(romFile, callback) {
		var self = this;
		var completed = false;
		var finish = function (result) {
			if (completed) {
				return;
			}
			completed = true;
			if (callback) {
				callback(result);
			}
		};
		if (!romFile) {
			finish(false);
			return;
		}
		var reader;
		try {
			reader = new FileReader();
		} catch (error) {
			finish(false);
			return;
		}
		reader.onload = function (e) {
			finish(self.setRom(e.target.result));
		};
		reader.onerror = function () {
			finish(false);
		};
		reader.onabort = function () {
			finish(false);
		};
		try {
			reader.readAsArrayBuffer(romFile);
		} catch (error) {
			finish(false);
		}
	}
	reset() {
		// Reset replaces the CPU and video state, so invalidate any queued run
		// callbacks before clearing the old cartridge and its pending writes.
		this.pause();

		this.mmu.clear();
		this.io.clear();
		this.audio.clear();
		this.video.clear();
		this.sio.clear();

		this.mmu.mmap(this.mmu.REGION_IO, this.io);
		this.mmu.mmap(
			this.mmu.REGION_PALETTE_RAM,
			this.video.renderPath.palette
		);
		this.mmu.mmap(this.mmu.REGION_VRAM, this.video.renderPath.vram);
		this.mmu.mmap(this.mmu.REGION_OAM, this.video.renderPath.oam);

		if (this.mmu.bios && typeof this.mmu.bios.beginHLEBoot == "function") {
			this.mmu.bios.beginHLEBoot();
		}
		this.cpu.resetCPU(0);
	}
	step() {
		while (this.doStep()) {
			this.cpu.step();
		}
	}
	waitFrame() {
		var seen = this.seenFrame;
		this.seenFrame = false;
		return !seen;
	}
	pause() {
		this.paused = true;
		this.running = false;
		this.runGeneration = (this.runGeneration || 0) + 1;
		this.audio.pause(true);
		if (this.queue) {
			clearTimeout(this.queue);
			this.queue = null;
		}
		// Save writes are normally persisted one frame after the cartridge has
		// gone idle. Pausing or resetting during that grace frame must not leave
		// the newest game progress only in memory.
		if (
			this.mmu.save &&
			(this.seenSave || this.mmu.saveNeedsFlush())
		) {
			this.storeSavedata();
			this.mmu.flushSave();
			this.seenSave = false;
		}
	}
	advanceFrame() {
		this.step();
		if (this.seenSave) {
			if (!this.mmu.saveNeedsFlush()) {
				this.storeSavedata();
				this.seenSave = false;
			} else {
				this.mmu.flushSave();
			}
		} else if (this.mmu.saveNeedsFlush()) {
			this.seenSave = true;
			this.mmu.flushSave();
		}
	}
	runStable() {
		if (this.running) {
			return; // Already running
		}
		var self = this;
		this.paused = false;
		this.running = true;
		this.runGeneration = (this.runGeneration || 0) + 1;
		var runGeneration = this.runGeneration;
		var runIsActive = function () {
			return (
				self.running &&
				!self.paused &&
				self.runGeneration === runGeneration
			);
		};
		var timer = 0;
		var frames = 0;
		var runFunc;
		var start = Date.now();
		var rendererHasPendingFrame = function () {
			var renderPath = self.video && self.video.renderPath;
			return !!(
				renderPath &&
				renderPath.worker &&
				!renderPath.workerFailed &&
				renderPath.delay > 0
			);
		};
		var waitForRenderer = function () {
			// Let the worker drain its queued frame before the next emulated
			// frame. This preserves short-lived visual effects instead of
			// silently dropping the frame that contains them.
			if (runIsActive()) {
				self.queue = window.setTimeout(runFunc, 1);
			}
		};
		this.audio.pause(false);

		if (this.reportFPS) {
			runFunc = function () {
				try {
					if (!runIsActive()) {
						return;
					}
					if (rendererHasPendingFrame()) {
						waitForRenderer();
						return;
					}
					timer += Date.now() - start;
					queueFrame(runFunc);
					start = Date.now();
					self.advanceFrame();
					++frames;
					if (frames == 60) {
						self.reportFPS((frames * 1000) / timer);
						frames = 0;
						timer = 0;
					}
				} catch (exception) {
					self.ERROR(exception);
					if (exception.stack) {
						self.logStackTrace(exception.stack.split("\n"));
					}
					throw exception;
				}
			};
		} else {
			runFunc = function () {
				try {
					if (!runIsActive()) {
						return;
					}
					if (rendererHasPendingFrame()) {
						waitForRenderer();
						return;
					}
					queueFrame(runFunc);
					self.advanceFrame();
				} catch (exception) {
					self.ERROR(exception);
					if (exception.stack) {
						self.logStackTrace(exception.stack.split("\n"));
					}
					throw exception;
				}
			};
		}
		queueFrame(runFunc);
	}
	setSavedata(data) {
		this.mmu.loadSavedata(data);
	}
	loadSavedataFromFile(saveFile) {
		var self = this;
		var targetMMU = this.mmu;
		var targetCart = targetMMU && targetMMU.cart;
		return new Promise(function (resolve) {
			var reader;
			try {
				reader = new FileReader();
			} catch (error) {
				self.WARN("Could not read savedata file: " + error);
				resolve(false);
				return;
			}
			reader.onload = function (e) {
				if (
					targetMMU &&
					(self.mmu !== targetMMU || self.mmu.cart !== targetCart)
				) {
					self.WARN("Could not load savedata: the cartridge changed while reading");
					resolve(false);
					return;
				}
				try {
					self.setSavedata(e.target.result);
					resolve(true);
				} catch (error) {
					self.WARN("Could not load savedata! " + error);
					resolve(false);
				}
			};
			reader.onerror = function () {
				self.WARN("Could not read savedata file");
				resolve(false);
			};
			reader.onabort = function () {
				self.WARN("Savedata file read was cancelled");
				resolve(false);
			};
			try {
				reader.readAsArrayBuffer(saveFile);
			} catch (error) {
				self.WARN("Could not read savedata file: " + error);
				resolve(false);
			}
		});
	}
	decodeSavedata(string) {
		this.setSavedata(this.decodeBase64(string));
	}
	decodeBase64(string) {
		var length = (string.length * 3) / 4;
		if (string[string.length - 2] == "=") {
			length -= 2;
		} else if (string[string.length - 1] == "=") {
			length -= 1;
		}
		var buffer = new ArrayBuffer(length);
		var view = new Uint8Array(buffer);
		var bits = string.match(/..../g);
		for (var i = 0; i + 2 < length; i += 3) {
			var s = atob(bits.shift());
			view[i] = s.charCodeAt(0);
			view[i + 1] = s.charCodeAt(1);
			view[i + 2] = s.charCodeAt(2);
		}
		if (i < length) {
			var s = atob(bits.shift());
			view[i++] = s.charCodeAt(0);
			if (s.length > 1) {
				view[i++] = s.charCodeAt(1);
			}
		}

		return buffer;
	}
	encodeBase64(view) {
		var data = [];
		var b;
		var wordstring = [];
		var triplet;
		for (var i = 0; i < view.byteLength; ++i) {
			b = view.getUint8(i, true);
			wordstring.push(String.fromCharCode(b));
			while (wordstring.length >= 3) {
				triplet = wordstring.splice(0, 3);
				data.push(btoa(triplet.join("")));
			}
		}
		if (wordstring.length) {
			data.push(btoa(wordstring.join("")));
		}
		return data.join("");
	}
	getSavedataView() {
		var save = this.mmu.save;
		if (!save) {
			return null;
		}
		var size =
			save instanceof EEPROMSavedata
				? save.exportSize
				: save.buffer.byteLength;
		if (!Number.isInteger(size) || size <= 0 || size > save.buffer.byteLength) {
			size = save.buffer.byteLength;
		}
		return new DataView(save.buffer, 0, size);
	}
	downloadSavedata() {
		var saveView = this.getSavedataView();
		if (!saveView) {
			this.WARN("No save data available");
			return false;
		}
		var cartCode =
			(this.mmu.cart && this.mmu.cart.code) ||
			(this.rom && this.rom.code) ||
			"game";
		var filename = String(cartCode).replace(/[^a-zA-Z0-9_-]/g, "_") + ".sav";
		var urlAPI = window.URL || window.webkitURL;
		var objectURL = null;
		var anchor = null;
		var parent = null;
		var attached = false;
		try {
			var bytes = new Uint8Array(
				saveView.buffer,
				saveView.byteOffset,
				saveView.byteLength
			);
			var blob = new Blob([bytes], { type: "application/octet-stream" });
			var href;
			if (urlAPI && typeof urlAPI.createObjectURL == "function") {
				try {
					objectURL = urlAPI.createObjectURL(blob);
					href = objectURL;
				} catch (error) {
					// Some browser contexts disable object URLs. A data URL still
					// lets the download link work for these small save files.
					href =
						"data:application/octet-stream;base64," +
						this.encodeBase64(saveView);
				}
			} else {
				href =
					"data:application/octet-stream;base64," +
					this.encodeBase64(saveView);
			}

			anchor = document.createElement("a");
			anchor.href = href;
			anchor.download = filename;
			if (anchor.style) {
				anchor.style.display = "none";
			}
			parent = document.body || document.documentElement;
			if (!parent || typeof anchor.click != "function") {
				throw new Error("Browser download links are unavailable");
			}
			parent.appendChild(anchor);
			attached = true;
			anchor.click();
			parent.removeChild(anchor);
			attached = false;
			anchor = null;

			if (objectURL && urlAPI && urlAPI.revokeObjectURL) {
				var savedURL = objectURL;
				var releaseURL = function () {
					urlAPI.revokeObjectURL(savedURL);
				};
				if (window.setTimeout) {
					window.setTimeout(releaseURL, 10000);
				} else {
					setTimeout(releaseURL, 10000);
				}
				objectURL = null;
			}
			return true;
		} catch (error) {
			if (attached && anchor && parent) {
				parent.removeChild(anchor);
			}
			if (objectURL && urlAPI && urlAPI.revokeObjectURL) {
				urlAPI.revokeObjectURL(objectURL);
			}
			this.WARN("Could not download savedata! " + error);
			return false;
		}
	}
	storeSavedata() {
		var sram = this.mmu.save;
		if (!sram || !this.mmu.cart) {
			return;
		}
		try {
			var storage = window.localStorage;
			storage[this.SYS_ID + "." + this.mmu.cart.code] = this.encodeBase64(
				this.getSavedataView()
			);
		} catch (e) {
			this.WARN("Could not store savedata! " + e);
		}
	}
	retrieveSavedata() {
		try {
			var storage = window.localStorage;
			var data = storage[this.SYS_ID + "." + this.mmu.cart.code];
			if (data) {
				this.decodeSavedata(data);
				return true;
			}
		} catch (e) {
			this.WARN("Could not retrieve savedata! " + e);
		}
		return false;
	}
	freeze() {
		return {
			cpu: this.cpu.freeze(),
			mmu: this.mmu.freeze(),
			irq: this.irq.freeze(),
			io: this.io.freeze(),
			sio: this.sio.freeze(),
			audio: this.audio.freeze(),
			video: this.video.freeze()
		};
	}
	defrost(frost) {
		this.cpu.defrost(frost.cpu);
		this.mmu.defrost(frost.mmu);
		this.video.defrost(frost.video);
		this.irq.defrost(frost.irq);
		this.io.defrost(frost.io);
		this.sio.defrost(frost.sio);
		this.audio.defrost(
			frost.audio,
			this.io.registers[this.io.SOUNDBIAS >> 1]
		);
		this.irq.pollNextEvent();
	}
	log(level, message) {}
	setLogger(logger) {
		this.log = logger;
	}
	logStackTrace(stack) {
		var overflow = stack.length - 32;
		this.ERROR("Stack trace follows:");
		if (overflow > 0) {
			this.log(-1, "> (Too many frames)");
		}
		for (var i = Math.max(overflow, 0); i < stack.length; ++i) {
			this.log(-1, "> " + stack[i]);
		}
	}
	ERROR(error) {
		if (this.logLevel & this.LOG_ERROR) {
			this.log(this.LOG_ERROR, error);
		}
	}
	WARN(warn) {
		if (this.logLevel & this.LOG_WARN) {
			this.log(this.LOG_WARN, warn);
		}
	}
	STUB(func) {
		if (this.logLevel & this.LOG_STUB) {
			this.log(this.LOG_STUB, func);
		}
	}
	INFO(info) {
		if (this.logLevel & this.LOG_INFO) {
			this.log(this.LOG_INFO, info);
		}
	}
	DEBUG(info) {
		if (this.logLevel & this.LOG_DEBUG) {
			this.log(this.LOG_DEBUG, info);
		}
	}
	ASSERT_UNREACHED(err) {
		throw new Error("Should be unreached: " + err);
	}
	ASSERT(test, err) {
		if (!test) {
			throw new Error("Assertion failed: " + err);
		}
	}
}
