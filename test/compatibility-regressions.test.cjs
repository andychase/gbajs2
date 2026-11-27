const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const context = vm.createContext({ console, Blob });
const mmuSource = fs.readFileSync(path.join(root, "js/mmu.js"), "utf8");
const videoSource = fs.readFileSync(
	path.join(root, "js/video/software.js"),
	"utf8"
);
const proxySource = fs.readFileSync(
	path.join(root, "js/video/proxy.js"),
	"utf8"
);
const gbaVideoSource = fs.readFileSync(path.join(root, "js/video.js"), "utf8");
const irqSource = fs.readFileSync(path.join(root, "js/irq.js"), "utf8");
const ioSource = fs.readFileSync(path.join(root, "js/io.js"), "utf8");
const keypadSource = fs.readFileSync(path.join(root, "js/keypad.js"), "utf8");
const sioSource = fs.readFileSync(path.join(root, "js/sio.js"), "utf8");
const audioSource = fs.readFileSync(path.join(root, "js/audio.js"), "utf8");
const gpioSource = fs.readFileSync(path.join(root, "js/gpio.js"), "utf8");
const armSource = fs.readFileSync(path.join(root, "js/arm.js"), "utf8");
const thumbSource = fs.readFileSync(path.join(root, "js/thumb.js"), "utf8");
const coreSource = fs.readFileSync(path.join(root, "js/core.js"), "utf8");
const gbaSource = fs.readFileSync(path.join(root, "js/gba.js"), "utf8");

vm.runInContext(
	`${mmuSource}\n` +
		"globalThis.MMUTest = GameBoyAdvanceMMU;\n" +
		"globalThis.MemoryBlockTest = MemoryBlock;\n" +
		"globalThis.MemoryViewTest = MemoryView;\n" +
		"globalThis.BIOSViewTest = BIOSView;",
	context
);
vm.runInContext(
	`${fs.readFileSync(path.join(root, "js/savedata.js"), "utf8")}\n` +
		"globalThis.SRAMSavedataTest = SRAMSavedata;\n" +
		"globalThis.FlashSavedataTest = FlashSavedata;\n" +
		"globalThis.EEPROMSavedataTest = EEPROMSavedata;",
	context
);
vm.runInContext(
	`globalThis.MemoryAligned16 = class MemoryAligned16 {
		constructor(size) { this.buffer = new Uint16Array(size >> 1); }
		loadU8(offset) { return (this.buffer[offset >> 1] >> ((offset & 1) * 8)) & 0xff; }
		loadU16(offset) { return this.buffer[offset >> 1]; }
		load32(offset) { return this.buffer[(offset >> 1) & ~1] | (this.buffer[(offset >> 1) | 1] << 16); }
		store16(offset, value) { this.buffer[offset >> 1] = value; }
		store32(offset, value) { this.store16(offset, value); this.store16(offset + 2, value >>> 16); }
	};\n${videoSource}\n` +
	"globalThis.RendererTest = GameBoyAdvanceSoftwareRenderer;\n" +
	"globalThis.PaletteTest = GameBoyAdvancePalette;\n" +
	"globalThis.OAMTest = GameBoyAdvanceOAM;\n" +
	"globalThis.GameBoyAdvanceVRAMTest = GameBoyAdvanceVRAM;\n" +
	"globalThis.OBJTest = GameBoyAdvanceOBJ;",
	context
);
vm.runInContext(
	`${proxySource}\n` +
		"globalThis.MemoryProxyTest = MemoryProxy;\n" +
		"globalThis.RenderProxyTest = GameBoyAdvanceRenderProxy;",
	context
);
vm.runInContext(
	`${gbaVideoSource}\n` + "globalThis.VideoTest = GameBoyAdvanceVideo;",
	context
);
vm.runInContext(
	`${irqSource}\n` + "globalThis.IRQTest = GameBoyAdvanceInterruptHandler;",
	context
);
vm.runInContext(
	`${ioSource}\n` + "globalThis.IOTest = GameBoyAdvanceIO;",
	context
);
vm.runInContext(
	`${keypadSource}\n` + "globalThis.KeypadTest = GameBoyAdvanceKeypad;",
	context
);
vm.runInContext(
	`${fs.readFileSync(path.join(root, "js/util.js"), "utf8")}\n` +
		"globalThis.SerializerTest = Serializer;\n" +
		"globalThis.PointerTest = Pointer;\n" +
		`${sioSource}\n` +
		"globalThis.SIOTest = GameBoyAdvanceSIO;",
	context
);
vm.runInContext(
	`globalThis.window = {};\n${audioSource}\n` +
		"globalThis.AudioTest = GameBoyAdvanceAudio;",
	context
);
vm.runInContext(
	`${gpioSource}\n` +
		"globalThis.GPIOTest = GameBoyAdvanceGPIO;\n" +
		"globalThis.RTCTest = GameBoyAdvanceRTC;",
	context
);
vm.runInContext(
	`${armSource}\n${thumbSource}\n${coreSource}\n` +
		"globalThis.CPUTest = ARMCore;",
	context
);
vm.runInContext(
	`${gbaSource}\n` + "globalThis.GBATest = GameBoyAdvance;",
	context
);

const MMU = context.MMUTest;
const MemoryBlock = context.MemoryBlockTest;
const BIOSView = context.BIOSViewTest;
const SRAMSavedata = context.SRAMSavedataTest;
const FlashSavedata = context.FlashSavedataTest;
const EEPROMSavedata = context.EEPROMSavedataTest;
const Renderer = context.RendererTest;
const Palette = context.PaletteTest;
const OAM = context.OAMTest;
const VRAM = context.GameBoyAdvanceVRAMTest;
const OBJ = context.OBJTest;
const MemoryProxy = context.MemoryProxyTest;
const RenderProxy = context.RenderProxyTest;
const Video = context.VideoTest;
const IRQ = context.IRQTest;
const IO = context.IOTest;
const Keypad = context.KeypadTest;
const SIO = context.SIOTest;
const Audio = context.AudioTest;
const GPIO = context.GPIOTest;
const RTC = context.RTCTest;
const Serializer = context.SerializerTest;
const Pointer = context.PointerTest;
const CPU = context.CPUTest;
const GBA = context.GBATest;

test("pausing persists cartridge writes that have not reached local storage", () => {
	for (const state of [
		{ seenSave: true, writePending: false, expectedStores: 1 },
		{ seenSave: false, writePending: true, expectedStores: 1 },
		{ seenSave: false, writePending: false, expectedStores: 0 }
	]) {
		const gba = Object.create(GBA.prototype);
		let stores = 0;
		let flushes = 0;
		gba.paused = false;
		gba.queue = null;
		gba.seenSave = state.seenSave;
		gba.audio = { pause() {} };
		gba.mmu = {
			save: { writePending: state.writePending },
			saveNeedsFlush() { return this.save.writePending; },
			flushSave() {
				this.save.writePending = false;
				++flushes;
			}
		};
		gba.storeSavedata = () => { ++stores; };

		gba.pause();

		assert.equal(stores, state.expectedStores);
		assert.equal(gba.seenSave, false);
		assert.equal(gba.mmu.save.writePending, false);
		assert.equal(flushes, state.expectedStores);
	}
});

test("stable playback waits for the render worker instead of advancing past a pending frame", () => {
	const callbacks = [];
	const previousQueueFrame = context.queueFrame;
	const previousSetTimeout = context.window.setTimeout;
	context.queueFrame = (callback) => {
		callbacks.push(callback);
		return callbacks.length;
	};
	context.window.setTimeout = (callback) => {
		callbacks.push(callback);
		return callbacks.length;
	};
	try {
		let advanced = 0;
		const gba = {
			running: false,
			runGeneration: 0,
			paused: false,
			queue: null,
			reportFPS: null,
			throttle: 16,
			audio: { pause() {} },
			video: {
				renderPath: { worker: {}, workerFailed: false, delay: 1 }
			},
			advanceFrame() { ++advanced; }
		};

		GBA.prototype.runStable.call(gba);
		callbacks.shift()();
		assert.equal(advanced, 0);
		assert.equal(callbacks.length, 1);

		gba.video.renderPath.delay = 0;
		callbacks.shift()();
		assert.equal(advanced, 1);
		assert.equal(callbacks.length, 1);

		gba.paused = true;
		callbacks.shift()();
		assert.equal(callbacks.length, 0);
	} finally {
		if (previousQueueFrame === undefined) {
			delete context.queueFrame;
		} else {
			context.queueFrame = previousQueueFrame;
		}
		if (previousSetTimeout === undefined) {
			delete context.window.setTimeout;
		} else {
			context.window.setTimeout = previousSetTimeout;
		}
	}
});

test("frame pacing follows the GBA refresh period without millisecond drift", () => {
	const previousSetTimeout = context.window.setTimeout;
	const previousQueueFrame = context.window.queueFrame;
	const previousAddEventListener = context.window.addEventListener;
	const delays = [];
	context.window.setTimeout = (callback, delay) => {
		delays.push(delay);
		return delays.length;
	};
	context.window.addEventListener = () => {};
	try {
		const gba = new GBA();
		const framePeriod = (gba.video.TOTAL_LENGTH * 1000) / 16777216;
		assert.equal(gba.throttle, framePeriod);
		for (let i = 0; i < 6000; ++i) {
			context.window.queueFrame(() => {});
		}
		assert.ok(delays.every(delay => delay === 16 || delay === 17));
		const elapsed = delays.reduce((total, delay) => total + delay, 0);
		assert.ok(Math.abs(elapsed - framePeriod * delays.length) < 1);
	} finally {
		if (previousSetTimeout === undefined) {
			delete context.window.setTimeout;
		} else {
			context.window.setTimeout = previousSetTimeout;
		}
		if (previousQueueFrame === undefined) {
			delete context.window.queueFrame;
		} else {
			context.window.queueFrame = previousQueueFrame;
		}
		if (previousAddEventListener === undefined) {
			delete context.window.addEventListener;
		} else {
			context.window.addEventListener = previousAddEventListener;
		}
	}
});

test("stable playback prevents duplicate loops and stale callbacks after resume", () => {
	const callbacks = [];
	const previousQueueFrame = context.queueFrame;
	const previousSetTimeout = context.window.setTimeout;
	const previousClearTimeout = context.clearTimeout;
	context.queueFrame = (callback) => {
		const id = callbacks.length + 1;
		callbacks.push({ callback, id });
		return id;
	};
	context.window.setTimeout = (callback) => {
		const id = callbacks.length + 1;
		callbacks.push({ callback, id });
		return id;
	};
	context.clearTimeout = () => {};
	try {
		let advanced = 0;
		const gba = {
			running: false,
			runGeneration: 0,
			paused: false,
			queue: null,
			reportFPS: null,
			throttle: 16,
			audio: { pause() {} },
			mmu: { save: null },
			video: { renderPath: { worker: null } },
			advanceFrame() { ++advanced; }
		};

		GBA.prototype.runStable.call(gba);
		const staleCallback = callbacks.shift().callback;
		GBA.prototype.runStable.call(gba);
		assert.equal(callbacks.length, 0, "a second start must not queue another loop");

		GBA.prototype.pause.call(gba);
		GBA.prototype.runStable.call(gba);
		const resumedCallback = callbacks.shift().callback;
		staleCallback();
		assert.equal(advanced, 0, "the old loop must not resume with the new run");
		assert.equal(callbacks.length, 0);

		resumedCallback();
		assert.equal(advanced, 1);
		assert.equal(callbacks.length, 1);
		const nextCallback = callbacks.shift().callback;
		GBA.prototype.pause.call(gba);
		nextCallback();
		assert.equal(advanced, 1, "callbacks queued before pause must stay inert");
		assert.equal(callbacks.length, 0);
	} finally {
		if (previousQueueFrame === undefined) {
			delete context.queueFrame;
		} else {
			context.queueFrame = previousQueueFrame;
		}
		if (previousSetTimeout === undefined) {
			delete context.window.setTimeout;
		} else {
			context.window.setTimeout = previousSetTimeout;
		}
		if (previousClearTimeout === undefined) {
			delete context.clearTimeout;
		} else {
			context.clearTimeout = previousClearTimeout;
		}
	}
});

test("reset saves pending cartridge data before clearing the old cartridge", () => {
	for (const state of [
		{ seenSave: true, writePending: false, expectedStores: 1 },
		{ seenSave: false, writePending: true, expectedStores: 1 },
		{ seenSave: false, writePending: false, expectedStores: 0 }
	]) {
		const gba = Object.create(GBA.prototype);
		const order = [];
		let stores = 0;
		gba.paused = false;
		gba.running = true;
		gba.runGeneration = 3;
		gba.audio = { pause() {}, clear() {} };
		gba.io = { clear() {} };
		gba.video = {
			clear() {},
			renderPath: { palette: {}, vram: {}, oam: {} }
		};
		gba.sio = { clear() {} };
		gba.cpu = { resetCPU() {} };
		gba.mmu = {
			save: { writePending: state.writePending },
			saveNeedsFlush() { return this.save.writePending; },
			flushSave() {
				this.save.writePending = false;
				order.push("flush");
			},
			clear() {
				order.push("clear");
				this.save = null;
			},
			mmap() {}
		};
		gba.seenSave = state.seenSave;
		gba.storeSavedata = () => {
			++stores;
			order.push("store");
		};

		gba.reset();

		assert.equal(stores, state.expectedStores);
		assert.deepEqual(
			order,
			state.expectedStores ? ["store", "flush", "clear"] : ["clear"]
		);
		assert.equal(gba.seenSave, false);
		assert.equal(gba.running, false, "reset must stop the old run loop");
		assert.equal(gba.runGeneration, 4, "reset must invalidate old callbacks");
	}
});

test("savedata file loading resolves only after applying or rejecting the file", async () => {
	const originalFileReader = context.FileReader;
	const file = new ArrayBuffer(32);
	let warnings = 0;
	context.FileReader = class FileReaderTest {
		readAsArrayBuffer(input) {
			assert.equal(input, file);
			this.onload({ target: { result: file } });
		}
	};
	try {
		const gba = Object.create(GBA.prototype);
		let loaded = null;
		gba.setSavedata = (data) => { loaded = data; };
		gba.WARN = () => { ++warnings; };
		assert.equal(await gba.loadSavedataFromFile(file), true);
		assert.equal(loaded, file);
		assert.equal(warnings, 0);

		gba.setSavedata = () => { throw new Error("invalid save"); };
		assert.equal(await gba.loadSavedataFromFile(file), false);
		assert.equal(warnings, 1);
	} finally {
		context.FileReader = originalFileReader;
	}
});

test("ROM file read failures report failure exactly once", () => {
	const originalFileReader = context.FileReader;
	let reader;
	context.FileReader = class FileReaderTest {
		constructor() {
			reader = this;
		}
		readAsArrayBuffer(input) {
			this.input = input;
		}
	};
	try {
		const gba = Object.create(GBA.prototype);
		gba.setRom = () => true;
		const results = [];
		const file = new ArrayBuffer(0xc0);
		gba.loadRomFromFile(file, (result) => results.push(result));
		assert.equal(reader.input, file);
		reader.onerror();
		reader.onload({ target: { result: file } });
		assert.deepEqual(results, [false]);

		gba.loadRomFromFile(null, (result) => results.push(result));
		assert.deepEqual(results, [false, false]);

		context.FileReader = class FailingFileReader {
			readAsArrayBuffer() {
				throw new Error("read failed");
			}
		};
		gba.loadRomFromFile(file, (result) => results.push(result));
		assert.deepEqual(results, [false, false, false]);
	} finally {
		context.FileReader = originalFileReader;
	}
});

test("real BIOS images must have the full 16 KiB address space", () => {
	const gba = Object.create(GBA.prototype);
	const loaded = [];
	 gba.mmu = {
		SIZE_BIOS: 0x4000,
		loadBios(...args) { loaded.push(args); }
	};

	assert.throws(
		() => gba.setBios(new ArrayBuffer(0x3fff), true),
		{ name: "RangeError", message: /exactly 16384 bytes/ }
	);
	assert.equal(loaded.length, 0);

	const bios = new ArrayBuffer(0x4000);
	assert.doesNotThrow(() => gba.setBios(bios, true));
	const stub = new ArrayBuffer(165);
	assert.doesNotThrow(() => gba.setBios(stub));
	assert.deepEqual(loaded, [[bios, true], [stub, undefined]]);
});

test("Serializer round-trips nested save-state data through its public API", async () => {
	const blob = Serializer.serialize({
		version: 2,
		enabled: true,
		cpu: { cycles: 123456, mode: "ARM" }
	});
	const state = Serializer.deserealizeStream(
		new DataView(await blob.arrayBuffer()),
		new Pointer()
	);

	assert.equal(Serializer.TYPE, "application/octet-stream");
	assert.ok(blob.size > 0);
	assert.equal(state.version, 2);
	assert.equal(state.enabled, true);
	assert.equal(state.cpu.cycles, 123456);
	assert.equal(state.cpu.mode, "ARM");
});

test("PNG save-state decoding waits until the image has loaded", async () => {
	const serialized = new Uint8Array(
		await Serializer.serialize({ version: 3, cpu: { cycles: 87 } }).arrayBuffer()
	);
	const pixelCount = Math.ceil(serialized.length / 3);
	const encodedPixels = new Uint8ClampedArray(pixelCount * 4);
	for (let pixel = 0; pixel < pixelCount; ++pixel) {
		const source = pixel * 3;
		const target = pixel * 4;
		encodedPixels[target] = serialized[source] || 0;
		encodedPixels[target + 1] = serialized[source + 1] || 0;
		encodedPixels[target + 2] = serialized[source + 2] || 0;
	}

	class FakeFileReader {
		readAsDataURL() {
			this.onload({ target: { result: "data:image/png;base64,test" } });
		}
		readAsArrayBuffer(blob) {
			blob.arrayBuffer().then((result) => {
				this.onload({ target: { result } });
			});
		}
	}
	class FakeImage {
		width = 0;
		height = 0;
		setAttribute(name) {
			if (name == "src") {
				this.width = pixelCount;
				this.height = 1;
				this.onload();
			}
		}
	}
	class FakeCanvas {
		width = 0;
		height = 0;
		setAttribute(name, value) {
			this[name] = Number(value);
		}
		getContext() {
			return {
				drawImage() {},
				getImageData: (_x, _y, width, height) => {
					assert.equal(width, pixelCount);
					assert.equal(height, 1);
					return { data: encodedPixels };
				}
			};
		}
	}

	const previousReader = context.FileReader;
	const previousDocument = context.document;
	context.FileReader = FakeFileReader;
	context.document = {
		createElement(name) {
			return name == "img" ? new FakeImage() : new FakeCanvas();
		}
	};
	try {
		const state = await new Promise((resolve, reject) => {
			try {
				Serializer.deserializePNG(new Blob(["png"]), resolve);
			} catch (error) {
				reject(error);
			}
		});
		assert.equal(state.version, 3);
		assert.equal(state.cpu.cycles, 87);
	} finally {
		context.FileReader = previousReader;
		context.document = previousDocument;
	}
});

test("PNG save-state encoding preserves nested emulator state", async () => {
	const imageUrl = "data:image/png;base64,saved-state";
	const encodedImages = new Map();
	const screenshot = new Uint8ClampedArray([
		12, 24, 36, 255, 48, 60, 72, 255,
		84, 96, 108, 255, 120, 132, 144, 255
	]);
	class FakeFileReader {
		readAsArrayBuffer(blob) {
			blob.arrayBuffer().then((result) => {
				this.onload({ target: { result } });
			});
		}
		readAsDataURL() {
			this.onload({ target: { result: imageUrl } });
		}
	}
	class FakeImage {
		setAttribute(name, value) {
			if (name == "src") {
				const stored = encodedImages.get(value);
				this.width = this.naturalWidth = stored.width;
				this.height = this.naturalHeight = stored.height;
				this.pixels = stored.pixels;
				this.onload();
			}
		}
	}
	class FakeCanvas {
		width = 0;
		height = 0;
		pixels = null;
		setAttribute(name, value) {
			this[name] = Number(value);
		}
		getContext() {
			const canvas = this;
			let image = null;
			return {
				createImageData(width, height) {
					return { data: new Uint8ClampedArray(width * height * 4) };
				},
				putImageData(imageData) {
					canvas.pixels = imageData.data.slice(
						0,
						canvas.width * canvas.height * 4
					);
				},
				drawImage(source) {
					image = source;
				},
				getImageData(_x, _y, width, height) {
					if (image) {
						assert.equal(image.width, width);
						assert.equal(image.height, height);
						return { data: image.pixels };
					}
					return { data: screenshot };
				}
			};
		}
		toDataURL() {
			encodedImages.set(imageUrl, {
				width: this.width,
				height: this.height,
				pixels: this.pixels
			});
			return imageUrl;
		}
	}

	const previousReader = context.FileReader;
	const previousDocument = context.document;
	context.FileReader = FakeFileReader;
	context.document = {
		createElement(name) {
			return name == "img" ? new FakeImage() : new FakeCanvas();
		}
	};
	try {
		const savedUrl = await new Promise((resolve) => {
			Serializer.serializePNG(
				Serializer.serialize({ version: 4, cpu: { cycles: 9901 } }),
				{
					width: 2,
					height: 2,
					getContext() {
						return { getImageData: () => ({ data: screenshot }) };
					}
				},
				resolve
			);
		});
		assert.equal(savedUrl, imageUrl);
		const state = await new Promise((resolve, reject) => {
			Serializer.deserializePNG(new Blob(["png"]), (result, error) => {
				if (error) {
					reject(error);
				} else {
					resolve(result);
				}
			});
		});
		assert.equal(state.version, 4);
		assert.equal(state.cpu.cycles, 9901);
	} finally {
		context.FileReader = previousReader;
		context.document = previousDocument;
	}
});

function softwareInterruptHarness() {
	const base = 0x02000000;
	const bytes = new Uint8Array(0x10000);
	const mmu = {
		SIZE_BIOS: 0x4000,
		SIZE_WORKING_RAM: 0x40000,
		SIZE_WORKING_IRAM: 0x8000,
		REGION_WORKING_RAM: 2,
		REGION_WORKING_IRAM: 3,
		BASE_OFFSET: 24,
		OFFSET_MASK: 0xffffff,
		bios: { real: false },
		loadU8(address) { return bytes[(address - base) & 0xffff]; },
		loadU16(address) {
			const offset = (address - base) & 0xffff;
			return bytes[offset] | (bytes[(offset + 1) & 0xffff] << 8);
		},
		load16(address) {
			return (this.loadU16(address) << 16) >> 16;
		},
		load32(address) {
			const offset = (address - base) & 0xffff;
			return (
				bytes[offset] |
				(bytes[(offset + 1) & 0xffff] << 8) |
				(bytes[(offset + 2) & 0xffff] << 16) |
				(bytes[(offset + 3) & 0xffff] << 24)
			);
		},
		store8(address, value) { bytes[(address - base) & 0xffff] = value; },
		store16(address, value) {
			const offset = (address - base) & 0xffff;
			bytes[offset] = value;
			bytes[(offset + 1) & 0xffff] = value >>> 8;
		},
		store32(address, value) {
			this.store16(address, value);
			this.store16(address + 2, value >>> 16);
		}
	};
	const cpu = { gprs: new Int32Array(16), mmu };
	const warnings = [];
	const core = { mmu, WARN(message) { warnings.push(message); } };
	const irq = new IRQ();
	irq.cpu = cpu;
	irq.core = core;
	const io = {
		SOUNDBIAS: 0x88,
		DMA1CNT_HI: 0xc6,
		DMA2CNT_HI: 0xd2,
		registers: new Uint16Array(0x100),
		writes: [],
		loadU16(offset) { return this.registers[offset >> 1]; },
		store16(offset, value) {
			this.writes.push([offset, value]);
			this.registers[offset >> 1] = value;
		}
	};
	irq.io = io;
	return { irq, cpu, mmu, bytes, base, io, warnings };
}

function timedDivisionHarness(nextEvent) {
	const { irq, cpu } = softwareInterruptHarness();
	cpu.PC = 15;
	cpu.instructionWidth = 4;
	cpu.MODE_SYSTEM = 0x1f;
	cpu.MODE_IRQ = 0x12;
	cpu.MODE_ARM = 0;
	cpu.mode = cpu.MODE_SYSTEM;
	cpu.execMode = cpu.MODE_ARM;
	cpu.cycles = 0;
	cpu.gprs[cpu.PC] = 0x1008;
	cpu.raiseIRQ = function () {
		this.mode = this.MODE_IRQ;
		this.execMode = this.MODE_ARM;
		this.cpsrI = true;
		this.gprs[this.PC] = 0x1c;
	};
	irq.core.ASSERT = (condition, message) => assert.ok(condition, message);
	irq.dma = [0, 1, 2, 3].map(() => ({ doIrq: false, nextIRQ: 0 }));
	irq.timers = [0, 1, 2, 3].map(() => ({ enable: false, countUp: false }));
	irq.timersEnabled = 0;
	irq.enable = true;
	irq.enabledIRQs = irq.MASK_VBLANK;
	irq.video = {
		nextEvent,
		updateTimers() {
			if (cpu.cycles >= this.nextEvent && this.nextEvent !== Infinity) {
				this.nextEvent = Infinity;
				irq.raiseIRQ(irq.IRQ_VBLANK);
			}
		}
	};
	irq.audio = { enabled: false, updateTimers() {} };
	irq.nextEvent = nextEvent;
	return { irq, cpu };
}

function saveMemoryMmu(saveMarker) {
	const mmu = new MMU();
	mmu.cpu = { gprs: [], PC: 15, instructionWidth: 4 };
	mmu.core = {
		io: {
			DMA0CNT_HI: 0,
			DMA1CNT_HI: 0,
			DMA2CNT_HI: 0,
			DMA3CNT_HI: 0
		},
		irq: { dma: [{}, {}, {}, { count: 0, enable: false }] }
	};
	mmu.clear();

	const rom = new ArrayBuffer(0x200);
	const view = new DataView(rom);
	view.setUint8(0xb2, 0x96);
	for (let index = 0; index < saveMarker.length; ++index) {
		view.setUint8(0xe4 + index, saveMarker.charCodeAt(index));
	}
	mmu.loadRom(rom, true);
	return mmu;
}

test("short cartridge images are rejected without throwing while reading the header", () => {
	const mmu = new MMU();
	for (const size of [0, 0xb2, 0xb3, 0xbf]) {
		const rom = new ArrayBuffer(size);
		if (size > 0xb2) {
			new DataView(rom).setUint8(0xb2, 0x96);
		}
		assert.doesNotThrow(() => {
			assert.equal(mmu.loadRom(rom, true), null);
		});
	}
});

test("cartridge ROM reads past the image return the open-bus address pattern", () => {
	const mmu = new MMU();
	mmu.cpu = { gprs: new Int32Array(16), PC: 15, instructionWidth: 4 };
	mmu.core = {
		io: {
			DMA0CNT_HI: 0,
			DMA1CNT_HI: 0,
			DMA2CNT_HI: 0,
			DMA3CNT_HI: 0
		},
		irq: { dma: [{}, {}, {}, { count: 0, enable: false }] }
	};
	mmu.clear();

	const romSize = 0x00200000;
	const rom = new ArrayBuffer(romSize);
	const romView = new DataView(rom);
	romView.setUint8(0xb2, 0x96);
	romView.setUint32(0x100, 0x89abcdef, true);
	mmu.loadRom(rom, false);

	const base = mmu.BASE_CART0;
	const address = base + romSize;
	const byteAddress = address + 0x100;
	const byteOffset = byteAddress & mmu.OFFSET_MASK;
	const expectedByte =
		((byteOffset >>> 1) >>> ((byteOffset & 1) << 3)) & 0xff;
	const halfwordAddress = address + 0x10000;
	const halfwordOffset = halfwordAddress & mmu.OFFSET_MASK;
	const expectedHalfword = (halfwordOffset >>> 1) & 0xffff;
	const alignedOffset = byteOffset & ~3;
	const expectedWord =
		((alignedOffset >>> 1) & 0xffff) |
		((((alignedOffset + 2) >>> 1) & 0xffff) << 16);

	assert.equal(mmu.loadU8(base + 0xb2), 0x96);
	assert.equal(mmu.load32(base + 0x100), 0x89abcdef | 0);
	assert.equal(
		mmu.load32(base + 0x101),
		((0x89abcdef >>> 8) | (0x89abcdef << 24)) | 0
	);
	assert.equal(mmu.loadU8(byteAddress), expectedByte);
	assert.equal(
		mmu.load8(byteAddress),
		expectedByte > 0x7f ? expectedByte - 0x100 : expectedByte
	);
	assert.equal(mmu.load16(halfwordAddress), -0x8000);
	assert.equal(mmu.loadU16(halfwordAddress), expectedHalfword);
	assert.equal(mmu.load16(halfwordAddress + 1), -0x80);
	assert.equal(mmu.load32(byteAddress), expectedWord | 0);
	assert.equal(
		mmu.load32(byteAddress + 1),
		((expectedWord >>> 8) | (expectedWord << 24)) | 0
	);
});

test("1 MiB cartridges mirror through the first 4 MiB of the ROM window", () => {
	const mmu = new MMU();
	mmu.cpu = { gprs: new Int32Array(16), PC: 15, instructionWidth: 4 };
	mmu.core = {
		io: {
			DMA0CNT_HI: 0,
			DMA1CNT_HI: 0,
			DMA2CNT_HI: 0,
			DMA3CNT_HI: 0
		},
		irq: { dma: [{}, {}, {}, { count: 0, enable: false }] }
	};
	mmu.clear();

	const rom = new ArrayBuffer(0x00100000);
	const view = new DataView(rom);
	view.setUint8(0xb2, 0x96);
	view.setUint32(0x100, 0x89abcdef, true);
	view.setUint8(0x000fffff, 0x7e);
	mmu.loadRom(rom, false);

	const base = mmu.BASE_CART0;
	for (const mirror of [0, 0x00100000, 0x00200000, 0x00300000]) {
		assert.equal(mmu.loadU8(base + mirror + 0xb2), 0x96);
		assert.equal(mmu.load32(base + mirror + 0x100), 0x89abcdef | 0);
	}
	assert.equal(mmu.loadU8(base + 0x003fffff), 0x7e);

	const beyondMirror = base + 0x00400000;
	const offset = beyondMirror & mmu.OFFSET_MASK;
	const openBusByte = ((offset >>> 1) >>> ((offset & 1) << 3)) & 0xff;
	assert.equal(mmu.loadU8(beyondMirror), openBusByte);
});

test("SRAM mirrors safely and emulates its 8-bit data bus", () => {
	const mmu = saveMemoryMmu("SRAM_V");
	const e = mmu.BASE_CART_SRAM;
	const f = mmu.BASE_CART_SRAM_MIRROR;

	assert.equal(mmu.memory[mmu.REGION_CART_SRAM_MIRROR], mmu.save);
	mmu.store8(e + 0x00ffff, 0x5a);
	assert.equal(mmu.loadU8(e + 0x007fff), 0x5a);
	assert.equal(mmu.loadU8(f + 0x00ffff), 0x5a);

	mmu.store16(f + 0x20, 0x1234);
	mmu.store16(e + 0x21, 0x1234);
	mmu.store32(f + 0x22, 0xa1b2c3d4);
	assert.equal(mmu.loadU8(e + 0x20), 0x34);
	assert.equal(mmu.loadU8(e + 0x21), 0x12);
	assert.equal(mmu.loadU8(e + 0x22), 0xb2);
	assert.equal(mmu.loadU8(e + 0x23), 0xff);
	assert.equal(mmu.loadU16(e + 0x22), 0xb2b2);
	assert.equal(mmu.load32(e + 0x22), 0xb2b2b2b2 | 0);
	assert.equal(mmu.load16(e + 0x22), 0xffffb2b2 | 0);

	mmu.adjustTimings(0x0003);
	assert.equal(mmu.waitstates[mmu.REGION_CART_SRAM_MIRROR], 8);
	assert.equal(
		mmu.waitstatesSeq32[mmu.REGION_CART_SRAM_MIRROR],
		mmu.waitstatesSeq32[mmu.REGION_CART_SRAM]
	);
});

test("cartridges without a save signature expose an open-bus save region", () => {
	const mmu = saveMemoryMmu("");
	assert.equal(mmu.save, null);
	for (const address of [mmu.BASE_CART_SRAM, mmu.BASE_CART_SRAM_MIRROR]) {
		assert.equal(mmu.loadU8(address), 0xff);
		assert.equal(mmu.loadU16(address), 0xffff);
		assert.equal(mmu.load32(address), -1);
		mmu.store8(address, 0x12);
		assert.equal(mmu.loadU8(address), 0xff);
	}
});

test("save-less cartridges can advance frames without save-state dereferences", () => {
	const gba = Object.create(GBA.prototype);
	const mmu = saveMemoryMmu("");
	let steps = 0;
	gba.mmu = mmu;
	gba.step = () => {
		++steps;
	};
	gba.seenSave = false;

	assert.doesNotThrow(() => gba.advanceFrame());
	assert.equal(steps, 1);
	assert.equal(mmu.saveNeedsFlush(), false);
	assert.doesNotThrow(() => mmu.flushSave());
	assert.doesNotThrow(() => gba.storeSavedata());
});

test("imported save data is normalized to the cartridge's mapped chip size", () => {
	const mmu = saveMemoryMmu("SRAM_V");
	const shortSave = new Uint8Array(0x100);
	shortSave[0] = 0x5a;
	assert.throws(
		() => mmu.loadSavedata(shortSave.buffer),
		{ name: "RangeError", message: /too small/ }
	);
	assert.equal(mmu.save.buffer.byteLength, mmu.SIZE_CART_SRAM);
	assert.equal(mmu.save.writePending, false);
	assert.doesNotThrow(() => mmu.save.loadU8(mmu.SIZE_CART_SRAM - 1));

	const oversizedSave = new Uint8Array(mmu.SIZE_CART_SRAM + 0x100);
	oversizedSave[mmu.SIZE_CART_SRAM - 1] = 0xa5;
	oversizedSave[mmu.SIZE_CART_SRAM] = 0x3c;
	mmu.loadSavedata(oversizedSave.buffer);
	assert.equal(mmu.save.buffer.byteLength, mmu.SIZE_CART_SRAM);
	assert.equal(mmu.save.loadU8(mmu.SIZE_CART_SRAM - 1), 0xa5);
});

test("512-byte EEPROM saves fit the full cartridge backing without out-of-bounds reads", () => {
	const mmu = saveMemoryMmu("EEPROM_V");
	const save = new Uint8Array(0x200);
	save[0x1ff] = 0x7e;
	mmu.loadSavedata(save.buffer);
	assert.equal(mmu.save.buffer.byteLength, mmu.SIZE_CART_EEPROM);
	assert.equal(mmu.save.view.getUint8(0x1ff), 0x7e);
	assert.equal(mmu.save.view.getUint8(0x200), 0xff);
	assert.equal(mmu.save.view.getUint8(0x1fff), 0xff);
	assert.doesNotThrow(() => mmu.save.view.getUint8(0x1fff));
	assert.equal(mmu.save.realSize, 0);
});

test("new SRAM, Flash, and EEPROM chips start in their erased 0xFF state", () => {
	const sram = new SRAMSavedata(16);
	const flash = new FlashSavedata(0x10000);
	const eeprom = new EEPROMSavedata(16, {
		core: { irq: { dma: [{}, {}, {}, {}] } }
	});
	for (const save of [sram, flash, eeprom]) {
		assert.equal(save.view.getUint8(0), 0xff);
		assert.equal(save.view.getUint8(save.view.byteLength - 1), 0xff);
	}
});

test("32-bit memory accesses charge VRAM and OAM waitstates to the right regions", () => {
	const mmu = new MMU();
	mmu.cpu = { cycles: 0 };
	mmu.waitstates32 = mmu.WAITSTATES_32;
	mmu.waitstatesSeq32 = mmu.WAITSTATES_SEQ_32;

	assert.equal(mmu.WAITSTATES_32[mmu.REGION_VRAM], 1);
	assert.equal(mmu.WAITSTATES_32[mmu.REGION_OAM], 0);
	assert.equal(mmu.WAITSTATES_SEQ_32[mmu.REGION_VRAM], 1);
	assert.equal(mmu.WAITSTATES_SEQ_32[mmu.REGION_OAM], 0);

	mmu.wait32(mmu.BASE_VRAM);
	mmu.wait32(mmu.BASE_OAM);
	assert.equal(mmu.cpu.cycles, 3);

	mmu.cpu.cycles = 0;
	mmu.waitSeq32(mmu.BASE_VRAM);
	mmu.waitSeq32(mmu.BASE_OAM);
	assert.equal(mmu.cpu.cycles, 3);
});

test("Flash byte commands remain safe through halfword and word cartridge writes", () => {
	const mmu = saveMemoryMmu("FLASH_V");
	const base = mmu.BASE_CART_SRAM;
	const save = mmu.save;

	assert.ok(save instanceof FlashSavedata);
	mmu.store16(base + 0x5555, 0xaa00);
	mmu.store32(mmu.BASE_CART_SRAM_MIRROR + 0x102aaa, 0x00550000);
	mmu.store16(base + 0x5555, 0x9000);

	assert.equal(save.first, 0);
	assert.equal(save.second, 0);
	assert.equal(save.idMode, true);
	assert.equal(mmu.loadU16(base), ((save.id & 0xff) * 0x101) & 0xffff);
});

test("Flash chip and sector erases are marked for persistent save", () => {
	const mmu = saveMemoryMmu("FLASH1M_V");
	const base = mmu.BASE_CART_SRAM;
	const save = mmu.save;

	function erase(address, command) {
		mmu.store8(base + 0x5555, 0xaa);
		mmu.store8(base + 0x2aaa, 0x55);
		mmu.store8(base + 0x5555, 0x80);
		mmu.store8(base + 0x5555, 0xaa);
		mmu.store8(base + 0x2aaa, 0x55);
		mmu.store8(base + address, command);
	}

	save.view.setUint8(0, 0x12);
	save.view.setUint8(0x10000, 0x34);
	save.writePending = false;
	erase(0x5555, 0x10);
	assert.equal(save.view.getUint8(0), 0xff);
	assert.equal(save.view.getUint8(0x10000), 0xff);
	assert.equal(mmu.saveNeedsFlush(), true);
	mmu.flushSave();
	assert.equal(mmu.saveNeedsFlush(), false);

	save.view.setUint8(0x1000, 0x56);
	save.view.setUint8(0x2000, 0x78);
	save.view.setUint8(0x11000, 0x9a);
	save.writePending = false;
	erase(0x1000, 0x30);
	assert.equal(save.view.getUint8(0x1000), 0xff);
	assert.equal(save.view.getUint8(0x2000), 0x78);
	assert.equal(save.view.getUint8(0x11000), 0x9a);
	assert.equal(mmu.saveNeedsFlush(), true);

	const gba = Object.create(GBA.prototype);
	let persistedSectorByte = null;
	gba.mmu = mmu;
	gba.audio = { pause() {} };
	gba.queue = null;
	gba.seenSave = false;
	gba.storeSavedata = () => {
		persistedSectorByte = save.view.getUint8(0x1000);
	};
	gba.pause();
	assert.equal(persistedSectorByte, 0xff);
	assert.equal(mmu.saveNeedsFlush(), false);
});

test("GPIO register windows accept word writes without aborting the game", () => {
	const mmu = saveMemoryMmu("SRAM_V");
	const rom = mmu.memory[mmu.REGION_CART0];
	const base = mmu.BASE_CART0;

	assert.doesNotThrow(() => mmu.store32(base + 0xc4, 0x000f000a));
	assert.equal(rom.gpio.direction, 0x0f);
	assert.doesNotThrow(() => mmu.store32(base + 0xc8, 0x12340001));
	assert.equal(rom.gpio.readWrite, 1);
});

test("EEPROM bus-width accesses do not crash the emulator", () => {
	const mmu = saveMemoryMmu("EEPROM_V");
	const eepromAddress = 0x0d000000;

	assert.ok(mmu.save instanceof EEPROMSavedata);

	assert.equal(mmu.load8(eepromAddress), 1);
	assert.equal(mmu.loadU8(eepromAddress), 1);
	assert.equal(mmu.load32(eepromAddress), 0x00010001);
	assert.doesNotThrow(() => mmu.store8(eepromAddress, 1));
	assert.doesNotThrow(() => mmu.store32(eepromAddress, 0x00010001));
});

function keypadHarness() {
	const irq = new IRQ();
	const io = new IO();
	const keypad = new Keypad();
	const cpu = { irq, raiseIRQ() { this.irqRaised = (this.irqRaised || 0) + 1; } };
	io.cpu = cpu;
	io.keypad = keypad;
	io.core = { STUB_REG() {} };
	io.registers = new Uint16Array(0x200);
	irq.cpu = cpu;
	irq.io = io;
	irq.interruptFlags = 0;
	irq.enabledIRQs = irq.MASK_KEYPAD;
	irq.enable = true;
	keypad.core = { irq };
	return { irq, io, keypad, cpu };
}

function videoHarness(events) {
	const video = Object.create(Video.prototype);
	Object.assign(video, {
		HORIZONTAL_PIXELS: 240,
		HBLANK_PIXELS: 68,
		HDRAW_LENGTH: 1006,
		HBLANK_LENGTH: 226,
		HORIZONTAL_LENGTH: 1232,
		VERTICAL_PIXELS: 160,
		VBLANK_PIXELS: 68,
		VERTICAL_TOTAL_PIXELS: 228,
		TOTAL_LENGTH: 280896,
		vblankCallback() {},
		drawCallback() {},
		core: { encodeBase64() {}, decodeBase64() {} },
		cpu: {
			cycles: 0,
			mmu: {
				runHblankDmas() { events.push(["hblank-dma", video.vcount]); },
				runVblankDmas() { events.push(["vblank-dma", video.vcount]); }
			},
			irq: {
				IRQ_VBLANK: 1,
				IRQ_HBLANK: 2,
				IRQ_VCOUNTER: 3,
				raiseIRQ(type) { events.push(["irq", type]); }
			}
		},
		renderPath: {
			clear() {},
			freeze() { return {}; },
			defrost() {},
			drawScanline(line) { events.push(["draw", line]); },
			primeObjOamForLineZero() { events.push(["oam-prime", video.vcount]); },
			finishDraw() { events.push(["finish", video.vcount]); },
			startDraw() { events.push(["start", video.vcount]); }
		}
	});
	video.clear();
	return { video, cpu: video.cpu };
}

function recordingMemory() {
	return {
		reads: [],
		writes: [],
		load8(offset) { this.reads.push(["load8", offset]); return offset; },
		load16(offset) { this.reads.push(["load16", offset]); return offset; },
		load32(offset) { this.reads.push(["load32", offset]); return offset; },
		loadU8(offset) { this.reads.push(["loadU8", offset]); return offset; },
		loadU16(offset) { this.reads.push(["loadU16", offset]); return offset; },
		store8(offset, value) { this.writes.push(["store8", offset, value]); },
		store16(offset, value) { this.writes.push(["store16", offset, value]); },
		store32(offset, value) { this.writes.push(["store32", offset, value]); },
		invalidatePage() {}
	};
}

test("VRAM mirror addresses wrap every 128 KiB and fold the upper 32 KiB", () => {
	const mmu = new MMU();
	const vram = recordingMemory();
	mmu.memory = [];
	mmu.memory[mmu.REGION_VRAM] = vram;

	assert.equal(mmu.loadU8(0x06018000), 0x10000);
	assert.equal(mmu.loadU8(0x0601ffff), 0x17fff);
	assert.equal(mmu.loadU8(0x06020000), 0);
	assert.equal(mmu.loadU8(0x06ffffff), 0x17fff);

	mmu.store16(0x06018000, 0x1234);
	assert.deepEqual(vram.writes[0], ["store16", 0x10000, 0x1234]);
});

test("OAM accesses mirror every 1 KiB", () => {
	const mmu = new MMU();
	const oam = recordingMemory();
	mmu.memory = [];
	mmu.memory[mmu.REGION_OAM] = oam;

	assert.equal(mmu.load16(0x07000402), 2);
	mmu.store16(0x07000402, 0xabcd);
	assert.deepEqual(oam.writes[0], ["store16", 2, 0xabcd]);
});

test("palette byte writes replicate the byte into the addressed halfword", () => {
	const palette = new Palette();
	palette.store8(0x003, 0x5a);
	palette.store8(0x203, 0xc3);

	assert.equal(palette.loadU16(0x002), 0x5a5a);
	assert.equal(palette.loadU16(0x202), 0xc3c3);
	assert.equal(palette.adjustedColors[0][1], palette.adjustColor(0x5a5a));
	assert.equal(palette.adjustedColors[1][1], palette.adjustColor(0xc3c3));
});

test("software RegisterRamReset clears every palette entry", () => {
	const renderer = Object.create(Renderer.prototype);
	renderer.palette = new Palette();
	for (let index = 0; index < 512; ++index) {
		renderer.palette.store16(index << 1, 0x7fff);
	}

	renderer.clearSubsets({ SIZE_PALETTE_RAM: 0x400 }, 0x04);

	assert.ok(renderer.palette.colors[0].every((color) => color === 0));
	assert.ok(renderer.palette.colors[1].every((color) => color === 0));
});

test("brightness effects start with the reset BLDY value of zero", () => {
	for (const scenario of [
		{ control: 0x0081, color: 0x0000 },
		{ control: 0x00c1, color: 0x7fff }
	]) {
		const renderer = new Renderer();
		renderer.clear({ SIZE_VRAM: 0x18000, SIZE_OAM: 0x400 });
		renderer.palette.store16(0x002, scenario.color);
		renderer.writeBlendControl(scenario.control);

		assert.equal(
			renderer.palette.accessColor(renderer.LAYER_BG0, 1),
			scenario.color
		);

		renderer.writeBlendY(8);
		assert.equal(renderer.palette.accessColor(renderer.LAYER_BG0, 1), 0x3def);
	}
});

test("renderer snapshots skip unchanged palette and OAM decoding", () => {
	const palette = new Palette();
	const paletteSnapshot = new Uint16Array(512);
	paletteSnapshot[1] = 0x1234;
	const originalPaletteStore = palette.store16;
	let paletteStores = 0;
	palette.store16 = function(offset, value) {
		++paletteStores;
		return originalPaletteStore.call(this, offset, value);
	};

	palette.overwrite(paletteSnapshot);
	assert.equal(paletteStores, 512);
	palette.setBlendY(0.5);
	const adjustedColor = palette.adjustedColors[0][1];
	paletteStores = 0;
	palette.overwrite(paletteSnapshot);
	assert.equal(paletteStores, 0);
	assert.equal(palette.adjustedColors[0][1], adjustedColor);
	paletteSnapshot[1] = 0x4321;
	palette.overwrite(paletteSnapshot);
	assert.equal(paletteStores, 1);
	assert.equal(palette.colors[0][1], 0x4321);

	const oam = new OAM(0x400);
	const oamSnapshot = new Uint16Array(0x200);
	const originalOAMStore = oam.store16;
	let oamStores = 0;
	oam.store16 = function(offset, value) {
		++oamStores;
		return originalOAMStore.call(this, offset, value);
	};

	oam.overwrite(oamSnapshot);
	assert.equal(oamStores, 0x200);
	assert.equal(oam.objs[0].disable, 0);
	oamStores = 0;
	oam.overwrite(oamSnapshot);
	assert.equal(oamStores, 0);
	oamSnapshot[0] = 0x0200;
	oam.overwrite(oamSnapshot);
	assert.equal(oamStores, 1);
	assert.equal(oam.objs[0].disable, 0x0200);
});

test("VRAM byte writes mirror in BG memory and are ignored in OBJ memory", () => {
	const vram = new VRAM(0x18000);
	const video = { backgroundMode: 0 };
	vram.video = video;
	vram.store8(0x0001, 0x34);
	vram.store8(0x10000, 0x56);
	assert.equal(vram.loadU16(0x0000), 0x3434);
	assert.equal(vram.loadU16(0x10000), 0x0000);

	video.backgroundMode = 3;
	vram.store8(0x10000, 0x78);
	vram.store8(0x14000, 0x9a);
	assert.equal(vram.loadU16(0x10000), 0x7878);
	assert.equal(vram.loadU16(0x14000), 0x0000);
});

test("worker VRAM applies the current bitmap-mode OBJ byte-write boundary", () => {
	const proxy = Object.create(RenderProxy.prototype);
	proxy.worker = { postMessage() {} };
	proxy.clear({ SIZE_PALETTE_RAM: 0x400, SIZE_VRAM: 0x18000, SIZE_OAM: 0x400 });
	proxy.writeDisplayControl(0);
	proxy.vram.store8(0x10000, 0x12);
	assert.equal(proxy.vram.loadU16(0x10000), 0);

	proxy.writeDisplayControl(3);
	proxy.vram.store8(0x10000, 0x34);
	proxy.vram.store8(0x14000, 0x56);
	assert.equal(proxy.vram.loadU16(0x10000), 0x3434);
	assert.equal(proxy.vram.loadU16(0x14000), 0);
});

test("worker VRAM byte-write restrictions survive RegisterRamReset", () => {
	const proxy = Object.create(RenderProxy.prototype);
	proxy.worker = { postMessage() {} };
	const mmu = {
		SIZE_PALETTE_RAM: 0x400,
		SIZE_VRAM: 0x18000,
		SIZE_OAM: 0x400,
		REGION_VRAM: 0x06,
		mmap() {}
	};
	proxy.clear(mmu);
	proxy.writeDisplayControl(0);
	proxy.clearSubsets(mmu, 0x08);
	proxy.vram.store8(0x10000, 0x12);
	assert.equal(proxy.vram.loadU16(0x10000), 0);

	proxy.writeDisplayControl(3);
	proxy.clearSubsets(mmu, 0x08);
	proxy.vram.store8(0x10000, 0x34);
	proxy.vram.store8(0x14000, 0x56);
	assert.equal(proxy.vram.loadU16(0x10000), 0x3434);
	assert.equal(proxy.vram.loadU16(0x14000), 0);
});

test("RegisterRamReset drops prefetched code when worker VRAM is replaced", () => {
	const proxy = Object.create(RenderProxy.prototype);
	proxy.worker = { postMessage() {} };
	const mmu = {
		SIZE_PALETTE_RAM: 0x400,
		SIZE_VRAM: 0x18000,
		SIZE_OAM: 0x400,
		REGION_PALETTE_RAM: 5,
		REGION_VRAM: 6,
		REGION_OAM: 7,
		memory: [],
		mmap(region, memory) { this.memory[region] = memory; }
	};
	proxy.clear(mmu);
	const previousVram = proxy.vram;
	const irq = new IRQ();
	irq.core = { mmu };
	irq.video = { renderPath: proxy };
	irq.io = {
		DISPCNT: 0,
		DEFAULT_DISPCNT: 0x80,
		store16() {}
	};
	irq.cpu = {
		instruction: function staleVramInstruction() {},
		page: { invalid: false },
		pageRegion: mmu.REGION_VRAM
	};

	irq.registerRamReset(0x08);

	assert.notEqual(proxy.vram, previousVram);
	assert.equal(mmu.memory[mmu.REGION_VRAM], proxy.vram);
	assert.equal(irq.cpu.instruction, null);
	assert.equal(irq.cpu.page, null);
	assert.equal(irq.cpu.pageRegion, -1);
});

test("renderer transfers immutable memory snapshots to its worker without duplicate buffers", () => {
	const proxy = Object.create(RenderProxy.prototype);
	const messages = [];
	const livePalette = new ArrayBuffer(8);
	const liveOam = new ArrayBuffer(8);
	const liveVram = new ArrayBuffer(16);
	const palette = livePalette.slice(0);
	const oam = liveOam.slice(0);
	const vram = liveVram.slice(0);
	proxy.worker = {
		postMessage(message, transferables) {
			messages.push({
				message: structuredClone(message, { transfer: transferables }),
				transferables
			});
		}
	};
	proxy.skipFrame = false;
	proxy.delay = 1;
	proxy.currentFrame = 3;
	proxy.scanlineQueue = [
		{
			y: 4,
			dirty: { memory: { palette, oam, vram: [vram] } }
		},
		{
			y: 9,
			dirty: { memory: { palette, vram: [vram] } }
		}
	];

	proxy.finishDraw({});

	assert.equal(messages.length, 1);
	assert.equal(messages[0].message.type, "finish");
	assert.equal(messages[0].message.frame, 3);
	assert.equal(messages[0].transferables.length, 3);
	assert.equal(messages[0].transferables[0], palette);
	assert.equal(messages[0].transferables[1], oam);
	assert.equal(messages[0].transferables[2], vram);
	assert.equal(palette.byteLength, 0);
	assert.equal(oam.byteLength, 0);
	assert.equal(vram.byteLength, 0);
	assert.equal(livePalette.byteLength, 8);
	assert.equal(liveOam.byteLength, 8);
	assert.equal(liveVram.byteLength, 16);
	assert.equal(
		messages[0].message.scanlines[0].dirty.memory.palette.byteLength,
		8
	);
	assert.equal(proxy.scanlineQueue.length, 0);
});

test("worker VRAM snapshots copy only changed pages and preserve full resets", () => {
	const proxy = Object.create(RenderProxy.prototype);
	const messages = [];
	proxy.worker = {
		postMessage(message, transferables) {
			messages.push(structuredClone(message, { transfer: transferables }));
		}
	};
	const mmu = {
		SIZE_PALETTE_RAM: 0x400,
		SIZE_VRAM: 0x18000,
		SIZE_OAM: 0x400,
		REGION_PALETTE_RAM: 5,
		REGION_VRAM: 6,
		REGION_OAM: 7,
		mmap() {}
	};
	proxy.clear(mmu);
	messages.length = 0;
	proxy.dirty = null;
	proxy.skipFrame = false;
	proxy.workerFailed = false;
	proxy.vram.store16(0x0030, 0x1111);
	proxy.vram.store16(0x0040, 0x2222);
	proxy.vram.store16(0x0100, 0x3333);
	proxy.drawScanline(8);

	const updates = proxy.scanlineQueue[0].dirty.memory.vram[0].patches;
	assert.deepEqual(Array.from(updates, ({ offset }) => offset), [0, 0x100]);
	assert.deepEqual(Array.from(updates, ({ buffer }) => buffer.byteLength), [0x100, 0x100]);
	assert.equal(new Uint16Array(updates[0].buffer)[0x30 >> 1], 0x1111);
	proxy.vram.store16(0x0030, 0xaaaa);
	assert.equal(new Uint16Array(updates[0].buffer)[0x30 >> 1], 0x1111);

	for (let page = 0; page < 16; ++page) {
		proxy.vram.store16(page * 0x100, page + 1);
	}
	proxy.drawScanline(9);
	assert.equal(proxy.scanlineQueue[1].dirty.memory.vram[0].byteLength, 0x2000);

	proxy.clearSubsets(mmu, 0x08);
	proxy.drawScanline(10);
	assert.equal(proxy.scanlineQueue[2].dirty.memory.vram[0].byteLength, 0x2000);
	proxy.finishDraw({});
	assert.equal(messages.length, 1);
	assert.equal(
		new Uint16Array(
			messages[0].scanlines[0].dirty.memory.vram[0].patches[0].buffer
		)[0x30 >> 1],
		0x1111
	);
	assert.equal(messages[0].scanlines[1].dirty.memory.vram[0].byteLength, 0x2000);
	assert.equal(messages[0].scanlines[2].dirty.memory.vram[0].byteLength, 0x2000);
});

test("worker applies sparse VRAM pages at their original addresses", () => {
	const workerContext = vm.createContext({ console, Blob });
	workerContext.importScripts = () => {};
	workerContext.self = { postMessage() {} };
	vm.runInContext(videoSource, workerContext);
	vm.runInContext(
		fs.readFileSync(path.join(root, "js/video/worker.js"), "utf8"),
		workerContext
	);
	const send = (data) => workerContext.self.onmessage({ data });
	send({ type: "clear", SIZE_VRAM: 0x18000, SIZE_OAM: 0x400 });
	send({ type: "start", backing: { data: new Uint8ClampedArray(240 * 160 * 4) } });
	const firstPage = new Uint16Array(0x80);
	const secondPage = new Uint16Array(0x80);
	const thirdPage = new Uint16Array(0x80);
	firstPage[3] = 0x1234;
	secondPage[4] = 0x5678;
	thirdPage[5] = 0x9abc;
	send({
		type: "finish",
		frame: 1,
		scanlines: [
			{
				y: 0,
				dirty: {
					memory: {
						vram: [
							{
								patches: [
									{ offset: 0, buffer: firstPage.buffer },
									{ offset: 0x100, buffer: secondPage.buffer }
								]
							},
							{ patches: [{ offset: 0x200, buffer: thirdPage.buffer }] }
						]
					}
				}
			}
		]
	});

	assert.equal(workerContext.video.vram.loadU16(6), 0x1234);
	assert.equal(workerContext.video.vram.loadU16(0x108), 0x5678);
	assert.equal(workerContext.video.vram.loadU16(0x220a), 0x9abc);
});

test("worker applies a sparse VRAM update on its captured scanline", () => {
	const workerContext = vm.createContext({ console, Blob });
	workerContext.importScripts = () => {};
	workerContext.self = { postMessage() {} };
	vm.runInContext(videoSource, workerContext);
	vm.runInContext(
		fs.readFileSync(path.join(root, "js/video/worker.js"), "utf8"),
		workerContext
	);
	const send = (data) => workerContext.self.onmessage({ data });
	const backing = { data: new Uint8ClampedArray(240 * 160 * 4) };
	send({ type: "clear", SIZE_VRAM: 0x18000, SIZE_OAM: 0x400 });
	send({ type: "start", backing });
	const initialVram = new Uint16Array(0x18000 >> 1);
	initialVram[0] = 0x001f;
	const lineOnePage = new Uint16Array(0x80);
	lineOnePage[(0x1e0 - 0x100) >> 1] = 0x7c00;
	send({
		type: "finish",
		frame: 1,
		scanlines: [
			{
				y: 0,
				dirty: {
					DISPCNT: 0x0403,
					memory: { vram: [initialVram.buffer] }
				}
			},
			{
				y: 1,
				dirty: {
					memory: {
						vram: [
							{
								patches: [
									{ offset: 0x100, buffer: lineOnePage.buffer }
								]
							}
						]
					}
				}
			}
		]
	});

	assert.deepEqual(Array.from(backing.data.slice(0, 3)), [248, 0, 0]);
	assert.deepEqual(Array.from(backing.data.slice(240 * 4, 240 * 4 + 3)), [0, 0, 248]);
});

test("render proxy keeps and transfers the line-zero OAM prime snapshot", async () => {
	const messages = [];
	const proxy = Object.create(RenderProxy.prototype);
	proxy.worker = {
		postMessage(message, transferables) {
			messages.push(structuredClone(message, { transfer: transferables }));
		}
	};
	proxy.clear({ SIZE_PALETTE_RAM: 0x400, SIZE_VRAM: 0x18000, SIZE_OAM: 0x400 });
	messages.length = 0;
	proxy.skipFrame = false;
	proxy.workerFailed = false;
	proxy.delay = 0;
	proxy.currentFrame = 1;

	proxy.oam.store16(0, 0x0200);
	proxy.primeObjOamForLineZero();
	proxy.oam.store16(0, 1);
	const liveOam = proxy.oam.blocks[0].buffer;
	proxy.drawScanline(0);

	assert.equal(proxy.scanlineQueue.length, 1);
	assert.equal(new Uint16Array(proxy.scanlineQueue[0].oamPrime)[0], 0x0200);
	assert.equal(new Uint16Array(proxy.scanlineQueue[0].dirty.memory.oam)[0], 1);
	proxy.finishDraw({});
	assert.equal(messages.length, 1);
	assert.equal(messages[0].scanlines[0].oamPrime.byteLength, 0x400);
	assert.equal(new Uint16Array(messages[0].scanlines[0].oamPrime)[0], 0x0200);
	assert.equal(liveOam.byteLength, 0x400);
});

test("render proxy save states preserve a pending line-zero OAM prime", async () => {
	const proxy = Object.create(RenderProxy.prototype);
	proxy.worker = { postMessage() {} };
	proxy.clear({ SIZE_PALETTE_RAM: 0x400, SIZE_VRAM: 0x18000, SIZE_OAM: 0x400 });
	proxy.oam.store16(0, 0x0200);
	proxy.primeObjOamForLineZero();
	const frozen = proxy.freeze();
	const bytes = new Uint8Array(await frozen.pendingOamPrime.arrayBuffer());
	assert.equal(new DataView(bytes.buffer).getUint32(0, true), 0x400);
	assert.equal(new Uint16Array(bytes.buffer, 4)[0], 0x0200);

	const payload = async (blob) => {
		const serialized = new Uint8Array(await blob.arrayBuffer());
		return serialized.slice(4).buffer;
	};
	const restored = Object.create(RenderProxy.prototype);
	restored.worker = { postMessage() {} };
	restored.clear({ SIZE_PALETTE_RAM: 0x400, SIZE_VRAM: 0x18000, SIZE_OAM: 0x400 });
	restored.defrost({
		palette: await payload(frozen.palette),
		vram: await payload(frozen.vram),
		oam: await payload(frozen.oam),
		pendingOamPrime: await payload(frozen.pendingOamPrime)
	});
	assert.equal(new Uint16Array(restored.pendingOamPrime)[0], 0x0200);
});

test("render proxy delay counts posted frames and releases playback on worker failure", () => {
	const messages = [];
	const proxy = Object.create(RenderProxy.prototype);
	proxy.worker = {
		postMessage(message) { messages.push(message); }
	};
	proxy.delay = 0;
	proxy.skipFrame = false;
	proxy.workerFailed = false;
	proxy.currentFrame = 0;
	proxy.scanlineQueue = [];

	proxy.startDraw();
	assert.equal(proxy.currentFrame, 1);
	assert.equal(proxy.delay, 0);
	proxy.finishDraw({});
	assert.equal(proxy.delay, 1);
	assert.equal(messages.length, 1);

	const error = new Error("worker failed");
	let reportedError = null;
	proxy.onWorkerError = (reported) => { reportedError = reported; };
	proxy.failWorker(error);
	assert.equal(proxy.workerFailed, true);
	assert.equal(proxy.skipFrame, true);
	assert.equal(proxy.delay, 0);
	assert.equal(reportedError, error);
});

test("video falls back to software rendering with current worker state", () => {
	const originalWorker = context.Worker;
	class MockWorker {
		constructor() { this.terminated = false; }
		postMessage() {}
		terminate() { this.terminated = true; }
	}
	context.Worker = MockWorker;
	try {
		const video = new Video();
		const io = new IO();
		io.registers = new Uint16Array(0x200);
		io.registers[io.DISPCNT >> 1] = 0x0404;
		io.registers[io.BG2PA >> 1] = 0x0100;
		const mmu = {
			SIZE_VRAM: 0x18000,
			SIZE_OAM: 0x400,
			SIZE_PALETTE_RAM: 0x400,
			REGION_PALETTE_RAM: 5,
			REGION_VRAM: 6,
			REGION_OAM: 7,
			memory: [],
			mmap(region, memory) { this.memory[region] = memory; }
		};
		const warnings = [];
		video.cpu = { mmu, instruction: () => {}, page: {}, pageRegion: 6 };
		video.core = { io, WARN(message) { warnings.push(message); } };
		video.vcount = 7;
		video.renderPath.clear(mmu);
		const proxy = video.renderPath;
		proxy.palette.store16(2, 0x1234);
		proxy.vram.store16(0, 0x5678);
		proxy.oam.store16(0, 0x0200);
		proxy.backing = { data: new Uint8ClampedArray(240 * 160 * 4) };

		proxy.failWorker(new Error("worker failed"));

		assert.ok(video.renderPath instanceof Renderer);
		assert.equal(video.renderPath.palette.colors[0][1], 0x1234);
		assert.equal(video.renderPath.vram.loadU16(0), 0x5678);
		assert.equal(video.renderPath.backgroundMode, 4);
		assert.equal(video.renderPath.bg[2].dx, 1);
		assert.equal(video.renderPath.vcount, 7);
		assert.equal(video.renderPath.pixelData, proxy.backing);
		assert.equal(video.cpu.instruction, null);
		assert.equal(video.cpu.page, null);
		assert.equal(video.cpu.pageRegion, -1);
		assert.equal(mmu.memory[mmu.REGION_PALETTE_RAM], video.renderPath.palette);
		assert.equal(mmu.memory[mmu.REGION_VRAM], video.renderPath.vram);
		assert.equal(mmu.memory[mmu.REGION_OAM], video.renderPath.oam);
		assert.equal(proxy.worker.terminated, true);
		assert.equal(warnings.length, 1);
	} finally {
		if (originalWorker === undefined) {
			delete context.Worker;
		} else {
			context.Worker = originalWorker;
		}
	}
});

test("worker memory does not dirty snapshots for unchanged values", () => {
	const writes = [];
	const owner = {
		memoryDirtied(memory, block) { writes.push([memory, block]); }
	};
	const memory = new MemoryProxy(owner, 0x2000, 12);

	memory.store8(0x0008, 0x5a);
	memory.store8(0x0008, 0x5a);
	memory.store16(0x0000, 0x1234);
	memory.store16(0x0000, 0x1234);
	memory.store32(0x0004, 0x89abcdef);
	memory.store32(0x0004, 0x89abcdef);
	memory.store16(0x1000, 0x4321);
	memory.store16(0x1000, 0x4321);

	assert.equal(writes.length, 4);
	assert.deepEqual(writes.map((write) => write[1]), [0, 0, 0, 1]);
	assert.equal(memory.loadU16(0x0008), 0x5a5a);
	assert.equal(memory.loadU16(0x0000), 0x1234);
	assert.equal(memory.load32(0x0004), 0x89abcdef | 0);
	assert.equal(memory.loadU16(0x1000), 0x4321);
});

test("worker renderer applies OAM writes one scanline after they are received", () => {
	const workerContext = vm.createContext({ console, Blob });
	workerContext.importScripts = () => {};
	workerContext.self = {
		messages: [],
		postMessage(message) { this.messages.push(message); }
	};
	vm.runInContext(videoSource, workerContext);
	vm.runInContext(
		fs.readFileSync(path.join(root, "js/video/worker.js"), "utf8"),
		workerContext
	);
	const send = (data) => workerContext.self.onmessage({ data });
	const backing = { data: new Uint8ClampedArray(240 * 160 * 4) };
	send({ type: "clear", SIZE_VRAM: 0x18000, SIZE_OAM: 0x400 });
	send({ type: "start", backing });

	const palette = new Uint16Array(512);
	palette[257] = 0x001f;
	const vram = new Uint16Array(0x1000);
	const vram32 = new Uint32Array(vram.buffer);
	for (let row = 0; row < 8; ++row) {
		vram32[8 + row] = 0x11111111;
	}
	const firstOam = new Uint16Array(0x200);
	firstOam[0] = 0x0200;
	firstOam[2] = 1;
	const secondOam = firstOam.slice();
	secondOam[0] = 1;
	const vramBlocks = new Array(12);
	vramBlocks[8] = vram.buffer;
	send({
		type: "finish",
		frame: 1,
		scanlines: [
			{
				y: 0,
				dirty: {
					DISPCNT: 0x1000,
					memory: {
						palette: palette.buffer,
						oam: firstOam.buffer,
						vram: vramBlocks
					}
				}
			},
			{
				y: 1,
				dirty: { memory: { oam: secondOam.buffer } }
			}
		]
	});

	assert.equal(backing.data[240 * 4], 0);
	assert.equal(backing.data[240 * 2 * 4], 248);
	assert.equal(workerContext.self.messages.length, 1);
});

test("worker renderer preserves the line-zero OAM snapshot across V-Blank writes", () => {
	const workerContext = vm.createContext({ console, Blob });
	workerContext.importScripts = () => {};
	workerContext.self = {
		messages: [],
		postMessage(message) { this.messages.push(message); }
	};
	vm.runInContext(videoSource, workerContext);
	vm.runInContext(
		fs.readFileSync(path.join(root, "js/video/worker.js"), "utf8"),
		workerContext
	);
	const send = (data) => workerContext.self.onmessage({ data });
	const backing = { data: new Uint8ClampedArray(240 * 160 * 4) };
	send({ type: "clear", SIZE_VRAM: 0x18000, SIZE_OAM: 0x400 });
	send({ type: "start", backing });

	const palette = new Uint16Array(512);
	palette[257] = 0x001f;
	const vram = new Uint16Array(0x1000);
	const vram32 = new Uint32Array(vram.buffer);
	for (let row = 0; row < 8; ++row) {
		vram32[8 + row] = 0x11111111;
	}
	const lineZeroOam = new Uint16Array(0x200);
	lineZeroOam[0] = 0x0200;
	lineZeroOam[2] = 1;
	const currentOam = lineZeroOam.slice();
	currentOam[0] = 1;
	const vramBlocks = new Array(12);
	vramBlocks[8] = vram.buffer;
	send({
		type: "finish",
		frame: 1,
		scanlines: [
			{
				y: 0,
				oamPrime: lineZeroOam.buffer,
				dirty: {
					DISPCNT: 0x1000,
					memory: {
						palette: palette.buffer,
						oam: currentOam.buffer,
						vram: vramBlocks
					}
				}
			}
		]
	});

	assert.equal(backing.data[0], 0);
	assert.equal(backing.data[240 * 4], 248);
	assert.equal(workerContext.self.messages.length, 1);
});

test("video timing starts at VCOUNT 0 and draws visible lines before Hblank DMA", () => {
	const events = [];
	const { video, cpu } = videoHarness(events);
	assert.equal(video.vcount, 0);

	cpu.cycles = video.nextEvent;
	video.updateTimers(cpu);
	assert.deepEqual(events.slice(0, 2), [["draw", 0], ["hblank-dma", 0]]);
	assert.equal(video.vcount, 0);

	cpu.cycles = video.nextEvent;
	video.updateTimers(cpu);
	assert.equal(video.vcount, 1);
	assert.equal(events.filter(([kind]) => kind === "draw").length, 1);

	while (video.vcount < video.VERTICAL_PIXELS) {
		cpu.cycles = video.nextEvent;
		video.updateTimers(cpu);
		cpu.cycles = video.nextEvent;
		video.updateTimers(cpu);
	}
	assert.equal(video.vcount, 160);
	assert.equal(events.filter(([kind]) => kind === "draw").length, 160);
	assert.deepEqual(events.filter(([kind]) => kind === "finish"), [["finish", 160]]);

	while (video.vcount !== 0 || video.inVblank) {
		cpu.cycles = video.nextEvent;
		video.updateTimers(cpu);
		cpu.cycles = video.nextEvent;
		video.updateTimers(cpu);
	}
	assert.equal(cpu.cycles, video.TOTAL_LENGTH);
	assert.equal(events.filter(([kind]) => kind === "start").length, 1);
	const hblankDmaLines = events
		.filter(([kind]) => kind === "hblank-dma")
		.map(([, line]) => line);
	assert.equal(hblankDmaLines.length, video.VERTICAL_PIXELS);
	assert.ok(hblankDmaLines.every((line) => line < video.VERTICAL_PIXELS));
});

test("HBlank DMA OAM updates enter the latched OBJ pipeline on the following scanline", () => {
	const events = [];
	const { video, cpu } = videoHarness(events);
	const renderer = new Renderer();
	renderer.clear({ SIZE_VRAM: 0x18000, SIZE_OAM: 0x400 });
	renderer.setBacking({ data: new Uint8ClampedArray(240 * 160 * 4) });
	renderer.writeDisplayControl(0x1000);
	renderer.palette.store16(0x202, 0x001f);
	for (let row = 0; row < 8; ++row) {
		renderer.vram.store32(0x10020 + row * 4, 0x11111111);
	}
	renderer.oam.store16(0, 0x0200);
	renderer.oam.store16(2, 0);
	renderer.oam.store16(4, 1);
	const drawScanline = renderer.drawScanline.bind(renderer);
	renderer.drawScanline = (line) => {
		events.push(["draw", line]);
		drawScanline(line);
	};
	video.renderPath = renderer;
	cpu.mmu.runHblankDmas = () => {
		if (video.vcount === 0) {
			// HBlank DMA enables the sprite after line 0 was drawn.
			renderer.oam.store16(0, 1);
		}
	};

	while (events.filter(([kind]) => kind === "draw").length < 3) {
		cpu.cycles = video.nextEvent;
		video.updateTimers(cpu);
	}

	assert.equal(renderer.pixelData.data[240 * 4], 0);
	assert.equal(renderer.pixelData.data[240 * 2 * 4], 248);
});

test("VBlank status stays set through line 227 and clears at line 0", () => {
	const events = [];
	const { video, cpu } = videoHarness(events);
	const advanceScanline = () => {
		const startingVcount = video.vcount;
		while (video.vcount === startingVcount) {
			cpu.cycles = video.nextEvent;
			video.updateTimers(cpu);
		}
	};

	while (video.vcount < video.VERTICAL_PIXELS) {
		advanceScanline();
	}
	assert.equal(video.vcount, 160);
	assert.equal(video.inVblank, true);
	const vblankStart = cpu.cycles;

	while (video.vcount < video.VERTICAL_TOTAL_PIXELS - 1) {
		advanceScanline();
	}
	assert.equal(video.vcount, 227);
	assert.equal(video.inVblank, true);
	assert.deepEqual(events.filter(([kind]) => kind === "oam-prime"), [
		["oam-prime", 227]
	]);

	advanceScanline();
	assert.equal(video.vcount, 0);
	assert.equal(video.inVblank, false);
	assert.equal(cpu.cycles - vblankStart, video.VBLANK_PIXELS * video.HORIZONTAL_LENGTH);
});

test("video catches up every scanline event crossed by a long CPU stall", () => {
	const events = [];
	const { video, cpu } = videoHarness(events);
	cpu.cycles = 2500;

	video.updateTimers(cpu);

	assert.deepEqual(
		events.filter(([kind]) => kind === "draw"),
		[["draw", 0], ["draw", 1]]
	);
	assert.equal(video.vcount, 2);
	assert.equal(video.inHblank, false);
});

test("video restore migrates states written with the old one-line VCOUNT offset", () => {
	const { video } = videoHarness([]);
	const legacyState = video.freeze();
	delete legacyState.timingVersion;
	legacyState.vcount = 159;
	legacyState.vcountSetting = 160;
	legacyState.inVblank = false;
	legacyState.vcounter = false;
	video.defrost(legacyState);

	assert.equal(video.vcount, 160);
	assert.equal(video.inVblank, true);
	assert.equal(video.vcounter, true);
});

test("video restore reconstructs the line-zero OAM latch for older line-227 states", () => {
	const events = [];
	const { video } = videoHarness(events);
	const state = video.freeze();
	state.vcount = video.VERTICAL_TOTAL_PIXELS - 1;
	state.inVblank = true;
	state.renderPath = {};

	video.defrost(state);

	assert.deepEqual(events.filter(([kind]) => kind === "oam-prime"), [
		["oam-prime", 227]
	]);
});

test("DISPSTAT VCOUNT match flag updates when its comparator changes mid-scanline", () => {
	const video = Object.create(Video.prototype);
	Object.assign(video, {
		vcount: 37,
		vcountSetting: 0,
		vcounter: false,
		nextHblank: 1006,
		nextEvent: 0,
		HBLANK_LENGTH: 226,
		HORIZONTAL_LENGTH: 1232,
		TOTAL_LENGTH: 280896
	});

	video.writeDisplayStat(37 << 8);
	assert.equal(video.vcounter, true);
	assert.equal(video.readDisplayStat() & 0x0004, 0x0004);

	video.writeDisplayStat(38 << 8);
	assert.equal(video.vcounter, false);
	assert.equal(video.readDisplayStat() & 0x0004, 0);
});

test("DISPSTAT comparator writes raise VCOUNT IRQ only on a new match edge", () => {
	const events = [];
	const { video } = videoHarness(events);
	const io = new IO();
	io.video = video;
	io.registers = new Uint16Array(0x200);
	video.vcount = 37;

	io.store16(io.DISPSTAT, 0x0020 | (37 << 8));
	io.store16(io.DISPSTAT, 0x0020 | (37 << 8));
	assert.equal(io.loadU16(io.DISPSTAT) & 0xff04, (37 << 8) | 0x0004);
	assert.deepEqual(
		events.filter(([kind]) => kind === "irq"),
		[["irq", video.cpu.irq.IRQ_VCOUNTER]]
	);

	io.store16(io.DISPSTAT, 0x0020 | (38 << 8));
	assert.equal(video.vcounter, false);
	io.store16(io.DISPSTAT, 0x0020 | (37 << 8));
	assert.deepEqual(
		events.filter(([kind]) => kind === "irq"),
		[
			["irq", video.cpu.irq.IRQ_VCOUNTER],
			["irq", video.cpu.irq.IRQ_VCOUNTER]
		]
	);

	const matchedBeforeEnableEvents = [];
	const { video: matchedBeforeEnable } = videoHarness(matchedBeforeEnableEvents);
	const matchedBeforeEnableIO = new IO();
	matchedBeforeEnableIO.video = matchedBeforeEnable;
	matchedBeforeEnableIO.registers = new Uint16Array(0x200);
	matchedBeforeEnable.vcount = 37;
	matchedBeforeEnableIO.store16(matchedBeforeEnableIO.DISPSTAT, 37 << 8);
	matchedBeforeEnableIO.store16(
		matchedBeforeEnableIO.DISPSTAT,
		0x0020 | (37 << 8)
	);
	assert.equal(matchedBeforeEnable.vcounter, true);
	assert.deepEqual(
		matchedBeforeEnableEvents.filter(([kind]) => kind === "irq"),
		[]
	);
});

test("VCOUNT IRQ deadlines follow the current H-Blank phase", () => {
	const events = [];
	const { video, cpu } = videoHarness(events);
	video.vcount = 37;
	video.nextEvent = video.HDRAW_LENGTH;
	video.writeDisplayStat(0x0020 | (38 << 8));
	assert.equal(
		video.nextVcounterIRQ,
		video.HDRAW_LENGTH + video.HBLANK_LENGTH
	);

	video.inHblank = true;
	video.nextEvent = video.HDRAW_LENGTH + video.HBLANK_LENGTH;
	video.nextHblank = video.nextEvent + video.HDRAW_LENGTH;
	video.writeDisplayStat(0x0020 | (39 << 8));
	assert.equal(
		video.nextVcounterIRQ,
		video.nextEvent + video.HORIZONTAL_LENGTH
	);

	video.writeDisplayStat(0x0020 | (38 << 8));
	assert.equal(video.nextVcounterIRQ, video.nextEvent);
	cpu.cycles = video.nextEvent;
	video.updateTimers(cpu);
	assert.equal(video.vcount, 38);
	assert.deepEqual(
		events.filter(([kind]) => kind === "irq"),
		[["irq", video.cpu.irq.IRQ_VCOUNTER]]
	);

	video.writeDisplayStat(0x0020 | (250 << 8));
	assert.equal(video.vcounter, false);
	assert.equal(video.nextVcounterIRQ, 0);
});

test("BIOS access protection accounts for ARM and Thumb PC pipelines", () => {
	const bios = new BIOSView(new ArrayBuffer(0x4000));
	const cpu = {
		PC: 15,
		gprs: new Int32Array(16),
		instructionWidth: 4,
		instruction: null
	};
	bios.mmu = { SIZE_BIOS: 0x4000, cpu };

	cpu.gprs[cpu.PC] = 4;
	assert.equal(bios._checkProtection(), false);
	cpu.gprs[cpu.PC] = 0x4004;
	cpu.instruction = function () {};
	assert.equal(bios._checkProtection(), false);
	cpu.gprs[cpu.PC] = 0x08000008;
	assert.equal(bios._checkProtection(), true);

	cpu.instructionWidth = 2;
	cpu.gprs[cpu.PC] = 0x4000;
	assert.equal(bios._checkProtection(), false);
	cpu.gprs[cpu.PC] = 0x4004;
	assert.equal(bios._checkProtection(), true);
});

test("BIOS word reads align and rotate both protected and unprotected values", () => {
	const data = new ArrayBuffer(0x4000);
	new Uint8Array(data).set([0x11, 0x22, 0x33, 0x44], 0x100);
	const bios = new BIOSView(data);
	assert.deepEqual(
		[0, 1, 2, 3].map((offset) => bios.load32(0x100 + offset)),
		[0x44332211, 0x11443322, 0x22114433, 0x33221144]
	);

	const cpu = {
		PC: 15,
		gprs: new Int32Array(16),
		instructionWidth: 4,
		instruction() {}
	};
	cpu.gprs[cpu.PC] = 0x08000008;
	bios.lastFetchedOpcode = 0x44332211;
	bios.mmu = {
		SIZE_BIOS: 0x4000,
		cpu,
		badMemory: { load32() { throw new Error("protected BIOS read used PC bus"); } }
	};
	assert.equal(bios.load32(0x101), 0x11443322);
});

test("compact HLE BIOS preserves the documented startup, SWI, and IRQ bus values", () => {
	const bios = new BIOSView(new ArrayBuffer(0xdc));
	bios.real = false;
	bios.mmu = { SIZE_BIOS: 0x4000 };
	const cpu = new CPU();
	cpu.mmu = bios.mmu;
	cpu.mmu.bios = bios;

	bios.beginHLEBoot();
	cpu.recordBIOSOpcode(0, 0xe3a0f302, cpu.WORD_SIZE_ARM);
	cpu.recordBIOSOpcode(0x08000000, 0, cpu.WORD_SIZE_ARM);
	assert.equal(bios.lastFetchedOpcode >>> 0, 0xe129f000);
	assert.equal(bios.hleStartupPending, false);

	bios.recordHLESWIReturn(0x08);
	assert.equal(bios.lastFetchedOpcode >>> 0, 0xe3a02004);

	cpu.mode = cpu.MODE_IRQ;
	cpu.recordBIOSOpcode(0x5c, 0xe510f004, cpu.WORD_SIZE_ARM);
	cpu.recordBIOSOpcode(0x08000004, 0, cpu.WORD_SIZE_ARM);
	assert.equal(bios.lastFetchedOpcode >>> 0, 0xe25ef004);
	assert.equal(bios.hleIRQReturnPending, true);

	cpu.mode = cpu.MODE_SYSTEM;
	cpu.recordBIOSOpcode(0x08000008, 0, cpu.WORD_SIZE_ARM);
	assert.equal(bios.lastFetchedOpcode >>> 0, 0xe55ec002);
	assert.equal(bios.hleIRQReturnPending, false);
});

test("ArcTan SWI returns the GBA fixed-point polynomial result", () => {
	const { irq, cpu } = softwareInterruptHarness();
	cpu.gprs[0] = 0x2000;
	irq.swi(0x09);
	assert.equal(cpu.gprs[0], 4836);
	assert.equal(cpu.gprs[1], -4096);
	assert.equal(cpu.gprs[3], 0x9720);
});

test("ArcTan2 SWI returns normalized unsigned turns for all axes", () => {
	const { irq, cpu } = softwareInterruptHarness();
	for (const [x, y, expected] of [
		[1, 0, 0],
		[0, 1, 0x4000],
		[-1, 0, 0x8000],
		[0, -1, 0xc000]
	]) {
		cpu.gprs[0] = x;
		cpu.gprs[1] = y;
		irq.swi(0x0a);
		assert.equal(cpu.gprs[0], expected);
		assert.equal(cpu.gprs[3], 0x170);
	}
	for (const [x, y, expected] of [
		[0x4000, 0x4000, 0x2000],
		[-0x4000, 0x4000, 0x6000],
		[-0x4000, -0x4000, 0xa000],
		[0x4000, -0x4000, 0xe000]
	]) {
		cpu.gprs[0] = x;
		cpu.gprs[1] = y;
		irq.swi(0x0a);
		assert.equal(cpu.gprs[0], expected);
	}
});

test("Sqrt SWI treats register input as unsigned 32-bit", () => {
	const { irq, cpu } = softwareInterruptHarness();
	cpu.gprs[0] = 0x80000000;
	irq.swi(0x08);
	assert.equal(cpu.gprs[0], 46340);

	cpu.gprs[0] = -1;
	irq.swi(0x08);
	assert.equal(cpu.gprs[0], 65535);
});

test("MidiKey2Freq interpolates fixed-point pitches and clamps high keys", () => {
	const { irq, cpu, mmu, base } = softwareInterruptHarness();
	const wave = base + 0x100;
	mmu.store32(wave + 4, 0x10000000);
	cpu.gprs[0] = wave;
	cpu.gprs[1] = 60;
	cpu.gprs[2] = 0;
	irq.swi(0x1f);
	assert.equal(cpu.gprs[0], 0x00040000);

	cpu.gprs[0] = wave;
	cpu.gprs[1] = 60;
	cpu.gprs[2] = 128;
	irq.swi(0x1f);
	assert.equal(cpu.gprs[0], 0x00041e71);

	cpu.gprs[0] = wave;
	cpu.gprs[1] = 178;
	cpu.gprs[2] = 0;
	irq.swi(0x1f);
	assert.equal(cpu.gprs[0], 0x0e411f03);

	cpu.gprs[0] = wave;
	cpu.gprs[1] = -1;
	cpu.gprs[2] = 0xffffffff;
	irq.swi(0x1f);
	assert.equal(cpu.gprs[0], 0x0e411f03);
	for (const [a, b] of [
		[0xffffffff, 0xffffffff],
		[0x80000000, 0xe411f03a],
		[0x12345678, 0x9abcdef0],
		[0xffffffff, 1]
	]) {
		const expected = Number((BigInt(a) * BigInt(b)) >> 32n) >>> 0;
		assert.equal(irq.multiplyHighUnsigned(a, b), expected);
	}
});

test("Div and DivArm SWIs match BIOS zero-divisor edges and signed overflow", () => {
	for (const [opcode, numerator, denominator] of [
		[0x06, 1, 0],
		[0x06, -1, 0],
		[0x06, 0, 0],
		[0x07, 1, 0],
		[0x07, -1, 0],
		[0x07, 0, 0]
	]) {
		const { irq, cpu } = softwareInterruptHarness();
		cpu.gprs[0] = opcode == 0x06 ? numerator : denominator;
		cpu.gprs[1] = opcode == 0x06 ? denominator : numerator;
		irq.swi(opcode);
		assert.deepEqual(
			Array.from(cpu.gprs.slice(0, 4)),
			[numerator == 0 ? 1 : numerator, numerator, 0, 1]
		);
		assert.equal(irq.pendingHLEBIOSCalls.length, 0);
	}

	for (const [opcode, numerator, denominator] of [
		[0x06, -7, 0],
		[0x07, -7, 0]
	]) {
		const { irq, cpu } = softwareInterruptHarness();
		cpu.gprs[0] = opcode == 0x06 ? numerator : denominator;
		cpu.gprs[1] = opcode == 0x06 ? denominator : numerator;
		cpu.gprs[3] = 0x12345678;
		irq.swi(opcode);
		assert.deepEqual(
			Array.from(cpu.gprs.slice(0, 4)),
			opcode == 0x06
				? [numerator, denominator, 0, 0x12345678]
				: [denominator, numerator, 0, 0x12345678]
		);
		assert.equal(irq.pendingHLEBIOSCalls.length, 1);
		assert.equal(irq.pendingHLEBIOSCalls[0].nonReturning, true);
	}

	const { irq, cpu } = softwareInterruptHarness();
	cpu.gprs[0] = -0x80000000;
	cpu.gprs[1] = -1;
	irq.swi(0x06);
	assert.deepEqual(
		Array.from(cpu.gprs.slice(0, 4)),
		[-0x80000000, 0, 0, -0x80000000]
	);
});

test("HLE division models the BIOS service duration", () => {
	const cases = [
		{ numerator: 1, denominator: 1, cycles: 69 },
		{ numerator: 1, denominator: 0, cycles: 69 },
		{ numerator: 0, denominator: 0, cycles: 69 },
		{ numerator: 100, denominator: 7, cycles: 108 },
		{ numerator: 0x7fffffff, denominator: 3, cycles: 446 },
		{ numerator: 0x7fffffff, denominator: 1, cycles: 459 },
		{ numerator: -0x80000000, denominator: -1, cycles: 467 }
	];

	for (const item of cases) {
		const { irq, cpu } = timedDivisionHarness(Infinity);
		cpu.gprs[0] = item.numerator;
		cpu.gprs[1] = item.denominator;
		irq.swi(0x06);
		assert.equal(cpu.cycles, item.cycles);
	}
});

test("non-returning HLE division advances devices without freezing the host", () => {
	const cpu = new CPU();
	const irq = new IRQ();
	cpu.irq = irq;
	irq.cpu = cpu;
	cpu.mmu = {
		wait32() {},
		waitPrefetch32() {},
		wait() {},
		waitPrefetch() {}
	};
	cpu.resetCPU(0x1000);
	irq.core = {
		mmu: { bios: { real: false } },
		sio: null,
		ASSERT: (condition, message) => assert.ok(condition, message)
	};
	irq.io = { IF: 0x202, registers: new Uint16Array(0x200) };
	irq.video = {
		nextEvent: 10,
		updateTimers() { this.nextEvent += 10; }
	};
	irq.audio = { enabled: false, nextEvent: Infinity, updateTimers() {} };
	irq.dma = [0, 1, 2, 3].map(() => ({ doIrq: false, nextIRQ: 0 }));
	irq.nextEvent = 10;
	const div = cpu.compileArm(0xef060000);
	div.writesPC = false;
	div.fixedJump = false;
	div.next = null;
	const nop = () => {};
	nop.writesPC = false;
	nop.fixedJump = false;
	nop.next = null;
	cpu.loadInstruction = () => nop;
	cpu.gprs[0] = 2;
	cpu.gprs[1] = 0;
	cpu.gprs[3] = 0x12345678;
	cpu.instruction = div;

	cpu.step();
	assert.equal(cpu.cycles, 10);
	assert.deepEqual(Array.from(cpu.gprs.slice(0, 4)), [2, 0, 0, 0x12345678]);
	assert.equal(irq.pendingHLEBIOSCalls[0].nonReturning, true);
	const frozenIRQ = irq.freeze();
	irq.pendingHLEBIOSCalls = [];
	irq.defrost(frozenIRQ);
	assert.equal(irq.pendingHLEBIOSCalls[0].nonReturning, true);
	const heldPc = cpu.gprs[cpu.PC];

	cpu.step();
	assert.equal(cpu.cycles, 20);
	assert.equal(cpu.gprs[cpu.PC], heldPc);
	assert.equal(cpu.instruction, null);

	cpu.resetCPU(0x2000);
	assert.equal(irq.pendingHLEBIOSCalls.length, 0);
});

test("non-returning HLE division does not record a completed BIOS return", () => {
	const { irq, cpu } = softwareInterruptHarness();
	let returns = 0;
	irq.core.mmu.bios = {
		real: false,
		recordHLESWIReturn() { ++returns; }
	};
	cpu.gprs[0] = 2;
	cpu.gprs[1] = 0;
	irq.swi(0x06);
	assert.equal(returns, 0);

	const returning = softwareInterruptHarness();
	returning.irq.core.mmu.bios = {
		real: false,
		recordHLESWIReturn() { ++returns; }
	};
	returning.cpu.gprs[0] = 1;
	returning.cpu.gprs[1] = 0;
	returning.irq.swi(0x06);
	assert.equal(returns, 1);
});

test("HLE division resumes after an IRQ and saves its pending state", () => {
	const { irq, cpu } = timedDivisionHarness(200);
	cpu.gprs[0] = 0x7fffffff;
	cpu.gprs[1] = 3;
	cpu.gprs[3] = 0x12345678;
	irq.swi(0x06);

	assert.equal(cpu.mode, cpu.MODE_IRQ);
	assert.equal(cpu.cycles, 200);
	assert.deepEqual(Array.from(cpu.gprs.slice(0, 4)), [0x7fffffff, 3, 0, 0x12345678]);
	assert.equal(irq.pendingHLEBIOSCalls[0].cyclesRemaining, 246);

	const frozen = irq.freeze();
	irq.pendingHLEBIOSCalls[0].cyclesRemaining = 0;
	irq.defrost(frozen);
	assert.equal(irq.pendingHLEBIOSCalls[0].cyclesRemaining, 246);

	cpu.cycles += 80;
	cpu.mode = cpu.MODE_SYSTEM;
	cpu.execMode = cpu.MODE_ARM;
	cpu.gprs[cpu.PC] = irq.pendingHLEBIOSCalls[0].resumeAddress + cpu.instructionWidth;
	irq.resumeHLEBIOSCallIfReady();

	assert.equal(cpu.cycles, 526);
	assert.equal(irq.pendingHLEBIOSCalls.length, 0);
	assert.deepEqual(Array.from(cpu.gprs.slice(0, 4)), [0x2aaaaaaa, 1, 0, 0x2aaaaaaa]);
});

test("CPU resumes HLE division after the interrupt handler returns", () => {
	for (const execMode of [0, 1]) {
		const cpu = new CPU();
		const irq = new IRQ();
		cpu.irq = irq;
		irq.cpu = cpu;
		cpu.mmu = {
			wait32() {},
			waitPrefetch32() {},
			wait() {},
			waitPrefetch() {}
		};
		cpu.resetCPU(0x1000);
		if (execMode == cpu.MODE_THUMB) {
			cpu.switchExecMode(execMode);
			cpu.gprs[cpu.PC] = 0x1002;
		}
		irq.core = {
			mmu: { bios: { real: false } },
			ASSERT: (condition, message) => assert.ok(condition, message)
		};
		irq.io = { IF: 0x202, registers: new Uint16Array(0x200) };
		irq.enable = true;
		irq.enabledIRQs = irq.MASK_VBLANK;
		irq.video = {
			nextEvent: 200,
			updateTimers() {
				if (cpu.cycles >= this.nextEvent && this.nextEvent !== Infinity) {
					this.nextEvent = Infinity;
					irq.raiseIRQ(irq.IRQ_VBLANK);
				}
			}
		};
		irq.audio = { enabled: false, nextEvent: Infinity, updateTimers() {} };
		irq.dma = [0, 1, 2, 3].map(() => ({ doIrq: false, nextIRQ: 0 }));
		irq.nextEvent = 200;
		const nop = () => {};
		nop.writesPC = false;
		nop.fixedJump = false;
		nop.next = null;
		const biosIRQReturn = cpu.compileArm(0xe25ef004);
		const irqReturn = function () {
			irq.dismissIRQs(irq.MASK_VBLANK);
			biosIRQReturn();
		};
		irqReturn.writesPC = biosIRQReturn.writesPC;
		irqReturn.fixedJump = biosIRQReturn.fixedJump;
		irqReturn.next = null;
		const loadTestInstruction = (address) => {
			if (address == cpu.BASE_IRQ) {
				return irqReturn;
			}
			return nop;
		};
		cpu.loadInstruction = loadTestInstruction;
		cpu.gprs[0] = 0x7fffffff;
		cpu.gprs[1] = 3;
		const swi = function () { irq.swi(0x06); };
		swi.writesPC = false;
		swi.fixedJump = false;
		swi.next = null;
		cpu.instruction = swi;

		cpu.step();
		assert.equal(cpu.mode, cpu.MODE_IRQ);
		assert.equal(cpu.cycles, 200);
		assert.equal(cpu.gprs[0], 0x7fffffff);

		cpu.loadInstruction = loadTestInstruction;
		cpu.step();
		assert.equal(cpu.mode, cpu.MODE_SYSTEM);
		assert.equal(!!cpu.execMode, !!execMode);
		assert.equal(cpu.gprs[cpu.PC] - cpu.instructionWidth, 0x1000 + cpu.instructionWidth);
		assert.equal(cpu.gprs[0], 0x7fffffff);

		cpu.loadInstruction = loadTestInstruction;
		cpu.step();
		assert.equal(cpu.gprs[0], 0x2aaaaaaa);
		assert.equal(cpu.gprs[1], 1);
		assert.equal(cpu.gprs[3], 0x2aaaaaaa);
		assert.equal(irq.pendingHLEBIOSCalls.length, 0);
	}
});

test("HLE division resumes at the correct Thumb address after an IRQ", () => {
	const { irq, cpu } = timedDivisionHarness(200);
	cpu.MODE_THUMB = 1;
	cpu.instructionWidth = 2;
	cpu.execMode = cpu.MODE_THUMB;
	cpu.gprs[cpu.PC] = 0x1004;
	cpu.gprs[0] = 0x7fffffff;
	cpu.gprs[1] = 3;
	irq.swi(0x06);

	const pending = irq.pendingHLEBIOSCalls[0];
	assert.equal(pending.resumeAddress, 0x1002);
	assert.equal(cpu.gprs[0], 0x7fffffff);

	cpu.cycles += 80;
	cpu.mode = cpu.MODE_SYSTEM;
	cpu.execMode = cpu.MODE_THUMB;
	cpu.gprs[cpu.PC] = pending.resumeAddress + cpu.instructionWidth;
	irq.resumeHLEBIOSCallIfReady();

	assert.equal(irq.pendingHLEBIOSCalls.length, 0);
	assert.equal(cpu.gprs[0], 0x2aaaaaaa);
	assert.equal(cpu.gprs[1], 1);
});

test("nested IRQ division does not overwrite the interrupted HLE call", () => {
	const { irq, cpu } = timedDivisionHarness(200);
	cpu.gprs[0] = 0x7fffffff;
	cpu.gprs[1] = 3;
	irq.swi(0x06);
	assert.equal(irq.pendingHLEBIOSCalls.length, 1);

	cpu.gprs[0] = 100;
	cpu.gprs[1] = 7;
	irq.swi(0x06);
	assert.equal(irq.pendingHLEBIOSCalls.length, 1);
	assert.deepEqual(Array.from(cpu.gprs.slice(0, 2)), [14, 2]);

	const interruptedCall = irq.pendingHLEBIOSCalls[0];
	cpu.cycles += 80;
	cpu.mode = cpu.MODE_SYSTEM;
	cpu.execMode = cpu.MODE_ARM;
	cpu.gprs[cpu.PC] = interruptedCall.resumeAddress + cpu.instructionWidth;
	irq.resumeHLEBIOSCallIfReady();

	assert.equal(irq.pendingHLEBIOSCalls.length, 0);
	assert.deepEqual(Array.from(cpu.gprs.slice(0, 4)), [0x2aaaaaaa, 1, 0, 0x2aaaaaaa]);
});

test("ARM ADC and SBC calculate overflow from the original shifter operand", () => {
	const cpu = new CPU();
	cpu.mmu = { waitPrefetch32() {} };
	cpu.gprs[0] = 0x7fffffff;
	cpu.shifterOperand = 0x7fffffff;
	cpu.cpsrC = 1;
	cpu.armCompiler.constructADCS(2, 0, () => {}, null)();
	assert.equal(cpu.gprs[2], -1);
	assert.equal(cpu.cpsrV, true);

	cpu.gprs[0] = 0x7fffffff;
	cpu.shifterOperand = 0x7fffffff;
	cpu.cpsrC = 0;
	cpu.armCompiler.constructSBCS(2, 0, () => {}, null)();
	assert.equal(cpu.gprs[2], -1);
	assert.equal(cpu.cpsrV, false);
	assert.equal(cpu.cpsrC, false);

	cpu.gprs[0] = -1;
	cpu.shifterOperand = -1;
	cpu.cpsrC = 0;
	cpu.armCompiler.constructSBCS(2, 0, () => {}, null)();
	assert.equal(cpu.gprs[2], -1);
	assert.equal(cpu.cpsrC, false);
});

test("ARM RSC preserves carry and overflow at unsigned wraparound", () => {
	const cpu = new CPU();
	cpu.mmu = { waitPrefetch32() {} };
	cpu.gprs[0] = 0x7fffffff;
	cpu.shifterOperand = 0x7fffffff;
	cpu.cpsrC = 0;
	cpu.armCompiler.constructRSCS(2, 0, () => {}, null)();
	assert.equal(cpu.gprs[2], -1);
	assert.equal(cpu.cpsrV, false);
	assert.equal(cpu.cpsrC, false);

	cpu.gprs[0] = -1;
	cpu.shifterOperand = 0;
	cpu.cpsrC = 0;
	cpu.armCompiler.constructRSCS(2, 0, () => {}, null)();
	assert.equal(cpu.gprs[2], 0);
	assert.equal(cpu.cpsrC, false);
});

test("Thumb ADC and SBC calculate flags across carry and borrow boundaries", () => {
	const cpu = new CPU();
	cpu.mmu = { waitPrefetch() {} };
	cpu.gprs[0] = 0x7fffffff;
	cpu.gprs[1] = 0x7fffffff;
	cpu.cpsrC = 1;
	cpu.thumbCompiler.constructADC(0, 1)();
	assert.equal(cpu.gprs[0], -1);
	assert.equal(cpu.cpsrV, true);

	cpu.gprs[0] = 0x7fffffff;
	cpu.gprs[1] = 0x7fffffff;
	cpu.cpsrC = 0;
	cpu.thumbCompiler.constructSBC(0, 1)();
	assert.equal(cpu.gprs[0], -1);
	assert.equal(cpu.cpsrV, false);
	assert.equal(cpu.cpsrC, false);

	cpu.gprs[0] = -1;
	cpu.gprs[1] = -1;
	cpu.cpsrC = 0;
	cpu.thumbCompiler.constructSBC(0, 1)();
	assert.equal(cpu.gprs[0], -1);
	assert.equal(cpu.cpsrC, false);
});

test("ARM PC operand reads PC+12 for register-controlled shifts", () => {
	const cpu = new CPU();
	cpu.mmu = { waitPrefetch32() {} };
	cpu.gprs[cpu.PC] = 0x1008;
	cpu.compileArm(0xe08f0010)(); // add r0, pc, r0, lsl r0
	assert.equal(cpu.gprs[0], 0x100c);

	cpu.gprs[cpu.PC] = 0x1008;
	cpu.compileArm(0xe28f0000)(); // add r0, pc, #0
	assert.equal(cpu.gprs[0], 0x1008);
});

test("ARM test instructions with PC in Rd restore CPSR from SPSR", () => {
	for (const opcode of [0xe11ff000, 0xe13ff000, 0xe15ff000, 0xe17ff000]) {
		const cpu = new CPU();
		cpu.mmu = { waitPrefetch32() {} };
		cpu.irq = { testIRQ() {} };
		cpu.mode = cpu.MODE_FIQ;
		cpu.bankedRegisters = Array.from({ length: 6 }, () => new Int32Array(7));
		cpu.bankedSPSRs = new Int32Array(6);
		cpu.bankedRegisters[0][2] = 32;
		cpu.gprs[8] = 64;
		cpu.spsr = cpu.MODE_SYSTEM;
		cpu.gprs[cpu.PC] = 0x08000100;

		const operation = cpu.compileArm(opcode);
		assert.equal(operation.writesPC, false, opcode.toString(16));
		operation();

		assert.equal(cpu.mode, cpu.MODE_SYSTEM, opcode.toString(16));
		assert.equal(cpu.gprs[8], 32, opcode.toString(16));
		assert.equal(cpu.gprs[cpu.PC], 0x08000100, opcode.toString(16));
	}
});

test("ARM word stores of PC include the extra pipeline word", () => {
	const cpu = new CPU();
	const writes = [];
	cpu.mmu = {
		wait32() {},
		waitPrefetch32() {},
		waitMulti32() {},
		store32(address, value) { writes.push([address, value]); }
	};
	cpu.gprs[cpu.PC] = 0x1008;
	cpu.gprs[11] = 0x2000;
	const storePC = cpu.compileArm(0xe58bf000); // str pc, [r11]
	assert.equal(storePC.writesPC, false);
	storePC();
	cpu.armCompiler.constructSTM(1 << cpu.PC, () => 0x3000, null)();
	cpu.gprs[0] = 0x4000;
	cpu.compileArm(0xe5a00004)(); // str r0, [r0, 4]!

	assert.deepEqual(writes, [
		[0x2000, 0x100c],
		[0x3000, 0x100c],
		[0x4004, 0x4000]
	]);
	assert.equal(cpu.gprs[0], 0x4004);
});

test("ARM empty block transfer lists access PC and update the base by 64 bytes", () => {
	const cpu = new CPU();
	const writes = [];
	const memory = new Map([[0x1000, 0x08001234]]);
	cpu.mmu = {
		wait32() {},
		waitPrefetch32() {},
		waitMulti32() {},
		load32(address) { return memory.get(address) || 0; },
		store32(address, value) { writes.push([address, value]); }
	};
	cpu.gprs[0] = 0x1000;
	const load = cpu.compileArm(0xe8b00000); // ldmia r0!, {}
	assert.equal(load.writesPC, true);
	load();
	assert.equal(cpu.gprs[cpu.PC], 0x08001234);
	assert.equal(cpu.gprs[0], 0x1040);

	cpu.gprs[0] = 0x2000;
	cpu.gprs[cpu.PC] = 0x08002008;
	const store = cpu.compileArm(0xe8a00000); // stmia r0!, {}
	assert.equal(store.writesPC, false);
	store();
	assert.deepEqual(writes, [[0x2000, 0x0800200c]]);
	assert.equal(cpu.gprs[0], 0x2040);
});

test("ARM LDM loads a writeback base register when it is in the list", () => {
	const cpu = new CPU();
	const memory = new Map([[0x1000, 0x0a], [0x1004, 0x0b]]);
	cpu.mmu = {
		waitPrefetch32() {},
		waitMulti32() {},
		load32(address) { return memory.get(address) || 0; }
	};
	cpu.gprs[1] = 0x1000;
	const load = cpu.compileArm(0xe8b10006); // ldmia r1!, {r1, r2}
	load();
	assert.equal(cpu.gprs[1], 0x0a);
	assert.equal(cpu.gprs[2], 0x0b);
});

test("ARM execution from VRAM preserves its two prefetched instructions", () => {
	const originalAddEventListener = context.window.addEventListener;
	context.window.addEventListener = () => {};
	try {
		const gba = new GBA();
		gba.reset();
		const cpu = gba.cpu;
		const mmu = gba.mmu;
		const address = mmu.BASE_VRAM + 0x100;
		for (const [offset, opcode] of [
			[0, 0xe5802000], // str r2, [r0]
			[4, 0xe5812000], // str r2, [r1]
			[8, 0xe3520000], // cmp r2, #0
			[12, 0x0a000000], // beq to the pass instruction
			[16, 0xe3a03001], // mov r3, #1 (failure)
			[20, 0xe3a03002] // mov r3, #2 (pass)
		]) {
			mmu.store32(address + offset, opcode);
		}
		cpu.resetCPU(address);
		cpu.gprs[0] = address + 8;
		cpu.gprs[1] = address + 12;
		cpu.gprs[2] = 0;
		for (let i = 0; i < 5; ++i) {
			cpu.step();
		}
		assert.equal(cpu.gprs[3], 2);
	} finally {
		context.window.addEventListener = originalAddEventListener;
	}
});

test("Thumb empty block transfer lists transfer PC and update the base by 64 bytes", () => {
	const cpu = new CPU();
	const writes = [];
	cpu.mmu = {
		wait() {},
		waitPrefetch() {},
		waitMulti32() {},
		load32(address) { return address === 0x1000 ? 0x08001234 : 0; },
		store32(address, value) { writes.push([address, value]); }
	};
	cpu.gprs[0] = 0x1000;
	const load = cpu.compileThumb(0xc800); // ldmia r0!, {}
	assert.equal(load.writesPC, true);
	load();
	assert.equal(cpu.gprs[cpu.PC], 0x08001234);
	assert.equal(cpu.gprs[0], 0x1040);

	cpu.gprs[0] = 0x2000;
	cpu.gprs[cpu.PC] = 0x08002004;
	const store = cpu.compileThumb(0xc000); // stmia r0!, {}
	assert.equal(store.writesPC, false);
	store();
	assert.deepEqual(writes, [[0x2000, 0x08002006]]);
	assert.equal(cpu.gprs[0], 0x2040);
});

test("Thumb STM stores the updated base when the base is not the first listed register", () => {
	const cpu = new CPU();
	const writes = [];
	cpu.mmu = {
		wait() {},
		waitMulti32() {},
		store32(address, value) { writes.push([address, value]); }
	};
	cpu.gprs[1] = 0x1000;
	cpu.gprs[2] = 0x2222;
	cpu.gprs[3] = 0x3333;
	cpu.compileThumb(0xc10f)(); // stmia r1!, {r0-r3}
	assert.deepEqual(writes, [
		[0x1000, 0],
		[0x1004, 0x1010],
		[0x1008, 0x2222],
		[0x100c, 0x3333]
	]);
	assert.equal(cpu.gprs[1], 0x1010);
});

test("ARM SWPB zero-extends the byte it reads", () => {
	const cpu = new CPU();
	let stored = null;
	cpu.mmu = {
		waitPrefetch32() {},
		wait() {},
		load8() { return -1; },
		loadU8() { return 0xff; },
		store8(address, value) { stored = [address, value]; }
	};
	cpu.gprs[0] = 0x2000;
	cpu.gprs[1] = 0x123;
	cpu.armCompiler.constructSWPB(2, 0, 1, null)();

	assert.equal(cpu.gprs[2], 0xff);
	assert.deepEqual(stored, [0x2000, 0x123]);
});

test("ARM long multiply and accumulate keep all 64 result bits", () => {
	const cpu = new CPU();
	cpu.mmu = { waitPrefetch32() {}, waitMul() {} };
	cpu.gprs[2] = 0x7fffffff;
	cpu.gprs[3] = 0x7fffffff;
	cpu.armCompiler.constructSMULL(1, 0, 2, 3, null)();
	const signedProduct = BigInt.asUintN(
		64,
		BigInt.asIntN(32, 0x7fffffffn) * BigInt.asIntN(32, 0x7fffffffn)
	);
	assert.equal(cpu.gprs[0] >>> 0, Number(signedProduct & 0xffffffffn));
	assert.equal(cpu.gprs[1] >>> 0, Number(signedProduct >> 32n));

	cpu.gprs[2] = -1;
	cpu.gprs[3] = -1;
	cpu.armCompiler.constructUMULL(1, 0, 2, 3, null)();
	const unsignedProduct = 0xffffffffn * 0xffffffffn;
	assert.equal(cpu.gprs[0] >>> 0, Number(unsignedProduct & 0xffffffffn));
	assert.equal(cpu.gprs[1] >>> 0, Number(unsignedProduct >> 32n));

	const a = 1967335287;
	const b = 3442499178;
	const low = 635173569;
	const high = 1264358700;
	cpu.cycles = 0;
	cpu.gprs[0] = low;
	cpu.gprs[1] = high;
	cpu.gprs[2] = a;
	cpu.gprs[3] = b;
	cpu.armCompiler.constructSMLAL(1, 0, 3, 2, null)();
	const signedAccumulate = BigInt.asUintN(
		64,
		(BigInt(high) << 32n) +
			BigInt(low) +
			BigInt.asIntN(32, BigInt(a)) * BigInt.asIntN(32, BigInt(b))
	);
	assert.equal(cpu.gprs[0] >>> 0, Number(signedAccumulate & 0xffffffffn));
	assert.equal(cpu.gprs[1] >>> 0, Number(signedAccumulate >> 32n));

	cpu.gprs[0] = low;
	cpu.gprs[1] = high;
	cpu.armCompiler.constructUMLAL(1, 0, 3, 2, null)();
	const unsignedAccumulate = BigInt.asUintN(
		64,
		(BigInt(high) << 32n) +
			BigInt(low) +
			BigInt(a >>> 0) * BigInt(b)
	);
	assert.equal(cpu.gprs[0] >>> 0, Number(unsignedAccumulate & 0xffffffffn));
	assert.equal(cpu.gprs[1] >>> 0, Number(unsignedAccumulate >> 32n));
});

test("ARM long multiply variants match 64-bit arithmetic across deterministic vectors", () => {
	const cpu = new CPU();
	cpu.mmu = { waitPrefetch32() {}, waitMul() {} };
	const smull = cpu.armCompiler.constructSMULL(1, 0, 3, 2, null);
	const umull = cpu.armCompiler.constructUMULL(1, 0, 3, 2, null);
	const smlal = cpu.armCompiler.constructSMLAL(1, 0, 3, 2, null);
	const umlal = cpu.armCompiler.constructUMLAL(1, 0, 3, 2, null);
	const vectors = [
		[0, 0],
		[1, 0xffffffff],
		[0x7fffffff, 0x7fffffff],
		[0x80000000, 0x80000000],
		[0xffffffff, 0xffffffff],
		[0x0000ffff, 0xffff0000],
		[0x00010000, 0x00010000]
	];
	let seed = 0x12345678;
	function nextU32() {
		seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
		return seed >>> 0;
	}
	for (let i = 0; i < 64; ++i) {
		vectors.push([nextU32(), nextU32()]);
	}

	for (const [a, b] of vectors) {
		cpu.gprs[2] = a;
		cpu.gprs[3] = b;
		smull();
		const signedProduct = BigInt.asUintN(
			64,
			BigInt.asIntN(32, BigInt(a)) * BigInt.asIntN(32, BigInt(b))
		);
		assert.equal(cpu.gprs[0] >>> 0, Number(signedProduct & 0xffffffffn));
		assert.equal(cpu.gprs[1] >>> 0, Number(signedProduct >> 32n));

		umull();
		const unsignedProduct = BigInt(a) * BigInt(b);
		assert.equal(cpu.gprs[0] >>> 0, Number(unsignedProduct & 0xffffffffn));
		assert.equal(cpu.gprs[1] >>> 0, Number(unsignedProduct >> 32n));

		const low = nextU32();
		const high = nextU32();
		cpu.gprs[0] = low;
		cpu.gprs[1] = high;
		cpu.cycles = 0;
		smlal();
		const signedSum = BigInt.asUintN(
			64,
			(BigInt(high) << 32n) +
				BigInt(low) +
				BigInt.asIntN(32, BigInt(a)) * BigInt.asIntN(32, BigInt(b))
		);
		assert.equal(cpu.gprs[0] >>> 0, Number(signedSum & 0xffffffffn));
		assert.equal(cpu.gprs[1] >>> 0, Number(signedSum >> 32n));

		cpu.gprs[0] = low;
		cpu.gprs[1] = high;
		cpu.cycles = 0;
		umlal();
		const unsignedSum = BigInt.asUintN(
			64,
			(BigInt(high) << 32n) + BigInt(low) + BigInt(a) * BigInt(b)
		);
		assert.equal(cpu.gprs[0] >>> 0, Number(unsignedSum & 0xffffffffn));
		assert.equal(cpu.gprs[1] >>> 0, Number(unsignedSum >> 32n));
	}
});

test("ARM register ROR uses the pipelined PC value for Rm", () => {
	const cpu = new CPU();
	cpu.gprs[cpu.PC] = 0x12345678;
	cpu.gprs[0] = 1;
	cpu.armCompiler.constructAddressingMode1ROR(0, cpu.PC)();
	const value = 0x1234567c;
	const expected = (value >>> 1) | (value << 31);
	assert.equal(cpu.shifterOperand, expected);
	assert.equal(cpu.shifterCarryOut, value & 1);
});

test("ARM multiply-accumulate instructions time the source register value", () => {
	const timedValues = [];
	const cpu = new CPU();
	cpu.mmu = {
		waitPrefetch32() {},
		waitMul(value) { timedValues.push(value); }
	};
	cpu.gprs[0] = 3;
	cpu.gprs[1] = 5;
	cpu.gprs[2] = 0x76543210;
	cpu.gprs[3] = 0x12345678;
	cpu.gprs[4] = 0;
	cpu.cycles = 0;
	[
		cpu.armCompiler.constructMLA(4, 0, 3, 2, null),
		cpu.armCompiler.constructMLAS(4, 0, 3, 2, null),
		cpu.armCompiler.constructSMLAL(1, 0, 3, 2, null),
		cpu.armCompiler.constructSMLALS(1, 0, 3, 2, null),
		cpu.armCompiler.constructUMLAL(1, 0, 3, 2, null),
		cpu.armCompiler.constructUMLALS(1, 0, 3, 2, null)
	].forEach((instruction) => instruction());
	assert.deepEqual(timedValues, Array(6).fill(0x12345678));
});

test("HALT advances hardware events and resumes on an enabled IRQ without IME", () => {
	const irq = new IRQ();
	let raisedCpuIRQ = false;
	const cpu = {
		cycles: 100,
		raiseIRQ() { raisedCpuIRQ = true; }
	};
	const video = {
		nextEvent: 110,
		hblankIRQ: false,
		vblankIRQ: false,
		vcounterIRQ: false,
		updateTimers() {
			this.nextEvent = 120;
			irq.raiseIRQ(irq.IRQ_VBLANK);
		}
	};
	irq.cpu = cpu;
	irq.core = { ASSERT() {} };
	irq.video = video;
	irq.audio = { enabled: false, updateTimers() {} };
	irq.io = { IF: 0x202, registers: new Uint16Array(0x200) };
	irq.enable = false;
	irq.enabledIRQs = irq.MASK_VBLANK;
	irq.interruptFlags = 0;
	irq.timersEnabled = 0;
	irq.dma = Array.from({ length: 4 }, () => ({ enable: false }));

	assert.doesNotThrow(() => irq.halt());
	assert.equal(irq.halted, true);
	assert.equal(irq.stepHalt(), false);
	assert.equal(cpu.cycles, 110);
	assert.equal(irq.halted, false);
	assert.equal(irq.interruptFlags & irq.MASK_VBLANK, irq.MASK_VBLANK);
	assert.equal(raisedCpuIRQ, false);
});

test("IntrWait preserves unrelated IF flags and only discards requested stale flags", () => {
	const { irq, cpu, io } = softwareInterruptHarness();
	const requested = irq.MASK_VBLANK;
	const unrelated = irq.MASK_DMA3;
	let traps = 0;
	irq.io = Object.assign(io, {
		IF: 0x202,
		registers: new Uint16Array(0x200)
	});
	irq.enable = true;
	cpu.raiseTrap = () => { ++traps; };

	irq.interruptFlags = requested | unrelated;
	cpu.gprs[0] = 1;
	cpu.gprs[1] = requested;
	irq.swi(0x04);
	assert.equal(irq.interruptFlags, unrelated);
	assert.equal(irq.io.registers[irq.io.IF >> 1], unrelated);
	assert.equal(traps, 1);

	irq.interruptFlags = requested | unrelated;
	cpu.gprs[0] = 0;
	cpu.gprs[1] = requested;
	irq.swi(0x04);
	assert.equal(irq.interruptFlags, requested | unrelated);
	assert.equal(traps, 1);

	irq.interruptFlags = unrelated;
	cpu.gprs[0] = 0;
	cpu.gprs[1] = requested;
	irq.swi(0x04);
	assert.equal(irq.interruptFlags, unrelated);
	assert.equal(traps, 2);
});

test("standalone multiplayer SIO reports missing peers after transfer", () => {
	const sio = new SIO();
	const io = new IO();
	const irq = new IRQ();
	const cpu = { cycles: 1000, raiseIRQ() {} };
	const core = {
		cpu,
		irq,
		sio,
		io,
		INFO() {},
		STUB(message) { throw new Error(message); },
		WARN(message) { throw new Error(message); },
		ASSERT() {}
	};
	io.registers = new Uint16Array(0x200);
	io.cpu = { irq, mmu: { adjustTimings() {} } };
	io.core = core;
	io.sio = sio;
	sio.core = core;
	sio.clear();
	irq.cpu = cpu;
	irq.core = core;
	irq.io = io;
	irq.video = { nextEvent: 50000, updateTimers() {} };
	irq.audio = { enabled: false, updateTimers() {} };
	irq.timersEnabled = 0;
	irq.dma = Array.from({ length: 4 }, () => ({ enable: false }));
	irq.enable = false;
	irq.enabledIRQs = 0;
	irq.interruptFlags = 0;
	irq.nextEvent = 0;
	irq.springIRQ = false;

	io.registers[io.RCNT >> 1] = io.DEFAULT_RCNT;
	io.store16(io.RCNT, 0);
	io.store16(io.SIOCNT, 0x6000);
	assert.equal(io.loadU16(io.RCNT) & 1, 1);
	assert.equal(io.loadU16(io.SIOCNT) & 0x000c, 0x000c);
	io.store16(io.SIOMLT_SEND, 0xabcd);
	assert.equal(io.loadU16(io.SIOMLT_SEND), 0xabcd);
	io.store16(io.SIOCNT, 0x6080);

	assert.equal(sio.nextEvent, cpu.cycles + 31976);
	assert.equal(irq.nextEvent, sio.nextEvent);
	assert.equal(io.loadU16(io.SIOCNT), 0x608c);
	assert.equal(io.loadU16(io.SIOCNT) & 0x0040, 0);
	assert.equal(io.loadU16(io.RCNT) & 1, 0);
	assert.equal(io.loadU16(io.SIOMULTI0), 0xffff);
	assert.equal(io.loadU16(io.SIOMULTI1), 0xffff);
	io.store16(io.SIOMLT_SEND, 0x7777);

	cpu.cycles = sio.nextEvent - 1;
	irq.updateTimers();
	assert.equal(sio.multiplayer.busy, 0x80);
	assert.equal(irq.interruptFlags & irq.MASK_SIO, 0);

	++cpu.cycles;
	irq.updateTimers();
	assert.equal(sio.multiplayer.busy, 0);
	assert.equal(io.loadU16(io.SIOMULTI0), 0xabcd);
	assert.equal(io.loadU16(io.SIOMULTI1), 0xffff);
	assert.equal(io.loadU16(io.RCNT) & 1, 1);
	assert.equal(irq.interruptFlags & irq.MASK_SIO, irq.MASK_SIO);
	assert.equal(io.loadU16(io.SIOCNT) & 0x0040, 0x0040);
	assert.equal(io.loadU16(io.SIOCNT) & 0x80, 0);
	io.store16(io.SIOCNT, 0x6080);
	assert.equal(io.loadU16(io.SIOCNT) & 0x0040, 0);
	sio.setMode(sio.SIO_GPIO);
	assert.equal(io.loadU16(io.RCNT) & 1, 1);
});

test("multiplayer SIO uses each baud timing and clears transfers when mode changes", () => {
	for (const [baud, cycles] of [
		[0, 31976],
		[1, 8378],
		[2, 5750],
		[3, 3140]
	]) {
		const sio = new SIO();
		const polls = [];
		sio.core = {
			cpu: { cycles: 50 },
			io: { SIOMLT_SEND: 0x12a, registers: new Uint16Array(0x200) },
			irq: {
				pollNextEvent() { polls.push(true); }
			},
			INFO() {},
			STUB(message) { throw new Error(message); }
		};
		sio.clear();
		sio.setMode(sio.SIO_MULTI);
		assert.equal(sio.sd, true);
		assert.equal(sio.multiplayer.si, 0x0004);
		sio.writeSIOCNT(0x80 | baud);
		assert.equal(sio.nextEvent, 50 + cycles);
		assert.equal(sio.multiplayer.busy, 0x80);
		assert.equal(polls.length, 1);
		sio.setMode(sio.SIO_GPIO);
		assert.equal(sio.nextEvent, 0);
		assert.equal(sio.multiplayer.busy, 0);
	}
});

test("serial-mode RCNT writes preserve pin states and clear reserved bits", () => {
	const sio = new SIO();
	const io = new IO();
	io.registers = new Uint16Array(0x200);
	io.core = {
		io,
		INFO() {},
		STUB(message) { throw new Error(message); }
	};
	io.sio = sio;
	sio.core = io.core;
	sio.clear();
	io.registers[io.RCNT >> 1] = io.DEFAULT_RCNT;
	io.registers[io.SIOCNT >> 1] = 0x2000;
	sio.setMode(sio.SIO_MULTI);

	const pinStates = io.loadU16(io.RCNT) & 0x000f;
	io.store16(io.RCNT, 0x3fff);
	const result = io.loadU16(io.RCNT);
	assert.equal(result & 0x000f, pinStates);
	assert.equal(result & 0x01f0, 0x01f0);
	assert.equal(result & 0x3e00, 0);
});

test("SIO save states preserve an in-flight transfer deadline and send word", () => {
	const sio = new SIO();
	sio.core = {
		cpu: { cycles: 200 },
		io: { SIOMLT_SEND: 0x12a, registers: new Uint16Array(0x200) },
		irq: { pollNextEvent() {} },
		INFO() {},
		STUB(message) { throw new Error(message); }
	};
	sio.clear();
	sio.core.io.registers[sio.core.io.SIOMLT_SEND >> 1] = 0x4567;
	sio.setMode(sio.SIO_MULTI);
	sio.writeSIOCNT(0x80 | 2);

	const restored = new SIO();
	restored.core = sio.core;
	restored.defrost(sio.freeze());
	assert.equal(restored.nextEvent, sio.nextEvent);
	assert.equal(restored.multiplayer.busy, 0x80);
	assert.equal(restored.multiplayer.send, 0x4567);
});

test("normal 8-bit SIO completes an internal-clock transfer and requests IRQ", () => {
	const sio = new SIO();
	const io = new IO();
	const interrupts = [];
	const cpu = { cycles: 1000 };
	const core = {
		cpu,
		sio,
		io,
		irq: {
			IRQ_SIO: 7,
			pollNextEvent() {},
			raiseIRQ(type) { interrupts.push(type); }
		},
		INFO() {},
		STUB(message) { throw new Error(message); },
		WARN(message) { throw new Error(message); }
	};
	io.registers = new Uint16Array(0x200);
	io.cpu = { irq: core.irq, mmu: { adjustTimings() {} } };
	io.core = core;
	io.sio = sio;
	sio.core = core;
	sio.clear();
	io.store16(io.RCNT, 0);
	io.store16(io.SIODATA8, 0xa5);
	io.store16(io.SIOCNT, 0x4081);

	assert.equal(sio.nextEvent, 1000 + 8 * 64);
	assert.equal(io.loadU16(io.SIODATA8), 0xa5);
	assert.equal(io.loadU16(io.SIOCNT) & 0x84, 0x84);
	sio.core.cpu.cycles = sio.nextEvent - 1;
	sio.updateTimers();
	assert.equal(io.loadU16(io.SIOCNT) & 0x80, 0x80);
	sio.core.cpu.cycles++;
	sio.updateTimers();
	assert.equal(io.loadU16(io.SIODATA8), 0xff);
	assert.equal(io.loadU16(io.SIOCNT) & 0x80, 0);
	assert.deepEqual(interrupts, [7]);
});

test("normal 32-bit SIO transfers both data halves and external clock waits", () => {
	const sio = new SIO();
	const io = new IO();
	const interrupts = [];
	const cpu = { cycles: 200 };
	const core = {
		cpu,
		sio,
		io,
		irq: {
			IRQ_SIO: 7,
			pollNextEvent() {},
			raiseIRQ(type) { interrupts.push(type); }
		},
		INFO() {},
		STUB(message) { throw new Error(message); },
		WARN(message) { throw new Error(message); }
	};
	io.registers = new Uint16Array(0x200);
	io.cpu = { irq: core.irq, mmu: { adjustTimings() {} } };
	io.core = core;
	io.sio = sio;
	sio.core = core;
	sio.clear();
	io.store16(io.RCNT, 0);
	io.store16(io.SIOCNT, 0x1000);
	io.store32(io.SIODATA32_LO, 0x89abcdef);
	io.store16(io.SIOCNT, 0x5083);
	assert.equal(sio.nextEvent, 200 + 32 * 8);
	assert.equal(io.load32(io.SIODATA32_LO) >>> 0, 0x89abcdef);
	cpu.cycles = sio.nextEvent;
	sio.updateTimers();
	assert.equal(io.load32(io.SIODATA32_LO) >>> 0, 0xffffffff);
	assert.equal(io.loadU16(io.SIOCNT) & 0x80, 0);
	assert.deepEqual(interrupts, [7]);

	interrupts.length = 0;
	cpu.cycles += 20;
	io.store16(io.SIOCNT, 0x5082);
	assert.equal(sio.normal.busy, true);
	assert.equal(sio.nextEvent, 0);
	sio.updateTimers();
	assert.equal(sio.normal.busy, true);
	assert.deepEqual(interrupts, []);
	sio.setMode(sio.SIO_GPIO);
	assert.equal(sio.normal.busy, false);
	assert.equal(sio.nextEvent, 0);
});

test("CpuSet and CpuFastSet honor all 21 count bits", () => {
	const { irq, cpu, mmu } = softwareInterruptHarness();
	const sentinel = new Error("first transfer reached");
	mmu.load32 = () => 0;
	mmu.store32 = () => { throw sentinel; };
	cpu.gprs[0] = 0x02000000;
	cpu.gprs[1] = 0x02000004;
	cpu.gprs[2] = 0x05100000;
	assert.throws(() => irq.swi(0x0b), (error) => error === sentinel);

	cpu.gprs[2] = 0x00100000;
	assert.throws(() => irq.swi(0x0c), (error) => error === sentinel);
});

test("GetBiosChecksum SWI reports the standard BIOS identity", () => {
	const { irq, cpu } = softwareInterruptHarness();
	irq.swi(0x0d);
	assert.deepEqual(Array.from(cpu.gprs.slice(0, 4)), [0xbaae187f | 0, 1, 0, 0x4000]);
});

test("BgAffineSet SWI treats screen anchors as signed halfwords", () => {
	const { irq, cpu, mmu, base } = softwareInterruptHarness();
	const source = base;
	const destination = base + 0x100;
	mmu.store32(source, 10 * 256);
	mmu.store32(source + 4, 20 * 256);
	mmu.store16(source + 8, -2);
	mmu.store16(source + 10, -3);
	mmu.store16(source + 12, 256);
	mmu.store16(source + 14, 256);
	mmu.store16(source + 16, 0);
	cpu.gprs[0] = source;
	cpu.gprs[1] = destination;
	cpu.gprs[2] = 1;

	irq.swi(0x0e);

	assert.deepEqual(
		[0, 2, 4, 6].map((offset) => mmu.load16(destination + offset)),
		[256, 0, 0, 256]
	);
	assert.equal(mmu.load32(destination + 8), 12 * 256);
	assert.equal(mmu.load32(destination + 12), 23 * 256);
});

test("ObjAffineSet advances through padded 8-byte source records", () => {
	const { irq, cpu, mmu, base } = softwareInterruptHarness();
	const source = base + 0x100;
	const destination = base + 0x200;
	const records = [
		[0x0100, 0x0100, 0x0000],
		[0x0200, 0x0300, 0x4000]
	];
	for (let index = 0; index < records.length; ++index) {
		const offset = source + index * 8;
		for (let field = 0; field < 3; ++field) {
			mmu.store16(offset + field * 2, records[index][field]);
		}
		mmu.store16(offset + 6, 0xffff);
	}
	cpu.gprs[0] = source;
	cpu.gprs[1] = destination;
	cpu.gprs[2] = records.length;
	cpu.gprs[3] = 2;

	irq.swi(0x0f);

	assert.deepEqual(
		[0, 2, 4, 6, 8, 10, 12, 14].map((offset) => mmu.loadU16(destination + offset)),
		[0x0100, 0, 0, 0x0100, 0, 0xfe00, 0x0300, 0]
	);
});

test("SoundBias SWI selects the documented output bias", () => {
	const { irq, cpu, io } = softwareInterruptHarness();
	cpu.gprs[0] = 0;
	irq.swi(0x19);
	cpu.gprs[0] = 1;
	irq.swi(0x19);
	assert.deepEqual(io.writes, [[io.SOUNDBIAS, 0], [io.SOUNDBIAS, 0x200]]);
});

test("SoundBias SWI preserves the selected Direct Sound resolution", () => {
	const { irq, cpu, io } = softwareInterruptHarness();
	io.registers[io.SOUNDBIAS >> 1] = 0xc000;

	cpu.gprs[0] = 1;
	irq.swi(0x19);
	assert.equal(io.loadU16(io.SOUNDBIAS), 0xc200);

	cpu.gprs[0] = 0;
	irq.swi(0x19);
	assert.equal(io.loadU16(io.SOUNDBIAS), 0xc000);
	assert.deepEqual(io.writes, [
		[io.SOUNDBIAS, 0xc200],
		[io.SOUNDBIAS, 0xc000]
	]);
});

test("SOUNDCNT_L routes PSG channels and scales each stereo side independently", () => {
	const audio = Object.create(Audio.prototype);
	Object.assign(audio, {
		SOUND_MAX: 0x400,
		PSG_MAX: 0x80,
		masterVolume: 1,
		soundRatio: 1,
		squareChannels: [
			{ playing: true, sample: 1 },
			{ playing: false, sample: 0 }
		],
		playingChannel3: false,
		playingChannel4: false,
		enableChannelA: false,
		enableChannelB: false,
		buffers: [new Float32Array(1), new Float32Array(1)],
		samplePointer: 0,
		sampleMask: 0,
		updateTimers() {},
		core: { irq: { pollNextEvent() {} } }
	});

	audio.writeSoundControlLo((7 << 4) | (1 << 12));
	audio.sample();
	assert.equal(audio.masterVolumeLeft, 7);
	assert.equal(audio.masterVolumeRight, 0);
	assert.equal(audio.buffers[0][0], 1);
	assert.equal(audio.buffers[1][0], 0);

	audio.writeSoundControlLo(7 | (1 << 8));
	audio.sample();
	assert.equal(audio.masterVolumeRight, 7);
	assert.equal(audio.masterVolumeLeft, 0);
	assert.equal(audio.buffers[0][0], 0);
	assert.equal(audio.buffers[1][0], 1);
});

test("PSG routing does not trigger square or noise channels", () => {
	const audio = Object.create(Audio.prototype);
	const makeSquare = () => ({
		playing: false,
		sample: 0,
		duty: 0.5,
		increment: 0,
		step: 0,
		initialVolume: 0,
		volume: 0,
		frequency: 0,
		interval: 1024,
		sweepSteps: 0,
		sweepIncrement: 1,
		sweepInterval: 0,
		doSweep: false,
		raise: 0,
		lower: 0,
		nextStep: 0,
		timed: false,
		length: 0,
		end: 0
	});
	Object.assign(audio, {
		cpuFrequency: 0x1000000,
		cpu: { cycles: 100 },
		squareChannels: [makeSquare(), makeSquare()],
		channel4: {
			sample: 0,
			lfsr: 0x7fff,
			width: 15,
			interval: 32,
			increment: 0,
			step: 0,
			initialVolume: 0,
			volume: 0,
			nextStep: 0,
			timed: false,
			length: 0,
			end: 0,
			next: 0
		},
		enabledLeft: 0,
		enabledRight: 0,
		masterVolumeLeft: 0,
		masterVolumeRight: 0,
		playingChannel3: false,
		playingChannel4: false,
		nextEvent: Infinity,
		updateTimers() {},
		core: { irq: { pollNextEvent() {} } }
	});

	// A route bit must not start a channel, and setup writes must wait for bit 15.
	audio.writeSoundControlLo(1 << 8);
	assert.equal(audio.squareChannels[0].playing, false);
	audio.writeSquareChannelSweep(0, 0x20);
	audio.writeSquareChannelDLE(0, 0xf000);
	audio.writeSquareChannelFC(0, 0x0123);
	assert.equal(audio.squareChannels[0].playing, false);

	// The trigger bit starts the oscillator even when neither side routes it.
	audio.writeSoundControlLo(0);
	audio.writeSquareChannelFC(0, 0x8000 | 0x0123);
	assert.equal(audio.squareChannels[0].playing, true);

	// Noise route and parameter writes also stay separate from its trigger.
	audio.writeSoundControlLo(1 << 15);
	assert.equal(audio.playingChannel4, false);
	audio.writeSoundControlLo(0);
	audio.writeChannel4LE(0xf000);
	audio.writeChannel4FC(0x003b);
	assert.equal(audio.playingChannel4, false);
	audio.writeChannel4FC(0x8000 | 0x003b);
	assert.equal(audio.playingChannel4, true);
	assert.equal(audio.channel4.lfsr, 0x7f);

	// Frequency and width updates while active do not reseed the noise counter.
	audio.channel4.lfsr = 0x35;
	audio.writeChannel4FC(0x0002);
	assert.equal(audio.channel4.lfsr, 0x35);
	assert.equal(audio.playingChannel4, true);
});

test("unrouted wave and noise channels continue advancing their oscillators", () => {
	const audio = Object.create(Audio.prototype);
	Object.assign(audio, {
		cpu: { cycles: 10 },
		cpuFrequency: 0x1000000,
		enabled: true,
		nextEvent: 0,
		nextSample: Infinity,
		sampleInterval: 1,
		squareChannels: [{ playing: false }, { playing: false }],
		playingChannel3: true,
		channel3Next: 0,
		channel3Interval: 1,
		channel3Write: true,
		channel3Bank: 0,
		channel3Dimension: 0,
		channel3Pointer: 0,
		channel3Timed: false,
		channel3Sample: 0,
		channel3Volume: 1,
		waveData: new Uint8Array(32),
		playingChannel4: true,
		channel4: {
			timed: false,
			end: 100,
			next: 0,
			interval: 1,
			lfsr: 0x7fff,
			width: 15,
			sample: 0,
			volume: 1,
			step: 0
		},
		updateEnvelope() {},
		core: { irq: { pollNextEvent() {} } },
		sample() {}
	});

	audio.updateTimers();
	assert.equal(audio.channel3Pointer, 11);
	assert.notEqual(audio.channel4.lfsr, 0x7fff);
});

test("audio ring buffer holds four callbacks at the highest SOUNDBIAS rate", () => {
	const originalWindowAudioContext = context.window.AudioContext;
	const originalAudioContext = context.AudioContext;
	class MockAudioContext {
		constructor() {
			this.sampleRate = 44100;
			this.destination = {};
		}
		createScriptProcessor() {
			return { connect() {}, disconnect() {} };
		}
	}
	context.window.AudioContext = MockAudioContext;
	context.AudioContext = MockAudioContext;
	try {
		const audio = new Audio();
		const requiredSamples = Math.ceil(
			(audio.bufferSize << 2) * (262144 / 44100)
		);
		assert.ok(audio.maxSamples >= requiredSamples);
		assert.equal(audio.maxSamples & (audio.maxSamples - 1), 0);
		assert.equal(audio.sampleMask, audio.maxSamples - 1);
		assert.equal(audio.buffers[0].length, audio.maxSamples);
		assert.equal(audio.buffers[1].length, audio.maxSamples);
	} finally {
		if (originalWindowAudioContext === undefined) {
			delete context.window.AudioContext;
		} else {
			context.window.AudioContext = originalWindowAudioContext;
		}
		if (originalAudioContext === undefined) {
			delete context.AudioContext;
		} else {
			context.AudioContext = originalAudioContext;
		}
	}
});

test("audio output resampling interpolates between GBA samples", () => {
	const audio = Object.create(Audio.prototype);
	const left = new Float32Array(4);
	const right = new Float32Array(4);
	Object.assign(audio, {
		masterEnable: true,
		bufferSize: 4,
		maxSamples: 16,
		sampleMask: 15,
		buffers: [
			Float32Array.from([0, 1, 0, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
			Float32Array.from([0, -1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
		],
		outputPointer: 0,
		samplePointer: 8,
		resampleRatio: 0.5,
		backup: 0,
		totalSamples: 0
	});

	audio.audioProcess({
		outputBuffer: {
			getChannelData(channel) {
				return channel ? right : left;
			}
		}
	});

	assert.deepEqual(Array.from(left), [0, 0.5, 1, 0.5]);
	assert.deepEqual(Array.from(right), [0, -0.5, -1, -0.5]);
	assert.equal(audio.outputPointer, 2);
});

test("Sound 3 frequency changes do not restart playback without the trigger bit", () => {
	let resets = 0;
	const audio = Object.create(Audio.prototype);
	Object.assign(audio, {
		cpuFrequency: 16777216,
		channel3Write: true,
		channel3Pointer: 13,
		resetChannel3() {
			resets++;
		}
	});

	audio.writeChannel3X(0x0400);

	assert.equal(resets, 0);
	assert.equal(audio.channel3Pointer, 13);
	assert.ok(audio.channel3Interval > 0);
});

test("Sound 3 reads the high wave-RAM nibble before the low nibble", () => {
	const audio = Object.create(Audio.prototype);
	Object.assign(audio, {
		enabled: true,
		cpu: { cycles: 0 },
		nextEvent: 0,
		nextSample: Infinity,
		sampleInterval: Infinity,
		squareChannels: [{ playing: false }, { playing: false }],
		playingChannel3: true,
		channel3Write: 0x80,
		channel3Pointer: 0,
		channel3Interval: 2,
		channel3Next: 0,
		channel3Dimension: 0,
		channel3Bank: 0,
		channel3Timed: false,
		channel3End: Infinity,
		waveData: Uint8Array.from([0x67, ...new Array(31).fill(0)])
	});

	audio.updateTimers();
	assert.equal(audio.channel3Sample, (6 - 8) / 8);
	assert.equal(audio.channel3Pointer, 1);

	audio.cpu.cycles = 2;
	audio.updateTimers();
	assert.equal(audio.channel3Sample, (7 - 8) / 8);
	assert.equal(audio.channel3Pointer, 2);
});

test("Sound 3 single-bank playback follows the selected bank and wraps after 32 samples", () => {
	const waveData = new Uint8Array(32);
	waveData[0] = 0x12;
	waveData[16] = 0xab;
	const audio = Object.create(Audio.prototype);
	Object.assign(audio, {
		enabled: true,
		cpu: { cycles: 0 },
		nextEvent: 0,
		nextSample: Infinity,
		sampleInterval: Infinity,
		squareChannels: [{ playing: false }, { playing: false }],
		playingChannel3: true,
		channel3Write: 0x80,
		channel3Pointer: 0,
		channel3Interval: 2,
		channel3Next: 0,
		channel3Dimension: 0,
		channel3Bank: 0x40,
		channel3Timed: false,
		channel3End: Infinity,
		waveData
	});

	for (let step = 0; step < 32; ++step) {
		audio.cpu.cycles = step * audio.channel3Interval;
		audio.updateTimers();
		if (step === 0) {
			assert.equal(audio.channel3Sample, (0xa - 8) / 8);
		} else if (step === 1) {
			assert.equal(audio.channel3Sample, (0xb - 8) / 8);
		}
	}
	assert.equal(audio.channel3Pointer, 0);
});

test("Sound 3 64-step playback plays the selected bank before the other bank", () => {
	const waveData = new Uint8Array(32);
	waveData[0] = 0x12;
	waveData[16] = 0xab;
	const audio = Object.create(Audio.prototype);
	Object.assign(audio, {
		enabled: true,
		cpu: { cycles: 0 },
		nextEvent: 0,
		nextSample: Infinity,
		sampleInterval: Infinity,
		squareChannels: [{ playing: false }, { playing: false }],
		playingChannel3: true,
		channel3Write: 0x80,
		channel3Pointer: 0,
		channel3Interval: 2,
		channel3Next: 0,
		channel3Dimension: 0x20,
		channel3Bank: 0x40,
		channel3Timed: false,
		channel3End: Infinity,
		waveData
	});

	for (let step = 0; step < 64; ++step) {
		audio.cpu.cycles = step * audio.channel3Interval;
		audio.updateTimers();
		if (step === 0) {
			assert.equal(audio.channel3Sample, (0xa - 8) / 8);
		} else if (step === 1) {
			assert.equal(audio.channel3Sample, (0xb - 8) / 8);
		} else if (step === 32) {
			assert.equal(audio.channel3Sample, (0x1 - 8) / 8);
		} else if (step === 33) {
			assert.equal(audio.channel3Sample, (0x2 - 8) / 8);
		}
	}
	assert.equal(audio.channel3Pointer, 0);
});

test("Sound 3 trigger restarts the waveform position", () => {
	const audio = Object.create(Audio.prototype);
	Object.assign(audio, {
		cpuFrequency: 16777216,
		cpu: { cycles: 100 },
		core: { irq: { pollNextEvent() {} } },
		enabled: false,
		channel3Write: true,
		channel3Pointer: 13,
		channel3Length: 20,
		nextEvent: 0
	});

	audio.writeChannel3X(0x8400);

	assert.equal(audio.channel3Pointer, 0);
	assert.equal(audio.channel3Next, 100);
	assert.equal(audio.channel3End, 120);
	assert.equal(audio.playingChannel3, true);
});

test("Wave RAM reads and writes honor the accessible bank mapping", () => {
	function audioState(enabled, selectedBank) {
		const audio = Object.create(Audio.prototype);
		audio.enabled = enabled;
		audio.channel3Bank = selectedBank;
		audio.waveData = new Uint8Array(32);
		return audio;
	}
	function readWaveRam(audio) {
		const io = new IO();
		io.audio = audio;
		io.registers = new Uint16Array(0x200);
		return io.loadU16(io.WAVE_RAM0_LO);
	}
	function writtenBank(enabled, selectedBank) {
		const audio = audioState(enabled, selectedBank);
		audio.writeWaveData(0, 0x1234, 2);
		return audio;
	}

	const disabled = writtenBank(false, 0x40);
	assert.deepEqual(Array.from(disabled.waveData.slice(0, 2)), [0, 0]);
	assert.deepEqual(Array.from(disabled.waveData.slice(16, 18)), [0x34, 0x12]);

	const enabledPlayingBank1 = writtenBank(true, 0x40);
	assert.deepEqual(Array.from(enabledPlayingBank1.waveData.slice(0, 2)), [0x34, 0x12]);
	assert.deepEqual(Array.from(enabledPlayingBank1.waveData.slice(16, 18)), [0, 0]);

	const enabledPlayingBank0 = writtenBank(true, 0);
	assert.deepEqual(Array.from(enabledPlayingBank0.waveData.slice(0, 2)), [0, 0]);
	assert.deepEqual(Array.from(enabledPlayingBank0.waveData.slice(16, 18)), [0x34, 0x12]);

	const readable = audioState(false, 0x40);
	readable.waveData.set([0x11, 0x22], 0);
	readable.waveData.set([0x33, 0x44], 16);
	assert.equal(readWaveRam(readable), 0x4433);
	readable.enabled = true;
	assert.equal(readWaveRam(readable), 0x2211);
	readable.channel3Bank = 0;
	assert.equal(readWaveRam(readable), 0x4433);
	readable.channel3Bank = 0x40;
	assert.equal(readWaveRam(readable), 0x2211);
});

test("noise channel LFSR follows the captured 7-bit sequence and both full periods", () => {
	for (const width of [7, 15]) {
		const audio = Object.create(Audio.prototype);
		Object.assign(audio, {
			playingChannel4: false,
			cpu: { cycles: 0 },
			core: { irq: { pollNextEvent() {} } },
			nextEvent: 0,
			enabled: false,
			channel4: {
				width,
				lfsr: 0,
				volume: 1,
				timed: false,
				length: 0,
				end: 0,
				next: 0,
				step: 0
			}
		});

		audio.resetChannel4();
		const initial = (1 << width) - 1;
		assert.equal(audio.channel4.lfsr, initial);
		const firstBits = [];
		const states = new Set();
		const period = initial;
		for (let step = 0; step < period; ++step) {
			states.add(audio.channel4.lfsr);
			const bit = audio.clockChannel4();
			if (width == 7 && step < 7) {
				firstBits.push(bit);
			}
		}
		assert.equal(states.size, period);
		assert.equal(audio.channel4.lfsr, initial);
		if (width == 7) {
			assert.deepEqual(firstBits, [1, 1, 1, 1, 1, 1, 0]);
		}
	}
});

test("disabling Sound 3 immediately stops waveform playback", () => {
	const audio = Object.create(Audio.prototype);
	Object.assign(audio, {
		channel3Write: 0x80,
		playingChannel3: true,
		core: { irq: { pollNextEvent() {} } }
	});

	audio.writeChannel3Lo(0);

	assert.equal(audio.channel3Write, 0);
	assert.equal(audio.playingChannel3, false);
});

test("enabling Sound 3 output alone does not trigger playback", () => {
	let resets = 0;
	const audio = Object.create(Audio.prototype);
	Object.assign(audio, {
		channel3Write: 0,
		playingChannel3: false,
		core: { irq: { pollNextEvent() {} } },
		resetChannel3() {
			resets++;
		}
	});

	audio.writeChannel3Lo(0x80);

	assert.equal(audio.channel3Write, 0x80);
	assert.equal(audio.playingChannel3, false);
	assert.equal(resets, 0);
});

test("SOUNDCNT_X reports master power and active PSG channels", () => {
	const io = new IO();
	io.registers = new Uint16Array(0x200);
	let stubCalls = 0;
	io.core = {
		STUB() {
			stubCalls++;
		}
	};
	io.audio = {
		enabled: true,
		squareChannels: [{ playing: true }, { playing: false }],
		playingChannel3: true,
		playingChannel4: true
	};

	assert.equal(io.loadU16(io.SOUNDCNT_X), 0x008d);

	io.audio.squareChannels[0].playing = false;
	io.audio.playingChannel3 = false;
	assert.equal(io.loadU16(io.SOUNDCNT_X), 0x0088);

	io.audio.enabled = false;
	io.audio.playingChannel4 = false;
	assert.equal(io.loadU16(io.SOUNDCNT_X), 0x0000);
	assert.equal(stubCalls, 0);
});

test("SOUNDCNT_H resets FIFO while its reset command bits read back as zero", () => {
	const io = new IO();
	io.registers = new Uint16Array(0x200);
	const controlWrites = [];
	io.audio = {
		writeSoundControlHi(value) {
			controlWrites.push(value);
		}
	};

	io.store16(io.SOUNDCNT_HI, 0x8802);

	assert.deepEqual(controlWrites, [0x8802]);
	assert.equal(io.registers[io.SOUNDCNT_HI >> 1], 0x0002);
	assert.equal(io.loadU16(io.SOUNDCNT_HI), 0x0002);
});

test("old save states do not restore SOUNDCNT_H FIFO reset commands", () => {
	const io = new IO();
	const registers = new Uint16Array(0x200);
	registers[io.SOUNDCNT_HI >> 1] = 0x888f;
	// defrost also replays all video registers; isolate the audio-state
	// sanitization this regression covers.
	io.store16 = () => {};

	io.defrost({ registers: registers.buffer });

	assert.equal(io.registers[io.SOUNDCNT_HI >> 1], 0x000f);
});

test("audio timer catch-up handles a long DMA stall without recursion", () => {
	const audio = Object.create(Audio.prototype);
	Object.assign(audio, {
		enabled: true,
		cpu: { cycles: 655360 },
		nextEvent: Infinity,
		nextSample: 0,
		sampleInterval: 16,
		sampleCount: 0,
		squareChannels: [{ playing: false }, { playing: false }],
		playingChannel3: false,
		playingChannel4: false,
		sample() {
			this.sampleCount++;
		}
	});

	assert.doesNotThrow(() => audio.updateTimers());
	assert.equal(audio.sampleCount, 40961);
	assert.equal(audio.nextSample, 655376);
});

test("audio output interpolation wraps across the ring-buffer boundary", () => {
	const audio = Object.create(Audio.prototype);
	const left = new Float32Array(4);
	const right = new Float32Array(4);
	const leftSamples = new Float32Array(16);
	const rightSamples = new Float32Array(16);
	leftSamples[15] = 1;
	leftSamples[0] = 0;
	rightSamples[15] = -1;
	rightSamples[0] = 0;
	Object.assign(audio, {
		masterEnable: true,
		bufferSize: 4,
		maxSamples: 16,
		sampleMask: 15,
		buffers: [leftSamples, rightSamples],
		outputPointer: 14,
		samplePointer: 1,
		resampleRatio: 0.5,
		backup: 0,
		totalSamples: 0
	});

	audio.audioProcess({
		outputBuffer: {
			getChannelData(channel) {
				return channel ? right : left;
			}
		}
	});

	assert.deepEqual(Array.from(left), [0, 0.5, 1, 0.5]);
	assert.deepEqual(Array.from(right), [0, -0.5, -1, -0.5]);
	assert.equal(audio.outputPointer, 0);
});

test("Direct Sound FIFO underrun holds its last sample and reset silences it", () => {
	const audio = Object.create(Audio.prototype);
	const io = { FIFO_A_LO: 0x0a0, FIFO_B_LO: 0x0a4 };
	const mmu = { BASE_IO: 0x04000000, DMA_TIMING_CUSTOM: 3 };
	const fifoDmas = [
		{ enable: true, timing: 3, dest: 0x040000a0 },
		{ enable: true, timing: 3, dest: 0x040000a4 }
	];
	Object.assign(audio, {
		SOUND_MAX: 0x400,
		FIFO_MAX: 0x80,
		PSG_MAX: 0x80,
		masterVolume: 1,
		masterVolumeLeft: 0,
		masterVolumeRight: 0,
		soundRatio: 1,
		ratioChannelA: 1,
		ratioChannelB: 1,
		enabledLeft: 0,
		enabledRight: 0,
		enableChannelA: 0x0300,
		enableChannelB: 0x3000,
		enableLeftChannelA: 0x0200,
		enableRightChannelA: 0x0100,
		enableLeftChannelB: 0x2000,
		enableRightChannelB: 0x1000,
		squareChannels: [
			{ playing: false, sample: 0 },
			{ playing: false, sample: 0 }
		],
		playingChannel3: false,
		playingChannel4: false,
		fifoA: [0.25],
		fifoB: [-0.5],
		fifoAInternal: [],
		fifoBInternal: [],
		fifoASample: 0,
		fifoBSample: 0,
		dmaA: 0,
		dmaB: 1,
		cpu: { mmu, irq: { io } },
		core: {
			irq: { dma: fifoDmas },
			mmu: { serviceDma() {} }
		},
		buffers: [new Float32Array(1), new Float32Array(1)],
		samplePointer: 0,
		sampleMask: 0
	});

	audio.sampleFifoA();
	audio.sampleFifoB();
	assert.equal(audio.fifoASample, 0.25);
	assert.equal(audio.fifoBSample, -0.5);
	assert.equal(audio.fifoA.length, 0);
	assert.equal(audio.fifoB.length, 0);

	audio.sampleFifoA();
	audio.sampleFifoB();
	assert.equal(audio.fifoASample, 0.25);
	assert.equal(audio.fifoBSample, -0.5);
	audio.sample();
	assert.ok(Number.isFinite(audio.buffers[0][0]));
	assert.ok(Number.isFinite(audio.buffers[1][0]));

	audio.fifoAInternal = [0.75];
	audio.fifoBInternal = [-0.25];
	audio.writeSoundControlHi(0x8800);
	assert.equal(audio.fifoA.length, 0);
	assert.equal(audio.fifoB.length, 0);
	assert.deepEqual(Array.from(audio.fifoAInternal), []);
	assert.deepEqual(Array.from(audio.fifoBInternal), []);
	assert.equal(audio.fifoASample, 0);
	assert.equal(audio.fifoBSample, 0);
});

test("Direct Sound FIFO sampling without a scheduled DMA channel does not crash", () => {
	const audio = Object.create(Audio.prototype);
	Object.assign(audio, {
		fifoA: [0.25],
		fifoB: [-0.5],
		fifoASample: 0,
		fifoBSample: 0,
		dmaA: -1,
		dmaB: -1
	});

	assert.doesNotThrow(() => audio.sampleFifoA());
	assert.doesNotThrow(() => audio.sampleFifoB());
	assert.equal(audio.fifoASample, 0.25);
	assert.equal(audio.fifoBSample, -0.5);
	assert.doesNotThrow(() => audio.sampleFifoA());
	assert.doesNotThrow(() => audio.sampleFifoB());
	assert.equal(audio.fifoASample, 0.25);
	assert.equal(audio.fifoBSample, -0.5);
});

test("Direct Sound loads FIFO words into its internal playback buffer", () => {
	const audio = Object.create(Audio.prototype);
	Object.assign(audio, {
		fifoA: [1, 2, 3, 4, 5, 6, 7, 8],
		fifoAInternal: [],
		fifoASample: 0,
		dmaA: -1
	});

	for (const expected of [1, 2, 3, 4]) {
		audio.sampleFifoA();
		assert.equal(audio.fifoASample, expected);
	}
	assert.equal(audio.fifoA.length, 4);
	assert.deepEqual(Array.from(audio.fifoAInternal), []);

	audio.sampleFifoA();
	assert.equal(audio.fifoASample, 5);
	assert.equal(audio.fifoA.length, 0);
	assert.deepEqual(Array.from(audio.fifoAInternal), [6, 7, 8]);
});

test("timer overflows consume Direct Sound FIFO samples without DMA", () => {
	const irq = new IRQ();
	const io = {
		registers: new Uint16Array(0x200),
		TM0CNT_LO: 0x100,
		TM1CNT_LO: 0x104,
		TM2CNT_LO: 0x108,
		TM3CNT_LO: 0x10c
	};
	const audio = Object.create(Audio.prototype);
	Object.assign(audio, {
		enabled: true,
		nextEvent: Infinity,
		enableChannelA: true,
		enableChannelB: true,
		soundTimerA: 0,
		soundTimerB: 0x4000,
		dmaA: -1,
		dmaB: -1,
		fifoA: [0.25],
		fifoB: [-0.5],
		fifoASample: 0,
		fifoBSample: 0,
		updateTimers() {}
	});

	irq.cpu = { cycles: 100 };
	irq.core = {
		sio: null,
		ASSERT(condition, message) { assert.ok(condition, message); }
	};
	irq.video = { nextEvent: 1000, updateTimers() {} };
	irq.audio = audio;
	irq.io = io;
	irq.nextEvent = 100;
	irq.timersEnabled = 2;
	irq.timers = [
		{
			enable: true,
			nextEvent: 100,
			overflowInterval: 200,
			reload: 0xff00,
			oldReload: 0,
			countUp: false,
			doIrq: false
		},
		{
			enable: true,
			nextEvent: 200,
			overflowInterval: 300,
			reload: 0xfe00,
			oldReload: 0,
			countUp: false,
			doIrq: false
		},
		{ enable: false, countUp: false, nextEvent: 0 },
		{ enable: false, countUp: false, nextEvent: 0 }
	];
	irq.dma = Array.from({ length: 4 }, () => ({
		enable: false,
		doIrq: false,
		nextIRQ: 0
	}));

	irq.updateTimers();

	assert.equal(audio.fifoA.length, 0);
	assert.equal(audio.fifoB.length, 1);
	assert.equal(audio.fifoASample, 0.25);
	assert.equal(audio.fifoBSample, 0);

	irq.cpu.cycles = 200;
	irq.updateTimers();

	assert.equal(audio.fifoB.length, 0);
	assert.equal(audio.fifoBSample, -0.5);

	irq.cpu.cycles = 300;
	irq.updateTimers();

	assert.equal(audio.fifoA.length, 0);
	assert.equal(audio.fifoASample, 0.25);
});

function timerHarness(cycles, timers, audio) {
	const irq = new IRQ();
	const io = {
		TM0CNT_LO: 0x100,
		IF: 0x202,
		registers: new Uint16Array(0x200)
	};
	const cpu = { cycles, raiseIRQ() {} };
	irq.cpu = cpu;
	irq.io = io;
	irq.core = {
		sio: null,
		ASSERT(condition, message) { assert.ok(condition, message); }
	};
	irq.video = {
		nextEvent: cycles + 1000,
		updateTimers() {}
	};
	irq.audio = Object.assign(
		{ enabled: false, updateTimers() {} },
		audio
	);
	irq.timers = timers;
	irq.timersEnabled = timers.filter((timer) => timer.enable).length;
	irq.dma = Array.from({ length: 4 }, () => ({
		enable: false,
		doIrq: false,
		nextIRQ: 0
	}));
	irq.nextEvent = cycles;
	return { irq, io, cpu };
}

function timerState(overrides = {}) {
	return Object.assign(
		{
			reload: 0,
			oldReload: 0,
			prescaleBits: 0,
			countUp: false,
			doIrq: false,
			enable: false,
			lastEvent: 0,
			nextEvent: 0,
			overflowInterval: 1
		},
		overrides
	);
}

test("timer-triggered FIFO DMA reschedules audio and video after advancing the CPU clock", () => {
	const audio = {
		enabled: true,
		nextEvent: 12,
		enableChannelA: true,
		enableChannelB: false,
		soundTimerA: 0,
		soundTimerB: 0x4000,
		dmaA: -1,
		dmaB: -1
	};
	const timer = timerState({
		enable: true,
		countUp: false,
		nextEvent: 10,
		overflowInterval: 100,
		reload: 0,
		doIrq: false
	});
	const { irq, cpu } = timerHarness(
		10,
		[timer, timerState(), timerState(), timerState()],
		audio
	);
	const videoCycles = [];
	irq.video.updateTimers = () => videoCycles.push(cpu.cycles);
	irq.audio.updateTimers = function () {
		if (this.nextEvent <= cpu.cycles) {
			this.nextEvent = cpu.cycles + 5;
		}
	};
	irq.audio.sampleFifoA = () => {
		cpu.cycles += 5;
	};

	irq.updateTimers();

	assert.equal(cpu.cycles, 15);
	assert.deepEqual(videoCycles, [10, 15]);
	assert.equal(irq.audio.nextEvent, 20);
	assert.ok(irq.nextEvent >= cpu.cycles);
});

test("one-shot DMA completion IRQ survives its channel being disabled", () => {
	const timers = [timerState(), timerState(), timerState(), timerState()];
	const { irq, cpu } = timerHarness(100, timers);
	Object.assign(irq.dma[0], {
		enable: false,
		doIrq: true,
		nextIRQ: 110
	});

	irq.pollNextEvent();
	assert.equal(irq.nextEvent, 110);
	cpu.cycles = 109;
	irq.updateTimers();
	assert.equal(irq.interruptFlags & irq.MASK_DMA0, 0);
	cpu.cycles = 110;
	irq.updateTimers();

	assert.equal(irq.interruptFlags & irq.MASK_DMA0, irq.MASK_DMA0);
	assert.equal(irq.dma[0].nextIRQ, 0);
});

test("DMA transfers stall the CPU for their bus transfer time", () => {
	const mmu = new MMU();
	const ram = new MemoryBlock(0x40000, 9);
	const io = { registers: new Uint16Array(0x200) };
	mmu.cpu = { cycles: 100 };
	mmu.core = { WARN() {} };
	mmu.memory = [];
	mmu.memory[mmu.REGION_WORKING_RAM] = ram;
	mmu.memory[mmu.REGION_IO] = io;
	mmu.waitstates = mmu.WAITSTATES;
	mmu.waitstatesSeq = mmu.WAITSTATES_SEQ;
	mmu.waitstates32 = mmu.WAITSTATES_32;
	mmu.waitstatesSeq32 = mmu.WAITSTATES_SEQ_32;
	mmu.DMA_REGISTER = [0, 0, 0, 0];
	const source = mmu.BASE_WORKING_RAM;
	const destination = source + 0x10;
	ram.store16(0, 0x1234);
	ram.store16(2, 0x5678);
	const dma = {
		enable: true,
		doIrq: true,
		repeat: false,
		width: 2,
		count: 2,
		nextCount: 2,
		nextSource: source,
		nextDest: destination,
		srcControl: 0,
		dstControl: 0,
		nextIRQ: 0
	};

	mmu.serviceDma(0, dma);

	assert.equal(ram.loadU16(0x10), 0x1234);
	assert.equal(ram.loadU16(0x12), 0x5678);
	assert.equal(mmu.cpu.cycles, 113);
	assert.equal(dma.nextIRQ, 113);
});

test("decrementing DMA invalidates every instruction cache page it writes", () => {
	const mmu = new MMU();
	const ram = new MemoryBlock(0x40000, 9);
	const io = { registers: new Uint16Array(0x200) };
	mmu.cpu = { cycles: 0 };
	mmu.core = { WARN() {} };
	mmu.memory = [];
	mmu.memory[mmu.REGION_WORKING_RAM] = ram;
	mmu.memory[mmu.REGION_IO] = io;
	mmu.waitstates = mmu.WAITSTATES;
	mmu.waitstatesSeq = mmu.WAITSTATES_SEQ;
	mmu.waitstates32 = mmu.WAITSTATES_32;
	mmu.waitstatesSeq32 = mmu.WAITSTATES_SEQ_32;
	mmu.DMA_REGISTER = [0, 1, 2, 3];
	ram.store32(0, 0x11223344);
	ram.store32(4, 0x55667788);
	ram.icache[1] = { invalid: false };
	ram.icache[2] = { invalid: false };

	mmu.serviceDma(0, {
		enable: true,
		doIrq: false,
		repeat: false,
		timing: mmu.DMA_TIMING_NOW,
		width: 4,
		count: 2,
		nextCount: 2,
		nextSource: mmu.BASE_WORKING_RAM,
		nextDest: mmu.BASE_WORKING_RAM + 0x800,
		srcControl: mmu.DMA_INCREMENT,
		dstControl: mmu.DMA_DECREMENT
	});

	assert.equal(ram.icache[2].invalid, true);
	assert.equal(ram.icache[1].invalid, true);
});

test("HBlank DMA uses the PPU trigger time when catching up missed scanlines", () => {
	const mmu = new MMU();
	const ram = new MemoryBlock(0x40000, 9);
	const io = { registers: new Uint16Array(0x200) };
	mmu.cpu = {
		cycles: 3000,
		irq: {
			dma: [{
				enable: true,
				doIrq: true,
				repeat: true,
				timing: mmu.DMA_TIMING_HBLANK,
				width: 2,
				count: 1,
				nextCount: 1,
				nextSource: mmu.BASE_WORKING_RAM,
				nextDest: mmu.BASE_WORKING_RAM + 0x100,
				srcControl: mmu.DMA_INCREMENT,
				dstControl: mmu.DMA_INCREMENT,
				busyUntil: 0
			}]
		}
	};
	mmu.core = { WARN() {} };
	mmu.memory = [];
	mmu.memory[mmu.REGION_WORKING_RAM] = ram;
	mmu.memory[mmu.REGION_IO] = io;
	mmu.waitstates = mmu.WAITSTATES;
	mmu.waitstatesSeq = mmu.WAITSTATES_SEQ;
	mmu.waitstates32 = mmu.WAITSTATES_32;
	mmu.waitstatesSeq32 = mmu.WAITSTATES_SEQ_32;
	mmu.DMA_REGISTER = [0, 1, 2, 3];
	ram.store16(0, 0x1234);
	ram.store16(2, 0x5678);

	mmu.runHblankDmas(1006);
	mmu.runHblankDmas(2238);

	assert.equal(ram.loadU16(0x100), 0x1234);
	assert.equal(ram.loadU16(0x102), 0x5678);
	assert.ok(mmu.cpu.irq.dma[0].busyUntil < 3000);
	assert.equal(mmu.cpu.cycles, 3000);
	ram.store16(4, 0x9abc);
	mmu.cpu.cycles = 3474;
	mmu.runHblankDmas(3470);
	assert.equal(ram.loadU16(0x104), 0x9abc);
	assert.equal(mmu.cpu.irq.dma[0].nextIRQ, 3479);
	assert.equal(mmu.cpu.cycles, 3479);
});

test("VBlank DMA uses the PPU trigger time when catching up missed frames", () => {
	const mmu = new MMU();
	const ram = new MemoryBlock(0x40000, 9);
	const io = { registers: new Uint16Array(0x200) };
	mmu.cpu = {
		cycles: 500000,
		irq: {
			dma: [{
				enable: true,
				doIrq: true,
				repeat: true,
				timing: mmu.DMA_TIMING_VBLANK,
				width: 2,
				count: 1,
				nextCount: 1,
				nextSource: mmu.BASE_WORKING_RAM,
				nextDest: mmu.BASE_WORKING_RAM + 0x100,
				srcControl: mmu.DMA_INCREMENT,
				dstControl: mmu.DMA_INCREMENT,
				busyUntil: 0
			}]
		}
	};
	mmu.core = { WARN() {} };
	mmu.memory = [];
	mmu.memory[mmu.REGION_WORKING_RAM] = ram;
	mmu.memory[mmu.REGION_IO] = io;
	mmu.waitstates = mmu.WAITSTATES;
	mmu.waitstatesSeq = mmu.WAITSTATES_SEQ;
	mmu.waitstates32 = mmu.WAITSTATES_32;
	mmu.waitstatesSeq32 = mmu.WAITSTATES_SEQ_32;
	mmu.DMA_REGISTER = [0, 1, 2, 3];
	ram.store16(0, 0x1234);
	ram.store16(2, 0x5678);

	mmu.runVblankDmas(197120);
	mmu.runVblankDmas(478016);

	assert.equal(ram.loadU16(0x100), 0x1234);
	assert.equal(ram.loadU16(0x102), 0x5678);
	assert.ok(mmu.cpu.irq.dma[0].busyUntil < 500000);
	assert.equal(mmu.cpu.cycles, 500000);
});

test("RAM-to-VRAM DMA preserves little-endian transfer values", () => {
	const mmu = new MMU();
	const ram = new MemoryBlock(0x40000, 9);
	const vram = new MemoryBlock(0x18000, 8);
	const io = { registers: new Uint16Array(4) };
	mmu.cpu = { cycles: 0 };
	mmu.core = { WARN() {} };
	mmu.memory = [];
	mmu.memory[mmu.REGION_WORKING_RAM] = ram;
	mmu.memory[mmu.REGION_VRAM] = vram;
	mmu.memory[mmu.REGION_IO] = io;
	mmu.waitstates = mmu.WAITSTATES;
	mmu.waitstatesSeq = mmu.WAITSTATES_SEQ;
	mmu.waitstates32 = mmu.WAITSTATES_32;
	mmu.waitstatesSeq32 = mmu.WAITSTATES_SEQ_32;
	mmu.DMA_REGISTER = [0, 1, 2, 3];
	const value = 0x11223344;
	ram.store32(0, value);

	mmu.serviceDma(0, {
		enable: true,
		doIrq: false,
		repeat: false,
		timing: mmu.DMA_TIMING_NOW,
		width: 4,
		count: 1,
		nextCount: 1,
		nextSource: mmu.BASE_WORKING_RAM,
		nextDest: mmu.BASE_VRAM,
		srcControl: mmu.DMA_INCREMENT,
		dstControl: mmu.DMA_INCREMENT
	});

	assert.equal(vram.load32(0), value);
});

test("DMA switches memory mappings when an address crosses a 16 MiB region", () => {
	const mmu = new MMU();
	const ewram = new MemoryBlock(0x40000, 9);
	const iwram = new MemoryBlock(0x8000, 7);
	const io = { registers: new Uint16Array(0x200) };
	mmu.cpu = { cycles: 0 };
	mmu.core = { WARN() {} };
	mmu.memory = [];
	mmu.memory[mmu.REGION_WORKING_RAM] = ewram;
	mmu.memory[mmu.REGION_WORKING_IRAM] = iwram;
	mmu.memory[mmu.REGION_IO] = io;
	mmu.waitstates = mmu.WAITSTATES;
	mmu.waitstatesSeq = mmu.WAITSTATES_SEQ;
	mmu.waitstates32 = mmu.WAITSTATES_32;
	mmu.waitstatesSeq32 = mmu.WAITSTATES_SEQ_32;
	mmu.DMA_REGISTER = [0, 1, 2, 3];
	ewram.store32(0x3fffc, 0x11223344);
	ewram.store32(0, 0xaabbccdd);
	iwram.store32(0, 0x55667788);

	const sourceDma = {
		enable: true,
		doIrq: false,
		repeat: false,
		timing: mmu.DMA_TIMING_NOW,
		width: 4,
		count: 2,
		nextCount: 2,
		nextSource: mmu.BASE_WORKING_RAM + 0x00fffffc,
		nextDest: mmu.BASE_WORKING_RAM + 0x100,
		srcControl: mmu.DMA_INCREMENT,
		dstControl: mmu.DMA_INCREMENT
	};
	mmu.serviceDma(0, sourceDma);

	assert.equal(ewram.load32(0x100), 0x11223344);
	assert.equal(ewram.load32(0x104), 0x55667788);
	assert.equal(iwram.load32(0), 0x55667788);
	assert.equal(sourceDma.nextSource, mmu.BASE_WORKING_IRAM + 4);

	ewram.store32(0x200, 0x10203040);
	ewram.store32(0x204, 0x50607080);
	mmu.serviceDma(0, {
		enable: true,
		doIrq: false,
		repeat: false,
		timing: mmu.DMA_TIMING_NOW,
		width: 4,
		count: 2,
		nextCount: 2,
		nextSource: mmu.BASE_WORKING_RAM + 0x200,
		nextDest: mmu.BASE_WORKING_RAM + 0x00fffffc,
		srcControl: mmu.DMA_INCREMENT,
		dstControl: mmu.DMA_INCREMENT
	});
	assert.equal(ewram.load32(0x3fffc), 0x10203040);
	assert.equal(iwram.load32(0), 0x50607080);
});

test("repeating DMA retains the full address after its last transfer crosses a region", () => {
	const mmu = new MMU();
	const ewram = new MemoryBlock(0x40000, 9);
	const iwram = new MemoryBlock(0x8000, 7);
	const io = { registers: new Uint16Array(0x200) };
	mmu.cpu = { cycles: 0 };
	mmu.core = { WARN() {} };
	mmu.memory = [];
	mmu.memory[mmu.REGION_WORKING_RAM] = ewram;
	mmu.memory[mmu.REGION_WORKING_IRAM] = iwram;
	mmu.memory[mmu.REGION_IO] = io;
	mmu.waitstates = mmu.WAITSTATES;
	mmu.waitstatesSeq = mmu.WAITSTATES_SEQ;
	mmu.waitstates32 = mmu.WAITSTATES_32;
	mmu.waitstatesSeq32 = mmu.WAITSTATES_SEQ_32;
	mmu.DMA_REGISTER = [0, 1, 2, 3];
	iwram.store32(0x7ffc, 0x89abcdef);
	const dma = {
		enable: true,
		doIrq: false,
		repeat: true,
		timing: mmu.DMA_TIMING_HBLANK,
		width: 4,
		count: 1,
		nextCount: 1,
		nextSource: mmu.BASE_WORKING_IRAM + 0x00fffffc,
		nextDest: mmu.BASE_WORKING_RAM + 0x100,
		srcControl: mmu.DMA_INCREMENT,
		dstControl: mmu.DMA_INCREMENT
	};

	mmu.serviceDma(0, dma);

	assert.equal(ewram.load32(0x100), 0x89abcdef | 0);
	assert.equal(dma.nextSource, mmu.BASE_IO);
});

test("DMA reads outside a short cartridge image through ROM open-bus behavior", () => {
	const mmu = new MMU();
	const io = {
		DMA0CNT_HI: 0xba,
		DMA1CNT_HI: 0xc6,
		DMA2CNT_HI: 0xd2,
		DMA3CNT_HI: 0xde
	};
	mmu.core = { io, WARN() {} };
	mmu.cpu = { cycles: 0 };
	mmu.clear();
	mmu.memory[mmu.REGION_IO] = { registers: new Uint16Array(0x200) };
	mmu.DMA_REGISTER = [0, 1, 2, 3];
	const rom = new ArrayBuffer(0xc0);
	new DataView(rom).setUint8(0xb2, 0x96);
	assert.ok(mmu.loadRom(rom, false));

	mmu.serviceDma(0, {
		enable: true,
		doIrq: false,
		repeat: false,
		timing: mmu.DMA_TIMING_NOW,
		width: 4,
		count: 1,
		nextCount: 1,
		nextSource: mmu.BASE_CART0 + 0x100,
		nextDest: mmu.BASE_WORKING_RAM + 0x10,
		srcControl: mmu.DMA_INCREMENT,
		dstControl: mmu.DMA_INCREMENT
	});

	assert.equal(
		mmu.memory[mmu.REGION_WORKING_RAM].load32(0x10),
		0x00810080
	);
});

test("immediate DMA ignores repeat and completes without recursive rescheduling", () => {
	const mmu = new MMU();
	const ram = new MemoryBlock(0x40000, 9);
	const io = { registers: new Uint16Array(4) };
	mmu.memory = [];
	mmu.memory[mmu.REGION_WORKING_RAM] = ram;
	mmu.memory[mmu.REGION_IO] = io;
	mmu.DMA_REGISTER = [0, 1, 2, 3];
	mmu.waitstates = mmu.WAITSTATES;
	mmu.waitstatesSeq = mmu.WAITSTATES_SEQ;
	mmu.waitstates32 = mmu.WAITSTATES_32;
	mmu.waitstatesSeq32 = mmu.WAITSTATES_SEQ_32;
	mmu.cpu = { cycles: 0 };
	mmu.core = { WARN() {} };
	ram.store32(0, 0x12345678);
	const dma = {
		enable: true,
		doIrq: false,
		repeat: true,
		timing: mmu.DMA_TIMING_NOW,
		width: 4,
		count: 1,
		nextCount: 1,
		nextSource: mmu.BASE_WORKING_RAM,
		nextDest: mmu.BASE_WORKING_RAM + 4,
		srcControl: mmu.DMA_INCREMENT,
		dstControl: mmu.DMA_INCREMENT
	};
	io.registers[0] = 0xffff;

	assert.doesNotThrow(() => mmu.serviceDma(0, dma));
	assert.equal(ram.load32(4), 0x12345678);
	assert.equal(dma.enable, false);
	assert.equal(io.registers[0] & 0x8000, 0);
});

test("idle count-up timers do not overflow on unrelated hardware events", () => {
	const timers = [
		timerState(),
		timerState({ enable: true, countUp: true, reload: 0xfffe, doIrq: true }),
		timerState(),
		timerState()
	];
	const { irq, io } = timerHarness(100, timers);
	io.registers[io.TM0CNT_LO / 2 + 2] = 0xfffd;

	irq.updateTimers();

	assert.equal(io.registers[io.TM0CNT_LO / 2 + 2], 0xfffd);
	assert.equal(irq.interruptFlags & irq.MASK_TIMER1, 0);
});

test("timers catch up overflows that occur during a FIFO DMA stall", () => {
	const timers = [
		timerState({ enable: true, nextEvent: 100, overflowInterval: 1000 }),
		timerState({ enable: true, nextEvent: 105, overflowInterval: 1000 }),
		timerState(),
		timerState()
	];
	const { irq, cpu } = timerHarness(100, timers, {
		enabled: true,
		enableChannelA: true,
		soundTimerA: 0,
		dmaA: 0
	});
	irq.audio.sampleFifoA = () => {
		cpu.cycles += 10;
	};

	irq.updateTimers();

	assert.equal(timers[0].lastEvent, 100);
	assert.equal(timers[1].lastEvent, 105);
	assert.equal(cpu.cycles, 110);
});

test("timer mode changes preserve the live counter and reschedule safely", () => {
	const timers = [
		timerState(),
		timerState({ enable: true, countUp: true, reload: 0xfffe }),
		timerState(),
		timerState()
	];
	const { irq, io, cpu } = timerHarness(100, timers);
	const timer1Register = (io.TM0CNT_LO + 4) >> 1;
	io.registers[timer1Register] = 0xfffd;

	irq.timerWriteControl(1, 0x0080);
	assert.equal(timers[1].countUp, false);
	assert.equal(timers[1].nextEvent, 103);
	assert.equal(io.registers[timer1Register], 0xfffd);

	cpu.cycles = 102;
	irq.updateTimers();
	assert.equal(io.registers[timer1Register], 0xfffd);
	cpu.cycles = 103;
	irq.updateTimers();
	assert.equal(io.registers[timer1Register], 0xfffe);
	assert.equal(timers[1].nextEvent, 105);

	cpu.cycles = 104;
	irq.timerWriteControl(1, 0x0084);
	assert.equal(timers[1].countUp, true);
	assert.equal(timers[1].nextEvent, 0);
	assert.equal(io.registers[timer1Register], 0xffff);
});

test("timer reload writes set the period used by the next overflow", () => {
	const timers = [
		timerState({
			enable: true,
			reload: 0xfffe,
			oldReload: 0xfffe,
			lastEvent: 100,
			nextEvent: 102,
			overflowInterval: 2
		}),
		timerState(),
		timerState(),
		timerState()
	];
	const { irq, io } = timerHarness(102, timers);
	const timer0Register = io.TM0CNT_LO >> 1;

	irq.timerSetReload(0, 0xfffc);
	irq.updateTimers();

	assert.equal(io.registers[timer0Register], 0xfffc);
	assert.equal(timers[0].nextEvent, 106);
});

test("timer reads apply the prescaler only to elapsed cycles", () => {
	const timers = [
		timerState(),
		timerState({
			enable: true,
			reload: 0x1000,
			oldReload: 0x1000,
			prescaleBits: 6,
			lastEvent: 100,
			nextEvent: 1000,
			overflowInterval: 0x3c0000
		}),
		timerState(),
		timerState()
	];
	const { irq } = timerHarness(164, timers);

	assert.equal(irq.timerRead(1), 0x1001);
});

test("short-period timers process every overflow and cascade pulse", () => {
	let directSoundSamples = 0;
	const timers = [
		timerState({
			enable: true,
			reload: 0xfffe,
			doIrq: true,
			lastEvent: 100,
			nextEvent: 100,
			overflowInterval: 1
		}),
		timerState({ enable: true, countUp: true, reload: 0xffff, doIrq: true }),
		timerState({ enable: true, countUp: true, reload: 0xffff, doIrq: true }),
		timerState({ enable: true, countUp: true, reload: 0xffff, doIrq: true })
	];
	const { irq, io } = timerHarness(104, timers, {
		enabled: true,
		enableChannelA: true,
		enableChannelB: false,
		soundTimerA: 0,
		sampleFifoA() { ++directSoundSamples; }
	});
	io.registers[io.TM0CNT_LO / 2 + 2] = 0xffff;
	io.registers[io.TM0CNT_LO / 2 + 4] = 0xffff;
	io.registers[io.TM0CNT_LO / 2 + 6] = 0xffff;
	const raised = [];
	irq.raiseIRQ = (type) => raised.push(type);

	irq.updateTimers();

	assert.equal(directSoundSamples, 5);
	assert.equal(timers[0].nextEvent, 105);
	assert.equal(timers[0].lastEvent, 104);
	assert.equal(raised.filter((type) => type === irq.IRQ_TIMER0).length, 5);
	assert.equal(raised.filter((type) => type === irq.IRQ_TIMER1).length, 5);
	assert.equal(raised.filter((type) => type === irq.IRQ_TIMER2).length, 5);
	assert.equal(raised.filter((type) => type === irq.IRQ_TIMER3).length, 5);
	assert.equal(io.registers[io.TM0CNT_LO / 2 + 2], 0xffff);
	assert.equal(io.registers[io.TM0CNT_LO / 2 + 4], 0xffff);
	assert.equal(io.registers[io.TM0CNT_LO / 2 + 6], 0xffff);
});

test("SOUNDCNT_X power-off clears PSG state and sound volume registers", () => {
	const io = new IO();
	io.registers = new Uint16Array(0x200);
	for (let offset = io.SOUND1CNT_LO; offset <= io.SOUNDCNT_LO; offset += 2) {
		io.registers[offset >> 1] = 0xffff;
	}
	io.registers[io.SOUNDCNT_HI >> 1] = 0xa90e;
	const core = {
		io,
		irq: { pollNextEvent() {} }
	};
	const audio = Object.create(Audio.prototype);
	const squareChannel = () => ({
		playing: true,
		sample: 0.5,
		duty: 0.5,
		increment: 1 / 16,
		step: 10,
		initialVolume: 0.5,
		volume: 0.5,
		frequency: 500,
		interval: 100,
		sweepSteps: 2,
		sweepIncrement: -1,
		sweepInterval: 20,
		doSweep: true,
		nextSweep: 30,
		raise: 40,
		lower: 50,
		nextStep: 60,
		timed: true,
		length: 70,
		end: 80
	});
	Object.assign(audio, {
		core,
		cpu: { cycles: 1000 },
		cpuFrequency: 0x1000000,
		enabled: true,
		nextEvent: 1200,
		nextSample: 1300,
		context: null,
		squareChannels: [squareChannel(), squareChannel()],
		channel3Write: true,
		playingChannel3: true,
		channel3Sample: 1,
		channel4: {
			sample: 1,
			lfsr: 1,
			width: 7,
			interval: 12,
			increment: 1 / 16,
			step: 8,
			initialVolume: 1,
			volume: 1,
			nextStep: 10,
			timed: true,
			length: 20,
			end: 30,
			next: 40
		},
		playingChannel4: true,
		masterVolumeLeft: 7,
		masterVolumeRight: 7,
		enabledLeft: 0xf,
		enabledRight: 0xf,
		fifoA: [1, 2],
		fifoB: [3, 4]
	});
	io.audio = audio;
	io.core = core;

	io.store16(io.SOUNDCNT_X, 0);

	for (let offset = io.SOUND1CNT_LO; offset <= io.SOUNDCNT_LO; offset += 2) {
		assert.equal(io.registers[offset >> 1], 0);
	}
	assert.equal(io.registers[io.SOUNDCNT_HI >> 1], 0xa900);
	assert.equal(io.registers[io.SOUNDCNT_X >> 1], 0);
	assert.ok(audio.squareChannels.every((channel) => !channel.playing));
	assert.equal(audio.playingChannel3, false);
	assert.equal(audio.channel3Write, false);
	assert.equal(audio.playingChannel4, false);
	assert.equal(audio.masterVolumeLeft, 0);
	assert.equal(audio.masterVolumeRight, 0);
	assert.deepEqual(audio.fifoA, [1, 2]);
	assert.deepEqual(audio.fifoB, [3, 4]);
});

test("SOUNDBIAS writes reach audio and select the documented sample rate", () => {
	const io = new IO();
	const writes = [];
	io.audio = {
		writeSoundBias(value) { writes.push(value); }
	};
	io.core = {
		STUB(message) { throw new Error(message); }
	};
	io.registers = new Uint16Array(0x200);
	io.store16(io.SOUNDBIAS, 0xffff);
	assert.deepEqual(writes, [0xc3fe]);
	assert.equal(io.loadU16(io.SOUNDBIAS), 0xc3fe);

	const audio = Object.create(Audio.prototype);
	const polls = [];
	Object.assign(audio, {
		cpuFrequency: 0x1000000,
		cpu: { cycles: 1024 },
		enabled: true,
		nextEvent: Infinity,
		nextSample: 1536,
		sampleInterval: 512,
		sampleRate: 32768,
		context: { sampleRate: 48000 },
		core: { irq: { pollNextEvent() { polls.push(true); } } },
		updateCount: 0,
		updateTimers() { ++this.updateCount; }
	});
	audio.writeSoundBias(0xc000);
	assert.equal(audio.soundBias, 0xc000);
	assert.equal(audio.sampleInterval, 64);
	assert.equal(audio.sampleRate, 262144);
	assert.equal(audio.resampleRatio, 262144 / 48000);
	assert.equal(audio.nextSample, 1088);
	assert.equal(audio.updateCount, 2);
	assert.equal(polls.length, 1);
});

test("audio save-state restore follows the restored SOUNDBIAS register", () => {
	const audio = Object.create(Audio.prototype);
	Object.assign(audio, {
		cpuFrequency: 0x1000000,
		context: { sampleRate: 48000 }
	});
	audio.defrost({ nextSample: 4096, soundBias: 0x4000 }, 0xc000);

	assert.equal(audio.nextSample, 4096);
	assert.equal(audio.soundBias, 0xc000);
	assert.equal(audio.sampleRate, 262144);
	assert.equal(audio.sampleInterval, 64);
	assert.equal(audio.resampleRatio, 262144 / 48000);

	audio.defrost({ nextSample: 8192, soundBias: 0x4000 });
	assert.equal(audio.soundBias, 0x4000);
	assert.equal(audio.sampleRate, 65536);
});

test("audio save states preserve Direct Sound FIFO data and partial-write slots", () => {
	const audio = Object.create(Audio.prototype);
	Object.assign(audio, {
		cpuFrequency: 0x1000000,
		context: null,
		nextSample: 4096,
		soundBias: 0x200,
		fifoA: [0.25, -0.5],
		fifoB: [0.75],
		fifoASample: 0.125,
		fifoBSample: -0.25,
		fifoAInternal: [0.5, 0.625],
		fifoBInternal: [-0.75],
		fifoAWriteBuffer: [1, 2, 3, 4, 5, 6, 7, 0xaabbccdd],
		fifoBWriteBuffer: [8, 9, 10, 11, 12, 13, 14, 0x11223344],
		fifoAWriteIndex: 7,
		fifoBWriteIndex: 6
	});

	const frost = audio.freeze();
	audio.fifoA = [];
	audio.fifoBWriteBuffer[7] = 0;
	audio.defrost(frost);

	assert.deepEqual(Array.from(audio.fifoA), [0.25, -0.5]);
	assert.deepEqual(Array.from(audio.fifoB), [0.75]);
	assert.equal(audio.fifoASample, 0.125);
	assert.equal(audio.fifoBSample, -0.25);
	assert.deepEqual(Array.from(audio.fifoAInternal), [0.5, 0.625]);
	assert.deepEqual(Array.from(audio.fifoBInternal), [-0.75]);
	assert.equal(audio.fifoAWriteBuffer[7], 0xaabbccdd);
	assert.equal(audio.fifoBWriteBuffer[7], 0x11223344);
	assert.equal(audio.fifoAWriteIndex, 7);
	assert.equal(audio.fifoBWriteIndex, 6);

	audio.appendToFifoA(0x08, 0, 1);
	assert.equal(audio.fifoAWriteBuffer[7], 0xaabbcc08);
	assert.equal(audio.fifoAWriteIndex, 0);
});

test("legacy audio save states initialize missing FIFO state safely", () => {
	const audio = Object.create(Audio.prototype);
	Object.assign(audio, { cpuFrequency: 0x1000000, context: null });
	audio.defrost({ nextSample: 2048 });

	assert.deepEqual(Array.from(audio.fifoA), []);
	assert.deepEqual(Array.from(audio.fifoB), []);
	assert.deepEqual(Array.from(audio.fifoAInternal), []);
	assert.deepEqual(Array.from(audio.fifoBInternal), []);
	assert.equal(audio.fifoAWriteBuffer.length, 8);
	assert.ok(audio.fifoAWriteBuffer.every((word) => word === 0));
	assert.equal(audio.fifoAWriteIndex, 0);
	assert.equal(audio.fifoBWriteIndex, 0);
});

test("unsupported ARM and Thumb opcodes enter the undefined-instruction vector", () => {
	function makeCpu(armOpcode) {
		const prefetches = [];
		const page = {
			arm: new Array(1024),
			thumb: new Array(2048),
			invalid: false
		};
		const cpu = new CPU();
		cpu.mmu = {
			BASE_OFFSET: 24,
			OFFSET_MASK: 0x00ffffff,
			memory: [{ PAGE_MASK: 0x0fff }],
			addressToPage(region, address) { return address >> 12; },
			accessPage() { return page; },
			load32(address) { return address === 0 ? armOpcode : 0xe1a00000; },
			load16(address) { return address === 0 ? 0xde00 : 0x46c0; },
			wait32() {},
			wait() {},
			waitPrefetch32(address) { prefetches.push([4, address]); },
			waitPrefetch(address) { prefetches.push([2, address]); },
		};
		cpu.irq = { clear() {}, testIRQ() {}, updateTimers() {} };
		cpu.resetCPU(0);
		return { cpu, prefetches };
	}

	{
		const { cpu, prefetches } = makeCpu(0xee000010);
		const originalCpsr = cpu.packCPSR();

		assert.doesNotThrow(() => cpu.step());
		assert.equal(cpu.mode, cpu.MODE_UNDEFINED);
		assert.equal(cpu.execMode, cpu.MODE_ARM);
		assert.equal(cpu.spsr, originalCpsr);
		assert.equal(cpu.gprs[cpu.LR], 4);
		assert.equal(cpu.gprs[cpu.PC], cpu.BASE_UNDEF + cpu.WORD_SIZE_ARM);
		assert.deepEqual(prefetches, [[4, cpu.BASE_UNDEF + cpu.WORD_SIZE_ARM]]);
	}

	{
		const { cpu, prefetches } = makeCpu(0);
		cpu.switchExecMode(cpu.MODE_THUMB);
		cpu.gprs[cpu.PC] = 2;
		const originalCpsr = cpu.packCPSR();

		assert.doesNotThrow(() => cpu.step());
		assert.equal(cpu.mode, cpu.MODE_UNDEFINED);
		assert.equal(cpu.execMode, cpu.MODE_ARM);
		assert.equal(cpu.spsr, originalCpsr);
		assert.equal(cpu.gprs[cpu.LR], 2);
		assert.equal(cpu.gprs[cpu.PC], cpu.BASE_UNDEF + cpu.WORD_SIZE_ARM);
		assert.deepEqual(prefetches, [[4, cpu.BASE_UNDEF + cpu.WORD_SIZE_ARM]]);
	}

	{
		const { cpu, prefetches } = makeCpu(0x0e000010);
		cpu.cpsrZ = false;

		assert.doesNotThrow(() => cpu.step());
		assert.equal(cpu.mode, cpu.MODE_SYSTEM);
		assert.equal(cpu.gprs[cpu.PC], 8);
		assert.equal(cpu.conditionPassed, false);
		assert.deepEqual(prefetches, [[4, 8]]);
	}
});

test("unsupported SWIs warn and return instead of crashing the emulator", () => {
	const { irq, warnings } = softwareInterruptHarness();
	const soundSwis = [
		0x1a,
		0x1b,
		0x1c,
		0x20,
		0x21,
		0x22,
		0x23,
		0x24,
		0x2a
	];
	for (const opcode of soundSwis) {
		assert.doesNotThrow(() => irq.swi(opcode));
	}
	assert.deepEqual(
		warnings,
		soundSwis.map(
			opcode => "Unimplemented software interrupt: 0x" + opcode.toString(16)
		)
	);
});

test("SoundDriverVSync restarts FIFO DMA only when its frame counter expires", () => {
	const { irq, mmu, base, io } = softwareInterruptHarness();
	const soundArea = base + 0x1000;
	mmu.store32(0x03007ff0, soundArea);
	mmu.store32(soundArea, 0x68736d53);
	mmu.store8(soundArea + 4, 2);
	mmu.store8(soundArea + 0x0b, 3);

	irq.swi(0x1d);
	assert.equal(mmu.loadU8(soundArea + 4), 1);
	assert.deepEqual(io.writes, []);

	irq.swi(0x1d);
	assert.equal(mmu.loadU8(soundArea + 4), 3);
	assert.deepEqual(io.writes, [
		[io.DMA1CNT_HI, 0],
		[io.DMA2CNT_HI, 0],
		[io.DMA1CNT_HI, 0xb600],
		[io.DMA2CNT_HI, 0xb600]
	]);

	mmu.store32(soundArea, 0);
	io.writes.length = 0;
	irq.swi(0x1d);
	assert.deepEqual(io.writes, []);
});

test("SoundDriverVSyncOff clears PCM buffers and VSyncOn restarts FIFO DMA", () => {
	const { irq, mmu, base, bytes, io } = softwareInterruptHarness();
	const soundArea = base + 0x1000;
	mmu.store32(0x03007ff0, soundArea);
	mmu.store32(soundArea, 0x68736d54);
	mmu.store8(soundArea + 4, 4);
	bytes.fill(0x7f, 0x1000 + 0x350, 0x1000 + 0x0fb0);

	irq.swi(0x28);
	assert.equal(mmu.loadU8(soundArea + 4), 0);
	assert.ok(bytes.slice(0x1000 + 0x350, 0x1000 + 0x0fb0).every(value => value == 0));
	assert.deepEqual(io.writes, [
		[io.DMA1CNT_HI, 0],
		[io.DMA2CNT_HI, 0]
	]);

	irq.swi(0x29);
	assert.deepEqual(io.writes.slice(-2), [
		[io.DMA1CNT_HI, 0xb600],
		[io.DMA2CNT_HI, 0xb600]
	]);
});

test("SoundChannelClear stops active voices without clearing the sound routing", () => {
	const { irq, mmu, base, cpu } = softwareInterruptHarness();
	const soundArea = base + 0x1000;
	mmu.store32(0x03007ff0, soundArea);
	mmu.store32(soundArea, 0x68736d53);
	mmu.store32(soundArea + 0x1c, 0x03000200);
	for (let channel = 0; channel < 12; ++channel) {
		mmu.store8(soundArea + 0x50 + channel * 0x40, 0x80 | channel);
	}

	let stops = 0;
	let updates = 0;
	irq.audio = {
		stopPSGChannels() { ++stops; },
		updateTimers() { ++updates; }
	};
	irq.core.irq = { pollNextEvent() {} };

	irq.swi(0x1e);

	assert.equal(stops, 1);
	assert.equal(updates, 1);
	assert.equal(mmu.load32(soundArea), 0x68736d53);
	assert.deepEqual(
		Array.from({ length: 12 }, (_, channel) =>
			mmu.loadU8(soundArea + 0x50 + channel * 0x40)
		),
		new Array(12).fill(0)
	);
	assert.equal(cpu.gprs[0], 0);
});

test("PSG stop preserves channel configuration and stereo routing", () => {
	const audio = Object.create(Audio.prototype);
	Object.assign(audio, {
		squareChannels: [
			{ playing: true, sample: 0.75, frequency: 400 },
			{ playing: true, sample: -0.5, frequency: 800 }
		],
		playingChannel3: true,
		channel3Sample: 0.25,
		channel3Write: true,
		channel3Bank: 1,
		playingChannel4: true,
		channel4: { sample: 0.5, width: 7 },
		masterVolumeLeft: 6,
		masterVolumeRight: 5,
		enabledLeft: 0x0b,
		enabledRight: 0x0d
	});

	audio.stopPSGChannels();

	assert.ok(audio.squareChannels.every((channel) => !channel.playing));
	assert.deepEqual(audio.squareChannels.map((channel) => channel.sample), [0, 0]);
	assert.equal(audio.playingChannel3, false);
	assert.equal(audio.channel3Sample, 0);
	assert.equal(audio.channel3Write, true);
	assert.equal(audio.channel3Bank, 1);
	assert.equal(audio.playingChannel4, false);
	assert.equal(audio.channel4.sample, 0);
	assert.equal(audio.channel4.width, 7);
	assert.equal(audio.masterVolumeLeft, 6);
	assert.equal(audio.masterVolumeRight, 5);
	assert.equal(audio.enabledLeft, 0x0b);
	assert.equal(audio.enabledRight, 0x0d);
});

test("MultiBoot returns the BIOS failure code when no receiver is available", () => {
	const { irq, cpu, warnings } = softwareInterruptHarness();
	cpu.gprs[0] = 0x02000100;
	cpu.gprs[1] = 1;

	irq.swi(0x25);

	assert.equal(cpu.gprs[0], 1);
	assert.deepEqual(warnings, []);
});

test("real BIOS mode forwards sound-driver SWIs to the BIOS vector", () => {
	const { irq, cpu, mmu, warnings } = softwareInterruptHarness();
	mmu.bios.real = true;
	const trapped = [];
	cpu.raiseTrap = () => { trapped.push(cpu.gprs[cpu.PC]); };
	const soundSwis = [
		0x1a,
		0x1b,
		0x1c,
		0x1d,
		0x1e,
		0x20,
		0x21,
		0x22,
		0x23,
		0x24,
		0x28,
		0x29,
		0x2a
	];

	for (const opcode of soundSwis) {
		irq.swi(opcode);
	}

	assert.equal(trapped.length, soundSwis.length);
	assert.deepEqual(warnings, []);
});

test("RegisterRamReset forces blank and resets requested SIO, sound, and system registers", () => {
	const { irq, cpu, warnings } = softwareInterruptHarness();
	const addresses = {
		DISPCNT: 0x000,
		DEFAULT_DISPCNT: 0x0080,
		SIOCNT: 0x128,
		RCNT: 0x134,
		SIOMLT_SEND: 0x12a,
		JOYCNT: 0x140,
		JOY_RECV: 0x150,
		JOY_TRANS: 0x154,
		SOUND1CNT_LO: 0x060,
		SOUND1CNT_HI: 0x062,
		SOUND1CNT_X: 0x064,
		SOUND2CNT_LO: 0x068,
		SOUND2CNT_HI: 0x06c,
		SOUND3CNT_LO: 0x070,
		SOUND3CNT_HI: 0x072,
		SOUND3CNT_X: 0x074,
		SOUND4CNT_LO: 0x078,
		SOUND4CNT_HI: 0x07c,
		SOUNDCNT_LO: 0x080,
		SOUNDCNT_HI: 0x082,
		SOUNDCNT_X: 0x084,
		SOUNDBIAS: 0x088,
		DISPSTAT: 0x004,
		BG0CNT: 0x008,
		BG1CNT: 0x00a,
		BG2CNT: 0x00c,
		BG3CNT: 0x00e,
		BG0HOFS: 0x010,
		BG0VOFS: 0x012,
		BG1HOFS: 0x014,
		BG1VOFS: 0x016,
		BG2HOFS: 0x018,
		BG2VOFS: 0x01a,
		BG3HOFS: 0x01c,
		BG3VOFS: 0x01e,
		BG2PA: 0x020,
		BG2PB: 0x022,
		BG2PC: 0x024,
		BG2PD: 0x026,
		BG2X_LO: 0x028,
		BG2X_HI: 0x02a,
		BG2Y_LO: 0x02c,
		BG2Y_HI: 0x02e,
		BG3PA: 0x030,
		BG3PB: 0x032,
		BG3PC: 0x034,
		BG3PD: 0x036,
		BG3X_LO: 0x038,
		BG3X_HI: 0x03a,
		BG3Y_LO: 0x03c,
		BG3Y_HI: 0x03e,
		WIN0H: 0x040,
		WIN1H: 0x042,
		WIN0V: 0x044,
		WIN1V: 0x046,
		WININ: 0x048,
		WINOUT: 0x04a,
		MOSAIC: 0x04c,
		BLDCNT: 0x050,
		BLDALPHA: 0x052,
		BLDY: 0x054,
		DMA0SAD_LO: 0x0b0,
		DMA3CNT_HI: 0x0de,
		TM0CNT_LO: 0x100,
		TM3CNT_HI: 0x10e,
		IE: 0x200,
		IF: 0x202,
		WAITCNT: 0x204,
		IME: 0x208
	};
	const writes = [];
	const io = Object.assign(addresses, {
		store16(offset, value) { writes.push([16, offset, value]); },
		store32(offset, value) { writes.push([32, offset, value]); }
	});
	irq.io = io;
	irq.audio = { waveData: new Uint8Array(32).fill(0xff) };
	cpu.gprs[0] = 0xe0;
	irq.swi(0x01);

	assert.deepEqual(writes[0], [16, io.DISPCNT, io.DEFAULT_DISPCNT]);
	assert.ok(writes.some(([width, address, value]) => width === 16 && address === io.RCNT && value === 0x8000));
	assert.ok(writes.some(([width, address, value]) => width === 16 && address === io.BG3HOFS && value === 0));
	assert.ok(writes.some(([width, address, value]) => width === 16 && address === io.BG3VOFS && value === 0));
	assert.ok(writes.some(([width, address, value]) => width === 16 && address === io.SOUNDBIAS && value === 0x0200));
	assert.ok(writes.some(([width, address, value]) => width === 16 && address === io.IF && value === 0xffff));
	assert.ok(writes.some(([width, address, value]) => width === 16 && address === io.IME && value === 0));
	assert.ok(irq.audio.waveData.every((value) => value === 0));
	assert.deepEqual(warnings, []);
});

test("RegisterRamReset clears RAM in place and invalidates cached code pages", () => {
	const irq = new IRQ();
	const mmu = new MMU();
	const ram = new MemoryBlock(0x40000, 9);
	const iram = new MemoryBlock(0x8000, 7);
	new Uint8Array(ram.buffer).fill(0xaa);
	new Uint8Array(iram.buffer).fill(0xbb);
	iram.view.setUint8(0x7e00, 0x44);
	ram.icache[0] = { invalid: false };
	iram.icache[0] = { invalid: false };
	mmu.REGION_WORKING_RAM = 2;
	mmu.REGION_WORKING_IRAM = 3;
	mmu.SIZE_WORKING_RAM = 0x40000;
	mmu.SIZE_WORKING_IRAM = 0x8000;
	mmu.memory = [];
	mmu.memory[2] = ram;
	mmu.memory[3] = iram;
	irq.core = { mmu };
	irq.cpu = {
		instruction: function staleInstruction() {},
		page: { invalid: false },
		pageRegion: mmu.REGION_WORKING_RAM
	};
	irq.io = {
		DISPCNT: 0,
		DEFAULT_DISPCNT: 0x80,
		writes: [],
		store16(offset, value) { this.writes.push([offset, value]); }
	};
	irq.registerRamReset(0x03);

	assert.equal(mmu.memory[2], ram);
	assert.equal(mmu.memory[3], iram);
	assert.equal(new Uint8Array(ram.buffer).some((value) => value !== 0), false);
	assert.equal(
		new Uint8Array(iram.buffer, 0, 0x7e00).some((value) => value !== 0),
		false
	);
	assert.equal(iram.view.getUint8(0x7e00), 0x44);
	assert.equal(ram.icache[0].invalid, true);
	assert.equal(iram.icache[0].invalid, true);
	assert.equal(irq.cpu.instruction, null);
	assert.equal(irq.cpu.page, null);
	assert.equal(irq.cpu.pageRegion, -1);
});

test("KEYCNT implements OR/AND keypad interrupt conditions and reads back", () => {
	const { irq, io, keypad, cpu } = keypadHarness();
	io.store16(io.KEYCNT, 0xc003);
	assert.equal(io.loadU16(io.KEYCNT), 0xc003);
	keypad.keyboardHandler({ type: "keydown", keyCode: 90, preventDefault() {} });
	assert.equal(irq.interruptFlags & irq.MASK_KEYPAD, 0);
	keypad.keyboardHandler({ type: "keydown", keyCode: 88, preventDefault() {} });
	assert.equal(irq.interruptFlags & irq.MASK_KEYPAD, irq.MASK_KEYPAD);
	assert.equal(cpu.irqRaised, 1);

	io.store16(io.IF, irq.MASK_KEYPAD);
	keypad.keyboardHandler({ type: "keyup", keyCode: 88, preventDefault() {} });
	keypad.keyboardHandler({ type: "keyup", keyCode: 90, preventDefault() {} });
	io.store16(io.KEYCNT, 0x4001);
	keypad.keyboardHandler({ type: "keydown", keyCode: 90, preventDefault() {} });
	assert.equal(irq.interruptFlags & irq.MASK_KEYPAD, irq.MASK_KEYPAD);
});

test("signed byte reads from I/O return a sign-extended register byte", () => {
	const mmu = new MMU();
	const io = new IO();
	io.registers = new Uint16Array(mmu.SIZE_IO >> 1);
	io.registers[io.POSTFLG >> 1] = 0x0180;
	mmu.memory = [];
	mmu.memory[mmu.REGION_IO] = io;

	assert.equal(mmu.load8(mmu.BASE_IO | io.POSTFLG), -128);
	assert.equal(mmu.load8(mmu.BASE_IO | io.POSTFLG | 1), 1);
});

test("Gamepad input supports browser button objects and disconnect cleanup", () => {
	const keypad = new Keypad();
	const buttons = Array.from({ length: 16 }, () => ({ pressed: false, value: 0 }));
	buttons[keypad.GAMEPAD_A] = { pressed: true, value: 1 };
	keypad.gamepadHandler({ buttons });
	assert.equal(keypad.currentDown & (1 << keypad.A), 0);
	assert.notEqual(keypad.currentDown & (1 << keypad.B), 0);
	const connected = { id: "connected", index: 0 };
	const removed = { id: "removed", index: 1 };
	keypad.gamepads = [connected, removed];
	keypad.gamepadDisconnectHandler({ gamepad: { id: "removed", index: 1 } });
	assert.equal(keypad.gamepads.length, 1);
	assert.equal(keypad.gamepads[0], connected);
});

test("keyboard and gamepad states combine and release when a pad disconnects", () => {
	const keypad = new Keypad();
	const previousNavigator = context.navigator;
	const buttons = Array.from({ length: 16 }, () => ({ pressed: false, value: 0 }));
	const gamepad = { buttons };
	let pads = [gamepad];
	context.navigator = { getGamepads() { return pads; } };

	try {
		keypad.keyboardHandler({
			type: "keydown",
			keyCode: keypad.KEYCODE_A,
			preventDefault() {}
		});
		buttons[keypad.GAMEPAD_B] = { pressed: true, value: 1 };
		keypad.pollGamepads();
		assert.equal(keypad.currentDown & (1 << keypad.A), 0);
		assert.equal(keypad.currentDown & (1 << keypad.B), 0);

		buttons[keypad.GAMEPAD_B] = { pressed: false, value: 0 };
		keypad.pollGamepads();
		assert.equal(keypad.currentDown & (1 << keypad.A), 0);
		assert.notEqual(keypad.currentDown & (1 << keypad.B), 0);

		buttons[keypad.GAMEPAD_B] = { pressed: true, value: 1 };
		keypad.pollGamepads();
		pads = [];
		keypad.pollGamepads();
		assert.equal(keypad.currentDown & (1 << keypad.A), 0);
		assert.notEqual(keypad.currentDown & (1 << keypad.B), 0);

		pads = [gamepad];
		keypad.pollGamepads();
		keypad.gamepadDisconnectHandler(gamepad);
		assert.equal(keypad.currentDown & (1 << keypad.A), 0);
		assert.notEqual(keypad.currentDown & (1 << keypad.B), 0);

		keypad.keyboardHandler({
			type: "keyup",
			keyCode: keypad.KEYCODE_A,
			preventDefault() {}
		});
		assert.equal(keypad.currentDown, 0x03ff);
	} finally {
		if (previousNavigator === undefined) {
			delete context.navigator;
		} else {
			context.navigator = previousNavigator;
		}
	}
});

test("keyboard input releases on browser blur without clearing gamepad input", () => {
	const keypad = new Keypad();
	const previousWindow = context.window;
	const listeners = {};
	context.window = {
		addEventListener(type, listener) {
			listeners[type] = listener;
		}
	};

	try {
		keypad.registerHandlers();
		keypad.setGamepadDown(0x03ff & ~(1 << keypad.B));
		keypad.keyboardHandler({
			type: "keydown",
			keyCode: keypad.KEYCODE_A,
			preventDefault() {}
		});
		assert.equal(keypad.currentDown & (1 << keypad.A), 0);
		assert.equal(keypad.currentDown & (1 << keypad.B), 0);

		listeners.blur();

		assert.notEqual(keypad.currentDown & (1 << keypad.A), 0);
		assert.equal(keypad.currentDown & (1 << keypad.B), 0);
	} finally {
		if (previousWindow === undefined) {
			delete context.window;
		} else {
			context.window = previousWindow;
		}
	}
});

test("BitUnPack SWI expands packed nibbles and applies bias only as specified", () => {
	const { irq, cpu, mmu, base } = softwareInterruptHarness();
	const source = base + 0x100;
	const dest = base + 0x200;
	const info = base + 0x300;
	mmu.store16(info, 2);
	mmu.store8(info + 2, 4);
	mmu.store8(info + 3, 8);
	mmu.store32(info + 4, 0);
	mmu.store8(source, 0x21);
	mmu.store8(source + 1, 0x04);
	cpu.gprs[0] = source;
	cpu.gprs[1] = dest;
	cpu.gprs[2] = info;
	irq.swi(0x10);
	assert.equal(mmu.load32(dest), 0x00040201);
	assert.equal(cpu.gprs[0], source + 2);
	assert.equal(cpu.gprs[1], dest + 4);

	mmu.store32(info + 4, 0x80000010 | 0);
	mmu.store8(source, 0x20);
	cpu.gprs[0] = source;
	cpu.gprs[1] = dest;
	cpu.gprs[2] = info;
	irq.swi(0x10);
	assert.equal(mmu.load32(dest), 0x10141210);
});

test("difference unfilter SWIs reconstruct 8-bit and 16-bit streams", () => {
	const { irq, cpu, mmu, base } = softwareInterruptHarness();
	const source = base + 0x400;
	const dest = base + 0x500;
	mmu.store32(source, 0x480);
	[10, 1, 1, 255].forEach((value, index) => mmu.store8(source + 4 + index, value));
	cpu.gprs[0] = source;
	cpu.gprs[1] = dest;
	irq.swi(0x16);
	assert.deepEqual(Array.from({ length: 4 }, (_, i) => mmu.loadU8(dest + i)), [10, 11, 12, 11]);

	const source16 = base + 0x600;
	const dest16 = base + 0x700;
	mmu.store32(source16, 0x481);
	mmu.store16(source16 + 4, 100);
	mmu.store16(source16 + 6, 2);
	cpu.gprs[0] = source16;
	cpu.gprs[1] = dest16;
	irq.swi(0x18);
	assert.deepEqual(
		[mmu.loadU16(dest16), mmu.loadU16(dest16 + 2)],
		[100, 102]
	);
});

test("Huffman SWI accepts valid 4-bit streams and rejects invalid widths safely", () => {
	const { irq, mmu, base, warnings } = softwareInterruptHarness();
	mmu.store32(base, 0x00000424);
	mmu.store8(base + 4, 1);
	mmu.store8(base + 5, 0xc0);
	mmu.store8(base + 6, 0x0a);
	mmu.store8(base + 7, 0x0b);
	mmu.store32(base + 8, 0);
	irq.huffman(base, base + 0x100);
	assert.equal(mmu.load32(base + 0x100) >>> 0, 0xaaaaaaaa);
	assert.equal(mmu.load32(base + 0x104), 0);

	mmu.store32(base, 0x00000420);
	assert.doesNotThrow(() => irq.huffman(base, base + 0x100));
	assert.match(warnings.at(-1), /Invalid Huffman symbol width: 0/);
});

test("compressed SWI output lengths are treated as unsigned 24-bit values", () => {
	const { irq, base } = softwareInterruptHarness();
	const sentinel = new Error("decompressor read compressed payload");
	const huffmanMmu = {
		load32(address) {
			if (address === base) return 0x80000024;
			if (address === base + 8) throw sentinel;
			return 0;
		},
		loadU8(address) {
			if (address === base + 4) return 1;
			if (address === base + 5) return 0xc0;
			if (address === base + 6) return 0x0a;
			if (address === base + 7) return 0x0b;
			throw sentinel;
		}
	};
	irq.cpu.mmu = huffmanMmu;
	assert.throws(() => irq.huffman(base, base + 0x100), sentinel);
	irq.cpu.mmu = {
		load32() { return 0x80000010; },
		loadU8() { throw sentinel; },
		store8() {},
		store16() {}
	};
	assert.throws(() => irq.lz77(base, base + 0x100, 1), sentinel);
	assert.throws(() => irq.rl(base, base + 0x100, 1), sentinel);
});

test("LZ77 decompression expands literal and overlapping back-reference data", () => {
	const encoded = [0x10, 0x41, 0x42, 0x43, 0x00, 0x02];
	const { irq, mmu, base } = softwareInterruptHarness();
	const source = base + 0x100;
	const dest = base + 0x200;
	mmu.store32(source, (6 << 8) | 0x10);
	encoded.forEach((value, index) => mmu.store8(source + 4 + index, value));

	irq.lz77(source, dest, 1);
	assert.deepEqual(
		Array.from({ length: 6 }, (_, index) => mmu.loadU8(dest + index)),
		[0x41, 0x42, 0x43, 0x41, 0x42, 0x43]
	);

	const vramHarness = softwareInterruptHarness();
	const vram = new VRAM(0x18000);
	vramHarness.mmu.store32(source, (6 << 8) | 0x10);
	encoded.forEach((value, index) =>
		vramHarness.mmu.store8(source + 4 + index, value)
	);
	const loadU8 = vramHarness.mmu.loadU8.bind(vramHarness.mmu);
	const store8 = vramHarness.mmu.store8.bind(vramHarness.mmu);
	const store16 = vramHarness.mmu.store16.bind(vramHarness.mmu);
	vramHarness.mmu.loadU8 = address => {
		if (address >= 0x06000000 && address < 0x06018000) {
			return vram.loadU8(address - 0x06000000);
		}
		return loadU8(address);
	};
	vramHarness.mmu.store8 = (address, value) => {
		if (address >= 0x06000000 && address < 0x06018000) {
			vram.store8(address - 0x06000000, value);
		} else {
			store8(address, value);
		}
	};
	vramHarness.mmu.store16 = (address, value) => {
		if (address >= 0x06000000 && address < 0x06018000) {
			vram.store16(address - 0x06000000, value);
		} else {
			store16(address, value);
		}
	};
	vramHarness.irq.lz77(source, 0x06000000, 2);
	assert.deepEqual(Array.from(vram.buffer.slice(0, 3)), [0x4241, 0x4143, 0x4342]);
});

test("RLUnCompVram preserves an odd final output byte while padding", () => {
	const { irq, mmu, base } = softwareInterruptHarness();
	const source = base + 0x100;
	const dest = 0x06000000;
	const vram = new VRAM(0x18000);
	vram.buffer.fill(0xcccc);
	mmu.store32(source, (5 << 8) | 0x30);
	mmu.store8(source + 4, 4);
	[0x10, 0x20, 0x30, 0x40, 0x50].forEach((value, index) =>
		mmu.store8(source + 5 + index, value)
	);

	const store8 = mmu.store8.bind(mmu);
	const store16 = mmu.store16.bind(mmu);
	mmu.store8 = (address, value) => {
		if (address >= dest && address < dest + 0x18000) {
			vram.store8(address - dest, value);
		} else {
			store8(address, value);
		}
	};
	mmu.store16 = (address, value) => {
		if (address >= dest && address < dest + 0x18000) {
			vram.store16(address - dest, value);
		} else {
			store16(address, value);
		}
	};

	irq.rl(source, dest, 2);
	assert.deepEqual(
		Array.from(vram.buffer.slice(0, 4)),
		[0x2010, 0x4030, 0x0050, 0x0000]
	);
});

test("8-bit difference unfilter packs byte results into VRAM halfwords", () => {
	const { irq, cpu, mmu, base } = softwareInterruptHarness();
	const source = base + 0x800;
	const dest = base + 0x900;
	mmu.store32(source, 0x480);
	[0x34, 0x12, 1, 1].forEach((value, index) => mmu.store8(source + 4 + index, value));
	cpu.gprs[0] = source;
	cpu.gprs[1] = dest;
	irq.swi(0x17);
	assert.deepEqual(
		[mmu.loadU16(dest), mmu.loadU16(dest + 2)],
		[0x4634, 0x4847]
	);
});

test("8-bit difference unfilter advances past a padded final VRAM halfword", () => {
	const { irq, cpu, mmu, base } = softwareInterruptHarness();
	const source = base + 0xa00;
	const dest = base + 0xb00;
	mmu.store32(source, 0x380);
	[0x20, 0x03, 0x04].forEach((value, index) =>
		mmu.store8(source + 4 + index, value)
	);
	cpu.gprs[0] = source;
	cpu.gprs[1] = dest;
	irq.swi(0x17);
	assert.deepEqual([mmu.loadU16(dest), mmu.loadU16(dest + 2)], [0x2320, 0x2727]);
	assert.equal(cpu.gprs[1], dest + 4);
	assert.equal(cpu.gprs[0], source + 8);
});

test("DMA reads and writes VRAM through its mirror while crossing a mirror boundary", () => {
	const mmu = new MMU();
	const vram = recordingMemory();
	mmu.memory = [];
	mmu.memory[mmu.REGION_VRAM] = vram;
	mmu.memory[mmu.REGION_IO] = { registers: [] };
	mmu.DMA_REGISTER = [0, 1, 2, 3];
	mmu.waitstates = mmu.WAITSTATES;
	mmu.waitstatesSeq = mmu.WAITSTATES_SEQ;
	mmu.waitstates32 = mmu.WAITSTATES_32;
	mmu.waitstatesSeq32 = mmu.WAITSTATES_SEQ_32;
	mmu.cpu = { cycles: 0 };
	mmu.core = { WARN() {} };

	mmu.serviceDma(0, {
		enable: true,
		width: 2,
		srcControl: mmu.DMA_INCREMENT,
		dstControl: mmu.DMA_INCREMENT,
		nextCount: 2,
		nextSource: 0x0601fffe,
		nextDest: 0x0601fffe,
		doIrq: false,
		repeat: false,
		count: 2
	});

	assert.deepEqual(vram.reads, [["loadU16", 0x17ffe], ["loadU16", 0]]);
	assert.deepEqual(vram.writes, [["store16", 0x17ffe, 0x17ffe], ["store16", 0, 0]]);
});

test("FIFO DMA converts programmed halfword transfers into four FIFO words", () => {
	const mmu = new MMU();
	const io = new IO();
	const audio = Object.create(Audio.prototype);
	const sourceReads = [];
	const samples = [];
	const sourceWords = [0x10203040, 0x50607080, 0x90a0b0c0, 0xd0e0f000];
	const source = {
		load32(offset) {
			sourceReads.push(offset);
			return sourceWords[offset >> 2];
		},
		invalidatePage() {}
	};

	mmu.memory = [];
	mmu.memory[mmu.REGION_WORKING_RAM] = source;
	mmu.memory[mmu.REGION_IO] = io;
	mmu.DMA_REGISTER = [0, 1, 2, 3];
	mmu.waitstates = mmu.WAITSTATES;
	mmu.waitstatesSeq = mmu.WAITSTATES_SEQ;
	mmu.waitstates32 = mmu.WAITSTATES_32;
	mmu.waitstatesSeq32 = mmu.WAITSTATES_SEQ_32;
	mmu.cpu = { cycles: 0 };
	mmu.core = { WARN() {} };
	io.registers = new Uint16Array(mmu.SIZE_IO >> 1);
	io.audio = {
		appendToFifoA(value) { samples.push(value); },
		appendToFifoB(value) { samples.push(value); }
	};

	audio.cpu = { mmu, irq: { io } };
	audio.core = { WARN() {} };
	audio.dmaA = -1;
	audio.dmaB = -1;

	const dma = {
		enable: true,
		width: 2,
		srcControl: mmu.DMA_INCREMENT,
		dstControl: mmu.DMA_INCREMENT,
		dest: mmu.BASE_IO | io.FIFO_A_LO,
		nextCount: 4,
		nextSource: mmu.BASE_WORKING_RAM,
		nextDest: mmu.BASE_IO | io.FIFO_A_LO,
		doIrq: false,
		repeat: false,
		count: 4
	};

	audio.scheduleFIFODma(1, dma);
	assert.equal(dma.width, 4);
	assert.equal(dma.dstControl, mmu.DMA_FIXED);
	assert.equal(audio.dmaA, 1);

	mmu.serviceDma(1, dma);

	assert.deepEqual(sourceReads, [0, 4, 8, 12]);
	assert.deepEqual(samples, sourceWords);
});

test("Direct Sound FIFO byte and halfword writes preserve untouched lanes", () => {
	const io = new IO();
	io.registers = new Uint16Array(0x200);
	const audio = Object.create(Audio.prototype);
	Object.assign(audio, {
		fifoA: [],
		fifoB: [],
		fifoAWriteBuffer: new Array(8).fill(0),
		fifoBWriteBuffer: new Array(8).fill(0),
		fifoAWriteIndex: 0,
		fifoBWriteIndex: 0,
		fifoASample: 0,
		fifoBSample: 0
	});
	io.audio = audio;

	const fifoAWords = [
		0x11223344,
		0xaabbccdd,
		0x01020304,
		0x11121314,
		0x21222324,
		0x31323334,
		0x41424344,
		0x51525354
	];
	const fifoBWords = [
		0x55667788,
		0x99aabbcc,
		0x01020304,
		0x11121314,
		0x21222324,
		0x31323334,
		0x41424344,
		0x51525354
	];
	for (const value of fifoAWords) {
		io.store32(io.FIFO_A_LO, value);
	}
	for (const value of fifoBWords) {
		io.store32(io.FIFO_B_LO, value);
	}
	assert.equal(audio.fifoAWriteIndex, 0);
	assert.equal(audio.fifoBWriteIndex, 0);
	assert.equal(audio.fifoA.length, 0, "eighth word overruns channel A");
	assert.equal(audio.fifoB.length, 0, "eighth word overruns channel B");

	const signedSample = (byte) => ((byte << 24) >> 24) / 128;
	io.store8(io.FIFO_A_LO, 0x08);
	assert.deepEqual(
		Array.from(audio.fifoA.slice(-4)),
		[0x08, 0x33, 0x22, 0x11].map(signedSample)
	);
	io.store16(io.FIFO_A_HI, 0xbeef);
	assert.deepEqual(
		Array.from(audio.fifoA.slice(-4)),
		[0xdd, 0xcc, 0xef, 0xbe].map(signedSample)
	);
	io.store8(io.FIFO_B_HI + 1, 0x02);
	assert.deepEqual(
		Array.from(audio.fifoB.slice(-4)),
		[0x88, 0x77, 0x66, 0x02].map(signedSample)
	);

	// FIFO reset returns the pointers to slot zero while the ring's old word
	// remains available for the next partial write.
	io.store16(io.SOUNDCNT_HI, 0x8800);
	io.store8(io.FIFO_A_LO + 3, 0x55);
	assert.deepEqual(
		Array.from(audio.fifoA),
		[0x08, 0x33, 0x22, 0x55].map(signedSample)
	);
	assert.equal(audio.fifoAWriteIndex, 1);
});

test("reassigning a DMA channel moves its FIFO association", () => {
	const mmu = new MMU();
	const io = { FIFO_A_LO: 0x0a0, FIFO_B_LO: 0x0a4 };
	const audio = Object.create(Audio.prototype);
	Object.assign(audio, {
		cpu: { mmu, irq: { io } },
		core: { WARN() {} },
		dmaA: 1,
		dmaB: -1
	});

	const dma = { dest: mmu.BASE_IO | io.FIFO_B_LO };
	audio.scheduleFIFODma(1, dma);

	assert.equal(audio.dmaA, -1);
	assert.equal(audio.dmaB, 1);
	assert.equal(dma.dstControl, mmu.DMA_FIXED);
	assert.equal(dma.width, 4);
});

test("stale FIFO DMA mappings cannot trigger a disabled or repurposed DMA", () => {
	const mmu = new MMU();
	const io = { FIFO_A_LO: 0x0a0 };
	for (const dma of [
		{
			enable: false,
			timing: mmu.DMA_TIMING_CUSTOM,
			dest: mmu.BASE_IO | io.FIFO_A_LO
		},
		{
			enable: true,
			timing: mmu.DMA_TIMING_NOW,
			dest: mmu.BASE_WORKING_IRAM
		},
		{
			enable: true,
			timing: mmu.DMA_TIMING_CUSTOM,
			dest: mmu.BASE_IO | 0x0a4
		}
	]) {
		let serviceCalls = 0;
		const audio = Object.create(Audio.prototype);
		Object.assign(audio, {
			cpu: { mmu, irq: { io } },
			core: {
				irq: { dma: [dma] },
				mmu: { serviceDma() { ++serviceCalls; } }
			},
			dmaA: 0,
			fifoA: new Array(12).fill(0),
			fifoASample: 0
		});

		audio.sampleFifoA();

		assert.equal(serviceCalls, 0);
		assert.equal(audio.dmaA, -1);
		assert.equal(audio.fifoA.length, 8);
	}
});

test("Direct Sound FIFO DMA waits for four empty ring words", () => {
	const mmu = new MMU();
	for (const [channel, fifoAddress] of [["A", 0x0a0], ["B", 0x0a4]]) {
		for (const initialLength of [12, 16]) {
			const io = { FIFO_A_LO: 0x0a0, FIFO_B_LO: 0x0a4 };
			const dma = {
				enable: true,
				timing: mmu.DMA_TIMING_CUSTOM,
				dest: mmu.BASE_IO | fifoAddress
			};
			const audio = Object.create(Audio.prototype);
			let serviceCalls = 0;
			let levelAtRequest = null;
			const fifoKey = "fifo" + channel;
			Object.assign(audio, {
				cpu: { mmu, irq: { io } },
				core: {
					irq: { dma: [dma] },
					mmu: {
						serviceDma() {
							++serviceCalls;
							levelAtRequest = audio[fifoKey].length;
							audio[fifoKey].push(...new Array(16).fill(0));
						}
					}
				},
				dmaA: channel === "A" ? 0 : -1,
				dmaB: channel === "B" ? 0 : -1,
				[fifoKey]: Array.from(
					{ length: initialLength },
					(_, index) => (index + 1) / 32
				),
				["fifo" + channel + "Sample"]: 0
			});

			audio["sampleFifo" + channel]();
			if (initialLength === 12) {
				assert.equal(serviceCalls, 1, `channel ${channel}, three queued words`);
				assert.equal(levelAtRequest, 12);
				assert.equal(audio[fifoKey].length, 24);
				assert.equal(audio["fifo" + channel + "Sample"], 1 / 32);
			} else {
				assert.equal(serviceCalls, 0, `channel ${channel}, four queued words`);
				assert.equal(audio[fifoKey].length, 12);
				audio["sampleFifo" + channel]();
				assert.equal(serviceCalls, 1, `channel ${channel}, low-water request`);
				assert.equal(levelAtRequest, 12);
				assert.equal(audio[fifoKey].length, 28);
				assert.equal(audio["fifo" + channel + "Sample"], 2 / 32);
			}

			audio["sampleFifo" + channel]();
			assert.equal(serviceCalls, 1, `channel ${channel}: no repeated refill`);
		}
	}
});

test("timer overflow services Direct Sound DMA at the FIFO low-water mark", () => {
	const mmu = new MMU();
	const io = new IO();
	const irq = new IRQ();
	const audio = Object.create(Audio.prototype);
	const sourceReads = [];
	const sourceWords = [0x10203040, 0x50607080, 0x90a0b0c0, 0xd0e0f000];
	const source = {
		load32(offset) {
			sourceReads.push(offset);
			return sourceWords[offset >> 2];
		},
		invalidatePage() {}
	};
	const cpu = { cycles: 0, irq };
	const dma = {
		enable: true,
		timing: mmu.DMA_TIMING_CUSTOM,
		srcControl: mmu.DMA_INCREMENT,
		dstControl: mmu.DMA_INCREMENT,
		width: 2,
		repeat: true,
		doIrq: false,
		count: 4,
		nextCount: 4,
		nextSource: mmu.BASE_WORKING_RAM,
		nextDest: mmu.BASE_IO | io.FIFO_A_LO,
		source: mmu.BASE_WORKING_RAM,
		dest: mmu.BASE_IO | io.FIFO_A_LO
	};

	mmu.memory = [];
	mmu.memory[mmu.REGION_WORKING_RAM] = source;
	mmu.memory[mmu.REGION_IO] = io;
	mmu.DMA_REGISTER = [0, 1, 2, 3];
	mmu.waitstates = mmu.WAITSTATES;
	mmu.waitstatesSeq = mmu.WAITSTATES_SEQ;
	mmu.waitstates32 = mmu.WAITSTATES_32;
	mmu.waitstatesSeq32 = mmu.WAITSTATES_SEQ_32;
	mmu.cpu = cpu;
	mmu.core = { WARN(message) { assert.fail(message); } };
	io.registers = new Uint16Array(mmu.SIZE_IO >> 1);
	io.audio = audio;
	io.cpu = { mmu, irq };
	irq.cpu = cpu;
	irq.io = io;
	irq.dma = [
		{ enable: false },
		dma,
		{ enable: false },
		{ enable: false }
	];
	irq.audio = audio;
	irq.timers = [
		{
			reload: 0xff00,
			oldReload: 0,
			countUp: false,
			enable: true,
			doIrq: false
		},
		{ enable: false, countUp: false },
		{ enable: false, countUp: false },
		{ enable: false, countUp: false }
	];
	Object.assign(audio, {
		cpu: { mmu, irq: { io } },
		core: { irq, mmu },
		enabled: true,
		enableChannelA: true,
		soundTimerA: 0,
		dmaA: 1,
		dmaB: -1,
		fifoA: Array.from({ length: 16 }, (_, index) => (index + 1) / 32),
		fifoB: [],
		fifoAInternal: [],
		fifoBInternal: [],
		fifoAWriteBuffer: new Array(8).fill(0),
		fifoBWriteBuffer: new Array(8).fill(0),
		fifoAWriteIndex: 0,
		fifoBWriteIndex: 0,
		fifoASample: 0,
		fifoBSample: 0
	});
	audio.scheduleFIFODma(1, dma);

	irq.processTimerOverflow(0, 0);
	assert.deepEqual(sourceReads, []);
	assert.equal(audio.fifoA.length, 12);
	assert.equal(audio.fifoASample, 1 / 32);

	cpu.cycles = 100;
	irq.processTimerOverflow(0, 100);
	assert.deepEqual(sourceReads, [0, 4, 8, 12]);
	assert.equal(audio.fifoASample, 2 / 32);
	assert.equal(audio.fifoA.length, 28);
	assert.ok(cpu.cycles > 100, "the FIFO DMA transfer stalls the emulated CPU");
});

test("local renderer VRAM mirrors high addresses without out-of-range reads", () => {
	const vram = new context.GameBoyAdvanceVRAMTest(0x18000);
	vram.store16(0x10000, 0x55aa);
	vram.store16(0x18000, 0x1234);
	vram.store16(0x20000, 0xabcd);

	assert.equal(vram.loadU16(0x10000), 0x1234);
	assert.equal(vram.loadU16(0), 0xabcd);
});

test("software renderer save states preserve palette, VRAM, and derived OAM", async () => {
	const source = new Renderer();
	source.clear(new MMU());
	source.palette.store16(0, 0x1234);
	source.palette.store16(0x200, 0x5678);
	source.vram.store16(0x1fffe, 0x9abc);
	source.oam.store16(0, 5);
	source.oam.store16(2, 0x23);
	source.oam.store16(4, 0x1401);

	const serialized = Serializer.serialize(source.freeze());
	const state = Serializer.deserealizeStream(
		new DataView(await serialized.arrayBuffer()),
		new Pointer()
	);
	const restored = new Renderer();
	restored.clear(new MMU());
	restored.defrost(state);

	assert.equal(restored.palette.colors[0][0], 0x1234);
	assert.equal(restored.palette.colors[1][0], 0x5678);
	assert.equal(restored.vram.loadU16(0x17ffe), 0x9abc);
	assert.equal(restored.oam.objs[0].y, 5);
	assert.equal(restored.oam.objs[0].x, 0x23);
	assert.equal(restored.oam.objs[0].tileBase, 1);

	const legacy = new Renderer();
	legacy.clear(new MMU());
	legacy.palette.store16(0, 0x4321);
	legacy.vram.store16(0, 0x8765);
	legacy.defrost({});
	assert.equal(legacy.palette.colors[0][0], 0x4321);
	assert.equal(legacy.vram.loadU16(0), 0x8765);
});

test("software renderer memories rotate unaligned 32-bit reads like the GBA bus", () => {
	const mmu = new MMU();
	const vram = new context.GameBoyAdvanceVRAMTest(0x18000);
	const oam = new OAM(0x400);
	const palette = new Palette();
	const bytes = [0x11, 0x22, 0x33, 0x44];
	new Uint8Array(vram.buffer.buffer).set(bytes, 0x100);
	new Uint8Array(vram.buffer.buffer).set(bytes, 0x10000);
	new Uint8Array(oam.buffer.buffer).set(bytes, 0x100);
	palette.store16(0x100, 0x2211);
	palette.store16(0x102, 0x4433);
	mmu.memory = [];
	mmu.memory[mmu.REGION_PALETTE_RAM] = palette;
	mmu.memory[mmu.REGION_VRAM] = vram;
	mmu.memory[mmu.REGION_OAM] = oam;

	const bases = [0x05000100, 0x06000100, 0x07000100];
	const expected = [0x44332211, 0x11443322, 0x22114433, 0x33221144];
	for (const base of bases) {
		for (let byteOffset = 0; byteOffset < 4; ++byteOffset) {
			assert.equal(mmu.load32(base + byteOffset), expected[byteOffset]);
		}
	}
	assert.equal(mmu.load32(0x06018001), expected[1]);
});

test("software renderer memories align unaligned 32-bit writes like the GBA bus", () => {
	const directMemories = [
		new Palette(),
		new context.GameBoyAdvanceVRAMTest(0x18000),
		new OAM(0x400)
	];
	const value = 0xa1b2c3d4;
	for (const memory of directMemories) {
		memory.store32(0x102, value);
		assert.equal(memory.load32(0x100), value | 0);
		assert.equal(memory.load32(0x104), 0);
	}

	const mmu = new MMU();
	mmu.memory = [];
	mmu.memory[mmu.REGION_PALETTE_RAM] = new Palette();
	mmu.memory[mmu.REGION_VRAM] = new context.GameBoyAdvanceVRAMTest(0x18000);
	mmu.memory[mmu.REGION_OAM] = new OAM(0x400);

	for (const base of [0x05000100, 0x06000100, 0x07000100]) {
		mmu.store32(base + 2, value);
		assert.equal(mmu.load32(base), value | 0);
		assert.equal(mmu.load32(base + 4), 0);
	}
});

test("odd halfword reads use ARM7 rotation and signed-byte behavior", () => {
	const mmu = new MMU();
	const bios = new BIOSView(new ArrayBuffer(0x4000));
	const ram = new MemoryBlock(0x40000, 9);
	const io = new IO();
	const palette = new Palette();
	const vram = new context.GameBoyAdvanceVRAMTest(0x18000);
	const oam = new OAM(0x400);
	io.registers = new Uint16Array(mmu.SIZE_IO >> 1);
	io.registers[io.POSTFLG >> 1] = 0x8011;
	io.video = { readDisplayStat() { return 0x2211; }, vcount: 0x4433 };
	new Uint8Array(bios.buffer).set([0x11, 0x80], 0x100);
	new Uint8Array(ram.buffer).set([0x11, 0x80], 0x100);
	palette.store16(0x100, 0x8011);
	new Uint8Array(vram.buffer.buffer).set([0x11, 0x80], 0x100);
	new Uint8Array(oam.buffer.buffer).set([0x11, 0x80], 0x100);
	mmu.memory = [];
	mmu.memory[mmu.REGION_BIOS] = bios;
	mmu.memory[mmu.REGION_IO] = io;
	mmu.memory[mmu.REGION_WORKING_RAM] = ram;
	mmu.memory[mmu.REGION_PALETTE_RAM] = palette;
	mmu.memory[mmu.REGION_VRAM] = vram;
	mmu.memory[mmu.REGION_OAM] = oam;

	for (const base of [
		0x00000100,
		0x02000100,
		0x04000300,
		0x05000100,
		0x06000100,
		0x07000100
	]) {
		assert.equal(mmu.loadU16(base), 0x8011);
		assert.equal(mmu.loadU16(base + 1), 0x11000080);
		assert.equal(mmu.load16(base), -32751);
		assert.equal(mmu.load16(base + 1), -128);
	}
	assert.deepEqual(
		[0, 1, 2, 3].map((offset) => mmu.load32(0x04000004 + offset)),
		[0x44332211, 0x11443322, 0x22114433, 0x33221144]
	);
	const workerVram = new MemoryProxy({ memoryDirtied() {} }, 0x18000, 13);
	workerVram.blocks[0].view.setUint8(0x100, 0x11);
	workerVram.blocks[0].view.setUint8(0x101, 0x80);
	mmu.memory[mmu.REGION_VRAM] = workerVram;
	assert.equal(mmu.loadU16(0x06000101), 0x11000080);
	assert.equal(mmu.load16(0x06000101), -128);

	const sramMmu = saveMemoryMmu("SRAM_V");
	sramMmu.store8(0x0e000101, 0x80);
	assert.equal(sramMmu.loadU16(0x0e000101) >>> 0, 0x80000080);
	assert.equal(sramMmu.load16(0x0e000101), -128);
});

test("worker-backed VRAM accesses stay within allocated memory blocks", () => {
	const mmu = new MMU();
	const vram = new MemoryProxy({ memoryDirtied() {} }, 0x18000, 13);
	mmu.memory = [];
	mmu.memory[mmu.REGION_VRAM] = vram;

	mmu.store16(0x06018000, 0xbeef);
	assert.equal(mmu.loadU16(0x06010000), 0xbeef);
	assert.equal(mmu.loadU16(0x06020000), 0);
});

test("OAM ignores byte writes in both render paths", () => {
	const oam = new OAM(0x400);
	oam.store8(0, 0xff);
	assert.equal(oam.buffer[0], 0);
	assert.equal(oam.objs[0].disable, 1);

	const proxy = new MemoryProxy({ memoryDirtied() {} }, 0x400, 0, true);
	proxy.store8(0, 0xff);
	assert.equal(proxy.blocks[0].loadU16(0), 0);
});

test("reserved OBJ shape codes do not render with stale dimensions", () => {
	const oam = new OAM(0x400);
	const obj = oam.objs[0];

	oam.store16(0, 0);
	assert.equal(obj.disable, 0);
	assert.equal(obj.cachedWidth, 8);

	oam.store16(0, 0xc000);
	assert.equal(obj.disable, 1);
	assert.equal(obj.cachedWidth, 8);

	oam.store16(0, 0x4000);
	assert.equal(obj.disable, 0);
	assert.equal(obj.cachedWidth, 16);
});

test("prohibited display modes do not crash rendering or disable BG2 after recovery", () => {
	for (const mode of [6, 7]) {
		const renderer = new Renderer();
		renderer.clear({ SIZE_VRAM: 0x18000, SIZE_OAM: 0x400 });
		renderer.setBacking({ data: new Uint8ClampedArray(240 * 160 * 4) });
		renderer.palette.store16(0, 0x03e0);
		renderer.writeDisplayControl(mode | 0x0400);

		assert.equal(renderer.bg[2].enabled, false);
		assert.doesNotThrow(() => renderer.drawScanline(0));
		assert.equal(renderer.pixelData.data[1], 248);

		renderer.writeDisplayControl(0x0080 | 0x0400);
		assert.equal(renderer.bg[2].enabled, 0x0400);
		assert.equal(typeof renderer.bg[2].drawScanline, "function");
	}
});

function renderPixel(renderer, oldStencil, oldColor, incomingMask, incomingColor) {
	const backing = {
		color: new Uint16Array([oldColor]),
		stencil: new Uint8Array([oldStencil])
	};
	const layer = {};
	Renderer.pushPixel.call(
		layer,
		null,
		null,
		renderer,
		incomingColor,
		0,
		0,
		backing,
		incomingMask,
		true
	);
	return { color: backing.color[0], stencil: backing.stencil[0] };
}

test("plain background pixel fast path preserves compositor ordering", () => {
	const scenarios = [
		{ oldStencil: 0, mask: 0x01, expectedColor: 0x1234 },
		{
			oldStencil: 0x80 | 0x01 | (1 << 1),
			mask: 0x01 | (1 << 1),
			expectedColor: 0x1234
		},
		{
			oldStencil: 0x80 | 0x01,
			mask: 0x01 | (1 << 1),
			expectedColor: 0x4321
		},
		{
			oldStencil: 0x80 | (1 << 1),
			mask: 0x01 | (1 << 1),
			expectedColor: 0x4321
		}
	];

	for (const scenario of scenarios) {
		function draw(useFastPath) {
			const renderer = new Renderer();
			renderer.clear({ SIZE_VRAM: 0x18000, SIZE_OAM: 0x400 });
			renderer.writeBlendControl(0);
			// Force the original compositor for the reference result while leaving
			// the actual blend registers disabled.
			renderer.hasBlendTargets = !useFastPath;
			let windowChecks = 0;
			let blendChecks = 0;
			const windowRegionAt = renderer.windowRegionAt.bind(renderer);
			renderer.windowRegionAt = (...args) => {
				++windowChecks;
				return windowRegionAt(...args);
			};
			renderer.setBlendEnabled = () => ++blendChecks;
			const backing = {
				color: new Uint16Array([0x4321]),
				stencil: new Uint8Array([scenario.oldStencil])
			};
			Renderer.pushPixel.call(
				{ multipalette: false },
				renderer.LAYER_BG0,
				{},
				renderer,
				0x1234,
				0,
				0,
				backing,
				scenario.mask,
				true
			);
			return { ...backing, windowChecks, blendChecks };
		}

		const fast = draw(true);
		const reference = draw(false);
		assert.deepEqual(
			{ color: fast.color[0], stencil: fast.stencil[0] },
			{ color: reference.color[0], stencil: reference.stencil[0] }
		);
		assert.equal(fast.color[0], scenario.expectedColor);
		assert.equal(fast.windowChecks, 0);
		assert.equal(fast.blendChecks, 0);
		assert.ok(reference.windowChecks > 0);
		assert.ok(reference.blendChecks > 0);
	}
});

test("window selection gives WIN0, then WIN1, OBJWIN, and outside priority", () => {
	const renderer = new Renderer();
	Object.assign(renderer, {
		win0: true,
		win1: true,
		objwin: true,
		win0Left: 10,
		win0Right: 30,
		win0Top: 5,
		win0Bottom: 20,
		win1Left: 20,
		win1Right: 40,
		win1Top: 10,
		win1Bottom: 30
	});

	assert.equal(renderer.windowRegionAt(25, 15, renderer.OBJWIN_MASK), 0);
	assert.equal(renderer.windowRegionAt(35, 15, renderer.OBJWIN_MASK), 1);
	assert.equal(renderer.windowRegionAt(5, 15, renderer.OBJWIN_MASK), 3);
	assert.equal(renderer.windowRegionAt(50, 15, 0), 2);
});

test("window edges wrap across screen boundaries on both axes", () => {
	const renderer = new Renderer();
	renderer.writeWin0H(0xE60A);
	renderer.writeWin0V(0x960A);
	renderer.win0 = true;

	assert.equal(renderer.windowRegionAt(5, 5, 0), 0);
	assert.equal(renderer.windowRegionAt(235, 5, 0), 0);
	assert.equal(renderer.windowRegionAt(5, 155, 0), 0);
	assert.equal(renderer.windowRegionAt(235, 155, 0), 0);
	assert.equal(renderer.windowRegionAt(100, 5, 0), 2);
	assert.equal(renderer.windowRegionAt(5, 80, 0), 2);
	assert.equal(renderer.windowRegionAt(100, 80, 0), 2);
});

test("normal and empty window ranges keep inclusive-start exclusive-end edges", () => {
	const renderer = new Renderer();
	renderer.win0 = true;
	renderer.writeWin0H(0x0A1E);
	renderer.writeWin0V(0x0514);

	assert.equal(renderer.windowRegionAt(10, 5, 0), 0);
	assert.equal(renderer.windowRegionAt(29, 19, 0), 0);
	assert.equal(renderer.windowRegionAt(30, 19, 0), 2);
	assert.equal(renderer.windowRegionAt(10, 20, 0), 2);

	renderer.writeWin0H(0x1414);
	assert.equal(renderer.windowRegionAt(20, 10, 0), 2);
});

test("OBJ-window pixels build coverage even when WINOUT hides OBJ", () => {
	const renderer = new Renderer();
	Object.assign(renderer, {
		vcount: 0,
		blendMode: 0,
		target1: new Array(6).fill(0),
		target2: new Array(6).fill(0),
		windows: Array.from({ length: 4 }, () => ({
			enabled: new Array(6).fill(false),
			special: false
		})),
		setBlendEnabled() {}
	});
	const layer = { multipalette: false };
	const backing = {
		color: new Uint16Array([0x7fff]),
		stencil: new Uint8Array(1)
	};

	Renderer.pushPixel.call(
		layer,
		renderer.LAYER_OBJ,
		{ palette: 0 },
		renderer,
		1,
		0,
		0,
		backing,
		renderer.OBJWIN_MASK,
		false
	);

	assert.equal(backing.stencil[0] & renderer.OBJWIN_MASK, renderer.OBJWIN_MASK);
	assert.equal(backing.stencil[0] & renderer.WRITTEN_MASK, 0);
	assert.equal(backing.color[0], 0x7fff);
});

test("scanline window cache includes OBJ-window coverage before drawing layers", () => {
	const renderer = new Renderer();
	renderer.clear({ SIZE_VRAM: 0x18000, SIZE_OAM: 0x400 });
	renderer.writeDisplayControl(0x9000);
	renderer.writeWinOut(0x0100);
	renderer.writeBlendControl(0);
	renderer.setBacking({
		data: new Uint8ClampedArray(
		renderer.HORIZONTAL_PIXELS * renderer.VERTICAL_PIXELS * 4
		)
	});
	renderer.objwinLayer.drawScanline = (backing) => {
		backing.stencil[0] |= renderer.OBJWIN_MASK;
	};
	const bgLayer = {
		index: renderer.LAYER_BG0,
		enabled: true,
		bg: false,
		drawScanline(backing) {
			for (let x = 0; x < 2; ++x) {
				Renderer.pushPixel.call(
					{},
					renderer.LAYER_BG0,
					null,
					renderer,
					0x001f,
					0,
					x,
					backing,
					renderer.BACKGROUND_MASK,
					true
				);
			}
		}
	};
	renderer.drawLayers = [renderer.objwinLayer, bgLayer];

	renderer.drawScanline(0);

	assert.equal(renderer.scanline.color[0], 0x001f);
	assert.equal(renderer.scanline.color[1], 0);
	assert.equal(renderer.windowRegionCache, null);
});

test("window-clipped mosaic text backgrounds start from the snapped scroll tile", () => {
	const scenarios = [
		{ scroll: 7, start: 11, expected: [248, 0, 0] },
		{ scroll: 250, start: 10, expected: [0, 0, 248] }
	];

	for (const scenario of scenarios) {
		const renderer = new Renderer();
		renderer.clear({ SIZE_VRAM: 0x18000, SIZE_OAM: 0x400 });
		renderer.setBacking({ data: new Uint8ClampedArray(240 * 160 * 4) });
		renderer.writeDisplayControl(0x0100 | 0x2000);
		renderer.writeBackgroundControl(0, 0x0044);
		renderer.writeBackgroundHOffset(0, scenario.scroll);
		renderer.writeWinIn(0x0001);
		renderer.writeWin0H((scenario.start << 8) | (scenario.start + 10));
		renderer.writeMosaic(0x000F);
		renderer.palette.store16(0x002, 0x001F);
		renderer.palette.store16(0x004, 0x03E0);
		renderer.palette.store16(0x006, 0x7C00);
		renderer.vram.store16(0, 0);
		renderer.vram.store16(2, 1);
		renderer.vram.store16(4, 2);
		renderer.vram.store16(62, 31);
		renderer.vram.store32(0x4000, 0x11111111);
		renderer.vram.store32(0x4040, 0x22222222);
		renderer.vram.store32(0x43E0, 0x33333333);

		renderer.drawScanline(0);

		const pixel = scenario.start * 4;
		assert.deepEqual(
			Array.from(renderer.pixelData.data.slice(pixel, pixel + 3)),
			scenario.expected,
			`incorrect mosaic tile for scroll ${scenario.scroll}`
		);
	}
});

test("8bpp text backgrounds prefetch the correct tile half at a clipped start", () => {
	function render(scroll, start, useWindow, hflip = false) {
		const renderer = new Renderer();
		renderer.clear({ SIZE_VRAM: 0x18000, SIZE_OAM: 0x400 });
		renderer.setBacking({ data: new Uint8ClampedArray(240 * 160 * 4) });
		renderer.writeDisplayControl(useWindow ? 0x2100 : 0x0100);
		renderer.writeBackgroundControl(0, 0x0880);
		renderer.writeBackgroundHOffset(0, scroll);
		if (useWindow) {
			renderer.writeWin0H((start << 8) | (start + 2));
			renderer.writeWin0V(1);
			renderer.writeWinIn(1);
			renderer.writeWinOut(0);
		}
		renderer.palette.store16(0x004, 0x001F);
		renderer.palette.store16(0x006, 0x001F);
		renderer.palette.store16(0x00C, 0x03E0);
		renderer.palette.store16(0x010, 0x7C00);
		renderer.vram.store16(0x4000, hflip ? 0x0400 : 0);
		renderer.vram.store32(0, 0x04030201);
		renderer.vram.store32(4, 0x08070605);

		renderer.drawScanline(0);
		return renderer.scanline.color[start];
	}

	assert.equal(render(5, 0, false), 0x03E0);
	assert.equal(render(4, 1, true), 0x03E0);
	assert.equal(render(0, 0, false, true), 0x7C00);
});

test("clipped 4bpp text background spans match the full scanline", () => {
	function render(scroll, windowStart) {
		const renderer = new Renderer();
		renderer.clear({ SIZE_VRAM: 0x18000, SIZE_OAM: 0x400 });
		renderer.setBacking({ data: new Uint8ClampedArray(240 * 160 * 4) });
		renderer.writeDisplayControl(0x0100 | (windowStart === null ? 0 : 0x2000));
		renderer.writeBackgroundControl(0, 0x0100);
		renderer.writeBackgroundHOffset(0, scroll);
		if (windowStart !== null) {
			renderer.writeWin0H((windowStart << 8) | (windowStart + 24));
			renderer.writeWin0V(0x00A0);
			renderer.writeWinIn(0x0001);
		}
		for (let index = 0; index < 16; ++index) {
			renderer.palette.store16(index * 2, (index * 0x421) & 0x7fff);
		}
		for (let tile = 1; tile <= 4; ++tile) {
			for (let word = 0; word < 8; ++word) {
				renderer.vram.store32(
					tile * 32 + word * 4,
					(0x76543210 ^ ((tile & 0xF) * 0x11111111)) >>> 0
				);
			}
		}
		for (let column = 0; column < 32; ++column) {
			renderer.vram.store16(0x0800 + column * 2, (column % 4) + 1);
		}
		renderer.drawScanline(0);
		return renderer.scanline.color;
	}

	for (const scroll of [0, 1, 3, 7, 255, 511]) {
		const full = render(scroll, null);
		for (let start = 0; start <= 216; ++start) {
			const clipped = render(scroll, start);
			for (let x = start; x < start + 24; ++x) {
				assert.equal(
					clipped[x],
					full[x],
					`scroll=${scroll}, clipped start=${start}, x=${x}`
				);
			}
		}
	}
});

test("clipped 8bpp text background spans match across tile and map wraps", () => {
	function render(scroll, windowStart) {
		const renderer = new Renderer();
		renderer.clear({ SIZE_VRAM: 0x18000, SIZE_OAM: 0x400 });
		renderer.setBacking({ data: new Uint8ClampedArray(240 * 160 * 4) });
		renderer.writeDisplayControl(0x0100 | (windowStart === null ? 0 : 0x2000));
		renderer.writeBackgroundControl(0, 0x0180);
		renderer.writeBackgroundHOffset(0, scroll);
		if (windowStart !== null) {
			renderer.writeWin0H((windowStart << 8) | (windowStart + 24));
			renderer.writeWin0V(0x00A0);
			renderer.writeWinIn(0x0001);
		}
		for (let index = 0; index < 256; ++index) {
			renderer.palette.store16(index * 2, (index * 0x421) & 0x7fff);
		}
		for (let tile = 1; tile <= 4; ++tile) {
			for (let row = 0; row < 8; ++row) {
				renderer.vram.store32(
					tile * 64 + row * 8,
					0x04030201 ^ (tile * 0x11111111)
				);
				renderer.vram.store32(
					tile * 64 + row * 8 + 4,
					0x08070605 ^ (tile * 0x11111111)
				);
			}
		}
		for (let column = 0; column < 32; ++column) {
			renderer.vram.store16(0x0800 + column * 2, (column % 4) + 1);
		}
		renderer.drawScanline(0);
		return renderer.scanline.color;
	}

	for (const scroll of [0, 1, 3, 7, 255, 511]) {
		const full = render(scroll, null);
		for (let start = 0; start <= 216; ++start) {
			const clipped = render(scroll, start);
			for (let x = start; x < start + 24; ++x) {
				assert.equal(
					clipped[x],
					full[x],
					`scroll=${scroll}, clipped start=${start}, x=${x}`
				);
			}
		}
	}
});

test("text BG scrolling selects the correct screen blocks for large maps", () => {
	function makeRenderer(size, hOffset, vOffset, entries) {
		const renderer = new Renderer();
		renderer.clear({ SIZE_VRAM: 0x18000, SIZE_OAM: 0x400 });
		renderer.setBacking({ data: new Uint8ClampedArray(240 * 160 * 4) });
		renderer.writeDisplayControl(0x0100);
		renderer.writeBackgroundControl(0, 0x0100 | (size << 14));
		renderer.writeBackgroundHOffset(0, hOffset);
		renderer.writeBackgroundVOffset(0, vOffset);
		const colors = [0, 0x001f, 0x03e0, 0x7c00, 0x7c1f];
		for (let tile = 1; tile <= 4; ++tile) {
			renderer.palette.store16(tile * 2, colors[tile]);
			for (let row = 0; row < 8; ++row) {
				renderer.vram.store32(tile * 32 + row * 4, 0x11111111 * tile);
			}
		}
		for (const [address, tile] of entries) {
			renderer.vram.store16(address, tile);
		}
		return renderer;
	}

	const horizontal = makeRenderer(1, 255, 0, [
		[0x083e, 1],
		[0x1000, 2]
	]);
	horizontal.drawScanline(0);
	assert.equal(horizontal.scanline.color[0], 0x001f);
	assert.equal(horizontal.scanline.color[1], 0x03e0);

	const vertical = makeRenderer(2, 0, 255, [
		[0x0fc0, 1],
		[0x1000, 3]
	]);
	vertical.drawScanline(0);
	assert.equal(vertical.scanline.color[0], 0x001f);
	vertical.drawScanline(1);
	assert.equal(vertical.scanline.color[0], 0x7c00);

	const large = makeRenderer(3, 255, 255, [
		[0x0ffe, 1],
		[0x17c0, 2],
		[0x183e, 3],
		[0x2000, 4]
	]);
	assert.equal(large.bg[0].screenBase, 0x800);
	assert.equal(large.bg[0].size, 3);
	large.drawScanline(0);
	assert.equal(large.scanline.color[0], 0x001f);
	assert.equal(large.scanline.color[1], 0x03e0);
	large.drawScanline(1);
	assert.equal(large.scanline.color[0], 0x7c00);
	assert.equal(large.scanline.color[1], 0x7c1f);
});

test("real OBJ-window sprites mask the following scanline layers", () => {
	const renderer = new Renderer();
	renderer.clear({ SIZE_VRAM: 0x18000, SIZE_OAM: 0x400 });
	renderer.writeDisplayControl(0x9100);
	renderer.writeWinOut(0x0100);
	renderer.writeBlendControl(0);
	renderer.setBacking({
		data: new Uint8ClampedArray(
			renderer.HORIZONTAL_PIXELS * renderer.VERTICAL_PIXELS * 4
		)
	});

	// OBJ 0 is an 8x8 OBJ-window sprite at the origin. Give its first row
	// nontransparent indices so it creates coverage during the normal path.
	renderer.oam.store16(0, 0x0800);
	renderer.oam.store16(2, 0);
	renderer.oam.store16(4, 0);
	renderer.vram.store32(0x10000, 0x11111111);

	const bgLayer = {
		index: renderer.LAYER_BG0,
		enabled: true,
		bg: false,
		drawScanline(backing) {
			for (const x of [0, 8]) {
				Renderer.pushPixel.call(
					{},
					renderer.LAYER_BG0,
					null,
					renderer,
					0x001f,
					0,
					x,
					backing,
					renderer.BACKGROUND_MASK,
					true
				);
			}
		}
	};
	renderer.drawLayers = [renderer.objwinLayer, bgLayer];

	renderer.drawScanline(0);

	assert.equal(renderer.scanline.stencil[0] & renderer.OBJWIN_MASK, renderer.OBJWIN_MASK);
	assert.equal(renderer.scanline.color[0], 0x001f);
	assert.equal(renderer.scanline.stencil[8] & renderer.WRITTEN_MASK, 0);
});

test("transparent OBJ-window priority promotion respects OAM and OBJ priority", () => {
	function resultingPriority(selectedIndex, selectedPriority, windowIndex, windowPriority) {
		const renderer = new Renderer();
		renderer.clear({ SIZE_VRAM: 0x18000, SIZE_OAM: 0x400 });
		renderer.objIndex[0] = selectedIndex;
		renderer.objPriority[0] = selectedPriority;
		renderer.objMode[0] = 0x10;
		renderer.objPriorityPass = "objwin";
		Renderer.pushPixel.call(
			{
				index: windowIndex,
				priority: windowPriority,
				multipalette: false,
				mode: renderer.OBJWIN_MASK
			},
			renderer.LAYER_OBJ,
			{ palette: 0 },
			renderer,
			0,
			0,
			0,
			{ color: new Uint16Array(1), stencil: new Uint8Array(1) },
			renderer.OBJWIN_MASK,
			false
		);
		return {
			priority: renderer.objPriority[0],
			mode: renderer.objMode[0]
		};
	}

	assert.deepEqual(resultingPriority(0, 2, 1, 0), { priority: 0, mode: 0x10 });
	assert.deepEqual(resultingPriority(1, 2, 0, 0), { priority: 2, mode: 0x10 });
	assert.deepEqual(resultingPriority(0, 2, 1, 2), { priority: 2, mode: 0x10 });
});

test("transparent OBJ-window pixels can promote a later OBJ over the BG", () => {
	const renderer = new Renderer();
	renderer.clear({ SIZE_VRAM: 0x18000, SIZE_OAM: 0x400 });
	renderer.writeDisplayControl(0x9100);
	renderer.writeBackgroundControl(0, 1);
	renderer.writeWinOut(0x0011);
	renderer.writeBlendControl(0);
	renderer.palette.store16(2, 0x03e0);
	renderer.palette.store16(0x202, 0x7c00);
	renderer.vram.store16(0, 1);
	renderer.vram.store32(32, 0x11111111);
	renderer.vram.store32(0x10000, 0x11111111);
	renderer.setBacking({ data: new Uint8ClampedArray(240 * 160 * 4) });

	// OBJ 0 is an opaque, lower-priority sprite. OBJ 1 is an OBJ-window sprite
	// with a transparent texel and higher priority. Hardware carries that
	// transparent OBJ-window priority through the sprite buffer.
	renderer.oam.store16(0, 0);
	renderer.oam.store16(2, 0);
	renderer.oam.store16(4, 0x0800);
	renderer.oam.store16(8, 0x0800);
	renderer.oam.store16(10, 0);
	renderer.oam.store16(12, 1);
	for (let i = 2; i < 128; ++i) {
		renderer.oam.store16(i * 8, 0x0200);
	}

	renderer.drawScanline(0);

	assert.equal(renderer.scanline.color[0], 0x7c00);
});

test("prohibited OBJ mode does not generate OBJ-window coverage", () => {
	const renderer = new Renderer();
	renderer.clear({ SIZE_VRAM: 0x18000, SIZE_OAM: 0x400 });
	renderer.writeDisplayControl(0x9100);
	renderer.writeWinOut(0x0100);
	renderer.writeBlendControl(0);
	renderer.setBacking({
		data: new Uint8ClampedArray(
			renderer.HORIZONTAL_PIXELS * renderer.VERTICAL_PIXELS * 4
		)
	});

	// OBJ mode 3 is prohibited. A nontransparent texel must not turn it into
	// an OBJ-window pixel that reveals BG0 inside the OBJ window.
	renderer.oam.store16(0, 0x0c00);
	renderer.oam.store16(2, 0);
	renderer.oam.store16(4, 0);
	renderer.vram.store32(0x10000, 0x11111111);

	const bgLayer = {
		index: renderer.LAYER_BG0,
		enabled: true,
		bg: false,
		drawScanline(backing) {
			Renderer.pushPixel.call(
				{},
				renderer.LAYER_BG0,
				null,
				renderer,
				0x001f,
				0,
				0,
				backing,
				renderer.BACKGROUND_MASK,
				true
			);
		}
	};
	renderer.drawLayers = [renderer.objwinLayer, bgLayer];

	renderer.drawScanline(0);

	assert.equal(renderer.scanline.stencil[0] & renderer.OBJWIN_MASK, 0);
	assert.equal(renderer.scanline.stencil[0] & renderer.WRITTEN_MASK, 0);
	assert.equal(renderer.scanline.color[0], 0);
});

test("window masks clip layers and gate raw-pixel brightness effects", () => {
	const renderer = new Renderer();
	Object.assign(renderer, {
		vcount: 0,
		win0: true,
		win1: false,
		objwin: false,
		win0Left: 0,
		win0Right: 8,
		win0Top: 0,
		win0Bottom: 1,
		blendMode: 2,
		target1: [renderer.TARGET1_MASK, 0, 0, 0, 0, 0],
		target2: new Array(6).fill(0),
		windows: Array.from({ length: 4 }, () => ({
			enabled: new Array(6).fill(false),
			special: false
		})),
		palette: {
			adjustColor(color) { return color + 1; },
			accessColor() { return 0; },
			mix() { return 0; }
		},
		setBlendEnabled() {}
	});
	renderer.windows[0].special = false;
	renderer.windows[2].enabled[renderer.LAYER_BG0] = true;
	renderer.windows[2].special = true;
	const layer = {};
	function drawAt(x) {
		const backing = {
			color: new Uint16Array(16),
			stencil: new Uint8Array(16)
		};
		Renderer.pushPixel.call(
			layer,
			renderer.LAYER_BG0,
			null,
			renderer,
			7,
			0,
			x,
			backing,
			renderer.BACKGROUND_MASK,
			true
		);
		return backing;
	}

	const clipped = drawAt(4);
	const outside = drawAt(10);
	assert.equal(clipped.stencil[4] & renderer.WRITTEN_MASK, 0);
	assert.equal(outside.color[10], 8);
	assert.notEqual(outside.stencil[10] & renderer.WRITTEN_MASK, 0);
});

test("scanline rendering applies window clipping and brightness to bitmap pixels", () => {
	const renderer = new Renderer();
	renderer.clear({ SIZE_VRAM: 0x18000, SIZE_OAM: 0x400 });
	renderer.writeDisplayControl(0x2403);
	renderer.writeWin0H(0x0008);
	renderer.writeWin0V(0x0001);
	renderer.writeWinIn(0x0004);
	renderer.writeWinOut(0x0024);
	renderer.writeBlendControl(0x0084);
	renderer.writeBlendY(16);
	for (let x = 0; x < renderer.HORIZONTAL_PIXELS; ++x) {
		renderer.vram.store16(x << 1, 0x0010);
	}
	const data = new Uint8ClampedArray(
		renderer.HORIZONTAL_PIXELS * renderer.VERTICAL_PIXELS * 4
	);
	renderer.setBacking({ data });
	renderer.drawScanline(0);

	const inside = 4 * 4;
	const outside = 10 * 4;
	assert.deepEqual(Array.from(data.slice(inside, inside + 3)), [128, 0, 0]);
	assert.deepEqual(Array.from(data.slice(outside, outside + 3)), [248, 248, 248]);
});

test("mode 5 selects the second framebuffer at the correct VRAM address", () => {
	const renderer = new Renderer();
	renderer.clear({ SIZE_VRAM: 0x18000, SIZE_OAM: 0x400 });
	renderer.setBacking({ data: new Uint8ClampedArray(240 * 160 * 4) });
	renderer.writeDisplayControl(0x0415);
	renderer.vram.store16(0x0000, 0x001F);
	renderer.vram.store16(0xA000, 0x03E0);
	renderer.vram.store16(0x14000, 0x7C00);

	renderer.drawScanline(0);

	assert.equal(renderer.scanline.color[0], 0x03E0);
});

test("forced blank paints only the current scanline white", () => {
	const renderer = new Renderer();
	renderer.clear({ SIZE_VRAM: 0x18000, SIZE_OAM: 0x400 });
	const width = renderer.HORIZONTAL_PIXELS;
	const height = renderer.VERTICAL_PIXELS;
	renderer.pixelData = { data: new Uint8ClampedArray(width * height * 4) };
	renderer.forcedBlank = 1;
	const y = 7;

	renderer.drawScanline(y);

	const rowStart = y * width * 4;
	assert.ok(
		renderer.pixelData.data
			.slice(rowStart, rowStart + width * 4)
			.every((value) => value === 0xff)
	);
	assert.ok(renderer.pixelData.data.slice(0, rowStart).every((value) => value === 0));
	assert.equal(renderer.vcount, y);
});

test("mode 4 palette index zero is transparent to lower-priority objects", () => {
	const renderer = new Renderer();
	renderer.clear({ SIZE_VRAM: 0x18000, SIZE_OAM: 0x400 });
	renderer.writeDisplayControl(0x1404);
	renderer.palette.store16(0, 0x1234);
	renderer.palette.store16(0x202, 0x7c00);
	renderer.vram.store32(0x14000, 0x11111111);
	renderer.oam.store16(0, 0);
	renderer.oam.store16(2, 0);
	renderer.oam.store16(4, 0x0400 | 512);
	renderer.setBacking({
		data: new Uint8ClampedArray(
			renderer.HORIZONTAL_PIXELS * renderer.VERTICAL_PIXELS * 4
		)
	});

	renderer.drawScanline(0);

	assert.equal(renderer.scanline.color[0], 0x7c00);
	assert.ok(renderer.scanline.stencil[0] & renderer.WRITTEN_MASK);
	assert.equal(
		renderer.scanline.stencil[0] & renderer.BACKGROUND_MASK,
		0
	);
});

test("zero-index text-background pixels reveal a lower-priority background", () => {
	const renderer = new Renderer();
	renderer.clear({ SIZE_VRAM: 0x18000, SIZE_OAM: 0x400 });
	renderer.setBacking({ data: new Uint8ClampedArray(240 * 160 * 4) });
	renderer.writeDisplayControl(0x0300);
	renderer.writeBackgroundControl(0, 0x0100);
	renderer.writeBackgroundControl(1, 0x0205);
	renderer.palette.store16(2, 0x001f);
	for (let row = 0; row < 8; ++row) {
		renderer.vram.store32(0x4000 + row * 4, 0x11111111);
	}

	renderer.drawScanline(0);

	assert.equal(renderer.scanline.color[0], 0x001f);
	assert.equal(renderer.scanline.color[7], 0x001f);
});

test("bitmap modes hide OBJ tiles below tile 512", () => {
	for (const mode of [3, 4, 5]) {
		for (const multipalette of [false, true]) {
			for (const tile of [0, 511]) {
				const renderer = new Renderer();
				renderer.clear({ SIZE_VRAM: 0x18000, SIZE_OAM: 0x400 });
				renderer.writeDisplayControl(0x1000 | mode);
				renderer.palette.store16(0, 0x03e0);
				renderer.palette.store16(0x202, 0x7c00);
				const alignedTile = multipalette ? tile & 0x03fe : tile;
				renderer.vram.store32(
					0x10000 + (alignedTile << 5),
					0x11111111
				);
				renderer.oam.store16(0, multipalette ? 0x2000 : 0);
				renderer.oam.store16(2, 0);
				renderer.oam.store16(4, 0x0400 | tile);
				renderer.setBacking({
					data: new Uint8ClampedArray(
						renderer.HORIZONTAL_PIXELS * renderer.VERTICAL_PIXELS * 4
					)
				});

				renderer.drawScanline(0);

				const description = `mode ${mode}, ${multipalette ? "8bpp" : "4bpp"}, tile ${tile}`;
				assert.equal(renderer.pixelData.data[0], 0, description);
				assert.equal(renderer.pixelData.data[1], 248, description);
				assert.equal(renderer.pixelData.data[2], 0, description);
			}
		}
	}
});

test("affine bitmap modes sample the floored x and y texel separately", () => {
	for (const mode of [3, 4, 5]) {
		const renderer = new Renderer();
		renderer.clear({ SIZE_VRAM: 0x18000, SIZE_OAM: 0x400 });
		renderer.writeDisplayControl(0x0400 | mode);
		const bg = renderer.bg[2];
		bg.dx = 1.5;
		bg.dy = 0;
		bg.sx = 0.5;
		bg.sy = 0.5;
		if (mode === 3) {
			renderer.vram.store16(2 * 2, 3);
		} else if (mode === 4) {
			renderer.vram.store16(2, 1);
			renderer.palette.store16(2, 3);
		} else {
			renderer.vram.store16(2 * 2, 3);
		}

		renderer.setBacking({
			data: new Uint8ClampedArray(
				renderer.HORIZONTAL_PIXELS * renderer.VERTICAL_PIXELS * 4
			)
		});
		renderer.drawScanline(0);
		assert.equal(renderer.scanline.color[1], 3, `mode ${mode}`);
	}
});

test("mode 4 unscaled affine rows preserve pixels at fractional origins and window edges", () => {
	const renderer = new Renderer();
	renderer.clear({ SIZE_VRAM: 0x18000, SIZE_OAM: 0x400 });
	renderer.writeDisplayControl(0x2c04);
	renderer.writeWin0H((5 << 8) | 10);
	renderer.writeWin0V(0x00a0);
	renderer.writeWinIn(0x0000);
	renderer.writeWinOut(0x0004);
	const bg = renderer.bg[2];
	bg.dx = 1;
	bg.dy = 0;
	bg.sx = 0.5;
	bg.sy = 37.75;
	for (let i = 0; i < 256; ++i) {
		renderer.palette.store16(
			i << 1,
			((i * 3) & 0x1f) | (((i * 5) & 0x1f) << 5) | (((i * 7) & 0x1f) << 10)
		);
	}
	const bitmap = new Uint8Array(renderer.vram.buffer.buffer, 0, 240 * 160);
	for (let i = 0; i < bitmap.length; ++i) {
		bitmap[i] = (i % 255) + 1;
	}
	renderer.setBacking({
		data: new Uint8ClampedArray(240 * 160 * 4)
	});
	assert.equal(renderer.backgroundMode, 4);
	assert.ok(renderer.bg[2].enabled);
	assert.equal(renderer.forcedBlank, 0);
	assert.equal(renderer.bg[2].drawScanline, renderer.drawScanlineBGMode4);
	const sourceX = bg.sx;
	const sourceY = bg.sy;

	renderer.drawScanline(0);
	const row = Math.floor(sourceY);
	const win0Backdrop = renderer.palette.colors[0][0];
	const expand = (color) => [
		(color & 0x1f) << 3,
		(color & 0x3e0) >> 2,
		(color & 0x7c00) >> 7
	];
	for (let x = 0; x < renderer.HORIZONTAL_PIXELS; ++x) {
		const insideDisabledWindow = x >= 5 && x < 10;
		const localX = Math.floor(x + sourceX);
		const index =
			!insideDisabledWindow &&
			row >= 0 &&
			row < renderer.VERTICAL_PIXELS &&
			localX >= 0 &&
			localX < renderer.HORIZONTAL_PIXELS
				? bitmap[row * renderer.HORIZONTAL_PIXELS + localX]
				: 0;
		const expected = expand(
			index ? renderer.palette.colors[0][index] : win0Backdrop
		);
		const pixelOffset = x * 4;
		assert.deepEqual(
			Array.from(renderer.pixelData.data.slice(pixelOffset, pixelOffset + 3)),
			expected,
			`pixel ${x}`
		);
	}
});

test("mode 4 unscaled affine rows honor the selected framebuffer page", () => {
	const renderer = new Renderer();
	renderer.clear({ SIZE_VRAM: 0x18000, SIZE_OAM: 0x400 });
	renderer.writeDisplayControl(0x0414);
	renderer.bg[2].dx = 1;
	renderer.bg[2].dy = 0;
	renderer.palette.store16(2, 0x001f);
	renderer.palette.store16(4, 0x03e0);
	const vram = new Uint8Array(renderer.vram.buffer.buffer);
	vram[0] = 2;
	vram[0xa000] = 1;
	renderer.setBacking({
		data: new Uint8ClampedArray(240 * 160 * 4)
	});

	renderer.drawScanline(0);

	assert.deepEqual(
		Array.from(renderer.pixelData.data.slice(0, 3)),
		[248, 0, 0]
	);
});

test("affine BG reference coordinates use signed 28-bit registers", () => {
	const renderer = new Renderer();
	renderer.clear({ SIZE_VRAM: 0x18000, SIZE_OAM: 0x400 });
	renderer.writeBackgroundRefX(2, 0x08000000);
	renderer.writeBackgroundRefY(2, 0x0fffffff);

	assert.equal(renderer.bg[2].refx, -0x80000);
	assert.equal(renderer.bg[2].sx, -0x80000);
	assert.equal(renderer.bg[2].refy, -1 / 256);
	assert.equal(renderer.bg[2].sy, -1 / 256);
});

test("IO affine reference writes agree across word and halfword accesses", () => {
	const registers = [
		["BG2X_LO", 2, "x"],
		["BG2Y_LO", 2, "y"],
		["BG3X_LO", 3, "x"],
		["BG3Y_LO", 3, "y"]
	];
	const values = [0, 0x00000100, 0x07ffff00, 0x08000000, 0x0fffff00, 0xffffffff];

	for (const [registerName, bgIndex, axis] of registers) {
		for (const value of values) {
			const makeHarness = () => {
				const io = new IO();
				io.registers = new Uint16Array(0x200);
				const renderer = new Renderer();
				renderer.clear({ SIZE_VRAM: 0x18000, SIZE_OAM: 0x400 });
				io.video = { renderPath: renderer };
				return { io, renderer };
			};
			const { io: halves, renderer: halfRenderer } = makeHarness();
			const { io: word, renderer: wordRenderer } = makeHarness();
			const offset = halves[registerName];
			halves.store16(offset, value & 0xffff);
			halves.store16(offset + 2, value >>> 16);
			word.store32(word[registerName], value);

			const property = axis == "x" ? "refx" : "refy";
			assert.equal(
				halfRenderer.bg[bgIndex][property],
				wordRenderer.bg[bgIndex][property],
				`${registerName} value 0x${value.toString(16)}`
			);
		}
	}
});

test("affine BG reference coordinates advance while disabled or forced blank", () => {
	for (const forcedBlank of [false, true]) {
		const renderer = new Renderer();
		renderer.clear({ SIZE_VRAM: 0x18000, SIZE_OAM: 0x400 });
		renderer.writeDisplayControl(
			2 | (forcedBlank ? 0x0480 : 0)
		);
		renderer.bg[2].sx = 10;
		renderer.bg[2].sy = 20;
		renderer.bg[2].dmx = 2;
		renderer.bg[2].dmy = -1;
		renderer.bg[3].sx = -5;
		renderer.bg[3].sy = 7;
		renderer.bg[3].dmx = 0.5;
		renderer.bg[3].dmy = 1.5;
		renderer.setBacking({
			data: new Uint8ClampedArray(240 * 160 * 4)
		});

		renderer.drawScanline(0);

		assert.equal(renderer.bg[2].sx, 12, `BG2 sx, forcedBlank=${forcedBlank}`);
		assert.equal(renderer.bg[2].sy, 19, `BG2 sy, forcedBlank=${forcedBlank}`);
		assert.equal(renderer.bg[3].sx, -4.5, `BG3 sx, forcedBlank=${forcedBlank}`);
		assert.equal(renderer.bg[3].sy, 8.5, `BG3 sy, forcedBlank=${forcedBlank}`);
	}
});

test("affine BG reference origins reload when a frame finishes", () => {
	const renderer = new Renderer();
	renderer.clear({ SIZE_VRAM: 0x18000, SIZE_OAM: 0x400 });
	const origins = [
		{ refx: 12.25, refy: -5.5, dmx: 0.5, dmy: 1 },
		{ refx: -7.75, refy: 18.125, dmx: -0.25, dmy: 0.75 }
	];
	for (let i = 0; i < origins.length; ++i) {
		Object.assign(renderer.bg[i + 2], origins[i]);
	}

	for (let y = 0; y < renderer.VERTICAL_PIXELS; ++y) {
		renderer.advanceAffineReferencePoints();
	}
	assert.notEqual(renderer.bg[2].sx, origins[0].refx);
	assert.notEqual(renderer.bg[3].sy, origins[1].refy);

	renderer.finishDraw({ finishDraw() {} });
	for (let i = 0; i < origins.length; ++i) {
		assert.equal(renderer.bg[i + 2].sx, origins[i].refx);
		assert.equal(renderer.bg[i + 2].sy, origins[i].refy);
	}
});

test("an affine reference write in H-Blank sets the next line origin directly", () => {
	const renderer = new Renderer();
	renderer.clear({ SIZE_VRAM: 0x18000, SIZE_OAM: 0x400 });
	renderer.writeDisplayControl(0x0402);
	renderer.writeBackgroundControl(2, 0);
	renderer.writeBackgroundRefX(2, 10 * 256);
	renderer.bg[2].dx = 0;
	renderer.bg[2].dy = 0;
	renderer.bg[2].dmx = 2;
	renderer.bg[2].dmy = 0;
	renderer.setBacking({
		data: new Uint8ClampedArray(240 * 160 * 4)
	});
	const mapX = [];
	renderer.accessMapMode1 = (_base, _size, x, _yBase, out) => {
		mapX.push(x);
		out.tile = 0;
	};
	renderer.vram.loadU8 = () => 1;
	renderer.bg[2].pushPixel = () => {};

	renderer.drawScanline(0);
	assert.equal(mapX[0], 10);
	assert.equal(renderer.bg[2].sx, 12);

	// Model an H-Blank write after line 0 has advanced its internal origin.
	renderer.writeBackgroundRefX(2, 50 * 256);
	renderer.drawScanline(1);
	assert.equal(mapX[240], 50);
	assert.equal(renderer.bg[2].sx, 52);
});

test("negative fractional affine tile coordinates wrap from the map edge", () => {
	const renderer = new Renderer();
	renderer.clear({ SIZE_VRAM: 0x18000, SIZE_OAM: 0x400 });
	renderer.writeDisplayControl(0x0402);
	renderer.writeBackgroundControl(2, 0x2000);
	const bg = renderer.bg[2];
	bg.dx = 0;
	bg.dy = 0;
	bg.sx = -0.5;
	bg.sy = 0;
	const mapX = [];
	renderer.accessMapMode1 = (base, size, x, yBase, out) => {
		mapX.push(x);
		out.tile = 0;
	};
	renderer.vram.loadU8 = () => 1;
	bg.pushPixel = () => {};
	bg.drawScanline(renderer.scanline, bg, 0, 1);

	assert.deepEqual(mapX, [127]);
});

test("window-clipped affine backgrounds preserve absolute screen coordinates", () => {
	function render(mode, clipped, mosaic) {
		const renderer = new Renderer();
		renderer.clear({ SIZE_VRAM: 0x18000, SIZE_OAM: 0x400 });
		renderer.writeDisplayControl(
			0x0400 | mode | (clipped ? 0x2000 : 0)
		);
		renderer.writeBackgroundControl(
			2,
			0x0100 | 0x0004 | (mode === 2 ? 0x2000 : 0) | (mosaic ? 0x0040 : 0)
		);
		renderer.writeMosaic(0x0024);
		if (clipped) {
			renderer.writeWin0H((13 << 8) | 181);
			renderer.writeWin0V(0x00a0);
			renderer.writeWinIn(0x0004);
		}

		const bg = renderer.bg[2];
		bg.dx = -1.5;
		bg.dy = 0.625;
		bg.dmx = 0.375;
		bg.dmy = -0.25;
		bg.sx = 37.25;
		bg.sy = -12.5;
		for (let i = 0; i < 256; ++i) {
			renderer.palette.store16(i * 2, (i * 0x421) & 0x7fff);
		}
		if (mode === 2) {
			for (let tile = 0; tile < 256; ++tile) {
				for (let word = 0; word < 16; ++word) {
					renderer.vram.store32(
						0x4000 + tile * 64 + word * 4,
						((tile + word) * 0x01010101) >>> 0
					);
				}
			}
			for (let entry = 0; entry < 256; ++entry) {
				renderer.vram.store16(0x0800 + entry * 2, entry & 0xff);
			}
		} else {
			for (let i = 0; i < 0x14000; i += 2) {
				renderer.vram.store16(i, (i * 37) & 0xffff);
			}
		}
		renderer.setBacking({ data: new Uint8ClampedArray(240 * 160 * 4) });
		renderer.drawScanline(2);
		return renderer.scanline.color;
	}

	for (const mode of [2, 3, 4, 5]) {
		for (const mosaic of [false, true]) {
			const full = render(mode, false, mosaic);
			const clipped = render(mode, true, mosaic);
			for (let x = 13; x < 181; ++x) {
				assert.equal(
					clipped[x],
					full[x],
					`mode=${mode}, mosaic=${mosaic}, x=${x}`
				);
			}
		}
	}
});

test("semi-transparent OBJ blending suppresses brightness on both targets", () => {
	const renderer = new Renderer();
	renderer.clear({ SIZE_VRAM: 0x18000, SIZE_OAM: 0x400 });
	renderer.writeDisplayControl(0x1100);
	renderer.writeBackgroundControl(0, 0);
	renderer.writeBlendControl(0x01d1);
	renderer.writeBlendAlpha(0x0808);
	renderer.writeBlendY(8);
	renderer.palette.store16(2, 0x0010);
	renderer.palette.store16(0x202, 0x001f);
	renderer.vram.store16(0, 1);
	renderer.vram.store32(32, 0x11111111);
	renderer.vram.store32(0x10000, 0x11111111);
	renderer.setBacking({ data: new Uint8ClampedArray(240 * 160 * 4) });
	renderer.oam.store16(0, 0x0400);
	renderer.oam.store16(2, 0);
	renderer.oam.store16(4, 0);
	for (let i = 1; i < 128; ++i) {
		renderer.oam.store16(i * 8, 0x0200);
	}

	renderer.drawScanline(0);

	// The background's raw red value (16) is the second target. The semi-OBJ
	// forces alpha blending, so its 50% fade must not darken that target first.
	assert.equal(renderer.scanline.color[0], 0x0017);
});

test("semi-transparent OBJ alpha blends against the backdrop second target", () => {
	for (const mode of [0, 1, 2, 3]) {
		const renderer = new Renderer();
		renderer.clear({ SIZE_VRAM: 0x18000, SIZE_OAM: 0x400 });
		renderer.writeDisplayControl(0x1000);
		renderer.writeBlendControl(0x2010 | (mode << 6));
		renderer.writeBlendAlpha(0x0808);
		renderer.writeBlendY(8);
		renderer.palette.store16(0, 0x0010);
		renderer.palette.store16(0x202, 0x001f);
		renderer.vram.store32(0x10000, 0x11111111);
		renderer.setBacking({ data: new Uint8ClampedArray(240 * 160 * 4) });
		renderer.oam.store16(0, 0x0400);
		renderer.oam.store16(2, 0);
		renderer.oam.store16(4, 0);
		for (let i = 1; i < 128; ++i) {
			renderer.oam.store16(i * 8, 0x0200);
		}

		renderer.drawScanline(0);

		// Backdrop red 16 is selected as target 2; the semitransparent OBJ red
		// 31 must alpha blend with it in every BLDCNT effect mode.
		assert.equal(renderer.scanline.color[0], 0x0017, `mode=${mode}`);
		assert.equal(renderer.pixelData.data[0], 184, `output mode=${mode}`);
	}
});

test("semi-transparent OBJ stays opaque when no second target is selected", () => {
	const renderer = new Renderer();
	renderer.clear({ SIZE_VRAM: 0x18000, SIZE_OAM: 0x400 });
	renderer.writeDisplayControl(0x1000);
	renderer.writeBlendControl(0x00d0);
	renderer.writeBlendAlpha(0x0808);
	renderer.writeBlendY(8);
	renderer.palette.store16(0x202, 0x001f);
	renderer.vram.store32(0x10000, 0x11111111);
	renderer.setBacking({ data: new Uint8ClampedArray(240 * 160 * 4) });
	renderer.oam.store16(0, 0x0400);
	renderer.oam.store16(2, 0);
	renderer.oam.store16(4, 0);
	for (let i = 1; i < 128; ++i) {
		renderer.oam.store16(i * 8, 0x0200);
	}

	renderer.drawScanline(0);

	// With no selected second target, semi-transparency has nothing to mix
	// against. The independent OBJ brightness effect still applies.
	assert.equal(renderer.scanline.color[0], 0x000f);
});

test("semi-transparent OBJ pixels force alpha blending over a second target", () => {
	const renderer = new Renderer();
	const blendCalls = [];
	Object.assign(renderer, {
		vcount: 0,
		blendMode: 2,
		blendA: 0.5,
		blendB: 0.5,
		target1: new Array(6).fill(0),
		target2: new Array(6).fill(0),
		windows: Array.from({ length: 4 }, () => ({
			enabled: new Array(6).fill(true),
			special: true
		})),
		palette: {
			accessColor() { return 0x7c00; },
			mix(a, top, b, bottom) {
				blendCalls.push([a, top, b, bottom]);
				return 0x1234;
			}
		},
		setBlendEnabled(...args) { blendCalls.push(args); }
	});
	const backing = {
		color: new Uint16Array([0x001f]),
		stencil: new Uint8Array([
			renderer.WRITTEN_MASK |
				renderer.TARGET2_MASK |
				renderer.BACKGROUND_MASK |
				(1 << 1)
		])
	};
	Renderer.pushPixel.call(
		{ multipalette: false, mode: 0x10 },
		renderer.LAYER_OBJ,
		{ palette: 0 },
		renderer,
		1,
		0,
		0,
		backing,
		0,
		false
	);

	assert.equal(backing.color[0], 0x1234);
	assert.deepEqual(blendCalls.at(-1), [0.5, 0x7c00, 0.5, 0x001f]);
});

test("semi-transparent OBJ alpha blending uses unadjusted colors in reverse layer order", () => {
	const renderer = new Renderer();
	const bgColors = new Array(0x100).fill(0);
	const objColors = new Array(0x100).fill(0);
	bgColors[1] = 0x0010;
	objColors[1] = 0x001f;
	Object.assign(renderer, {
		vcount: 0,
		blendMode: 3,
		blendA: 0.75,
		blendB: 0.25,
		target1: new Array(6).fill(0),
		target2: new Array(6).fill(0),
		windows: Array.from({ length: 4 }, () => ({
			enabled: new Array(6).fill(true),
			special: true
		})),
		palette: {
			colors: [bgColors, objColors],
			accessColor() { return 0x0008; },
			mix(a, top, b, bottom) {
				const r = Math.min(a * (top & 0x1f) + b * (bottom & 0x1f), 0x1f);
				const g = Math.min(a * ((top >> 5) & 0x1f) + b * ((bottom >> 5) & 0x1f), 0x1f);
				const blue = Math.min(a * ((top >> 10) & 0x1f) + b * ((bottom >> 10) & 0x1f), 0x1f);
				return r | (g << 5) | (blue << 10);
			}
		},
		setBlendEnabled() {}
	});
	renderer.target2[renderer.LAYER_BG0] = renderer.TARGET2_MASK;
	const backing = {
		color: new Uint16Array([0x001f]),
		unadjustedColor: new Uint16Array([0x001f]),
		stencil: new Uint8Array([
			renderer.WRITTEN_MASK | renderer.TARGET1_MASK
		])
	};
	Renderer.pushPixel.call(
		{ multipalette: false, mode: 0 },
		renderer.LAYER_BG0,
		{},
		renderer,
		1,
		0,
		0,
		backing,
		renderer.TARGET2_MASK | renderer.BACKGROUND_MASK | (1 << 1),
		false
	);

	// The existing OBJ is the first target (31); the incoming BG is the second
	// target (16), even though its displayed brightness lookup returns 8.
	assert.equal(backing.color[0], 0x001b);
	assert.equal(backing.unadjustedColor[0], 0x001b);
});

test("renderer gives OBJ pixels priority over BG pixels at the same level", () => {
	const renderer = new Renderer();
	Object.assign(renderer, {
		blendMode: 0,
		alphaEnabled: false,
		target1: new Array(6).fill(0),
		target2: new Array(6).fill(0),
		palette: { accessColor() {}, mix() {} },
		setBlendEnabled() {}
	});
	const priority = 2 << 1;
	const written = renderer.WRITTEN_MASK;
	const bg = renderer.BACKGROUND_MASK;
	const bgPixel = 0x03e0;
	const objPixel = 0x001f;

	assert.equal(
		renderPixel(renderer, written | priority | bg, bgPixel, priority, objPixel).color,
		objPixel
	);
	assert.equal(
		renderPixel(renderer, written | priority, objPixel, priority | bg, bgPixel).color,
		objPixel
	);
	assert.equal(
		renderPixel(renderer, written | priority, objPixel, priority, bgPixel).color,
		objPixel
	);
	assert.equal(
		renderPixel(renderer, written | priority | bg, bgPixel, priority | bg, objPixel).color,
		objPixel
	);
});

test("lower-numbered backgrounds win equal-priority ties", () => {
	function render(bg0Priority, bg1Priority) {
		const renderer = new Renderer();
		renderer.clear({ SIZE_VRAM: 0x18000, SIZE_OAM: 0x400 });
		renderer.setBacking({ data: new Uint8ClampedArray(240 * 160 * 4) });
		renderer.writeDisplayControl(0x0100 | 0x0200);
		renderer.writeBackgroundControl(0, 0x0100 | bg0Priority);
		renderer.writeBackgroundControl(1, 0x0200 | 0x0004 | bg1Priority);
		renderer.palette.store16(0x002, 0x001f);
		renderer.palette.store16(0x004, 0x03e0);
		renderer.vram.store16(0x0800, 0);
		renderer.vram.store16(0x1000, 0);
		for (let row = 0; row < 8; ++row) {
			renderer.vram.store32(row * 4, 0x11111111);
			renderer.vram.store32(0x4000 + row * 4, 0x22222222);
		}

		renderer.drawScanline(0);
		return renderer.scanline.color[0];
	}

	assert.equal(render(0, 0), 0x001f, "BG0 wins a priority tie with BG1");
	assert.equal(render(1, 0), 0x03e0, "priority beats BG number");
});

test("lower OAM index wins when OBJ pixels have equal priority", () => {
	const renderer = new Renderer();
	renderer.clear({ SIZE_VRAM: 0x18000, SIZE_OAM: 0x400 });
	renderer.setBacking({ data: new Uint8ClampedArray(240 * 160 * 4) });
	renderer.writeDisplayControl(0x1000);
	renderer.palette.store16(0x202, 0x001f);
	renderer.palette.store16(0x204, 0x03e0);
	for (let row = 0; row < 8; ++row) {
		renderer.vram.store32(0x10000 + row * 4, 0x11111111);
		renderer.vram.store32(0x10020 + row * 4, 0x22222222);
	}
	renderer.oam.store16(0, 0);
	renderer.oam.store16(2, 0);
	renderer.oam.store16(4, 0);
	renderer.oam.store16(8, 0);
	renderer.oam.store16(10, 0);
	renderer.oam.store16(12, 1);

	renderer.drawScanline(0);

	assert.equal(renderer.pixelData.data[0], 248);
	assert.equal(renderer.pixelData.data[1], 0);
});

test("higher OBJ priority wins when a later OAM entry overlaps", () => {
	const renderer = new Renderer();
	renderer.clear({ SIZE_VRAM: 0x18000, SIZE_OAM: 0x400 });
	renderer.setBacking({ data: new Uint8ClampedArray(240 * 160 * 4) });
	renderer.writeDisplayControl(0x1000);
	renderer.palette.store16(0x202, 0x001f);
	renderer.palette.store16(0x204, 0x03e0);
	for (let row = 0; row < 8; ++row) {
		renderer.vram.store32(0x10000 + row * 4, 0x11111111);
		renderer.vram.store32(0x10020 + row * 4, 0x22222222);
	}
	renderer.oam.store16(0, 0);
	renderer.oam.store16(2, 0);
	renderer.oam.store16(4, 1 << 10);
	renderer.oam.store16(8, 0);
	renderer.oam.store16(10, 0);
	renderer.oam.store16(12, 1);

	renderer.drawScanline(0);

	assert.equal(renderer.pixelData.data[0], 0);
	assert.equal(renderer.pixelData.data[1], 248);
});

test("OBJ ordering uses the latched priority values for the current scanline", () => {
	const renderer = new Renderer();
	renderer.clear({ SIZE_VRAM: 0x18000, SIZE_OAM: 0x400 });
	renderer.setBacking({ data: new Uint8ClampedArray(240 * 160 * 4) });
	renderer.writeDisplayControl(0x1000);
	renderer.palette.store16(0x202, 0x001f);
	renderer.palette.store16(0x204, 0x03e0);
	for (let row = 0; row < 8; ++row) {
		renderer.vram.store32(0x10000 + row * 4, 0x11111111);
		renderer.vram.store32(0x10020 + row * 4, 0x22222222);
	}
	renderer.oam.store16(0, 0);
	renderer.oam.store16(2, 0);
	renderer.oam.store16(4, 2 << 10);
	renderer.oam.store16(8, 0);
	renderer.oam.store16(10, 0);
	renderer.oam.store16(12, 1 << 10 | 1);

	renderer.drawScanline(0);
	// This live OAM write must not change the priority comparison until line 2.
	renderer.oam.store16(4, 0);
	renderer.drawScanline(1);

	assert.equal(renderer.pixelData.data[240 * 4], 0);
	assert.equal(renderer.pixelData.data[240 * 4 + 1], 248);
	assert.equal(renderer.pixelData.data[240 * 4 + 2], 0);
});

test("higher-priority later OBJ shows above BG when the earlier OBJ is behind BG", () => {
	const renderer = new Renderer();
	renderer.clear({ SIZE_VRAM: 0x18000, SIZE_OAM: 0x400 });
	renderer.setBacking({ data: new Uint8ClampedArray(240 * 160 * 4) });
	renderer.writeDisplayControl(0x1100);
	renderer.writeBackgroundControl(0, 0x0005);
	renderer.vram.store16(0, 0);
	renderer.vram.store32(0x4000, 0x11111111);
	renderer.vram.store32(0x10000, 0x11111111);
	renderer.vram.store32(0x10020, 0x22222222);
	renderer.palette.store16(0x002, 0x7c00);
	renderer.palette.store16(0x202, 0x001f);
	renderer.palette.store16(0x204, 0x03e0);
	renderer.oam.store16(0, 0);
	renderer.oam.store16(2, 0);
	renderer.oam.store16(4, 2 << 10);
	renderer.oam.store16(8, 0);
	renderer.oam.store16(10, 0);
	renderer.oam.store16(12, 1);

	renderer.drawScanline(0);

	assert.equal(renderer.pixelData.data[0], 0);
	assert.equal(renderer.pixelData.data[1], 248);
	assert.equal(renderer.pixelData.data[2], 0);
});

test("transparent higher-priority OBJ promotes an existing OBJ over the BG", () => {
	const renderer = new Renderer();
	renderer.clear({ SIZE_VRAM: 0x18000, SIZE_OAM: 0x400 });
	renderer.setBacking({ data: new Uint8ClampedArray(240 * 160 * 4) });
	renderer.writeDisplayControl(0x1100);
	renderer.writeBackgroundControl(0, 0x0006);
	renderer.vram.store16(0, 0);
	renderer.vram.store32(0x4000, 0x11111111);
	renderer.palette.store16(0x002, 0x7c00);
	renderer.palette.store16(0x202, 0x001f);
	renderer.vram.store32(0x10000, 0x11111111);
	renderer.vram.store32(0x10020, 0x00000000);
	renderer.oam.store16(0, 0);
	renderer.oam.store16(2, 0);
	renderer.oam.store16(4, 3 << 10);
	renderer.oam.store16(8, 0);
	renderer.oam.store16(10, 0);
	renderer.oam.store16(12, 2 << 10 | 1);

	renderer.drawScanline(0);

	assert.equal(renderer.pixelData.data[0], 248, "the first OBJ keeps its color");
	assert.equal(renderer.pixelData.data[1], 0);
	assert.equal(renderer.pixelData.data[2], 0);
});

test("transparent semi-transparent OBJ promotes the existing OBJ blend flag", () => {
	const renderer = new Renderer();
	renderer.clear({ SIZE_VRAM: 0x18000, SIZE_OAM: 0x400 });
	renderer.setBacking({ data: new Uint8ClampedArray(240 * 160 * 4) });
	renderer.writeDisplayControl(0x1100);
	renderer.writeBackgroundControl(0, 0x0006);
	renderer.writeBlendControl(0x0110);
	renderer.writeBlendAlpha(0x0808);
	renderer.vram.store16(0, 0);
	renderer.vram.store32(0x4000, 0x11111111);
	renderer.palette.store16(0x002, 0x7c00);
	renderer.palette.store16(0x202, 0x001f);
	renderer.vram.store32(0x10000, 0x11111111);
	renderer.vram.store32(0x10020, 0x00000000);
	renderer.oam.store16(0, 0);
	renderer.oam.store16(2, 0);
	renderer.oam.store16(4, 3 << 10);
	renderer.oam.store16(8, 1 << 10);
	renderer.oam.store16(10, 0);
	renderer.oam.store16(12, 2 << 10 | 1);

	renderer.drawScanline(0);

	assert.ok(renderer.pixelData.data[0] > 0, "OBJ red is blended into the pixel");
	assert.ok(renderer.pixelData.data[2] > 0, "BG blue remains in the pixel");
	assert.equal(renderer.pixelData.data[1], 0);
});

test("transparent lower-index OBJ pixels let later OAM entries show through", () => {
	const renderer = new Renderer();
	renderer.clear({ SIZE_VRAM: 0x18000, SIZE_OAM: 0x400 });
	renderer.setBacking({ data: new Uint8ClampedArray(240 * 160 * 4) });
	renderer.writeDisplayControl(0x1000);
	renderer.palette.store16(0x204, 0x03e0);
	for (let row = 0; row < 8; ++row) {
		renderer.vram.store32(0x10020 + row * 4, 0x22222222);
	}
	renderer.oam.store16(0, 0);
	renderer.oam.store16(2, 0);
	renderer.oam.store16(4, 0);
	renderer.oam.store16(8, 0);
	renderer.oam.store16(10, 0);
	renderer.oam.store16(12, (1 << 10) | 1);

	renderer.drawScanline(0);

	assert.equal(renderer.pixelData.data[0], 0);
	assert.equal(renderer.pixelData.data[1], 248);
	assert.equal(renderer.pixelData.data[2], 0);
});

test("OBJ mosaic fills the clipped first block from the sprite edge", () => {
	const renderer = new Renderer();
	renderer.clear({ SIZE_VRAM: 0x18000, SIZE_OAM: 0x400 });
	renderer.setBacking({ data: new Uint8ClampedArray(240 * 160 * 4) });
	renderer.writeDisplayControl(0x1000);
	renderer.writeMosaic(0x0300);
	for (let index = 1; index <= 8; ++index) {
		renderer.palette.store16(0x200 + (index << 1), index);
	}
	renderer.vram.store32(0x10000, 0x87654321);
	renderer.oam.store16(0, 0x1000);
	renderer.oam.store16(2, 1);
	renderer.oam.store16(4, 0);

	renderer.drawScanline(0);

	const redAt = (x) => renderer.pixelData.data[x * 4];
	const firstBlock = [
		redAt(1), redAt(2), redAt(3), redAt(4),
		redAt(5), redAt(6), redAt(7), redAt(8)
	];
	assert.equal(redAt(0), 0);
	assert.deepEqual(firstBlock, [8, 8, 8, 32, 32, 32, 32, 64]);

	renderer.oam.store16(2, 0x1001);
	renderer.drawScanline(0);
	assert.deepEqual(
		[
			redAt(1), redAt(2), redAt(3), redAt(4),
			redAt(5), redAt(6), redAt(7), redAt(8)
		],
		[64, 64, 64, 40, 40, 40, 40, 8]
	);
});

test("affine OBJ mosaic aligns to the same screen grid as normal OBJ mosaic", () => {
	function render(affine, spriteY, mosaicY) {
		const renderer = new Renderer();
		renderer.clear({ SIZE_VRAM: 0x18000, SIZE_OAM: 0x400 });
		renderer.writeDisplayControl(0x1000);
		renderer.writeMosaic((mosaicY - 1) << 12);
		renderer.palette.store16(0x202, 0x001f);
		for (let row = 0; row < 8; ++row) {
			renderer.vram.store32(0x10000 + row * 4, 0x11111111);
		}
		renderer.oam.store16(0, spriteY | 0x1000 | (affine ? 0x0100 : 0));
		renderer.oam.store16(2, 1);
		renderer.oam.store16(4, 0);
		const data = new Uint8ClampedArray(240 * 160 * 4);
		renderer.setBacking({ data });
		renderer.drawScanline(0);
		renderer.drawScanline(1);
		return Array.from(data.slice(0, 240 * 2 * 4));
	}

	assert.deepEqual(render(true, 0, 1), render(false, 0, 1));
	const affineMosaic = render(true, 1, 2);
	const normalMosaic = render(false, 1, 2);
	assert.deepEqual(affineMosaic, normalMosaic);
});

test("OBJ scanline cycle limits honor DISPCNT H-Blank Interval Free", () => {
	const scenarios = [
		{ hblankFree: true, index: 14, visible: true },
		{ hblankFree: true, index: 15, visible: false },
		{ hblankFree: false, index: 18, visible: true },
		{ hblankFree: false, index: 19, visible: false },
		{ hblankFree: true, index: 14, visible: false, affineIndex: 13 }
	];

	for (const scenario of scenarios) {
		const renderer = new Renderer();
		renderer.clear({ SIZE_VRAM: 0x18000, SIZE_OAM: 0x400 });
		renderer.setBacking({ data: new Uint8ClampedArray(240 * 160 * 4) });
		renderer.writeDisplayControl(
			0x1000 | (scenario.hblankFree ? 0x0020 : 0)
		);
		renderer.palette.store16(0x202, 0x001f);
		for (let row = 0; row < 8; ++row) {
			renderer.vram.store32(0x10020 + row * 4, 0x11111111);
		}

		for (let i = 0; i <= scenario.index; ++i) {
			renderer.oam.store16(
				i * 8,
				i === scenario.affineIndex ? 0x0100 : 0
			);
			renderer.oam.store16(i * 8 + 2, 0xc000);
			renderer.oam.store16(i * 8 + 4, i === scenario.index ? 1 : 0);
		}

		renderer.drawScanline(0);
		assert.equal(
			renderer.pixelData.data[0] === 248,
			scenario.visible,
			`H-Blank Interval Free=${scenario.hblankFree}, OAM index=${scenario.index}`
		);
	}
});

test("OBJ scanline cycle limits also cover OBJ-window sprites", () => {
	const renderer = new Renderer();
	renderer.clear({ SIZE_VRAM: 0x18000, SIZE_OAM: 0x400 });
	renderer.setBacking({ data: new Uint8ClampedArray(240 * 160 * 4) });
	renderer.writeDisplayControl(0x1000 | 0x8000 | 0x0020);
	for (let row = 0; row < 8; ++row) {
		renderer.vram.store32(0x10020 + row * 4, 0x11111111);
	}

	for (let i = 0; i <= 15; ++i) {
		renderer.oam.store16(i * 8, i === 15 ? 0x0800 : 0);
		renderer.oam.store16(i * 8 + 2, 0xc000);
		renderer.oam.store16(i * 8 + 4, i === 15 ? 1 : 0);
	}

	renderer.drawScanline(0);
	assert.equal(renderer.scanline.stencil[0] & renderer.OBJWIN_MASK, 0);
});

test("OBJ attribute changes take one scanline to reach the renderer", () => {
	const renderer = new Renderer();
	renderer.clear({ SIZE_VRAM: 0x18000, SIZE_OAM: 0x400 });
	renderer.setBacking({ data: new Uint8ClampedArray(240 * 160 * 4) });
	renderer.writeDisplayControl(0x1000);
	renderer.palette.store16(0x202, 0x001f);
	for (let row = 0; row < 8; ++row) {
		renderer.vram.store32(0x10020 + row * 4, 0x11111111);
	}

	// Keep the OBJ disabled for line 0, then enable it for line 1 after the
	// line-0 OAM evaluation has already latched the next scanline's attributes.
	renderer.oam.store16(0, 0x0200);
	renderer.oam.store16(2, 0);
	renderer.oam.store16(4, 1);
	renderer.drawScanline(0);
	renderer.oam.store16(0, 1);
	renderer.drawScanline(1);

	assert.equal(renderer.pixelData.data[240 * 4], 0);
	renderer.drawScanline(2);
	assert.equal(renderer.pixelData.data[240 * 2 * 4], 248);
});

test("line-zero OBJ attributes are sampled during the final V-Blank line", () => {
	const renderer = new Renderer();
	renderer.clear({ SIZE_VRAM: 0x18000, SIZE_OAM: 0x400 });
	renderer.setBacking({ data: new Uint8ClampedArray(240 * 160 * 4) });
	renderer.writeDisplayControl(0x1000);
	renderer.palette.store16(0x202, 0x001f);
	for (let row = 0; row < 8; ++row) {
		renderer.vram.store32(0x10020 + row * 4, 0x11111111);
	}

	renderer.oam.store16(0, 0x0200);
	renderer.oam.store16(2, 0);
	renderer.oam.store16(4, 1);
	renderer.primeObjOamForLineZero();
	renderer.oam.store16(0, 1);
	renderer.drawScanline(0);

	assert.equal(renderer.pixelData.data[0], 0);
	renderer.drawScanline(1);
	assert.equal(renderer.pixelData.data[240 * 4], 248);
});

test("renderer save states preserve pending one-scanline OBJ updates", async () => {
	const source = new Renderer();
	source.clear({ SIZE_VRAM: 0x18000, SIZE_OAM: 0x400 });
	source.setBacking({ data: new Uint8ClampedArray(240 * 160 * 4) });
	source.writeDisplayControl(0x1000);
	source.palette.store16(0x202, 0x001f);
	for (let row = 0; row < 8; ++row) {
		source.vram.store32(0x10020 + row * 4, 0x11111111);
	}
	source.oam.store16(0, 0x0200);
	source.oam.store16(2, 0);
	source.oam.store16(4, 1);
	source.drawScanline(0);
	source.oam.store16(0, 1);

	const serialized = Serializer.serialize(source.freeze());
	const state = Serializer.deserealizeStream(
		new DataView(await serialized.arrayBuffer()),
		new Pointer()
	);
	const restored = new Renderer();
	restored.clear({ SIZE_VRAM: 0x18000, SIZE_OAM: 0x400 });
	restored.defrost(state);
	restored.setBacking({ data: new Uint8ClampedArray(240 * 160 * 4) });
	restored.writeDisplayControl(0x1000);

	restored.drawScanline(1);
	assert.equal(restored.pixelData.data[240 * 4], 0);
	restored.drawScanline(2);
	assert.equal(restored.pixelData.data[240 * 2 * 4], 248);
});

test("right-offscreen OBJs consume full cycles while left-clipped OBJs save cycles", () => {
	for (const scenario of [
		{ firstX: 240, expectedRed: 0 },
		{ firstX: 452, expectedRed: 248 }
	]) {
		const renderer = new Renderer();
		renderer.clear({ SIZE_VRAM: 0x18000, SIZE_OAM: 0x400 });
		renderer.setBacking({ data: new Uint8ClampedArray(240 * 160 * 4) });
		renderer.writeDisplayControl(0x1000 | 0x0020);
		renderer.palette.store16(0x202, 0x001f);
		for (let row = 0; row < 8; ++row) {
			renderer.vram.store32(0x10020 + row * 4, 0x11111111);
		}

		for (let i = 0; i <= 15; ++i) {
			const x = i === 0 ? scenario.firstX : i === 15 ? 0 : scenario.firstX === 240 ? 240 : 447;
			renderer.oam.store16(i * 8, 1 << 14);
			renderer.oam.store16(i * 8 + 2, x | (3 << 14));
			renderer.oam.store16(i * 8 + 4, i === 15 ? 1 : 0);
		}

		renderer.drawScanline(0);
		assert.equal(
			renderer.pixelData.data[0],
			scenario.expectedRed,
			`unexpected later OBJ visibility with first OAM x=${scenario.firstX}`
		);
	}
});

test("left-wrapped OBJs ending at x=0 still reduce the scanline OBJ budget", () => {
	const renderer = new Renderer();
	renderer.clear({ SIZE_VRAM: 0x18000, SIZE_OAM: 0x400 });
	renderer.writeDisplayControl(0x1000 | 0x0020);

	for (let i = 0; i < 30; ++i) {
		renderer.oam.store16(i * 8, 0);
		renderer.oam.store16(i * 8 + 2, 448 | (3 << 14));
		renderer.oam.store16(i * 8 + 4, 0);
	}
	renderer.oam.store16(30 * 8, 0);
	renderer.oam.store16(30 * 8 + 2, 0);
	renderer.oam.store16(30 * 8 + 4, 0);

	renderer.prepareObjCycles(0);

	assert.equal(renderer.objCycleAllowed[30], 0);
});

test("left-wrapped affine OBJs reduce their cycle cost", () => {
	const renderer = new Renderer();
	renderer.clear({ SIZE_VRAM: 0x18000, SIZE_OAM: 0x400 });
	renderer.writeDisplayControl(0x1000 | 0x0020);

	for (let i = 0; i <= 38; ++i) {
		renderer.oam.store16(i * 8, 0x0100);
		renderer.oam.store16(i * 8 + 2, i === 0 ? 500 : 0);
		renderer.oam.store16(i * 8 + 4, 0);
	}

	renderer.prepareObjCycles(0);

	assert.equal(renderer.objCycleAllowed[37], 1);
	assert.equal(renderer.objCycleAllowed[38], 0);
});

test("fully left-clipped affine OBJs cannot add to the scanline cycle budget", () => {
	function visibleNormalObjects(withFarLeftAffine) {
		const renderer = new Renderer();
		renderer.clear({ SIZE_VRAM: 0x18000, SIZE_OAM: 0x400 });
		renderer.writeDisplayControl(0x1000 | 0x0020);
		for (let i = 0; i < 128; ++i) {
			renderer.oam.store16(i * 8, 0);
			renderer.oam.store16(i * 8 + 2, 0);
			renderer.oam.store16(i * 8 + 4, 0);
		}
		if (withFarLeftAffine) {
			renderer.oam.store16(0, 0x0100);
			renderer.oam.store16(2, 0xc100);
		}

		renderer.prepareObjCycles(0);
		return renderer.objCycleAllowed.reduce(
			(count, allowed, index) => count + (index > 0 && allowed ? 1 : 0),
			0
		);
	}

	const visibleWithoutAffine = visibleNormalObjects(false);
	const visibleWithFarLeftAffine = visibleNormalObjects(true);
	assert.ok(visibleWithoutAffine > 0);
	assert.ok(
		visibleWithFarLeftAffine <= visibleWithoutAffine,
		`far-left affine OBJ allowed ${visibleWithFarLeftAffine} normal OBJs, baseline ${visibleWithoutAffine}`
	);
});

test("OBJ scan time includes earlier sprites outside the current scanline", () => {
	const renderer = new Renderer();
	renderer.clear({ SIZE_VRAM: 0x18000, SIZE_OAM: 0x400 });
	renderer.writeDisplayControl(0x1000 | 0x0020);

	for (let i = 0; i < 42; ++i) {
		const y = i < 14 ? 0 : 1;
		renderer.oam.store16(i * 8, y);
		renderer.oam.store16(i * 8 + 2, i < 14 ? 0xc000 : 0);
		renderer.oam.store16(i * 8 + 4, 0);
	}
	renderer.oam.store16(42 * 8, 0);
	renderer.oam.store16(42 * 8 + 2, 0);
	renderer.oam.store16(42 * 8 + 4, 0);

	renderer.prepareObjCycles(0);

	assert.equal(renderer.objCycleAllowed[42], 0);
});

test("64x64 affine OBJs charge OAM scan time across intervening entries", () => {
	const renderer = new Renderer();
	renderer.clear({ SIZE_VRAM: 0x18000, SIZE_OAM: 0x400 });
	renderer.writeDisplayControl(0x1000 | 0x0020);

	for (let i = 0; i <= 70; ++i) {
		const largeAffine = i <= 50 && i % 10 === 0;
		renderer.oam.store16(i * 8, largeAffine ? 0x0100 : 0x0200);
		renderer.oam.store16(i * 8 + 2, largeAffine ? 0xc000 : 0);
		renderer.oam.store16(i * 8 + 4, 0);
	}
	// The last entry is an ordinary 8x8 OBJ after six 64x64 affine OBJs.
	renderer.oam.store16(70 * 8, 0);
	renderer.oam.store16(70 * 8 + 2, 0);
	renderer.oam.store16(70 * 8 + 4, 0);

	renderer.prepareObjCycles(0);

	assert.equal(renderer.objCycleAllowed[50], 1);
	assert.equal(renderer.objCycleAllowed[70], 0);
});

test("double-size affine OBJs wrap their tail to the top of the screen", () => {
	function render(y, line = 0) {
		const renderer = new Renderer();
		renderer.clear({ SIZE_VRAM: 0x18000, SIZE_OAM: 0x400 });
		renderer.setBacking({ data: new Uint8ClampedArray(240 * 160 * 4) });
		renderer.writeDisplayControl(0x1000);
		renderer.palette.store16(0x202, 0x001f);
		// A zero matrix samples the center texel throughout the output field.
		renderer.oam.store16(0, y | 0x0100 | 0x0200);
		renderer.oam.store16(2, 0xc000);
		renderer.oam.store16(4, 0);
		renderer.oam.store16(6, 0);
		renderer.oam.store16(14, 0);
		renderer.oam.store16(22, 0);
		renderer.oam.store16(30, 0);
		renderer.vram.store32(0x10000 + (132 << 5), 0x11111111);

		renderer.drawScanline(line);
		return renderer.pixelData.data[line * 240 * 4];
	}

	assert.equal(render(129), 248);
	// At Y=128 the field ends exactly at line 256 and has no wrapped tail.
	assert.equal(render(128), 0);
	// At Y=159, the wrapped tail covers lines 0..30 and stops at line 31.
	assert.equal(render(159, 30), 248);
	assert.equal(render(159, 31), 0);
});

test("2D-mapped OBJs wrap horizontal tile fetches within each VRAM row", () => {
	function lastTileFetched({ affine, line, multipalette, oneDimensional }) {
		const tiles = [];
		const video = {
			HORIZONTAL_PIXELS: 240,
			LAYER_OBJ: 4,
			TARGET1_MASK: 0x10,
			OBJWIN_MASK: 0x20,
			target1: new Array(6).fill(0),
			target2: new Array(6).fill(0),
			blendMode: 0,
			alphaEnabled: false,
			objCharacterMapping: oneDimensional,
			objMosaicX: 1,
			objMosaicY: 1,
			accessTile(_base, tile) {
				tiles.push(tile);
				return 0;
			}
		};
		const obj = new OBJ({ video }, 0);
		obj.x = 0;
		obj.y = 0;
		obj.cachedWidth = 16;
		obj.cachedHeight = 16;
		obj.tileBase = 63;
		obj.disable = false;
		obj.multipalette = multipalette;
		obj.scalerotOam = { a: 1, b: 0, c: 0, d: 1 };
		obj.pushPixel = () => {};

		if (affine) {
			obj.drawScanlineAffine(null, line, 0, 0, 16);
		} else {
			obj.drawScanlineNormal(null, line, 0, 0, 16);
		}
		return tiles[tiles.length - 1];
	}

	for (const affine of [false, true]) {
		for (const multipalette of [false, true]) {
			for (const line of [0, 8]) {
				assert.equal(
					lastTileFetched({ affine, line, multipalette, oneDimensional: false }),
					line === 0 ? 32 : 64,
					`2D ${affine ? "affine" : "normal"} ${multipalette ? "8bpp" : "4bpp"} line ${line}`
				);
			}
		}
	}
	assert.equal(
		lastTileFetched({ affine: false, line: 0, multipalette: false, oneDimensional: true }),
		64,
		"1D mapping remains linear"
	);
	assert.equal(
		lastTileFetched({ affine: false, line: 8, multipalette: false, oneDimensional: true }),
		66,
		"1D mapping advances to the next tile row"
	);
});

test("clipped 8bpp OBJ scanlines start from the correct half of the tile row", () => {
	const accessedBases = [];
	const accessedTiles = [];
	const video = {
		HORIZONTAL_PIXELS: 240,
		LAYER_OBJ: 4,
		TARGET1_MASK: 0x10,
		target1: new Array(6).fill(0),
		target2: new Array(6).fill(0),
		blendMode: 0,
		alphaEnabled: false,
		objCharacterMapping: false,
		objMosaicX: 1,
		accessTile(base, tile) {
			accessedBases.push(base);
			accessedTiles.push(tile);
			return base;
		}
	};
	const obj = new OBJ({ video }, 0);
	obj.x = 0;
	obj.cachedWidth = 16;
	obj.cachedHeight = 8;
	obj.multipalette = true;
	obj.tileBase = 5;
	obj.disable = false;
	obj.pushPixel = (_layer, _map, _video, row, _x, _offset) => row;

	obj.drawScanlineNormal(null, 0, 0, 5, 12);

	assert.equal(accessedBases[0], obj.TILE_OFFSET + 4);
	assert.equal(accessedTiles[0], 4);
	assert.ok(accessedTiles.every((tile) => !(tile & 1)));
});

test("8bpp affine OBJ rendering ignores the low tile-number bit", () => {
	const accessedTiles = [];
	const video = {
		HORIZONTAL_PIXELS: 240,
		LAYER_OBJ: 4,
		target1: new Array(6).fill(0),
		target2: new Array(6).fill(0),
		blendMode: 0,
		alphaEnabled: false,
		objCharacterMapping: false,
		objMosaicX: 1,
		objMosaicY: 1,
		accessTile(_base, tile) {
			accessedTiles.push(tile);
			return 0;
		}
	};
	const obj = new OBJ({ video }, 0);
	obj.x = 0;
	obj.cachedWidth = 8;
	obj.cachedHeight = 8;
	obj.multipalette = true;
	obj.tileBase = 5;
	obj.scalerotOam = { a: 0, b: 0, c: 0, d: 0 };
	obj.pushPixel = () => {};

	obj.drawScanlineAffine(null, 4, 0, 0, 8);

	assert.ok(accessedTiles.length > 0);
	assert.ok(accessedTiles.every((tile) => !(tile & 1)));
});

test("OBJ pixels wrap across the left edge without losing the visible tile tail", () => {
	const renderer = new Renderer();
	renderer.clear({ SIZE_VRAM: 0x18000, SIZE_OAM: 0x400 });
	renderer.setBacking({ data: new Uint8ClampedArray(240 * 160 * 4) });
	renderer.writeDisplayControl(0x1000);
	renderer.palette.store16(0x202, 0x001f);
	for (let row = 0; row < 8; ++row) {
		renderer.vram.store32(0x10000 + row * 4, 0x11111111);
	}
	renderer.oam.store16(0, 0);
	const obj = renderer.oam.objs[0];
	for (let x = 0; x < 512; ++x) {
		renderer.oam.store16(2, x);
		renderer.drawScanline(0);
		const screenX = x >= 256 ? x - 512 : x;
		const visibleStart = Math.max(0, screenX);
		const visibleEnd = Math.min(
			renderer.HORIZONTAL_PIXELS,
			screenX + obj.cachedWidth
		);
		for (let pixel = 0; pixel < 240; ++pixel) {
			const expected =
				pixel >= visibleStart && pixel < visibleEnd ? 248 : 0;
			assert.equal(renderer.pixelData.data[pixel * 4], expected);
		}
	}
});

test("wide OBJ pixels wrap cleanly at the left and right screen edges", () => {
	const renderer = new Renderer();
	renderer.clear({ SIZE_VRAM: 0x18000, SIZE_OAM: 0x400 });
	renderer.setBacking({ data: new Uint8ClampedArray(240 * 160 * 4) });
	renderer.writeDisplayControl(0x1000);
	renderer.palette.store16(0x202, 0x001f);
	for (let offset = 0; offset < 0x800; offset += 4) {
		renderer.vram.store32(0x10000 + offset, 0x11111111);
	}
	renderer.oam.store16(0, 0);
	renderer.oam.store16(2, 3 << 14);
	renderer.oam.store16(4, 0);

	for (const x of [0, 1, 230, 233, 239, 240, 255, 256, 447, 448, 449, 495, 496, 503, 504, 511]) {
		renderer.oam.store16(2, x | (3 << 14));
		renderer.drawScanline(0);
		const screenX = x >= 256 ? x - 512 : x;
		const visibleStart = Math.max(0, screenX);
		const visibleEnd = Math.min(renderer.HORIZONTAL_PIXELS, screenX + 64);
		for (let pixel = 0; pixel < renderer.HORIZONTAL_PIXELS; ++pixel) {
			const expected = pixel >= visibleStart && pixel < visibleEnd ? 248 : 0;
			assert.equal(
				renderer.pixelData.data[pixel * 4],
				expected,
				`wide OBJ at OAM x=${x}, screen x=${pixel}`
			);
		}
	}
});

test("RTC encodes every hour correctly in 12-hour and 24-hour modes", () => {
	const rtc = new RTC({});
	for (let hour = 0; hour < 24; ++hour) {
		const date = new Date(2024, 0, 2, hour, 34, 56);
		rtc.control = 0x40;
		rtc.updateClock(date);
		assert.equal(
			rtc.time[4],
			rtc.bcd(hour),
			`24-hour mode at hour ${hour}`
		);

		rtc.control = 0;
		rtc.updateClock(date);
		const expected12Hour =
			rtc.bcd(hour % 12) | (hour >= 12 ? 0x80 : 0);
		assert.equal(
			rtc.time[4],
			expected12Hour,
			`12-hour mode at hour ${hour}`
		);
	}
});

test("RTC control writes preserve the documented writable bits", () => {
	const rtc = new RTC({});
	rtc.command = 4;
	rtc.bits = 0x6a;
	rtc.bytesRemaining = 1;
	rtc.processByte();

	assert.equal(rtc.control, 0x6a);
	rtc.command = 4;
	assert.equal(rtc.sioOutputPin(), 0);
	rtc.bitsRead = 1;
	assert.equal(rtc.sioOutputPin(), 1);
});

test("RTC read commands are not mistaken for CPU-to-RTC data", () => {
	const outputPins = [];
	const rtc = new RTC({ outputPins: (pins) => outputPins.push(pins) });
	rtc.transferStep = 2;
	rtc.command = 4;
	rtc.reading = 0x80;
	rtc.direction = 2;
	rtc.control = 0x40;
	rtc.bytesRemaining = 1;

	rtc.setPins(5);
	assert.deepEqual(outputPins, [5]);
	assert.equal(rtc.bitsRead, 1);
});

test("RTC chip-select aborts low-clock transfers and allows a clean restart", () => {
	const outputPins = [];
	const rtc = new RTC({ outputPins: (pins) => outputPins.push(pins) });
	rtc.transferStep = 2;
	rtc.command = 4;
	rtc.bitsRead = 3;
	rtc.bytesRemaining = 1;

	rtc.setPins(0);
	assert.equal(rtc.transferStep, 0);
	assert.equal(rtc.command, -1);
	assert.equal(rtc.bitsRead, 0);
	assert.equal(rtc.bytesRemaining, 0);
	assert.equal(outputPins.at(-1), 2);

	rtc.setPins(1);
	assert.equal(rtc.transferStep, 1);
	rtc.setPins(5);
	assert.equal(rtc.transferStep, 2);
});

test("GPIO readback keeps direction and control registers independent", () => {
	const rom = { view: new DataView(new ArrayBuffer(0x100)) };
	const gpio = new GPIO({}, rom);

	gpio.store16(0xc8, 1);
	assert.equal(rom.view.getUint16(0xc8, true), 1);

	gpio.store16(0xc6, 7);
	assert.equal(rom.view.getUint16(0xc6, true), 7);
	gpio.store16(0xc6, 1);
	assert.equal(rom.view.getUint16(0xc6, true), 1);
});

test("RTC encodes two-digit years and Sunday-based weekday numbers", () => {
	const rtc = new RTC({});
	const sunday = new Date(2024, 0, 7, 12, 0, 0);
	rtc.updateClock(sunday);
	assert.equal(rtc.time[0], 0x24);
	assert.equal(rtc.time[3], 0);

	const monday = new Date(2024, 0, 8, 12, 0, 0);
	rtc.updateClock(monday);
	assert.equal(rtc.time[0], 0x24);
	assert.equal(rtc.time[3], 1);

	const lastYear = new Date(1999, 11, 31, 12, 0, 0);
	rtc.updateClock(lastYear);
	assert.equal(rtc.time[0], 0x99);
	assert.equal(rtc.time[3], 5);
});
