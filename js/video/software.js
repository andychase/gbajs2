class MemoryAligned16 {
	constructor(size) {
		this.buffer = new Uint16Array(size >> 1);
		this.ICACHE_PAGE_BITS = 8;
		this.PAGE_MASK = (2 << this.ICACHE_PAGE_BITS) - 1;
		this.icache = new Array(size >> (this.ICACHE_PAGE_BITS + 1));
	}
	load8(offset) {
		return (this.loadU8(offset) << 24) >> 24;
	}
	load16(offset) {
		return (this.loadU16(offset) << 16) >> 16;
	}
	loadU8(offset) {
		var index = offset >> 1;
		if (offset & 1) {
			return (this.buffer[index] & 0xFF00) >>> 8;
		}
		else {
			return this.buffer[index] & 0x00FF;
		}
	}
	loadU16(offset) {
		return this.buffer[offset >> 1];
	}
	load32(offset) {
		var alignedOffset = offset & ~3;
		var value = this.loadU16(alignedOffset) | (this.loadU16(alignedOffset + 2) << 16);
		var rotate = (offset & 3) << 3;
		return (value >>> rotate) | (value << (32 - rotate));
	}
	store8(offset, value) {
		var index = offset >> 1;
		this.store16(offset, (value << 8) | value);
	}
	store16(offset, value) {
		this.buffer[offset >> 1] = value;
	}
	store32(offset, value) {
		var alignedOffset = offset & ~3;
		this.store16(alignedOffset, value & 0xFFFF);
		this.store16(alignedOffset + 2, value >>> 16);
	}
	insert(start, data) {
		this.buffer.set(data, start);
	}
	invalidatePage(address) {
		var page =
			this.icache[
				(address % this.buffer.byteLength) >>
					(this.ICACHE_PAGE_BITS + 1)
			];
		if (page) {
			page.invalid = true;
		}
	}
};

class GameBoyAdvanceVRAM extends MemoryAligned16 {
	constructor(size) {
		super(size);
		this.vram = this.buffer;
	}
	normalizeOffset(offset) {
		offset &= 0x0001ffff;
		return offset >= 0x00018000 ? offset - 0x00008000 : offset;
	}
	loadU8(offset) {
		return super.loadU8(this.normalizeOffset(offset));
	}
	loadU16(offset) {
		return super.loadU16(this.normalizeOffset(offset));
	}
	load32(offset) {
		return super.load32(this.normalizeOffset(offset));
	}
	store16(offset, value) {
		return super.store16(this.normalizeOffset(offset), value);
	}
	store8(offset, value) {
		var normalized = this.normalizeOffset(offset);
		var mode = this.video ? this.video.backgroundMode : 0;
		var objStart = mode >= 3 && mode <= 5 ? 0x14000 : 0x10000;
		if (normalized < objStart) {
			super.store8(normalized, value);
		}
	}
	store32(offset, value) {
		return super.store32(this.normalizeOffset(offset), value);
	}
};

class GameBoyAdvanceOAM extends MemoryAligned16 {
	constructor(size) {
		super(size);
		this.oam = this.buffer;
		this.objs = new Array(128);
		for (var i = 0; i < 128; ++i) {
			this.objs[i] = new GameBoyAdvanceOBJ(this, i);
		}
		// A zero-filled OAM buffer does not match the default derived OBJ state
		// (OBJ attributes of zero describe an enabled 8x8 OBJ), so the first
		// overwrite must decode every attribute before unchanged words are skipped.
		this.initialized = false;
		this.writeEpoch = 0;
		this.writeVersions = new Uint32Array(size >> 1);
		this.scalerot = new Array(32);
		for (var i = 0; i < 32; ++i) {
			this.scalerot[i] = {
				a: 1,
				b: 0,
				c: 0,
				d: 1
			};
		}
	}
	store8(offset, value) {
		// OAM is 16-bit write-only on the GBA bus; byte writes are ignored.
	}
	overwrite(memory) {
		for (var i = 0; i < (this.buffer.byteLength >> 1); ++i) {
			if (!this.initialized || this.buffer[i] !== memory[i]) {
				this.store16(i << 1, memory[i]);
			}
		}
		this.initialized = true;
	}
	store16(offset, value) {
		var wordIndex = (offset & 0x3FF) >> 1;
		this.writeVersions[wordIndex] = ++this.writeEpoch;
		var index = (offset & 0x3F8) >> 3;
		var obj = this.objs[index];
		var scalerot = this.scalerot[index >> 2];
		var layer = obj.priority;
		var disable = obj.disable;
		var y = obj.y;
		switch (offset & 0x00000006) {
			case 0:
				// Attribute 0
				obj.y = value & 0x00FF;
				var wasScalerot = obj.scalerot;
				obj.scalerot = value & 0x0100;
				if (obj.scalerot) {
					obj.scalerotOam = this.scalerot[obj.scalerotParam];
					obj.doublesize = !!(value & 0x0200);
					obj.disable = 0;
					obj.hflip = 0;
					obj.vflip = 0;
				}
				else {
					obj.doublesize = false;
					obj.disable = value & 0x0200;
					if (wasScalerot) {
						obj.hflip = obj.scalerotParam & 0x0008;
						obj.vflip = obj.scalerotParam & 0x0010;
					}
				}
				obj.mode = (value & 0x0C00) >> 6; // This lines up with the stencil format
				obj.mosaic = value & 0x1000;
				obj.multipalette = value & 0x2000;
				obj.shape = (value & 0xC000) >> 14;

				obj.recalcSize();
				break;
			case 2:
				// Attribute 1
				obj.x = value & 0x01FF;
				if (obj.scalerot) {
					obj.scalerotParam = (value & 0x3E00) >> 9;
					obj.scalerotOam = this.scalerot[obj.scalerotParam];
					obj.hflip = 0;
					obj.vflip = 0;
					obj.drawScanline = obj.drawScanlineAffine;
				}
				else {
					obj.hflip = value & 0x1000;
					obj.vflip = value & 0x2000;
					obj.drawScanline = obj.drawScanlineNormal;
				}
				obj.size = (value & 0xC000) >> 14;

				obj.recalcSize();
				break;
			case 4:
				// Attribute 2
				obj.tileBase = value & 0x03FF;
				obj.priority = (value & 0x0C00) >> 10;
				obj.palette = (value & 0xF000) >> 8; // This is shifted up 4 to make pushPixel faster
				break;
			case 6:
				// Scaling/rotation parameter
				switch (index & 0x3) {
					case 0:
						scalerot.a = (value << 16) / 0x1000000;
						break;
					case 1:
						scalerot.b = (value << 16) / 0x1000000;
						break;
					case 2:
						scalerot.c = (value << 16) / 0x1000000;
						break;
					case 3:
						scalerot.d = (value << 16) / 0x1000000;
						break;
				}
				break;
			}
			if (obj.shape == 3) {
				// Shape 3 is reserved by the GBA; do not reuse dimensions from a
				// previous valid shape and accidentally render this OBJ.
				obj.disable = 1;
			}

			MemoryAligned16.prototype.store16.call(this, offset, value);
		}
}
;

GameBoyAdvanceOAM.prototype = Object.create(MemoryAligned16.prototype);



