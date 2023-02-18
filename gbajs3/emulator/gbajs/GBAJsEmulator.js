class GBAJsEmulator {
	constructor(canvas_id) {
		this.gba = null;
		this.runCommands = [];
		this.debug = null;
		this.isRunning = false;

		try {
			this.gba = new GameBoyAdvance();
			this.gba.keypad.eatInput = true;
			this.gba.setLogger(function (level, error) {
				console.log(error);
				this.gba.pause();
				let screen = document.getElementById(canvas_id);
				if (screen.getAttribute('class') === 'dead') {
					console.log(
						'We appear to have crashed multiple times without reseting.'
					);
					return;
				}
				let crash = document.createElement('img');
				crash.setAttribute('id', 'crash');
				crash.setAttribute('src', 'resources/crash.png');
				screen.parentElement.insertBefore(crash, screen);
				screen.setAttribute('class', 'dead');
			});

			// run initialization
			if (this.gba && FileReader) {
				let canvas = document.getElementById(canvas_id);
				this.gba.setCanvas(canvas);

				this.gba.logLevel = this.gba.LOG_ERROR;

				this.gba.setBios(biosBin);
			} else {
				throw new Error('GBA/FileReader do not exist, exiting');
			}
		} catch (exception) {
			this.gba = null;
			this.invalid = true;
			this.errors = ['exception loading gba:' + exception];
			console.log('exception loading gba:' + exception);
		}
	}

	// interface for emulators:
	// required methods
	run(file, callback) {
		var that = this;
		this.gba.loadRomFromFile(file, function (result) {
			if (result) {
				for (let i = 0; i < that.runCommands.length; ++i) {
					that.runCommands[i]();
				}
				that.runCommands = [];
				that.gba.runStable();
				that.isRunning = true;
			}
			callback(result);
		});
	}

	loadSave(file) {
		var that = this;
		this.runCommands.push(function () {
			that.gba.loadSavedataFromFile(file);
			$('#saveloader').val('');
		});
	}

	pause() {
		if (this.debug && this.debug.gbaCon) {
			this.debug.gbaCon.pause();
		} else {
			this.gba.pause();
		}
	}

	resume() {
		if (this.debug && this.debug.gbaCon) {
			this.debug.gbaCon.run();
		} else {
			this.gba.runStable();
		}
	}

	getPaused() {
		return this.gba.paused;
	}

	getIsRunning() {
		return this.isRunning;
	}

	setVolume(percent_value) {
		this.gba.audio.masterVolume = Math.pow(2, percent_value) - 1;
	}

	getVolume() {
		return this.gba.audio.masterVolume;
	}

	setPixelated(pixelated) {
		let canvas = document.getElementById('screen');
		let context = canvas.getContext('2d');
		if (context) {
			context.imageSmoothingEnabled = !pixelated;
		}
	}

	reset() {
		let hasCrashed = false;

		this.gba.pause();
		this.gba.reset();
		this.isRunning = false;

		let crash = document.getElementById('crash');
		if (crash) {
			let context = this.gba.targetCanvas.getContext('2d');
			context.clearRect(0, 0, 480, 320);
			this.gba.video.drawCallback();
			crash.parentElement.removeChild(crash);
			let canvas = document.getElementById('screen');
			canvas.removeAttribute('class');
			hasCrashed = true;
		}
		return hasCrashed;
	}

	quickReload() {
		return false; //network reload always required, maybe in the future
	}

	downloadSave(filename) {
		this.gba.downloadSavedata(filename);
	}

	getCurrentSave() {
		var sram = this.gba.mmu.save;
		if (!sram) {
			return false;
		}
		return sram.buffer;
	}

	enableKeyboardInput() {
		// disables early exit in gbajs
		this.gba.keypad.keymodalactive = false;
	}

	disableKeyboardInput() {
		// enables early exit in gbajs,
		// true implies another modal is active
		this.gba.keypad.keymodalactive = true;
	}

	simulateKeyDown(keyId) {
		var keycode = this.gba.keypad.getKeyCodeValue(keyId.toUpperCase());
		this.gba.keypad.keyboardHandler(
			new KeyboardEvent('keydown', {
				keyCode: keycode,
				which: keycode,
				shiftKey: false,
				ctrlKey: false,
				metaKey: false
			})
		);
	}

	simulateKeyUp(keyId) {
		var keycode = this.gba.keypad.getKeyCodeValue(keyId.toUpperCase());
		this.gba.keypad.keyboardHandler(
			new KeyboardEvent('keyup', {
				keyCode: keycode,
				which: keycode,
				shiftKey: false,
				ctrlKey: false,
				metaKey: false
			})
		);
	}

	remapKeyBinding(name, keyBindingCode, _keybindingName) {
		var keycode = parseFloat(keyBindingCode);
		if (!Number.isNaN(keycode)) {
			this.gba.keypad.remapKeycode(name.toUpperCase(), keycode);
		}
	}

	setFastForward(mode = null, value) {
		// 0 or 16 are the common defaults
		if (!this.gba.paused) {
			this.gba.pause();
			clearTimeout(this.gba.queue);
			this.gba.throttle = value;
			this.gba.runStable();
		} else {
			this.gba.throttle = value;
		}
	}

	screenShot() {
		var resizedCanvas = document.createElement('canvas');
		$(resizedCanvas).addClass('pixelatedCanvas');
		var resizedContext = resizedCanvas.getContext('2d');
		resizedContext.mozImageSmoothingEnabled = false;
		resizedContext.webkitImageSmoothingEnabled = false;
		resizedContext.msImageSmoothingEnabled = false;
		resizedContext.imageSmoothingEnabled = false;

		resizedCanvas.height = $('#screenwrapper').height();
		resizedCanvas.width = $('#screenwrapper').width();

		var screen = document.getElementById('screen');
		resizedContext.drawImage(
			screen,
			0,
			0,
			resizedCanvas.width,
			resizedCanvas.height
		);

		let data = resizedCanvas.toDataURL();
		let image = new Image();
		image.src = data;
		let w = window.open('');
		w.document.write(image.outerHTML);
	}

	// optional methods
	quitGame() {
		this.reset(); //vancise hmmm
	}

	quitEmulator() {}

	// chrome will pause audio due to their autoplay policy changes
	// this is a simple way around this, this function will resume the
	// audio context and should be used within a user gesture
	audioPolyfill(callback = null) {
		if (
			typeof this.gba === 'undefined' ||
			typeof this.gba.audio === 'undefined' ||
			typeof this.gba.audio.context === 'undefined'
		) {
			return;
		}
		if (this.gba.audio.context.state == 'suspended') {
			this.gba.audio.context.resume();
		}
		if (this.gba.audio.context.state == 'running' && callback) {
			// run user provided callback, usually for removing gesture
			callback();
		}
	}

	// uses 2d canvas context
	lcdFade() {
		let context = this.gba.context;
		let target = this.gba.targetCanvas.getContext('2d');
		let callback = this.gba.video.drawCallback;

		let i = 0;
		let drawInterval = setInterval(function () {
			i++;
			let pixelData = context.getImageData(0, 0, 240, 160);
			for (let y = 0; y < 160; ++y) {
				for (let x = 0; x < 240; ++x) {
					let xDiff = Math.abs(x - 120);
					let yDiff = Math.abs(y - 80) * 0.8;
					let xFactor = (120 - i - xDiff) / 120;
					let yFactor =
						(80 -
							i -
							(y & 1) * 10 -
							yDiff +
							Math.pow(xDiff, 1 / 2)) /
						80;
					pixelData.data[(x + y * 240) * 4 + 3] *=
						Math.pow(xFactor, 1 / 3) * Math.pow(yFactor, 1 / 2);
				}
			}
			context.putImageData(pixelData, 0, 0);
			target.clearRect(0, 0, 480, 320);
			if (i > 40) {
				clearInterval(drawInterval);
			} else {
				callback();
			}
		}, 50);
	}

	enableDebug() {
		window.gba = this.gba;
		const debugloc = location.protocol + '//' + location.host;
		var that = this;
		window.onmessage = function (message) {
			if (
				message.origin != debugloc &&
				(message.origin != 'file://' || debugloc)
			) {
				console.log('Failed XSS');
				return;
			}
			switch (message.data) {
				case 'connect':
					if (message.source === that.debug) {
						that.debug.postMessage('connect', debugloc || '*');
					}
					break;
				case 'connected':
					break;
				case 'disconnect':
					if (message.source === that.debug) {
						that.debug = null;
					}
			}
		};
		window.onunload = function () {
			if (that.debug && that.debug.postMessage) {
				that.debug.postMessage('disconnect', debugloc || '*');
			}
		};
		if (!this.debug || !this.debug.postMessage) {
			this.debug = window.open('debugger.html', 'debug');
		} else {
			this.debug.postMessage('connect', debugloc || '*');
		}
	}

	isDebugActive() {
		if (this.debug) {
			return true;
		}
		return false;
	}
}
