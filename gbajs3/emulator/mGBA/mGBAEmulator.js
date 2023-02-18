class mGBAEmulator {
	constructor(canvas_id) {
		this.isPaused = false;
		this.isRunning = false;
		this.savePath = '/data/saves/';
		this.romPath = '/data/games/';

		this.module = {
			canvas: (function () {
				return document.getElementById(canvas_id);
			})()
		};

		var that = this;
		mGBA(this.module).then(function (Module) {
			that.version =
				Module.version.projectName +
				' ' +
				Module.version.projectVersion;

			Module.FSInit();
		});
	}

	// interface for emulators:
	// required methods
	run(file, callback) {
		var reader = new FileReader();
		var that = this;
		reader.onload = function (e) {
			that.isRunning = that.loadBuffer(file.name, e.target.result);
			callback(that.isRunning);
		};
		reader.readAsArrayBuffer(file);
	}

	loadSave(file) {
		var reader = new FileReader();
		var that = this;
		reader.onload = function (e) {
			that.writeSav(file.name, e.target.result);
		};
		reader.readAsArrayBuffer(file);
	}

	pause() {
		this.isPaused = true;
		this.module.pauseGame();
	}

	resume() {
		this.isPaused = false;
		this.module.resumeGame();
	}

	getPaused() {
		return this.isPaused;
	}

	getIsRunning() {
		return this.isRunning;
	}

	setVolume(percent_value) {
		this.module.setVolume(percent_value);
	}

	getVolume() {
		return this.module.getVolume();
	}

	setPixelated(_pixelated) {
		$(this.module.canvas).toggleClass('pixelatedCanvas');
	}

	reset() {
		this.quitGame();
		this.isRunning = false;
		return false; //always returns without exception
	}

	quickReload() {
		if (this.isRunning) {
			// reset core based on active save+rom
			this.module.quickReload();
		} else if (this.module.gameName) {
			// try to load the current save/rom name if present in filesystem
			var res = this.module.loadGame(this.module.gameName);
		} else {
			// network reload required
			return false;
		}
		return true;
	}

	downloadSave(filename) {
		//purely for compatability
		var save = this.module.getSave();
		if (window.URL && save) {
			var a = $("<a style='display: none;'/>");
			var url = window.URL.createObjectURL(
				new Blob([save], { type: 'data:application/x-spss-sav' })
			);
			a.attr('href', url);
			a.attr('download', filename);
			$('body').append(a);
			a[0].click();
			window.URL.revokeObjectURL(url);
			a.remove();
		}
	}

	getCurrentSave() {
		return this.module.getSave();
	}

	enableKeyboardInput() {
		this.module.toggleInput(true);
	}

	disableKeyboardInput() {
		this.module.toggleInput(false);
	}

	simulateKeyDown(keyId) {
		this.module.buttonPress(keyId);
	}

	simulateKeyUp(keyId) {
		this.module.buttonUnpress(keyId);
	}

	remapKeyBinding(name, _keyBindingCode, keybindingName) {
		keybindingName = keybindingName.replace(/arrow/gi, ''); //mgba arrow bindings use up, down, left, right
		//handle edge cases
		if (keybindingName === 'Enter') {
			keybindingName = 'Return';
		}

		this.module.bindKey(keybindingName, name);
	}

	setFastForward(mode, value) {
		this.module.setMainLoopTiming(mode, value);
	}

	// we use a webgl canvas context for mgba, implying
	// that we need to re-render and immediately after
	// copy the canvas to avoid an empty buffer
	_copyCanvas() {
		var resizedCanvas = document.createElement('canvas');
		$(resizedCanvas).addClass('pixelatedCanvas');
		var resizedContext = resizedCanvas.getContext('2d');
		resizedContext.mozImageSmoothingEnabled = false;
		resizedContext.webkitImageSmoothingEnabled = false;
		resizedContext.msImageSmoothingEnabled = false;
		resizedContext.imageSmoothingEnabled = false;

		resizedCanvas.height = $('#screenwrapper').height();
		resizedCanvas.width = $('#screenwrapper').width();

		var screen = document
			.getElementById('screen')
			.getContext('webgl').canvas;
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

	// pass the function to copy the canvas to the c code, this
	// will be called immediately after filling the canvas buffers
	screenShot() {
		this.module.screenShot(this._copyCanvas);
	}

	// optional methods
	quitGame() {
		this.module.quitGame();
		this.isPaused = false;
		this.isRunning = false;
	}

	quitEmulator() {
		this.module.quitMgba();
		this.isPaused = false;
		this.isRunning = false;
	}

	// chrome will pause audio due to their autoplay policy changes
	// this is a simple way around this, this function will resume the
	// audio context and should be used within a user gesture
	audioPolyfill(callback = null) {
		if (
			typeof this.module === 'undefined' ||
			typeof this.module.SDL2 == 'undefined' ||
			typeof this.module.SDL2.audioContext == 'undefined'
		)
			return;
		if (this.module.SDL2.audioContext.state == 'suspended') {
			this.module.SDL2.audioContext.resume();
			if ($('#soundSwitchCheckChecked').is(':checked')) {
				this.setVolume($('#volume_slider').val());
			} else {
				this.setVolume(0);
			}
		}
		if (this.module.SDL2.audioContext.state == 'running' && callback) {
			// run user provided callback, usually for removing gesture
			callback();
		}
	}

	// uses webgl canvas context, vancise refactor
	// chatcgpt answer here was trash
	lcdFade() {
		let gl = this.module.canvas.getContext('webgl');

		let i = 0;
		let drawInterval = setInterval(function () {
			i++;
			let pixelData = new Uint8Array(240 * 160 * 4);
			gl.readPixels(0, 0, 240, 160, gl.RGB, gl.UNSIGNED_BYTE, pixelData);
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
					pixelData[(x + y * 240) * 4 + 3] *=
						Math.pow(xFactor, 1 / 3) * Math.pow(yFactor, 1 / 2);
				}
			}
			// create and bind the buffer
			let buffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
			gl.bufferData(gl.ARRAY_BUFFER, pixelData, gl.STATIC_DRAW);

			// create the vertex shader
			let vertexShader = gl.createShader(gl.VERTEX_SHADER);
			gl.shaderSource(
				vertexShader,
				`
	      attribute vec2 a_position;
	      attribute vec2 a_texCoord;
	      uniform mat3 u_matrix;
	      varying vec2 v_texCoord;
	      void main() {
	        gl_Position = vec4((u_matrix * vec3(a_position, 1)).xy, 0, 1);
	        v_texCoord = a_texCoord;
	      }
	    `
			);
			gl.compileShader(vertexShader);

			// create the fragment shader
			let fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
			gl.shaderSource(
				fragmentShader,
				`
	      precision mediump float;
	      uniform sampler2D u_image;
	      varying vec2 v_texCoord;
	      void main() {
	        gl_FragColor = texture2D(u_image, v_texCoord);
	      }
	    `
			);
			gl.compileShader(fragmentShader);

			// create and link the program
			let program = gl.createProgram();
			gl.attachShader(program, vertexShader);
			gl.attachShader(program, fragmentShader);
			gl.linkProgram(program);
			gl.useProgram(program);

			// set the attributes and uniforms
			let positionLocation = gl.getAttribLocation(program, 'a_position');
			gl.enableVertexAttribArray(positionLocation);
			gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 16, 0);
			let texCoordLocation = gl.getAttribLocation(program, 'a_texCoord');
			gl.enableVertexAttribArray(texCoordLocation);
			gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 16, 8);
			let matrixLocation = gl.getUniformLocation(program, 'u_matrix');
			gl.uniformMatrix3fv(matrixLocation, false, [
				2 / 240,
				0,
				0,
				0,
				-2 / 160,
				0,
				-1,
				1,
				1
			]);
			let imageLocation = gl.getUniformLocation(program, 'u_image');
			gl.uniform1i(imageLocation, 0);
			// create the texture
			let texture = gl.createTexture();
			gl.bindTexture(gl.TEXTURE_2D, texture);
			gl.texParameteri(
				gl.TEXTURE_2D,
				gl.TEXTURE_WRAP_S,
				gl.CLAMP_TO_EDGE
			);
			gl.texParameteri(
				gl.TEXTURE_2D,
				gl.TEXTURE_WRAP_T,
				gl.CLAMP_TO_EDGE
			);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
			gl.texImage2D(
				gl.TEXTURE_2D,
				0,
				gl.RGBA,
				240,
				160,
				0,
				gl.RGBA,
				gl.UNSIGNED_BYTE,
				pixelData
			);

			// draw the texture
			gl.drawArrays(gl.TRIANGLES, 0, 6);
			//target.clearRect(0, 0, 480, 320);
			//gl.clear(gl.CLEAR_BUFFER_BIT);
			if (i > 40) {
				clearInterval(drawInterval);
			} else {
				//callback();
			}
		}, 50);
	}

	//EnterCheat(cheat_code) {
	//
	//}

	//ToggleCheat(cheat_name) { //desired params? id or string??
	//
	//}

	//EnableDebug() {
	//
	//}

	//helpers
	writeSav(name, buffer) {
		var res = this.module.FS.writeFile(
			this.savePath + name,
			new Uint8Array(buffer)
		);
		return res;
	}

	loadBuffer(name, buffer) {
		var filepath = this.romPath + name;
		this.module.FS.writeFile(filepath, new Uint8Array(buffer));
		var res = this.module.loadGame(filepath);

		return res;
	}
}