class GameBoyAdvancePalette {
	constructor() {
		this.ICACHE_PAGE_BITS = 8;
		this.PAGE_MASK = (2 << this.ICACHE_PAGE_BITS) - 1;
		this.icache = new Array(2);
		this.colors = [new Array(0x100), new Array(0x100)];
		this.adjustedColors = [new Array(0x100), new Array(0x100)];
		this.passthroughColors = [
			this.colors[0], // BG0
			this.colors[0], // BG1
			this.colors[0], // BG2
			this.colors[0], // BG3
			this.colors[1], // OBJ
			this.colors[0] // Backdrop
		];
		// BLDY resets to zero, so the initial brightness lookup must preserve
		// the raw palette colors until software programs a brightness amount.
		this.blendY = 0;
	}
	overwrite(memory) {
		for (var i = 0; i < 512; ++i) {
			var type = i >> 8;
			var index = i & 0xFF;
			if (this.colors[type][index] !== memory[i]) {
				this.store16(i << 1, memory[i]);
			}
		}
	}
	loadU8(offset) {
		return (this.loadU16(offset) >> (8 * (offset & 1))) & 0xFF;
	}
	load8(offset) {
		return (this.loadU8(offset) << 24) >> 24;
	}
	loadU16(offset) {
		return this.colors[(offset & 0x200) >> 9][(offset & 0x1FF) >> 1];
	}
	load16(offset) {
		return (this.loadU16(offset) << 16) >> 16;
	}
	load32(offset) {
		var alignedOffset = offset & ~3;
		var value = this.loadU16(alignedOffset) | (this.loadU16(alignedOffset + 2) << 16);
		var rotate = (offset & 3) << 3;
		return (value >>> rotate) | (value << (32 - rotate));
	}
	store8(offset, value) {
		// Palette byte writes repeat the byte across the addressed halfword.
		this.store16(offset, (value & 0xff) * 0x101);
	}
	store16(offset, value) {
		var type = (offset & 0x200) >> 9;
		var index = (offset & 0x1FF) >> 1;
		this.colors[type][index] = value;
		this.adjustedColors[type][index] = this.adjustColor(value);
	}
	store32(offset, value) {
		var alignedOffset = offset & ~3;
		this.store16(alignedOffset, value & 0xFFFF);
		this.store16(alignedOffset + 2, value >>> 16);
	}
	invalidatePage(address) {
		var page = this.icache[address >> (this.ICACHE_PAGE_BITS + 1)];
		if (page) {
			page.invalid = true;
		}
	}
	convert16To32(value, input) {
		var r = (value & 0x001F) << 3;
		var g = (value & 0x03E0) >> 2;
		var b = (value & 0x7C00) >> 7;

		input[0] = r;
		input[1] = g;
		input[2] = b;
	}
	mix(aWeight, aColor, bWeight, bColor) {
		var ar = (aColor & 0x001F);
		var ag = (aColor & 0x03E0) >> 5;
		var ab = (aColor & 0x7C00) >> 10;

		var br = (bColor & 0x001F);
		var bg = (bColor & 0x03E0) >> 5;
		var bb = (bColor & 0x7C00) >> 10;

		var r = Math.min(aWeight * ar + bWeight * br, 0x1F);
		var g = Math.min(aWeight * ag + bWeight * bg, 0x1F);
		var b = Math.min(aWeight * ab + bWeight * bb, 0x1F);

		return r | (g << 5) | (b << 10);
	}
	makeDarkPalettes(layers) {
		if (this.adjustColor != this.adjustColorDark) {
			this.adjustColor = this.adjustColorDark;
			this.resetPalettes();
		}
		this.resetPaletteLayers(layers);
	}
	makeBrightPalettes(layers) {
		if (this.adjustColor != this.adjustColorBright) {
			this.adjustColor = this.adjustColorBright;
			this.resetPalettes();
		}
		this.resetPaletteLayers(layers);
	}
	makeNormalPalettes() {
		this.passthroughColors[0] = this.colors[0];
		this.passthroughColors[1] = this.colors[0];
		this.passthroughColors[2] = this.colors[0];
		this.passthroughColors[3] = this.colors[0];
		this.passthroughColors[4] = this.colors[1];
		this.passthroughColors[5] = this.colors[0];
	}
	makeSpecialPalette(layer) {
		this.passthroughColors[layer] = this.adjustedColors[layer == 4 ? 1 : 0];
	}
	makeNormalPalette(layer) {
		this.passthroughColors[layer] = this.colors[layer == 4 ? 1 : 0];
	}
	resetPaletteLayers(layers) {
		if (layers & 0x01) {
			this.passthroughColors[0] = this.adjustedColors[0];
		}
		else {
			this.passthroughColors[0] = this.colors[0];
		}
		if (layers & 0x02) {
			this.passthroughColors[1] = this.adjustedColors[0];
		}
		else {
			this.passthroughColors[1] = this.colors[0];
		}
		if (layers & 0x04) {
			this.passthroughColors[2] = this.adjustedColors[0];
		}
		else {
			this.passthroughColors[2] = this.colors[0];
		}
		if (layers & 0x08) {
			this.passthroughColors[3] = this.adjustedColors[0];
		}
		else {
			this.passthroughColors[3] = this.colors[0];
		}
		if (layers & 0x10) {
			this.passthroughColors[4] = this.adjustedColors[1];
		}
		else {
			this.passthroughColors[4] = this.colors[1];
		}
		if (layers & 0x20) {
			this.passthroughColors[5] = this.adjustedColors[0];
		}
		else {
			this.passthroughColors[5] = this.colors[0];
		}
	}
	resetPalettes() {
		var i;
		var outPalette = this.adjustedColors[0];
		var inPalette = this.colors[0];
		for (i = 0; i < 256; ++i) {
			outPalette[i] = this.adjustColor(inPalette[i]);
		}

		outPalette = this.adjustedColors[1];
		inPalette = this.colors[1];
		for (i = 0; i < 256; ++i) {
			outPalette[i] = this.adjustColor(inPalette[i]);
		}
	}
	accessColor(layer, index) {
		return this.passthroughColors[layer][index];
	}
	adjustColorDark(color) {
		var r = (color & 0x001F);
		var g = (color & 0x03E0) >> 5;
		var b = (color & 0x7C00) >> 10;

		r = r - (r * this.blendY);
		g = g - (g * this.blendY);
		b = b - (b * this.blendY);

		return r | (g << 5) | (b << 10);
	}
	adjustColorBright(color) {
		var r = (color & 0x001F);
		var g = (color & 0x03E0) >> 5;
		var b = (color & 0x7C00) >> 10;

		r = r + ((31 - r) * this.blendY);
		g = g + ((31 - g) * this.blendY);
		b = b + ((31 - b) * this.blendY);

		return r | (g << 5) | (b << 10);
	}
	setBlendY(y) {
		if (this.blendY != y) {
			this.blendY = y;
			this.resetPalettes();
		}
	}
}

GameBoyAdvancePalette.prototype.adjustColor = GameBoyAdvancePalette.prototype.adjustColorBright;

class GameBoyAdvanceOBJ {
	constructor(oam, index) {
		this.TILE_OFFSET = 0x10000;
		this.oam = oam;

		this.index = index;
		this.x = 0;
		this.y = 0;
		this.scalerot = 0;
		this.doublesize = false;
		this.scalerotParam = 0;
		this.disable = 1;
		this.mode = 0;
		this.mosaic = false;
		this.multipalette = false;
		this.shape = 0;
		this.hflip = 0;
		this.vflip = 0;
		this.tileBase = 0;
		this.size = 0;
		this.priority = 0;
		this.palette = 0;
		this.drawScanline = this.drawScanlineNormal;
		this.pushPixel = GameBoyAdvanceSoftwareRenderer.pushPixel;
		this.cachedWidth = 8;
		this.cachedHeight = 8;
	}
	getTileNumber(video, tileBase, tileOffset, localX, paletteShift) {
		var tileColumn =
			(localX & 0x01F8) >> (3 - paletteShift);
		var rowOffset = tileOffset << paletteShift;
		if (video.objCharacterMapping) {
			return tileBase + rowOffset + tileColumn;
		}
		// In 2D mapping, each character row has 32 4bpp tile units. Horizontal
		// fetches wrap within that row, while the vertical row offset advances
		// independently. 8bpp tiles occupy two units, so they wrap at the same
		// boundary after tileBase has been aligned to an even unit.
		return (
			(tileBase & ~0x1F) +
			rowOffset +
			(((tileBase & 0x1F) + tileColumn) & 0x1F)
		);
	}
	drawScanlineNormal(backing, y, yOff, start, end) {
		var video = this.oam.video;
		var x;
		var underflow;
		var offset;
		var mask = this.mode | video.target2[video.LAYER_OBJ] | (this.priority << 1);
		if (this.mode == 0x10) {
			mask |= video.TARGET1_MASK;
		}
		if (video.blendMode == 1 && video.alphaEnabled) {
			mask |= video.target1[video.LAYER_OBJ];
		}

		var totalWidth = this.cachedWidth;
		// OAM X is a signed 9-bit coordinate; only values 256-511 wrap left.
		if (this.x < 256) {
			if (this.x < start) {
				underflow = start - this.x;
				offset = start;
			}
			else {
				underflow = 0;
				offset = this.x;
			}
			if (end < this.cachedWidth + this.x) {
				totalWidth = end - this.x;
			}
		}
		else {
			underflow = start + 512 - this.x;
			offset = start;
			if (end < this.cachedWidth - underflow) {
				totalWidth = end;
			}
		}

		var localX;
		var localY;
		if (!this.vflip) {
			localY = y - yOff;
		}
		else {
			localY = this.cachedHeight - y + yOff - 1;
		}
		var localYLo = localY & 0x7;
		var mosaicX;
		var tileOffset;

		var paletteShift = this.multipalette ? 1 : 0;
		var tileBase = this.multipalette ? this.tileBase & 0x03fe : this.tileBase;

		if (video.objCharacterMapping) {
			tileOffset = ((localY & 0x01F8) * this.cachedWidth) >> 6;
		}
		else {
			tileOffset = (localY & 0x01F8) << (2 - paletteShift);
		}

		mosaicX = this.mosaic ? offset % video.objMosaicX : 0;
		if (!this.hflip) {
			localX = underflow - mosaicX;
		}
		else {
			localX = this.cachedWidth - (underflow - mosaicX) - 1;
		}
		if (this.mosaic) {
			// A sprite can begin in the middle of a screen-space mosaic block.
			// The hardware repeats the nearest edge texel for the part of that
			// block outside the sprite instead of omitting those pixels.
			localX = Math.max(0, Math.min(localX, this.cachedWidth - 1));
		}

		var tileRow = video.accessTile(
			this.TILE_OFFSET + (localX & 0x4) * paletteShift,
			this.getTileNumber(
				video,
				tileBase,
				tileOffset,
				localX,
				paletteShift
			),
			localYLo << paletteShift
		);
		for (x = underflow; x < totalWidth; ++x) {
			mosaicX = this.mosaic ? offset % video.objMosaicX : 0;
			if (!this.hflip) {
				localX = x - mosaicX;
			}
			else {
				localX = this.cachedWidth - (x - mosaicX) - 1;
			}
			if (this.mosaic) {
				localX = Math.max(0, Math.min(localX, this.cachedWidth - 1));
			}
			if (!paletteShift) {
				if (!(x & 0x7) || (this.mosaic && !mosaicX)) {
					tileRow = video.accessTile(
						this.TILE_OFFSET,
						this.getTileNumber(
							video,
							tileBase,
							tileOffset,
							localX,
							paletteShift
						),
						localYLo
					);
				}
			}
			else {
				if (!(x & 0x3) || (this.mosaic && !mosaicX)) {
					tileRow = video.accessTile(
						this.TILE_OFFSET + (localX & 0x4),
						this.getTileNumber(
							video,
							tileBase,
							tileOffset,
							localX,
							paletteShift
						),
						localYLo << 1
					);
				}
			}
			this.pushPixel(video.LAYER_OBJ, this, video, tileRow, localX & 0x7, offset, backing, mask, false);
			offset++;
		}
	}
	drawScanlineAffine(backing, y, yOff, start, end) {
		var video = this.oam.video;
		var x;
		var underflow;
		var offset;
		var mask = this.mode | video.target2[video.LAYER_OBJ] | (this.priority << 1);
		if (this.mode == 0x10) {
			mask |= video.TARGET1_MASK;
		}
		if (video.blendMode == 1 && video.alphaEnabled) {
			mask |= video.target1[video.LAYER_OBJ];
		}

		var localX;
		var localY;
		var yDiff = y - yOff;
		var tileOffset;

		var paletteShift = this.multipalette ? 1 : 0;
		var tileBase = this.multipalette ? this.tileBase & 0x03fe : this.tileBase;
		var totalWidth = this.cachedWidth << this.doublesize;
		var totalHeight = this.cachedHeight << this.doublesize;
		var drawWidth = totalWidth;
		if (drawWidth > video.HORIZONTAL_PIXELS) {
			totalWidth = video.HORIZONTAL_PIXELS;
		}

		// OAM X is a signed 9-bit coordinate; only values 256-511 wrap left.
		if (this.x < 256) {
			if (this.x < start) {
				underflow = start - this.x;
				offset = start;
			}
			else {
				underflow = 0;
				offset = this.x;
			}
			if (end < drawWidth + this.x) {
				drawWidth = end - this.x;
			}
		}
		else {
			underflow = start + 512 - this.x;
			offset = start;
			if (end < drawWidth - underflow) {
				drawWidth = end;
			}
		}

		for (x = underflow; x < drawWidth; ++x) {
			localX = this.scalerotOam.a * (x - (totalWidth >> 1)) + this.scalerotOam.b * (yDiff - (totalHeight >> 1)) + (this.cachedWidth >> 1);
			localY = this.scalerotOam.c * (x - (totalWidth >> 1)) + this.scalerotOam.d * (yDiff - (totalHeight >> 1)) + (this.cachedHeight >> 1);
			if (this.mosaic) {
				// Mosaic blocks are aligned to screen coordinates, even when the
				// affine OBJ begins partway through a block.
				localX -= (offset % video.objMosaicX) * this.scalerotOam.a + (y % video.objMosaicY) * this.scalerotOam.b;
				localY -= (offset % video.objMosaicX) * this.scalerotOam.c + (y % video.objMosaicY) * this.scalerotOam.d;
			}

			if (localX < 0 || localX >= this.cachedWidth || localY < 0 || localY >= this.cachedHeight) {
				offset++;
				continue;
			}

			if (video.objCharacterMapping) {
				tileOffset = ((localY & 0x01F8) * this.cachedWidth) >> 6;
			}
			else {
				tileOffset = (localY & 0x01F8) << (2 - paletteShift);
			}
			var tileRow = video.accessTile(
				this.TILE_OFFSET + (localX & 0x4) * paletteShift,
				this.getTileNumber(
					video,
					tileBase,
					tileOffset,
					localX,
					paletteShift
				),
				(localY & 0x7) << paletteShift
			);
			this.pushPixel(video.LAYER_OBJ, this, video, tileRow, localX & 0x7, offset, backing, mask, false);
			offset++;
		}
	}
	recalcSize() {
		switch (this.shape) {
			case 0:
				// Square
				this.cachedHeight = this.cachedWidth = 8 << this.size;
				break;
			case 1:
				// Horizontal
				switch (this.size) {
					case 0:
						this.cachedHeight = 8;
						this.cachedWidth = 16;
						break;
					case 1:
						this.cachedHeight = 8;
						this.cachedWidth = 32;
						break;
					case 2:
						this.cachedHeight = 16;
						this.cachedWidth = 32;
						break;
					case 3:
						this.cachedHeight = 32;
						this.cachedWidth = 64;
						break;
				}
				break;
			case 2:
				// Vertical
				switch (this.size) {
					case 0:
						this.cachedHeight = 16;
						this.cachedWidth = 8;
						break;
					case 1:
						this.cachedHeight = 32;
						this.cachedWidth = 8;
						break;
					case 2:
						this.cachedHeight = 32;
						this.cachedWidth = 16;
						break;
					case 3:
						this.cachedHeight = 64;
						this.cachedWidth = 32;
						break;
				}
				break;
			default:
			// Bad!
		}
	}
	scanlineOrigin(y) {
		var height = this.cachedHeight;
		if (this.scalerot && this.doublesize) {
			height <<= 1;
		}

		var origin = this.y < 160 ? this.y : this.y - 256;
		if (origin <= y && y < origin + height) {
			return origin;
		}

		// A double-size 64-pixel OBJ is 128 pixels high. If it starts at
		// Y=129..159, its tail wraps through the 256-line OBJ coordinate space
		// and appears at the top of the visible screen.
		if (this.y < 160 && this.y + height > 256) {
			origin = this.y - 256;
			if (origin <= y && y < origin + height) {
				return origin;
			}
		}
		return null;
	}
}

