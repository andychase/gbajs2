function hex(number, leading, usePrefix) {
	if (typeof usePrefix === "undefined") {
		usePrefix = true;
	}
	if (typeof leading === "undefined") {
		leading = 8;
	}
	var string = (number >>> 0).toString(16).toUpperCase();
	leading -= string.length;
	if (leading < 0) return string;
	return (usePrefix ? "0x" : "") + new Array(leading + 1).join("0") + string;
}

class Pointer {
	constructor() {
		this.index = 0;
		this.top = 0;
		this.stack = [];
	}
	advance(amount) {
		var index = this.index;
		this.index += amount;
		return index;
	}
	mark() {
		return this.index - this.top;
	}
	push() {
		this.stack.push(this.top);
		this.top = this.index;
	}
	pop() {
		this.top = this.stack.pop();
	}
	readString(view) {
		var length = view.getUint32(this.advance(4), true);
		var bytes = [];
		for (var i = 0; i < length; ++i) {
			bytes.push(String.fromCharCode(view.getUint8(this.advance(1))));
		}
		return bytes.join("");
	}
}

class C_Serializer {
	constructor() {
		this.TAG_INT = 1;
		this.TAG_STRING = 2;
		this.TAG_STRUCT = 3;
		this.TAG_BLOB = 4;
		this.TAG_BOOLEAN = 5;
		this.TYPE = "application/octet-stream";
	}

	pack(value) {
		var object = new DataView(new ArrayBuffer(4));
		object.setUint32(0, value, true);
		return object.buffer;
	}

	pack8(value) {
		var object = new DataView(new ArrayBuffer(1));
		object.setUint8(0, value, true);
		return object.buffer;
	}

	prefix(value) {
		return new Blob(
			[
				Serializer.pack(value.size || value.length || value.byteLength),
				value
			],
			{ type: Serializer.TYPE }
		);
	}

	serialize(stream) {
		var parts = [];
		var size = 4;
		for (var i in stream) {
			if (stream.hasOwnProperty(i)) {
				var tag;
				var head = Serializer.prefix(i);
				var body;
				switch (typeof stream[i]) {
					case "number":
						tag = Serializer.TAG_INT;
						body = Serializer.pack(stream[i]);
						break;
					case "string":
						tag = Serializer.TAG_STRING;
						body = Serializer.prefix(stream[i]);
						break;
					case "object":
						if (stream[i].type == Serializer.TYPE) {
							tag = Serializer.TAG_BLOB;
							body = stream[i];
						} else {
							tag = Serializer.TAG_STRUCT;
							body = Serializer.serialize(stream[i]);
						}
						break;
					case "boolean":
						tag = Serializer.TAG_BOOLEAN;
						body = Serializer.pack8(stream[i]);
						break;
					default:
						console.log(stream[i]);
						break;
				}
				size +=
					1 +
					head.size +
					(body.size || body.byteLength || body.length);
				parts.push(Serializer.pack8(tag));
				parts.push(head);
				parts.push(body);
			}
		}
		parts.unshift(Serializer.pack(size));
		return new Blob(parts);
	}

	deserialize(blob, callback) {
		var reader = new FileReader();
		reader.onload = function (data) {
			callback(
				Serializer.deserealizeStream(
					new DataView(data.target.result),
					new Pointer()
				)
			);
		};
		reader.readAsArrayBuffer(blob);
	}

	deserealizeStream(view, pointer) {
		pointer.push();
		var object = {};
		var remaining = view.getUint32(pointer.advance(4), true);
		while (pointer.mark() < remaining) {
			var tag = view.getUint8(pointer.advance(1));
			var head = pointer.readString(view);
			var body;
			switch (tag) {
				case Serializer.TAG_INT:
					body = view.getUint32(pointer.advance(4), true);
					break;
				case Serializer.TAG_STRING:
					body = pointer.readString(view);
					break;
				case Serializer.TAG_STRUCT:
					body = Serializer.deserealizeStream(view, pointer);
					break;
				case Serializer.TAG_BLOB:
					var size = view.getUint32(pointer.advance(4), true);
					body = view.buffer.slice(
						pointer.advance(size),
						pointer.advance(0)
					);
					break;
				case Serializer.TAG_BOOLEAN:
					body = !!view.getUint8(pointer.advance(1));
					break;
			}
			object[head] = body;
		}
		if (pointer.mark() > remaining) {
			throw "Size of serialized data exceeded";
		}
		pointer.pop();
		return object;
	}

