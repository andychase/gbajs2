import { domToCanvas } from 'modern-screenshot';

// uses a webgl canvas context,
// clears the canvas to all black immediately
const clearWebGlCanvas = (canvas: HTMLCanvasElement) => {
  const gl = canvas.getContext('webgl');

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

// takes in a canvas ref, and a func to render to ensure our canvas has content.
// copies the canvas given to a new 2d canvas under the same parent,
// then lcd fades the copied canvas before clearing the original canvas
export const fadeCanvas = (
  canvas: HTMLCanvasElement | null,
  renderFunc: (callback: () => void) => void
) => {
  if (!canvas) return;

  renderFunc(() =>
    domToCanvas(canvas, {
      width: canvas.width,
      height: canvas.height
    })
      .then((copyCanvas) => {
        copyCanvas.style.width = `${canvas.clientWidth}px`;
        copyCanvas.style.height = `${canvas.clientHeight}px`;
        copyCanvas.style.backgroundColor = 'black';
        copyCanvas.style.imageRendering = 'pixelated';
        copyCanvas.style.position = 'absolute';
        copyCanvas.style.top = '0';
        copyCanvas.style.left = '0';
        copyCanvas.style.right = '0';
        copyCanvas.style.margin = '0 auto';
        copyCanvas.style.objectFit = 'contain';
        canvas.parentElement?.appendChild(copyCanvas);

        lcdFade2d(copyCanvas);
        clearWebGlCanvas(canvas);
        // if necessary additionally clear 2d canvas
      })
      .catch((e) => {
        console.error(`screen to canvas has failed: ${e}`);
      })
  );
};