class GameBoyAdvanceOBJLayer {
	constructor(video, index) {
		this.video = video;
		this.bg = false;
		this.index = video.LAYER_OBJ;
		this.priority = index;
		this.enabled = false;
		this.objwin = 0;
	}
	drawScanline(backing, layer, start, end) {
		var y = this.video.vcount;
		var mosaicY;
		var obj;
		if (start >= end) {
			return;
		}
		var objs = this.video.objOam.objs;
		for (var i = 0; i < objs.length; ++i) {
			obj = objs[i];
			if (
				this.video.objCycleLimitReady &&
				!this.video.objCycleAllowed[obj.index]
			) {
				continue;
			}
			if (obj.disable) {
				continue;
			}
			// OBJ mode 3 is prohibited. Its encoded bits overlap both the
			// semi-transparent and OBJ-window stencil flags, so interpreting the
			// stencil value directly would incorrectly treat it as an OBJ window.
			if (
				obj.mode ===
				(this.video.TARGET1_MASK | this.video.OBJWIN_MASK)
			) {
				continue;
			}
			if ((obj.mode & this.video.OBJWIN_MASK) != this.objwin) {
				continue;
			}
			if (
				!(obj.mode & this.video.OBJWIN_MASK) &&
				this.priority >= 0 &&
				this.priority != obj.priority
			) {
				continue;
			}
			var yOrigin = obj.scanlineOrigin(y);
			if (yOrigin === null) {
				continue;
			}
			if (!obj.mosaic) {
				mosaicY = y;
			}
			else {
				mosaicY = y - y % this.video.objMosaicY;
			}
			obj.drawScanline(backing, mosaicY, yOrigin, start, end);
		}
	}
	objComparator(a, b) {
		return a.index - b.index;
	}
}
;



