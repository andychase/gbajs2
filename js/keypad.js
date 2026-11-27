class GameBoyAdvanceKeypad {
	constructor() {
		this.KEYCODE_LEFT = 37;
		this.KEYCODE_UP = 38;
		this.KEYCODE_RIGHT = 39;
		this.KEYCODE_DOWN = 40;
		this.KEYCODE_START = 13;
		this.KEYCODE_SELECT = 220;
		this.KEYCODE_A = 90;
		this.KEYCODE_B = 88;
		this.KEYCODE_L = 65;
		this.KEYCODE_R = 83;

		this.GAMEPAD_LEFT = 14;
		this.GAMEPAD_UP = 12;
		this.GAMEPAD_RIGHT = 15;
		this.GAMEPAD_DOWN = 13;
		this.GAMEPAD_START = 9;
		this.GAMEPAD_SELECT = 8;
		this.GAMEPAD_A = 1;
		this.GAMEPAD_B = 0;
		this.GAMEPAD_L = 4;
		this.GAMEPAD_R = 5;
		this.GAMEPAD_THRESHOLD = 0.2;

		this.A = 0;
		this.B = 1;
		this.SELECT = 2;
		this.START = 3;
		this.RIGHT = 4;
		this.LEFT = 5;
		this.UP = 6;
		this.DOWN = 7;
		this.R = 8;
		this.L = 9;

		this.currentDown = 0x03ff;
		this.keyboardDown = 0x03ff;
		this.gamepadDown = 0x03ff;
		this.eatInput = false;

		this.gamepads = [];

		this.remappingKeyId = "";
	}
	keyboardHandler(e) {
		var toggle = 0;

		// Check for a remapping
		if (this.remappingKeyId != "") {
			this.remapKeycode(this.remappingKeyId, e.keyCode);
			this.remappingKeyId = "";
			e.preventDefault();
			return; // Could do an else and wrap the rest of the function in it, but this is cleaner
		}

		switch (e.keyCode) {
			case this.KEYCODE_START:
				toggle = this.START;
				break;
			case this.KEYCODE_SELECT:
				toggle = this.SELECT;
				break;
			case this.KEYCODE_A:
				toggle = this.A;
				break;
			case this.KEYCODE_B:
				toggle = this.B;
				break;
			case this.KEYCODE_L:
				toggle = this.L;
				break;
			case this.KEYCODE_R:
				toggle = this.R;
				break;
			case this.KEYCODE_UP:
				toggle = this.UP;
				break;
			case this.KEYCODE_RIGHT:
				toggle = this.RIGHT;
				break;
			case this.KEYCODE_DOWN:
				toggle = this.DOWN;
				break;
			case this.KEYCODE_LEFT:
				toggle = this.LEFT;
				break;
			default:
				return;
		}

		toggle = 1 << toggle;
		var previousDown = this.currentDown;
		if (e.type == "keydown") {
			this.keyboardDown &= ~toggle;
		} else {
			this.keyboardDown |= toggle;
		}
		this.updateCurrentDown(previousDown);

		if (this.eatInput) {
			e.preventDefault();
		}
	}
	keyboardBlurHandler() {
		if (this.keyboardDown == 0x03ff) {
			return;
		}
		var previousDown = this.currentDown;
		this.keyboardDown = 0x03ff;
		this.updateCurrentDown(previousDown);
	}
	gamepadHandler(gamepad) {
		var value = 0;
		if (this.isButtonPressed(gamepad.buttons[this.GAMEPAD_LEFT])) {
			value |= 1 << this.LEFT;
		}
		if (this.isButtonPressed(gamepad.buttons[this.GAMEPAD_UP])) {
			value |= 1 << this.UP;
		}
		if (this.isButtonPressed(gamepad.buttons[this.GAMEPAD_RIGHT])) {
			value |= 1 << this.RIGHT;
		}
		if (this.isButtonPressed(gamepad.buttons[this.GAMEPAD_DOWN])) {
			value |= 1 << this.DOWN;
		}
		if (this.isButtonPressed(gamepad.buttons[this.GAMEPAD_START])) {
			value |= 1 << this.START;
		}
		if (this.isButtonPressed(gamepad.buttons[this.GAMEPAD_SELECT])) {
			value |= 1 << this.SELECT;
		}
		if (this.isButtonPressed(gamepad.buttons[this.GAMEPAD_A])) {
			value |= 1 << this.A;
		}
		if (this.isButtonPressed(gamepad.buttons[this.GAMEPAD_B])) {
			value |= 1 << this.B;
		}
		if (this.isButtonPressed(gamepad.buttons[this.GAMEPAD_L])) {
			value |= 1 << this.L;
		}
		if (this.isButtonPressed(gamepad.buttons[this.GAMEPAD_R])) {
			value |= 1 << this.R;
		}

		this.setGamepadDown(~value & 0x3ff);
	}
	isButtonPressed(button) {
		if (typeof button === "number") {
			return button > this.GAMEPAD_THRESHOLD;
		}
		return !!(
			button &&
			(typeof button.pressed === "boolean"
				? button.pressed
				: button.value > this.GAMEPAD_THRESHOLD)
		);
	}
	notifyInputChange(previousDown) {
		if (this.core && this.core.irq) {
			this.core.irq.keypadInputChanged(previousDown, this.currentDown);
		}
	}
	gamepadConnectHandler(gamepad) {
		this.gamepads.push(gamepad && gamepad.gamepad ? gamepad.gamepad : gamepad);
	}
	gamepadDisconnectHandler(gamepad) {
		gamepad = gamepad && gamepad.gamepad ? gamepad.gamepad : gamepad;
		this.gamepads = this.gamepads.filter(function (other) {
			return (
				other !== gamepad &&
				(gamepad.index === undefined || other.index !== gamepad.index)
			);
		});
		if (!this.gamepads.length) {
			this.setGamepadDown(0x03ff);
		}
	}
	pollGamepads() {
		var navigatorList = [];
		var hasGamepadApi = false;
		if (
			typeof navigator !== "undefined" &&
			typeof navigator.webkitGetGamepads == "function"
		) {
			navigatorList = navigator.webkitGetGamepads() || [];
			hasGamepadApi = true;
		} else if (
			typeof navigator !== "undefined" &&
			typeof navigator.getGamepads == "function"
		) {
			navigatorList = navigator.getGamepads() || [];
			hasGamepadApi = true;
		}

		// Let's all give a shout out to Chrome for making us get the gamepads EVERY FRAME
		/* How big of a performance draw is this? Would it be worth letting users know? */
		if (hasGamepadApi) {
			this.gamepads = [];
			for (var i = 0; i < navigatorList.length; ++i) {
				if (navigatorList[i]) {
					this.gamepads.push(navigatorList[i]);
				}
			}
		}
		if (this.gamepads.length > 0) {
			this.gamepadHandler(this.gamepads[0]);
		} else if (hasGamepadApi) {
			this.setGamepadDown(0x03ff);
		}
	}
	setGamepadDown(value) {
		var previousDown = this.currentDown;
		this.gamepadDown = value & 0x03ff;
		this.updateCurrentDown(previousDown);
	}
	updateCurrentDown(previousDown) {
		this.currentDown = this.keyboardDown & this.gamepadDown;
		this.notifyInputChange(previousDown);
	}
	registerHandlers() {
		window.addEventListener(
			"keydown",
			this.keyboardHandler.bind(this),
			true
		);
		window.addEventListener("keyup", this.keyboardHandler.bind(this), true);
		window.addEventListener(
			"blur",
			this.keyboardBlurHandler.bind(this),
			true
		);

		window.addEventListener(
			"gamepadconnected",
			this.gamepadConnectHandler.bind(this),
			true
		);
		window.addEventListener(
			"mozgamepadconnected",
			this.gamepadConnectHandler.bind(this),
			true
		);
		window.addEventListener(
			"webkitgamepadconnected",
			this.gamepadConnectHandler.bind(this),
			true
		);

		window.addEventListener(
			"gamepaddisconnected",
			this.gamepadDisconnectHandler.bind(this),
			true
		);
		window.addEventListener(
			"mozgamepaddisconnected",
			this.gamepadDisconnectHandler.bind(this),
			true
		);
		window.addEventListener(
			"webkitgamepaddisconnected",
			this.gamepadDisconnectHandler.bind(this),
			true
		);
	}
	// keyId is ["A", "B", "SELECT", "START", "RIGHT", "LEFT", "UP", "DOWN", "R", "L"]
	initKeycodeRemap(keyId) {
		// Ensure valid keyId
		var validKeyIds = ["A", "B", "SELECT", "START", "RIGHT", "LEFT", "UP", "DOWN", "R", "L"];
		if (validKeyIds.indexOf(keyId) != -1) {
			/* If remappingKeyId holds a value, the keydown event above will
			wait for the next keypress to assign the keycode */
			this.remappingKeyId = keyId;
		}
	}
	// keyId is ["A", "B", "SELECT", "START", "RIGHT", "LEFT", "UP", "DOWN", "R", "L"]
	remapKeycode(keyId, keycode) {
		switch (keyId) {
			case "A":
				this.KEYCODE_A = keycode;
				break;
			case "B":
				this.KEYCODE_B = keycode;
				break;
			case "SELECT":
				this.KEYCODE_SELECT = keycode;
				break;
			case "START":
				this.KEYCODE_START = keycode;
				break;
			case "RIGHT":
				this.KEYCODE_RIGHT = keycode;
				break;
			case "LEFT":
				this.KEYCODE_LEFT = keycode;
				break;
			case "UP":
				this.KEYCODE_UP = keycode;
				break;
			case "DOWN":
				this.KEYCODE_DOWN = keycode;
				break;
			case "R":
				this.KEYCODE_R = keycode;
				break;
			case "L":
				this.KEYCODE_L = keycode;
				break;
		}
	}
}
