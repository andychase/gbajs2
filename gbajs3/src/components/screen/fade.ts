// uses a webgl canvas context,
// clears the canvas to all black immediately
const clearWebGlCanvas = (canvas: HTMLCanvasElement) => {
  const gl = canvas.getContext('webgl2');

  gl?.clearColor(0.0, 0.0, 0.0, 1.0);
  gl?.clear(gl?.COLOR_BUFFER_BIT);
};

// uses a 2d canvas context,
// fades the canvas in a radial LCD fashion
const lcdFade2d = (canvas: HTMLCanvasElement) => {
  const context = canvas.getContext('2d'),
    drawCountMax = 40,
    drawIntervalTimeout = 50;
  let drawCount = 0;

  if (!context) return;

  const videoWidth = canvas.width;
  const videoHeight = canvas.height;
  const halfVideoWidth = videoWidth / 2;
  const halfVideoHeight = videoHeight / 2;

  const pixelData = context.getImageData(0, 0, videoWidth, videoHeight);

  const drawInterval = setInterval(() => {
    drawCount++;

    for (let y = 0; y < videoHeight; ++y) {
      for (let x = 0; x < videoWidth; ++x) {
        const xDiff = Math.abs(x - halfVideoWidth);
        const yDiff = Math.abs(y - halfVideoHeight) * 0.8;
        const xFactor = (halfVideoWidth - drawCount - xDiff) / halfVideoWidth;
        const yFactor =
          (halfVideoHeight -
            drawCount -
            (y & 1) * 10 -
            yDiff +
            Math.pow(xDiff, 1 / 2)) /
          halfVideoHeight;

        pixelData.data[(x + y * videoWidth) * 4 + 3] *=
          Math.pow(xFactor, 1 / 3) * Math.pow(yFactor, 1 / 2);
      }
    }

    context.putImageData(pixelData, 0, 0);

    if (drawCount > drawCountMax) {
      clearInterval(drawInterval);
      canvas.remove();
    }
  }, drawIntervalTimeout);
};

// fadeCanvas takes in a canvas ref, and a blob representing the last frame rendered.
// It copies the screenshot frame to a new 2d canvas under the same parent,
// then lcd fades the copied canvas and clears the original canvas
export const fadeCanvas = (
  canvas: HTMLCanvasElement | null,
  screenshot: Blob | null
) => {
  if (!canvas || !screenshot) return;

  const copyCanvas = document.createElement('canvas');
  const context = copyCanvas.getContext('2d');
  const url = URL.createObjectURL(screenshot);

  copyCanvas.className = canvas.className;
  copyCanvas.height = canvas.height;
  copyCanvas.width = canvas.width;
  copyCanvas.style.backgroundColor = canvas.style.backgroundColor;
  copyCanvas.style.height = `${canvas.clientHeight}px`;
  copyCanvas.style.imageRendering = canvas.style.imageRendering;
  copyCanvas.style.margin = canvas.style.margin;
  copyCanvas.style.objectFit = canvas.style.objectFit;
  copyCanvas.style.width = `${canvas.clientWidth}px`;
  copyCanvas.style.position = 'absolute';
  copyCanvas.style.top = '0';
  copyCanvas.style.left = '0';
  copyCanvas.style.right = '0';

  const fadeImage = new Image();
  fadeImage.onload = () => {
    context?.drawImage(fadeImage, 0, 0);
    canvas.parentElement?.appendChild(copyCanvas);

    clearWebGlCanvas(canvas);
    lcdFade2d(copyCanvas);
  };
  fadeImage.src = url;
};
