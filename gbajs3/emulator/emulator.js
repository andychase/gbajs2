class GameBoyAdvanceEmulator {
	constructor(emulator = 'mGBA', canvas_id = 'screen') {
		this.emulator = null;
		switch (emulator) {
			case 'mGBA':
				this.emulator = new mGBAEmulator(canvas_id);
				break;
			case 'gbajs':
				this.emulator = new GBAJsEmulator(canvas_id);
				break;
			default:
				return { invalid: true, errors: ['Unknown emulator'] };
		}

		if (!this.emulator || this.emulator.invalid) {
			return {
				invalid: true,
				errors: [
					'Error instanciating emulator fo type: ' + emulator
				].concat(this.emulator.errors)
			};
		}
	}

	// interface for emulators:
	// required methods
	Run(file, callback = null) {
		this.emulator.run(file, callback);
	}

	LoadSave(file) {
		this.emulator.loadSave(file);
	}

	IsRunning() {
		return this.emulator.getIsRunning();
	}

	Pause() {
		this.emulator.pause();
	}

	Resume() {
		this.emulator.resume();
	}

	GetPaused() {
		return this.emulator.getPaused();
	}

	SetVolume(percent_value) {
		this.emulator.setVolume(percent_value);
	}

	GetVolume() {
		return this.emulator.getVolume();
	}

	SetPixelated(pixelated) {
		this.emulator.setPixelated(pixelated);
	}

	Reset() {
		return this.emulator.reset();
	}

	QuickReload() {
		return this.emulator.quickReload();
	}

	DownloadSave(filename) {
		this.emulator.downloadSave(filename);
	}

	GetCurrentSave() {
		return this.emulator.getCurrentSave();
	}

	EnableKeyboardInput() {
		this.emulator.enableKeyboardInput();
	}

	DisableKeyboardInput() {
		this.emulator.disableKeyboardInput();
	}

	SimulateKeyDown(keycode) {
		this.emulator.simulateKeyDown(keycode);
	}

	SimulateKeyUp(keycode) {
		this.emulator.simulateKeyUp(keycode);
	}

	RemapKeyBinding(name, keyBindingCode, keybindingName) {
		this.emulator.remapKeyBinding(name, keyBindingCode, keybindingName);
	}

	SetFastForward(mode, value) {
		this.emulator.setFastForward(mode, value);
	}

	ScreenShot() {
		this.emulator.screenShot();
	}

	DefaultKeyBindings() {
		return this.emulator.defaultKeyBindings();
	}

	// optional methods
	QuitGame() {
		if (this.emulatorCan('quitGame')) {
			this.emulator.quitGame();
		}
	}

	QuitEmulator() {
		if (this.emulatorCan('quitEmulator')) {
			this.emulator.quitEmulator();
		}
	}

	EnableDebug() {
		if (this.emulatorCan('enableDebug')) {
			this.emulator.enableDebug();
		}
	}

	IsDebugActive() {
		if (this.emulatorCan('isDebugActive')) {
			return this.emulator.isDebugActive();
		}
		return false;
	}

	AudioPolyfill(callback = null) {
		if (this.emulatorCan('audioPolyfill')) {
			this.emulator.audioPolyfill(callback);
		}
	}

	LCDFade() {
		if (this.emulatorCan('lcdFade')) {
			this.emulator.lcdFade();
		}
	}

	CreateSaveState(slot) {
		if (this.emulatorCan('createSaveState')) {
			return this.emulator.createSaveState(slot);
		}
		return false;
	}

	ListSaveStates() {
		if (this.emulatorCan('listSaveStates')) {
			return this.emulator.listSaveStates();
		}
		return [];
	}

	LoadSaveState(slot) {
		if (this.emulatorCan('loadSaveState')) {
			return this.emulator.loadSaveState(slot);
		}
		return false;
	}

	DeleteSaveState(slot) {
		if (this.emulatorCan('deleteSaveState')) {
			this.emulator.deleteSaveState(slot);
		}
	}

	LoadCheatsFile(file) {
		if (this.emulatorCan('loadCheatsFile')) {
			this.emulator.loadCheatsFile(file);
		}
	}

	GetCurrentCheatsFile() {
		if (this.emulatorCan('getCurrentCheatsFile')) {
			return this.emulator.getCurrentCheatsFile();
		}
		return false;
	}

	GetCurrentCheatsFileName() {
		if (this.emulatorCan('getCurrentCheatsFileName')) {
			return this.emulator.getCurrentCheatsFileName();
		}
		return false;
	}

	ParseCheatsString(cheatsStr) {
		if (this.emulatorCan('parseCheatsString')) {
			return this.emulator.parseCheatsString(cheatsStr);
		}
		return false;
	}

	// helpers
	emulatorCan(methodname) {
		if (this.emulator) {
			return typeof this.emulator[methodname] === 'function';
		}
		return false;
	}
}