class GameBoyAdvanceSoftwareRenderer {
	constructor() {
		this.LAYER_BG0 = 0;
		this.LAYER_BG1 = 1;
		this.LAYER_BG2 = 2;
		this.LAYER_BG3 = 3;
		this.LAYER_OBJ = 4;
		this.LAYER_BACKDROP = 5;

		this.HORIZONTAL_PIXELS = 240;
		this.VERTICAL_PIXELS = 160;
		this.VERTICAL_TOTAL_PIXELS = 228;

		this.LAYER_MASK = 0x06;
		this.BACKGROUND_MASK = 0x01;
		this.TARGET2_MASK = 0x08;
		this.TARGET1_MASK = 0x10;
		this.OBJWIN_MASK = 0x20;
		this.WRITTEN_MASK = 0x80;

		this.PRIORITY_MASK = this.LAYER_MASK | this.BACKGROUND_MASK;

	}
	clear(mmu) {
		this.palette = new GameBoyAdvancePalette();
		this.vram = new GameBoyAdvanceVRAM(mmu.SIZE_VRAM);
		this.vram.video = this;
		this.oam = new GameBoyAdvanceOAM(mmu.SIZE_OAM);
		this.oam.video = this;
		this.objOam = new GameBoyAdvanceOAM(mmu.SIZE_OAM);
		this.objOam.video = this;
		this.objOamAppliedVersions = new Uint32Array(mmu.SIZE_OAM >> 1);
		this.stageObjOam();
		this.lastObjScanline = null;
		this.objLayers = [
			new GameBoyAdvanceOBJLayer(this, 0),
			new GameBoyAdvanceOBJLayer(this, 1),
			new GameBoyAdvanceOBJLayer(this, 2),
			new GameBoyAdvanceOBJLayer(this, 3)
		];
		this.objwinLayer = new GameBoyAdvanceOBJLayer(this, 4);
		this.objwinLayer.objwin = this.OBJWIN_MASK;
		this.objPriority = new Uint8Array(this.HORIZONTAL_PIXELS);
		this.objIndex = new Uint8Array(this.HORIZONTAL_PIXELS);
		this.objMode = new Uint8Array(this.HORIZONTAL_PIXELS);
		this.objPixelIndex = new Uint8Array(this.HORIZONTAL_PIXELS);
		this.objPriorityPass = false;
		this.objRenderMap = { index: 0, palette: 0, mode: 0 };
		this.objCycleAllowed = new Uint8Array(128);
		this.objCycleLimitReady = false;

		// DISPCNT
		this.backgroundMode = 0;
		this.displayFrameSelect = 0;
		this.hblankIntervalFree = 0;
		this.objCharacterMapping = 0;
		this.forcedBlank = 1;
		this.win0 = 0;
		this.win1 = 0;
		this.objwin = 0;

		// VCOUNT
		this.vcount = -1;

		// WIN0H
		this.win0Left = 0;
		this.win0Right = 240;

		// WIN1H
		this.win1Left = 0;
		this.win1Right = 240;

		// WIN0V
		this.win0Top = 0;
		this.win0Bottom = 160;

		// WIN1V
		this.win1Top = 0;
		this.win1Bottom = 160;

		// WININ/WINOUT
		this.windows = new Array();
		for (var i = 0; i < 4; ++i) {
			this.windows.push({
				enabled: [false, false, false, false, false, true],
				special: 0
			});
		};

		// BLDCNT
		this.target1 = new Array(5);
		this.target2 = new Array(5);
		this.blendMode = 0;
		this.hasBlendTargets = false;

		// BLDALPHA
		this.blendA = 0;
		this.blendB = 0;

		// BLDY
		this.blendY = 0;

		// MOSAIC
		this.bgMosaicX = 1;
		this.bgMosaicY = 1;
		this.objMosaicX = 1;
		this.objMosaicY = 1;

		this.lastHblank = 0;
		this.nextHblank = this.HDRAW_LENGTH;
		this.nextEvent = this.nextHblank;

		this.nextHblankIRQ = 0;
		this.nextVblankIRQ = 0;
		this.nextVcounterIRQ = 0;

		this.bg = new Array();
		for (var i = 0; i < 4; ++i) {
			this.bg.push({
				bg: true,
				index: i,
				enabled: false,
				video: this,
				vram: this.vram,
				priority: 0,
				charBase: 0,
				mosaic: false,
				multipalette: false,
				screenBase: 0,
				overflow: 0,
				size: 0,
				x: 0,
				y: 0,
				refx: 0,
				refy: 0,
				dx: 1,
				dmx: 0,
				dy: 0,
				dmy: 1,
				sx: 0,
				sy: 0,
				pushPixel: GameBoyAdvanceSoftwareRenderer.pushPixel,
				drawScanline: this.drawScanlineBGMode0
			});
		}

		this.bgModes = [
			this.drawScanlineBGMode0,
			this.drawScanlineBGMode2, // Modes 1 and 2 are identical for layers 2 and 3
			this.drawScanlineBGMode2,
			this.drawScanlineBGMode3,
			this.drawScanlineBGMode4,
			this.drawScanlineBGMode5
		];

		// Draw lower-numbered BGs last so they win equal-priority ties. OBJ
		// layers follow all BGs, giving OBJ the hardware tie-break over BGs.
		this.drawLayers = [
			this.bg[3],
			this.bg[2],
			this.bg[1],
			this.bg[0],
			this.objLayers[0],
			this.objLayers[1],
			this.objLayers[2],
			this.objLayers[3],
			this.objwinLayer
		];

		this.alphaEnabled = false;

		this.scanline = {
			color: new Uint16Array(this.HORIZONTAL_PIXELS),
			// Preserve source colors so a semi-transparent OBJ can bypass any
			// brightness adjustment already applied to its second target.
			unadjustedColor: new Uint16Array(this.HORIZONTAL_PIXELS),
			// Stencil format:
			// Bits 0-1: Layer
			// Bit 2: Is background
			// Bit 3: Is Target 2
			// Bit 4: Is Target 1
			// Bit 5: Is OBJ Window
			// Bit 6: Reserved
			// Bit 7: Has been written
			stencil: new Uint8Array(this.HORIZONTAL_PIXELS)
		};
		this.windowRegionIndices = new Int8Array(this.HORIZONTAL_PIXELS);
		this.windowRegionCache = null;
		this.windowRegionRunStarts = new Uint16Array(this.HORIZONTAL_PIXELS);
		this.windowRegionRunEnds = new Uint16Array(this.HORIZONTAL_PIXELS);
		this.windowRegionRunRegions = new Int8Array(this.HORIZONTAL_PIXELS);
		this.windowRegionRunCount = 0;
		this.sharedColor = [0, 0, 0];
		this.sharedMap = {
			tile: 0,
			hflip: false,
			vflip: false,
			palette: 0
		};
	}
	invalidateMemoryPages(memory, length) {
		if (
			!memory ||
			typeof memory.invalidatePage != "function" ||
			memory.ICACHE_PAGE_BITS === undefined
		) {
				return;
			}
		var pageSize = 1 << (memory.ICACHE_PAGE_BITS + 1);
		for (var offset = 0; offset < length; offset += pageSize) {
			memory.invalidatePage(offset);
		}
	}
	clearSubsets(mmu, regions) {
		if (regions & 0x04) {
			this.palette.overwrite(
				new Uint16Array(mmu.SIZE_PALETTE_RAM >> 1)
			);
			this.invalidateMemoryPages(this.palette, mmu.SIZE_PALETTE_RAM);
		}

		if (regions & 0x08) {
			this.vram.insert(0, new Uint16Array(mmu.SIZE_VRAM >> 1));
			this.invalidateMemoryPages(this.vram, mmu.SIZE_VRAM);
		}

		if (regions & 0x10) {
			this.oam.overwrite(new Uint16Array(mmu.SIZE_OAM >> 1));
			this.oam.video = this;
			this.invalidateMemoryPages(this.oam, mmu.SIZE_OAM);
		}
	}
	stageObjOam() {
		for (var i = 0; i < this.oam.buffer.length; ++i) {
			if (
				this.objOamAppliedVersions[i] !== this.oam.writeVersions[i] ||
				this.objOam.buffer[i] !== this.oam.buffer[i]
			) {
				this.objOam.store16(i << 1, this.oam.buffer[i]);
				this.objOamAppliedVersions[i] = this.oam.writeVersions[i];
			}
		}
		// Reset initializes affine parameter registers independently of the
		// zero-filled OAM backing array, so preserve the decoded matrix values.
		for (var i = 0; i < this.oam.scalerot.length; ++i) {
			this.objOam.scalerot[i].a = this.oam.scalerot[i].a;
			this.objOam.scalerot[i].b = this.oam.scalerot[i].b;
			this.objOam.scalerot[i].c = this.oam.scalerot[i].c;
			this.objOam.scalerot[i].d = this.oam.scalerot[i].d;
		}
	}
	primeObjOamForLineZero() {
		this.stageObjOam();
		this.lastObjScanline = this.VERTICAL_TOTAL_PIXELS - 1;
	}
	freeze() {
		var palette = new Uint16Array(512);
		var oamScalers = new Float64Array(32 * 4);
		var objOamScalers = new Float64Array(32 * 4);
		var oamDisabled = new Uint16Array(128);
		var objOamDisabled = new Uint16Array(128);
		palette.set(this.palette.colors[0], 0);
		palette.set(this.palette.colors[1], 256);
		for (var i = 0; i < 32; ++i) {
			var offset = i << 2;
			oamScalers[offset] = this.oam.scalerot[i].a;
			oamScalers[offset + 1] = this.oam.scalerot[i].b;
			oamScalers[offset + 2] = this.oam.scalerot[i].c;
			oamScalers[offset + 3] = this.oam.scalerot[i].d;
			objOamScalers[offset] = this.objOam.scalerot[i].a;
			objOamScalers[offset + 1] = this.objOam.scalerot[i].b;
			objOamScalers[offset + 2] = this.objOam.scalerot[i].c;
			objOamScalers[offset + 3] = this.objOam.scalerot[i].d;
		}
		for (var i = 0; i < 128; ++i) {
			oamDisabled[i] = this.oam.objs[i].disable;
			objOamDisabled[i] = this.objOam.objs[i].disable;
		}
		return {
			palette: Serializer.prefix(palette.buffer),
			vram: Serializer.prefix(this.vram.buffer.buffer),
			oam: Serializer.prefix(this.oam.buffer.buffer),
			oamWriteVersions: Serializer.prefix(this.oam.writeVersions.buffer),
			oamWriteEpoch: this.oam.writeEpoch,
			oamInitialized: this.oam.initialized,
			oamDisabled: Serializer.prefix(oamDisabled.buffer),
			oamScalers: Serializer.prefix(oamScalers.buffer),
			objOam: Serializer.prefix(this.objOam.buffer.buffer),
			objOamAppliedVersions: Serializer.prefix(this.objOamAppliedVersions.buffer),
			objOamDisabled: Serializer.prefix(objOamDisabled.buffer),
			objOamScalers: Serializer.prefix(objOamScalers.buffer),
			lastObjScanline: this.lastObjScanline === null
				? -1
				: this.lastObjScanline
		};
	}
	defrost(frost) {
		if (frost.palette) {
			this.palette.overwrite(new Uint16Array(frost.palette));
		}
		if (frost.vram) {
			this.vram.insert(0, new Uint16Array(frost.vram));
		}
		if (frost.oam) {
			this.oam.overwrite(new Uint16Array(frost.oam));
			this.oam.video = this;
		}
		if (frost.oamWriteVersions) {
			this.oam.writeVersions.set(new Uint32Array(frost.oamWriteVersions));
			this.oam.writeEpoch = frost.oamWriteEpoch || 0;
			this.oam.initialized = !!frost.oamInitialized;
		}
		if (frost.oamDisabled) {
			var oamDisabled = new Uint16Array(frost.oamDisabled);
			for (var i = 0; i < 128; ++i) {
				this.oam.objs[i].disable = oamDisabled[i];
			}
		}
		if (frost.oamScalers) {
			var oamScalers = new Float64Array(frost.oamScalers);
			for (var i = 0; i < 32; ++i) {
				var offset = i << 2;
				this.oam.scalerot[i].a = oamScalers[offset];
				this.oam.scalerot[i].b = oamScalers[offset + 1];
				this.oam.scalerot[i].c = oamScalers[offset + 2];
				this.oam.scalerot[i].d = oamScalers[offset + 3];
			}
		}
		if (frost.objOam) {
			this.objOam.overwrite(new Uint16Array(frost.objOam));
			if (frost.objOamAppliedVersions) {
				this.objOamAppliedVersions.set(
					new Uint32Array(frost.objOamAppliedVersions)
				);
			}
			if (frost.objOamDisabled) {
				var objOamDisabled = new Uint16Array(frost.objOamDisabled);
				for (var i = 0; i < 128; ++i) {
					this.objOam.objs[i].disable = objOamDisabled[i];
				}
			}
			if (frost.objOamScalers) {
				var objOamScalers = new Float64Array(frost.objOamScalers);
				for (var i = 0; i < 32; ++i) {
					var offset = i << 2;
					this.objOam.scalerot[i].a = objOamScalers[offset];
					this.objOam.scalerot[i].b = objOamScalers[offset + 1];
					this.objOam.scalerot[i].c = objOamScalers[offset + 2];
					this.objOam.scalerot[i].d = objOamScalers[offset + 3];
				}
			}
			this.lastObjScanline = frost.lastObjScanline >= 0
				? frost.lastObjScanline
				: null;
		}
		else {
			this.stageObjOam();
			this.lastObjScanline = null;
		}
	}
	setBacking(backing) {
		this.pixelData = backing;

		// Clear backing first
		for (var offset = 0; offset < this.HORIZONTAL_PIXELS * this.VERTICAL_PIXELS * 4;) {
			this.pixelData.data[offset++] = 0xFF;
			this.pixelData.data[offset++] = 0xFF;
			this.pixelData.data[offset++] = 0xFF;
			this.pixelData.data[offset++] = 0xFF;
		}
	}
	writeDisplayControl(value) {
		this.backgroundMode = value & 0x0007;
		this.displayFrameSelect = value & 0x0010;
		this.hblankIntervalFree = value & 0x0020;
		this.objCharacterMapping = value & 0x0040;
		this.forcedBlank = value & 0x0080;
		this.bg[0].enabled = value & 0x0100;
		this.bg[1].enabled = value & 0x0200;
		this.bg[2].enabled = value & 0x0400;
		this.bg[3].enabled = value & 0x0800;
		this.objLayers[0].enabled = value & 0x1000;
		this.objLayers[1].enabled = value & 0x1000;
		this.objLayers[2].enabled = value & 0x1000;
		this.objLayers[3].enabled = value & 0x1000;
		this.win0 = value & 0x2000;
		this.win1 = value & 0x4000;
		this.objwin = value & 0x8000;
		this.objwinLayer.enabled = value & 0x1000 && value & 0x8000;

		// Total hack so we can store both things that would set it to 256-color mode in the same variable
		this.bg[2].multipalette &= ~0x0001;
		this.bg[3].multipalette &= ~0x0001;
		if (this.backgroundMode > 0) {
			this.bg[2].multipalette |= 0x0001;
		}
		if (this.backgroundMode == 2) {
			this.bg[3].multipalette |= 0x0001;
		}

		this.resetLayers();
	}
	writeBackgroundControl(bg, value) {
		var bgData = this.bg[bg];
		bgData.priority = value & 0x0003;
		bgData.charBase = (value & 0x000C) << 12;
		bgData.mosaic = value & 0x0040;
		bgData.multipalette &= ~0x0080;
		if (bg < 2 || this.backgroundMode == 0) {
			bgData.multipalette |= value & 0x0080;
		}
		bgData.screenBase = (value & 0x1F00) << 3;
		bgData.overflow = value & 0x2000;
		bgData.size = (value & 0xC000) >> 14;

		this.drawLayers.sort(this.layerComparator);
	}
	writeBackgroundHOffset(bg, value) {
		this.bg[bg].x = value & 0x1FF;
	}
	writeBackgroundVOffset(bg, value) {
		this.bg[bg].y = value & 0x1FF;
	}
	writeBackgroundRefX(bg, value) {
		this.bg[bg].refx = (value << 4) / 0x1000;
		this.bg[bg].sx = this.bg[bg].refx;
	}
	writeBackgroundRefY(bg, value) {
		this.bg[bg].refy = (value << 4) / 0x1000;
		this.bg[bg].sy = this.bg[bg].refy;
	}
	writeBackgroundParamA(bg, value) {
		this.bg[bg].dx = (value << 16) / 0x1000000;
	}
	writeBackgroundParamB(bg, value) {
		this.bg[bg].dmx = (value << 16) / 0x1000000;
	}
	writeBackgroundParamC(bg, value) {
		this.bg[bg].dy = (value << 16) / 0x1000000;
	}
	writeBackgroundParamD(bg, value) {
		this.bg[bg].dmy = (value << 16) / 0x1000000;
	}
	writeWin0H(value) {
		this.win0Left = (value & 0xFF00) >> 8;
		this.win0Right = value & 0x00FF;
	}
	writeWin1H(value) {
		this.win1Left = (value & 0xFF00) >> 8;
		this.win1Right = value & 0x00FF;
	}
	writeWin0V(value) {
		this.win0Top = (value & 0xFF00) >> 8;
		this.win0Bottom = value & 0x00FF;
	}
	writeWin1V(value) {
		this.win1Top = (value & 0xFF00) >> 8;
		this.win1Bottom = value & 0x00FF;
	}
	writeWindow(index, value) {
		var window = this.windows[index];
		window.enabled[0] = value & 0x01;
		window.enabled[1] = value & 0x02;
		window.enabled[2] = value & 0x04;
		window.enabled[3] = value & 0x08;
		window.enabled[4] = value & 0x10;
		window.special = value & 0x20;
	}
	writeWinIn(value) {
		this.writeWindow(0, value);
		this.writeWindow(1, value >> 8);
	}
	writeWinOut(value) {
		this.writeWindow(2, value);
		this.writeWindow(3, value >> 8);
	}
	writeBlendControl(value) {
		this.target1[0] = !!(value & 0x0001) * this.TARGET1_MASK;
		this.target1[1] = !!(value & 0x0002) * this.TARGET1_MASK;
		this.target1[2] = !!(value & 0x0004) * this.TARGET1_MASK;
		this.target1[3] = !!(value & 0x0008) * this.TARGET1_MASK;
		this.target1[4] = !!(value & 0x0010) * this.TARGET1_MASK;
		this.target1[5] = !!(value & 0x0020) * this.TARGET1_MASK;
		this.target2[0] = !!(value & 0x0100) * this.TARGET2_MASK;
		this.target2[1] = !!(value & 0x0200) * this.TARGET2_MASK;
		this.target2[2] = !!(value & 0x0400) * this.TARGET2_MASK;
		this.target2[3] = !!(value & 0x0800) * this.TARGET2_MASK;
		this.target2[4] = !!(value & 0x1000) * this.TARGET2_MASK;
		this.target2[5] = !!(value & 0x2000) * this.TARGET2_MASK;
		this.blendMode = (value & 0x00C0) >> 6;
		this.hasBlendTargets = !!(value & 0x3F3F);

		switch (this.blendMode) {
			case 1:
			// Alpha
			// Fall through
			case 0:
				// Normal
				this.palette.makeNormalPalettes();
				break;
			case 2:
				// Brighter
				this.palette.makeBrightPalettes(value & 0x3F);
				break;
			case 3:
				// Darker
				this.palette.makeDarkPalettes(value & 0x3F);
				break;
		}
	}
	setBlendEnabled(layer, enabled, override) {
		this.alphaEnabled = enabled && override == 1;
		if (enabled) {
			switch (override) {
				case 1:
				// Alpha
				// Fall through
				case 0:
					// Normal
					this.palette.makeNormalPalette(layer);
					break;
				case 2:
				// Brighter
				case 3:
					// Darker
					this.palette.makeSpecialPalette(layer);
					break;
			}
		}
		else {
			this.palette.makeNormalPalette(layer);
		}
	}
	writeBlendAlpha(value) {
		this.blendA = (value & 0x001F) / 16;
		if (this.blendA > 1) {
			this.blendA = 1;
		}
		this.blendB = ((value & 0x1F00) >> 8) / 16;
		if (this.blendB > 1) {
			this.blendB = 1;
		}
	}
	writeBlendY(value) {
		this.blendY = value;
		this.palette.setBlendY(value >= 16 ? 1 : (value / 16));
	}
	writeMosaic(value) {
		this.bgMosaicX = (value & 0xF) + 1;
		this.bgMosaicY = ((value >> 4) & 0xF) + 1;
		this.objMosaicX = ((value >> 8) & 0xF) + 1;
		this.objMosaicY = ((value >> 12) & 0xF) + 1;
	}
	resetLayers() {
		if (this.backgroundMode > 1) {
			this.bg[0].enabled = false;
			this.bg[1].enabled = false;
		}
		if (this.backgroundMode > 5) {
			// Modes 6 and 7 are prohibited on GBA. They have no BG renderer;
			// leaving BG2 enabled here would select an undefined draw function
			// and crash when the next scanline is rendered.
			this.bg[2].enabled = false;
		}
		if (this.bg[2].enabled) {
			this.bg[2].drawScanline = this.bgModes[this.backgroundMode];
		}
		if ((this.backgroundMode == 0 || this.backgroundMode == 2)) {
			if (this.bg[3].enabled) {
				this.bg[3].drawScanline = this.bgModes[this.backgroundMode];
			}
		}
		else {
			this.bg[3].enabled = false;
		}
		this.drawLayers.sort(this.layerComparator);
	}
	layerComparator(a, b) {
		var diff = b.priority - a.priority;
		if (!diff) {
			if (a.bg && !b.bg) {
				return -1;
			}
			else if (!a.bg && b.bg) {
				return 1;
			}

			return b.index - a.index;
		}
		return diff;
	}
	accessMapMode0(base, size, x, yBase, out) {
		var offset = base + ((x >> 2) & 0x3E) + yBase;

		if (size & 1) {
			offset += (x & 0x100) << 3;
		}

		var mem = this.vram.loadU16(offset);
		out.tile = mem & 0x03FF;
		out.hflip = mem & 0x0400;
		out.vflip = mem & 0x0800;
		out.palette = (mem & 0xF000) >> 8; // This is shifted up 4 to make pushPixel faster
	}
	accessMapMode1(base, size, x, yBase, out) {
		var offset = base + (x >> 3) + yBase;

		out.tile = this.vram.loadU8(offset);
	}
	accessTile(base, tile, y) {
		if (
			this.backgroundMode >= 3 &&
			this.backgroundMode <= 5 &&
			base >= 0x10000 &&
			base < 0x10008 &&
			(tile & 0x03FF) < 0x0200
		) {
			// Bitmap modes reserve the first half of OBJ character memory for the
			// framebuffer. OBJ tile numbers 0-511 are not displayable there.
			return 0;
		}
		var offset = base + (tile << 5);
		offset |= y << 2;

		return this.vram.load32(offset);
	}
	static pushPixel(layer, map, video, row, x, offset, backing, mask, raw) {
		var index;
		if (!raw) {
			if (this.multipalette) {
				index = (row >> (x << 3)) & 0xFF;
			}
			else {
				index = (row >> (x << 2)) & 0xF;
			}
			// Index 0 is transparent
			if (!index) {
				if (
					layer == video.LAYER_OBJ &&
					(mask & video.OBJWIN_MASK) &&
					video.objPriority &&
					video.objPriorityPass === "objwin"
				) {
					var previousWindowObjIndex = video.objIndex[offset];
					if (
						previousWindowObjIndex != 0xFF &&
						this.index > previousWindowObjIndex &&
						this.priority < video.objPriority[offset]
					) {
						// Transparent OBJ-window texels can promote a sprite already
						// selected earlier in OAM, without changing its color or mode.
						video.objPriority[offset] = this.priority;
					}
				}
				// On GBA, a transparent OBJ texel can still promote the priority
				// and semi-transparent flag of an OBJ pixel already in the buffer.
				// Keep its color and palette source, but remember the new priority
				// metadata for BG composition below.
				if (
					layer == video.LAYER_OBJ &&
					!(mask & video.OBJWIN_MASK) &&
					video.objPriority &&
					video.objPriorityPass
				) {
					var previousObjIndex = video.objIndex[offset];
					if (
						previousObjIndex != 0xFF &&
						this.priority < video.objPriority[offset]
					) {
						video.objPriority[offset] = this.priority;
						video.objMode[offset] = this.mode;
					}
				}
				return;
			}
			if (
				layer == video.LAYER_OBJ &&
				!(mask & video.OBJWIN_MASK) &&
				video.objPriority &&
				video.objPriorityPass
			) {
				var previousObjIndex = video.objIndex[offset];
				if (
					previousObjIndex == 0xFF ||
					this.priority < video.objPriority[offset]
				) {
					video.objIndex[offset] = map.index;
					video.objPriority[offset] = this.priority;
					video.objMode[offset] = this.mode;
					video.objPixelIndex[offset] = index;
				}
				return;
			}
			else if (!this.multipalette) {
				index |= map.palette;
			}
		}
		if (
			layer == video.LAYER_OBJ &&
			!(mask & video.OBJWIN_MASK) &&
			video.objPriority &&
			!video.objPriorityPass &&
			video.objIndex[offset] != map.index
		) {
			// The OBJ priority field decides overlap first, with OAM order breaking
			// ties. A later, higher-priority OBJ can therefore replace an earlier
			// lower-priority OBJ before BG composition is resolved.
			return;
		}

		var oldStencil = backing.stencil[offset];
		if (
			layer !== null &&
			(
				(layer < video.LAYER_OBJ && (mask & video.BACKGROUND_MASK)) ||
				(layer == video.LAYER_OBJ && !(mask & video.OBJWIN_MASK))
			) &&
			!video.win0 &&
			!video.win1 &&
			!video.objwin &&
			video.blendMode === 0 &&
			!video.hasBlendTargets
		) {
			var priority = mask & video.PRIORITY_MASK;
			var oldPriority = oldStencil & video.PRIORITY_MASK;
			if (
				!(oldStencil & video.WRITTEN_MASK) ||
				priority < oldPriority ||
				(priority === oldPriority && (oldStencil & video.BACKGROUND_MASK))
			) {
				backing.color[offset] = raw
					? row
					: video.palette.accessColor(layer, index);
				if (backing.unadjustedColor) {
					backing.unadjustedColor[offset] = backing.color[offset];
				}
				backing.stencil[offset] =
					video.WRITTEN_MASK |
					(oldStencil & video.OBJWIN_MASK) |
					(mask & ~video.TARGET1_MASK);
			}
			return;
		}

		var stencil;
		var blend = video.blendMode;
		if (mask & video.OBJWIN_MASK) {
			// OBJ-window pixels build a mask even when the OBJ display bit is
			// disabled in WINOUT. The mask only affects later layer pixels.
			backing.stencil[offset] = oldStencil | video.OBJWIN_MASK;
			return;
		}

		var windowRegion = video.windowRegionCache
			? video.windowRegionCache[offset]
			: video.windowRegionAt(offset, video.vcount, oldStencil);
		var effectsEnabled =
			windowRegion < 0 || video.windows[windowRegion].special;
		if (
			windowRegion >= 0 &&
			layer < video.LAYER_BACKDROP &&
			!video.windows[windowRegion].enabled[layer]
		) {
			return;
		}
		var objMode = !map || map.mode === undefined ? this.mode : map.mode;
		var semiTransparent = layer == video.LAYER_OBJ && objMode == 0x10;
		video.setBlendEnabled(
			layer,
			effectsEnabled && video.target1[layer],
			blend
		);
		mask &= ~video.TARGET1_MASK;
		if (
			effectsEnabled &&
			((blend == 1 && video.target1[layer]) || semiTransparent)
		) {
			mask |= video.TARGET1_MASK;
		}

		if ((mask & video.TARGET1_MASK) && (oldStencil & video.TARGET2_MASK)) {
			video.setBlendEnabled(layer, true, 1);
		}

		var pixel = raw ? row : video.palette.accessColor(layer, index);
		var originalPixel = raw
			? row
			: video.palette.colors
				? video.palette.colors[layer == video.LAYER_OBJ ? 1 : 0][index]
				: pixel;
		if (
			raw &&
			effectsEnabled &&
			video.target1[layer] &&
			(blend == 2 || blend == 3)
		) {
			pixel = video.palette.adjustColor(pixel);
		}
		var reverseSemiAlpha =
			(blend == 2 || blend == 3) &&
			(mask & video.TARGET2_MASK) &&
			(oldStencil & video.TARGET1_MASK);
		if (reverseSemiAlpha) {
			// Under brightness modes, a pre-existing TARGET1 is a
			// semi-transparent OBJ. Its alpha blend suppresses brightness on
			// both targets.
			pixel = originalPixel;
		}
		var didAlphaBlend = false;
		if (
			semiTransparent &&
			(mask & video.TARGET1_MASK) &&
			(oldStencil & video.TARGET2_MASK) &&
			!(oldStencil & video.WRITTEN_MASK)
		) {
			// The backdrop is a valid second target even when no BG pixel has
			// written to the scanline yet. Blend it here and clear TARGET1 so
			// finishScanline does not apply a second alpha pass in mode 1.
			var backdropColor = video.palette.colors
				? video.palette.colors[0][0]
				: video.palette.accessColor(video.LAYER_BACKDROP, 0);
			if (backing.unadjustedColor) {
				backdropColor = backing.unadjustedColor[offset];
			}
			pixel = video.palette.mix(
				video.blendA,
				pixel,
				video.blendB,
				backdropColor
			);
			mask &= ~video.TARGET1_MASK;
			didAlphaBlend = true;
		}

		stencil = video.WRITTEN_MASK | (oldStencil & video.OBJWIN_MASK);
		var highPriority = (mask & video.PRIORITY_MASK) < (oldStencil & video.PRIORITY_MASK);
		// Backgrounds can draw over each other, too.
		if ((mask & video.PRIORITY_MASK) == (oldStencil & video.PRIORITY_MASK)) {
			// A higher BG number loses BG-to-BG ties by draw order, while OBJ
			// pixels beat BG pixels at the same priority. OBJ-to-OBJ ties are
			// already resolved by the ascending OAM iteration order.
			highPriority = !!(oldStencil & video.BACKGROUND_MASK);
		}

		if (!(oldStencil & video.WRITTEN_MASK)) {
			// Nothing here yet, just continue
			stencil |= mask;
		}
		else if (highPriority) {
			// We are higher priority
			if (mask & video.TARGET1_MASK && oldStencil & video.TARGET2_MASK) {
				var target2Color = backing.color[offset];
				if (backing.unadjustedColor) {
					target2Color = backing.unadjustedColor[offset];
				}
				pixel = video.palette.mix(video.blendA, pixel, video.blendB, target2Color);
				didAlphaBlend = true;
			}
			// We just drew over something, so it doesn't make sense for us to be a TARGET1 anymore...
			stencil |= mask & ~video.TARGET1_MASK;
		}
		else if ((mask & video.PRIORITY_MASK) > (oldStencil & video.PRIORITY_MASK)) {
			// We're below another layer, but might be the blend target for it
			stencil = oldStencil & ~(video.TARGET1_MASK | video.TARGET2_MASK);
			if (mask & video.TARGET2_MASK && oldStencil & video.TARGET1_MASK) {
				var target1Color = backing.color[offset];
				if (backing.unadjustedColor) {
					target1Color = backing.unadjustedColor[offset];
				}
				pixel = video.palette.mix(video.blendB, pixel, video.blendA, target1Color);
				didAlphaBlend = true;
			}
			else {
				return;
			}
		}
		else {
			return;
		}

		backing.color[offset] = pixel;
		if (backing.unadjustedColor) {
			backing.unadjustedColor[offset] = didAlphaBlend ? pixel : originalPixel;
		}
		backing.stencil[offset] = stencil;
	}
	identity(x) {
		return x;
	}
	windowCoordinateInRange(coordinate, start, end) {
		// A reversed edge pair wraps through coordinate zero on the GBA.
		return start <= end
			? coordinate >= start && coordinate < end
			: coordinate >= start || coordinate < end;
	}
	drawScanlineBlank(backing, y) {
		for (var x = 0; x < this.HORIZONTAL_PIXELS; ++x) {
			backing.color[x] = 0xFFFF;
			if (backing.unadjustedColor) {
				backing.unadjustedColor[x] = 0xFFFF;
			}
			backing.stencil[x] = 0;
		}
		var offset = y * this.HORIZONTAL_PIXELS * 4;
		for (var pixel = 0; pixel < this.HORIZONTAL_PIXELS; ++pixel) {
			this.pixelData.data[offset++] = 0xFF;
			this.pixelData.data[offset++] = 0xFF;
			this.pixelData.data[offset++] = 0xFF;
			this.pixelData.data[offset++] = 0xFF;
		}
	}
	drawSelectedObjLayer(backing, layer) {
		for (var x = 0; x < this.HORIZONTAL_PIXELS; ++x) {
			var index = this.objIndex[x];
			var priority = this.objPriority[x];
			if (index == 0xFF || priority != layer.priority) {
				continue;
			}
			var obj = this.objOam.objs[index];
			var map = this.objRenderMap;
			map.index = index;
			map.palette = obj.palette;
			map.mode = this.objMode[x];
			var mask =
				map.mode |
				this.target2[this.LAYER_OBJ] |
				(priority << 1);
			if (map.mode == 0x10) {
				mask |= this.TARGET1_MASK;
			}
			if (this.blendMode == 1 && this.alphaEnabled) {
				mask |= this.target1[this.LAYER_OBJ];
			}
			obj.pushPixel(
				this.LAYER_OBJ,
				map,
				this,
				this.objPixelIndex[x],
				0,
				x,
				backing,
				mask,
				false
			);
		}
	}
	prepareScanline(backing) {
		for (var x = 0; x < this.HORIZONTAL_PIXELS; ++x) {
			backing.stencil[x] = this.target2[this.LAYER_BACKDROP];
			if (backing.unadjustedColor) {
				backing.unadjustedColor[x] = this.palette.colors[0][0];
			}
		}
	}
	windowRegionAt(x, y, stencil) {
		if (!(this.win0 || this.win1 || this.objwin)) {
			return -1;
		}
		if (
			this.win0 &&
			this.windowCoordinateInRange(y, this.win0Top, this.win0Bottom) &&
			this.windowCoordinateInRange(x, this.win0Left, this.win0Right)
		) {
			return 0;
		}
		if (
			this.win1 &&
			this.windowCoordinateInRange(y, this.win1Top, this.win1Bottom) &&
			this.windowCoordinateInRange(x, this.win1Left, this.win1Right)
		) {
			return 1;
		}
		if (this.objwin && stencil & this.OBJWIN_MASK) {
			return 3;
		}
		return 2;
	}
	drawScanlineBGMode0(backing, bg, start, end) {
		var video = this.video;
		var x;
		var y = video.vcount;
		var offset = start;
		var xOff = bg.x;
		var yOff = bg.y;
		var localX;
		var localXLo;
		var localY = y + yOff;
		if (this.mosaic) {
			localY -= y % video.bgMosaicY;
		}
		var localYLo = localY & 0x7;
		var mosaicX;
		var screenBase = bg.screenBase;
		var charBase = bg.charBase;
		var size = bg.size;
		var index = bg.index;
		var map = video.sharedMap;
		var paletteShift = bg.multipalette ? 1 : 0;
		var mask = video.target2[index] | (bg.priority << 1) | video.BACKGROUND_MASK;
		if (video.blendMode == 1 && video.alphaEnabled) {
			mask |= video.target1[index];
		}

		var yBase = (localY << 3) & 0x7C0;
		if (size == 2) {
			yBase += (localY << 3) & 0x800;
		}
		else if (size == 3) {
			yBase += (localY << 4) & 0x1000;
		}

		var xMask;
		if (size & 1) {
			xMask = 0x1FF;
		}
		else {
			xMask = 0xFF;
		}

		// BG mosaic repeats from the left edge of each screen-space block;
		// snap before wrapping into the text map so clipped draws start alike.
		var startMosaicX = this.mosaic ? start % video.bgMosaicX : 0;
		var startLocalX = (start + xOff - startMosaicX) & xMask;
		video.accessMapMode0(screenBase, size, startLocalX, yBase, map);
		var startTileBase = charBase;
		// 8bpp rows are fetched four pixels at a time, so clipped starts may
		// need the second word before the first scanline pixel is drawn.
		if (
			paletteShift &&
			(!!(startLocalX & 0x4) == !map.hflip)
		) {
			startTileBase += 4;
		}
		var tileRow = video.accessTile(
			startTileBase,
			map.tile << paletteShift,
			(!map.vflip ? localYLo : 7 - localYLo) << paletteShift
		);
		for (x = start; x < end; ++x) {
			mosaicX = this.mosaic ? offset % video.bgMosaicX : 0;
			localX = (x + xOff - mosaicX) & xMask;
			localXLo = localX & 0x7;
			if (!paletteShift) {
				if (!localXLo || (this.mosaic && !mosaicX)) {
					video.accessMapMode0(screenBase, size, localX, yBase, map);
					tileRow = video.accessTile(charBase, map.tile, !map.vflip ? localYLo : 7 - localYLo);
					if (!tileRow && !localXLo) {
						x += 7;
						offset += 8;
						continue;
					}
				}
			}
			else {
				if (!localXLo || (this.mosaic && !mosaicX)) {
					video.accessMapMode0(screenBase, size, localX, yBase, map);
				}
				if (!(localXLo & 0x3) || (this.mosaic && !mosaicX)) {
					tileRow = video.accessTile(charBase + (!!(localX & 0x4) == !map.hflip ? 4 : 0), map.tile << 1, (!map.vflip ? localYLo : 7 - localYLo) << 1);
					if (!tileRow && !(localXLo & 0x3)) {
						x += 3;
						offset += 4;
						continue;
					}
				}
			}
			if (map.hflip) {
				localXLo = 7 - localXLo;
			}
			bg.pushPixel(index, map, video, tileRow, localXLo, offset, backing, mask, false);
			offset++;
		}
	}
	drawScanlineBGMode2(backing, bg, start, end) {
		var video = this.video;
		var x;
		var y = video.vcount;
		var offset = start;
		var localX;
		var localY;
		var screenBase = bg.screenBase;
		var charBase = bg.charBase;
		var size = bg.size;
		var sizeAdjusted = 128 << size;
		var index = bg.index;
		var map = video.sharedMap;
		var color;
		var mask = video.target2[index] | (bg.priority << 1) | video.BACKGROUND_MASK;
		if (video.blendMode == 1 && video.alphaEnabled) {
			mask |= video.target1[index];
		}

		var yBase;

		for (x = start; x < end; ++x) {
			localX = bg.dx * x + bg.sx;
			localY = bg.dy * x + bg.sy;
			if (this.mosaic) {
				localX -= (x % video.bgMosaicX) * bg.dx + (y % video.bgMosaicY) * bg.dmx;
				localY -= (x % video.bgMosaicX) * bg.dy + (y % video.bgMosaicY) * bg.dmy;
			}
			// Affine coordinates are 8.8 fixed point. Sampling uses the integer
			// texel selected by an arithmetic shift, which floors negative
			// fractions instead of truncating them toward zero.
			localX = Math.floor(localX);
			localY = Math.floor(localY);
			if (bg.overflow) {
				localX &= sizeAdjusted - 1;
				localY &= sizeAdjusted - 1;
			}
			else if (localX < 0 || localY < 0 || localX >= sizeAdjusted || localY >= sizeAdjusted) {
				offset++;
				continue;
			}
			yBase = ((localY << 1) & 0x7F0) << size;
			video.accessMapMode1(screenBase, size, localX, yBase, map);
			color = this.vram.loadU8(charBase + (map.tile << 6) + ((localY & 0x7) << 3) + (localX & 0x7));
			bg.pushPixel(index, map, video, color, 0, offset, backing, mask, false);
			offset++;
		}
	}
	drawScanlineBGMode3(backing, bg, start, end) {
		var video = this.video;
		var x;
		var y = video.vcount;
		var offset = start;
		var localX;
		var localY;
		var index = bg.index;
		var map = video.sharedMap;
		var color;
		var mask = video.target2[index] | (bg.priority << 1) | video.BACKGROUND_MASK;
		if (video.blendMode == 1 && video.alphaEnabled) {
			mask |= video.target1[index];
		}

		for (x = start; x < end; ++x) {
			localX = bg.dx * x + bg.sx;
			localY = bg.dy * x + bg.sy;
			if (this.mosaic) {
				localX -= (x % video.bgMosaicX) * bg.dx + (y % video.bgMosaicY) * bg.dmx;
				localY -= (x % video.bgMosaicX) * bg.dy + (y % video.bgMosaicY) * bg.dmy;
			}
			localX = Math.floor(localX);
			localY = Math.floor(localY);
			if (localX < 0 || localY < 0 || localX >= video.HORIZONTAL_PIXELS || localY >= video.VERTICAL_PIXELS) {
				offset++;
				continue;
			}
			color = this.vram.loadU16(((localY * video.HORIZONTAL_PIXELS) + localX) << 1);
			bg.pushPixel(index, map, video, color, 0, offset, backing, mask, true);
			offset++;
		}
	}
	drawScanlineBGMode4(backing, bg, start, end) {
		var video = this.video;
		var x;
		var y = video.vcount;
		var offset = start;
		var localX;
		var localY;
		var charBase = 0;
		if (video.displayFrameSelect) {
			charBase += 0xA000;
		}
		var size = bg.size;
		var index = bg.index;
		var map = video.sharedMap;
		var color;
		var mask = video.target2[index] | (bg.priority << 1) | video.BACKGROUND_MASK;
		if (video.blendMode == 1 && video.alphaEnabled) {
			mask |= video.target1[index];
		}

		// Most bitmap backgrounds use an unscaled identity transform. Handle that
		// common case without multiplying and flooring coordinates for every
		// pixel; fractional reference origins still use the same floor semantics.
		if (!this.mosaic && bg.dx === 1 && bg.dy === 0) {
			localY = Math.floor(bg.sy);
			if (localY < 0 || localY >= video.VERTICAL_PIXELS) {
				return;
			}
			localX = Math.floor(bg.sx);
			var rowOffset = charBase + localY * video.HORIZONTAL_PIXELS;
			for (x = start; x < end; ++x) {
				var sourceX = localX + x;
				if (sourceX >= 0 && sourceX < video.HORIZONTAL_PIXELS) {
					color = this.vram.loadU8(rowOffset + sourceX);
					bg.pushPixel(
						index,
						map,
						video,
						color,
						0,
						offset,
						backing,
						mask,
						false
					);
				}
				++offset;
			}
			return;
		}

		for (x = start; x < end; ++x) {
			localX = bg.dx * x + bg.sx;
			localY = bg.dy * x + bg.sy;
			if (this.mosaic) {
				localX -= (x % video.bgMosaicX) * bg.dx + (y % video.bgMosaicY) * bg.dmx;
				localY -= (x % video.bgMosaicX) * bg.dy + (y % video.bgMosaicY) * bg.dmy;
			}
			localX = Math.floor(localX);
			localY = Math.floor(localY);
			if (localX < 0 || localY < 0 || localX >= video.HORIZONTAL_PIXELS || localY >= video.VERTICAL_PIXELS) {
				offset++;
				continue;
			}
			color = this.vram.loadU8(charBase + (localY * video.HORIZONTAL_PIXELS) + localX);
			bg.pushPixel(index, map, video, color, 0, offset, backing, mask, false);
			offset++;
		}
	}
	drawScanlineBGMode5(backing, bg, start, end) {
		var video = this.video;
		var x;
		var y = video.vcount;
		var offset = start;
		var localX;
		var localY;
		var charBase = 0;
		if (video.displayFrameSelect) {
			charBase += 0xA000;
		}
		var index = bg.index;
		var map = video.sharedMap;
		var color;
		var mask = video.target2[index] | (bg.priority << 1) | video.BACKGROUND_MASK;
		if (video.blendMode == 1 && video.alphaEnabled) {
			mask |= video.target1[index];
		}

		for (x = start; x < end; ++x) {
			localX = bg.dx * x + bg.sx;
			localY = bg.dy * x + bg.sy;
			if (this.mosaic) {
				localX -= (x % video.bgMosaicX) * bg.dx + (y % video.bgMosaicY) * bg.dmx;
				localY -= (x % video.bgMosaicX) * bg.dy + (y % video.bgMosaicY) * bg.dmy;
			}
			localX = Math.floor(localX);
			localY = Math.floor(localY);
			if (localX < 0 || localY < 0 || localX >= 160 || localY >= 128) {
				offset++;
				continue;
			}
			color = this.vram.loadU16(charBase + (((localY * 160) + localX) << 1));
			bg.pushPixel(index, map, video, color, 0, offset, backing, mask, true);
			offset++;
		}
	}
	drawScanline(y) {
		var backing = this.scanline;
		this.objCycleLimitReady = false;
		// OBJ attributes are fetched one line ahead by the display pipeline.
		// The final V-Blank line primes line 0; isolated calls and scanline jumps
		// still start a fresh latch from the current OAM state.
		var previousObjScanline = y === 0
			? this.VERTICAL_TOTAL_PIXELS - 1
			: y - 1;
		if (
			this.lastObjScanline === null ||
			this.lastObjScanline !== previousObjScanline
		) {
			this.stageObjOam();
		}
		if (this.forcedBlank) {
			this.vcount = y;
			this.drawScanlineBlank(backing, y);
			this.advanceAffineReferencePoints();
			this.stageObjOam();
			this.lastObjScanline = y;
			return;
		}
		this.prepareScanline(backing);
		this.vcount = y;
		if (this.objLayers[0].enabled) {
			this.prepareObjCycles(y);
		}
		if (this.objLayers[0].enabled) {
			this.objPriority.fill(0xFF);
			this.objIndex.fill(0xFF);
			this.objPriorityPass = true;
			var objLayer = this.objLayers[0];
			var objPriority = objLayer.priority;
			objLayer.priority = -1;
			objLayer.drawScanline(
				backing,
				objLayer,
				0,
				this.HORIZONTAL_PIXELS
			);
			objLayer.priority = objPriority;
			this.objPriorityPass = false;
		}
		// OBJ-window coverage must be known before BG and OBJ composition. Run
		// it after normal OBJ selection so transparent window texels can promote
		// the priority of already-selected sprites, as on hardware.
		if (this.objwinLayer.enabled) {
			this.objPriorityPass = "objwin";
			this.objwinLayer.drawScanline(
				backing,
				this.objwinLayer,
				0,
				this.HORIZONTAL_PIXELS
			);
			this.objPriorityPass = false;
		}
		if (!(this.win0 || this.win1 || this.objwin)) {
			// With no windows, every pixel belongs to the unrestricted outside
			// region. Avoid resolving and run-length encoding the same state 240
			// times for every scanline.
			this.windowRegionIndices.fill(-1);
			this.windowRegionCache = this.windowRegionIndices;
			this.windowRegionRunCount = 1;
			this.windowRegionRunStarts[0] = 0;
			this.windowRegionRunEnds[0] = this.HORIZONTAL_PIXELS;
			this.windowRegionRunRegions[0] = -1;
		} else {
			// Window geometry is constant for the rest of this scanline, so
			// resolve each pixel's region once instead of repeating the checks per
			// layer.
			for (var x = 0; x < this.HORIZONTAL_PIXELS; ++x) {
				this.windowRegionIndices[x] = this.windowRegionAt(
					x,
					y,
					backing.stencil[x]
				);
			}
			this.windowRegionCache = this.windowRegionIndices;
			// Keep a compact list of contiguous regions so clipped layers do not
			// sample pixels that their active window has disabled.
			this.windowRegionRunCount = 0;
			var runStart = 0;
			var runRegion = this.windowRegionIndices[0];
			for (x = 1; x < this.HORIZONTAL_PIXELS; ++x) {
				if (this.windowRegionIndices[x] != runRegion) {
					var run = this.windowRegionRunCount++;
					this.windowRegionRunStarts[run] = runStart;
					this.windowRegionRunEnds[run] = x;
					this.windowRegionRunRegions[run] = runRegion;
					runStart = x;
					runRegion = this.windowRegionIndices[x];
				}
			}
			var run = this.windowRegionRunCount++;
			this.windowRegionRunStarts[run] = runStart;
			this.windowRegionRunEnds[run] = this.HORIZONTAL_PIXELS;
			this.windowRegionRunRegions[run] = runRegion;
		}
		// Draw lower priority first; pushPixel applies the cached window mask.
		for (var i = 0; i < this.drawLayers.length; ++i) {
			var layer = this.drawLayers[i];
			if (!layer.enabled || layer === this.objwinLayer) {
				continue;
			}
			if (layer.index == this.LAYER_OBJ) {
				// Separate OBJ layers resolve OBJ-to-BG priority after the OBJ
				// priority/OAM-order pass has selected one pixel per screen position.
				this.drawSelectedObjLayer(backing, layer);
			} else {
				for (var run = 0; run < this.windowRegionRunCount; ++run) {
					var region = this.windowRegionRunRegions[run];
					if (
						region >= 0 &&
						!this.windows[region].enabled[layer.index]
					) {
						continue;
					}
					layer.drawScanline(
						backing,
						layer,
						this.windowRegionRunStarts[run],
						this.windowRegionRunEnds[run]
					);
				}
			}
		}

		this.finishScanline(backing);
		this.advanceAffineReferencePoints();
		this.objCycleLimitReady = false;
		this.windowRegionCache = null;
		// Latch the OAM currently visible to the PPU for the next scanline.
		// H-Blank DMA runs after this method, so its writes take effect one line
		// later, matching the hardware's OBJ pipeline.
		this.stageObjOam();
		this.lastObjScanline = y;
	}
	advanceAffineReferencePoints() {
		// BG2/BG3 reference counters advance each visible line even when the
		// layer is disabled or the display is forced blank.
		for (var bg = 2; bg < 4; ++bg) {
			this.bg[bg].sx += this.bg[bg].dmx;
			this.bg[bg].sy += this.bg[bg].dmy;
		}
	}
	prepareObjCycles(y) {
		// Keep this helper useful when called directly by diagnostics/tests,
		// before the renderer has established its scanline pipeline.
		if (this.lastObjScanline === null) {
			this.stageObjOam();
		}
		var objs = this.objOam.objs;
		var cyclesRemaining = this.hblankIntervalFree ? 954 : 1210;
		this.objCycleAllowed.fill(0);

		for (var i = 0; i < objs.length; ++i) {
			var obj = objs[i];
			// Every OAM entry costs two cycles to scan, including disabled OBJs
			// and OBJs that do not intersect this scanline.
			cyclesRemaining -= 2;
			if (cyclesRemaining <= 0) {
				break;
			}
			if (obj.disable) {
				continue;
			}

			var width = obj.cachedWidth;
			var height = obj.cachedHeight;
			if (obj.scalerot && obj.doublesize) {
				width <<= 1;
				height <<= 1;
			}
			if (obj.scanlineOrigin(y) !== null) {
				this.objCycleAllowed[obj.index] = 1;
				// The scan cost above supplies two cycles of each OBJ's total
				// rendering cost. Normal OBJs use one cycle per pixel of width;
				// affine OBJs use two cycles per output pixel plus eight setup cycles.
				// Pixels clipped off the left edge reduce the drawing cost. Fully
				// left-clipped non-affine OBJs do not fetch any pixels at all.
				var x = obj.x < 256 ? obj.x : obj.x - 512;
				var spriteCycles = obj.scalerot ? 8 + (width << 1) : width - 2;
				if (x < 0) {
					if (obj.scalerot) {
						var clippedWidth = Math.min(-x, width);
						spriteCycles -= clippedWidth << 1;
					}
					else {
						if (x + width < 0) {
							continue;
						}
						spriteCycles += x >> 1;
					}
				}
				cyclesRemaining -= spriteCycles;
			}
		}

		this.objCycleLimitReady = true;
	}
	finishScanline(backing) {
		var color;
		var backdrop = this.palette.colors[0][0];
		var xx = this.vcount * this.HORIZONTAL_PIXELS * 4;
		if (!(this.win0 || this.win1 || this.objwin) && this.blendMode === 0) {
			var data = this.pixelData.data;
			for (var x = 0; x < this.HORIZONTAL_PIXELS; ++x) {
				color = backing.stencil[x] & this.WRITTEN_MASK
					? backing.color[x]
					: backdrop;
				data[xx++] = (color & 0x001f) << 3;
				data[xx++] = (color & 0x03e0) >> 2;
				data[xx++] = (color & 0x7c00) >> 7;
				++xx;
			}
			return;
		}
		var isTarget2 = this.target2[this.LAYER_BACKDROP];
		for (var x = 0; x < this.HORIZONTAL_PIXELS; ++x) {
			var stencil = backing.stencil[x];
			var region = this.windowRegionCache
				? this.windowRegionCache[x]
				: this.windowRegionAt(x, this.vcount, stencil);
			var effectsEnabled =
				region < 0 || this.windows[region].special;
			var backdropColor = backdrop;
			if (
				effectsEnabled &&
				this.target1[this.LAYER_BACKDROP] &&
				(this.blendMode == 2 || this.blendMode == 3)
			) {
				backdropColor = this.palette.adjustColor(backdropColor);
			}
			if (stencil & this.WRITTEN_MASK) {
				color = backing.color[x];
				if (
					effectsEnabled &&
					this.blendMode == 1 &&
					isTarget2 &&
					stencil & this.TARGET1_MASK
				) {
					color = this.palette.mix(
						this.blendA,
						color,
						this.blendB,
						backdrop
					);
				}
				this.palette.convert16To32(color, this.sharedColor);
			}
			else {
				this.palette.convert16To32(backdropColor, this.sharedColor);
			}
			this.pixelData.data[xx++] = this.sharedColor[0];
			this.pixelData.data[xx++] = this.sharedColor[1];
			this.pixelData.data[xx++] = this.sharedColor[2];
			xx++;
		}
	}
	startDraw() {
		// Nothing to do
	}
	finishDraw(caller) {
		this.bg[2].sx = this.bg[2].refx;
		this.bg[2].sy = this.bg[2].refy;
		this.bg[3].sx = this.bg[3].refx;
		this.bg[3].sy = this.bg[3].refy;
		caller.finishDraw(this.pixelData);
	}
}