	serializePNG(blob, base, callback) {
		var canvas = document.createElement("canvas");
		var context = canvas.getContext("2d");
		var pixels = base
			.getContext("2d")
			.getImageData(0, 0, base.width, base.height);
		var transparent = 0;
		for (var y = 0; y < base.height; ++y) {
			for (var x = 0; x < base.width; ++x) {
				if (!pixels.data[(x + y * base.width) * 4 + 3]) {
					++transparent;
				}
			}
		}
		var bytesInCanvas =
			transparent * 3 + (base.width * base.height - transparent);
		for (
			var multiplier = 1;
			bytesInCanvas * multiplier * multiplier < blob.size;
			++multiplier
		);
		var edges = bytesInCanvas * multiplier * multiplier - blob.size;
		var padding = Math.ceil(edges / (base.width * multiplier));
		canvas.setAttribute("width", base.width * multiplier);
		canvas.setAttribute("height", base.height * multiplier + padding);

		var reader = new FileReader();
		reader.onload = function (data) {
			var view = new Uint8Array(data.target.result);
			var pointer = 0;
			var pixelPointer = 0;
			var newPixels = context.createImageData(
				canvas.width,
				canvas.height + padding
			);
			for (var y = 0; y < canvas.height; ++y) {
				for (var x = 0; x < canvas.width; ++x) {
					var oldY = (y / multiplier) | 0;
					var oldX = (x / multiplier) | 0;
					if (
						oldY > base.height ||
						!pixels.data[(oldX + oldY * base.width) * 4 + 3]
					) {
						newPixels.data[pixelPointer++] = view[pointer++];
						newPixels.data[pixelPointer++] = view[pointer++];
						newPixels.data[pixelPointer++] = view[pointer++];
						newPixels.data[pixelPointer++] = 0;
					} else {
						var byte = view[pointer++];
						newPixels.data[pixelPointer++] =
							pixels.data[(oldX + oldY * base.width) * 4 + 0] |
							(byte & 7);
						newPixels.data[pixelPointer++] =
							pixels.data[(oldX + oldY * base.width) * 4 + 1] |
							((byte >> 3) & 7);
						newPixels.data[pixelPointer++] =
							pixels.data[(oldX + oldY * base.width) * 4 + 2] |
							((byte >> 6) & 7);
						newPixels.data[pixelPointer++] =
							pixels.data[(oldX + oldY * base.width) * 4 + 3];
					}
				}
			}
			context.putImageData(newPixels, 0, 0);
			callback(canvas.toDataURL("image/png"));
		};
		reader.readAsArrayBuffer(blob);
		return canvas;
	}

	deserializePNG(blob, callback) {
		var reader = new FileReader();
		reader.onload = function (data) {
			var image = document.createElement("img");
			image.setAttribute("src", data.target.result);
			var canvas = document.createElement("canvas");
			canvas.setAttribute("height", image.height);
			canvas.setAttribute("width", image.width);
			var context = canvas.getContext("2d");
			context.drawImage(image, 0, 0);
			var pixels = context.getImageData(
				0,
				0,
				canvas.width,
				canvas.height
			);
			var data = [];
			for (var y = 0; y < canvas.height; ++y) {
				for (var x = 0; x < canvas.width; ++x) {
					if (!pixels.data[(x + y * canvas.width) * 4 + 3]) {
						data.push(pixels.data[(x + y * canvas.width) * 4 + 0]);
						data.push(pixels.data[(x + y * canvas.width) * 4 + 1]);
						data.push(pixels.data[(x + y * canvas.width) * 4 + 2]);
					} else {
						var byte = 0;
						byte |= pixels.data[(x + y * canvas.width) * 4 + 0] & 7;
						byte |=
							(pixels.data[(x + y * canvas.width) * 4 + 1] & 7) <<
							3;
						byte |=
							(pixels.data[(x + y * canvas.width) * 4 + 2] & 7) <<
							6;
						data.push(byte);
					}
				}
			}
			newBlob = new Blob(
				data.map(function (byte) {
					var array = new Uint8Array(1);
					array[0] = byte;
					return array;
				}),
				{ type: Serializer.TYPE }
			);
			Serializer.deserialize(newBlob, callback);
		};
		reader.readAsDataURL(blob);
	}
}
var Serializer = new C_Serializer();