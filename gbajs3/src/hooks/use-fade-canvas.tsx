import { useRef, useCallback } from 'react';

const drawCountMax = 40;
const drawIntervalTimeout = 50;

// uses a webgl canvas context,
// clears the canvas to all black immediately
const clearWebGlCanvas = (canvas: HTMLCanvasElement) => {
  const gl = canvas.getContext('webgl2');

  gl?.clearColor(0.0, 0.0, 0.0, 1.0);
  gl?.clear(gl.COLOR_BUFFER_BIT);
};

export const useFadeCanvas = () => {
  const intervalRef = useRef<number | null>(null);
  const copyCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const cancelFade = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (copyCanvasRef.current) {
      copyCanvasRef.current.remove();
      copyCanvasRef.current = null;
    }
  }, []);

  const startFade = useCallback(
    (canvas: HTMLCanvasElement | null, screenshot: Blob | null) => {
      cancelFade();

      if (!canvas || !screenshot) return;

      const copyCanvas = document.createElement('canvas');
      const ctx = copyCanvas.getContext('2d');
      const url = URL.createObjectURL(screenshot);

      copyCanvas.width = canvas.width;
      copyCanvas.height = canvas.height;
      copyCanvas.className = canvas.className;
      copyCanvas.style.cssText = canvas.style.cssText;
      copyCanvas.style.position = 'absolute';
      copyCanvas.style.top = '0';
      copyCanvas.style.left = '0';
      copyCanvas.style.right = '0';
      copyCanvas.setAttribute('role', 'presentation');

      const fadeImage = new Image();
      fadeImage.onload = () => {
        ctx?.drawImage(fadeImage, 0, 0);
        canvas.parentElement?.appendChild(copyCanvas);
        clearWebGlCanvas(canvas);

        const context = copyCanvas.getContext('2d');
        if (!context) return;

        let drawCount = 0;
        const videoWidth = copyCanvas.width;
        const videoHeight = copyCanvas.height;
        const halfVideoWidth = videoWidth / 2;
        const halfVideoHeight = videoHeight / 2;
        const pixelData = context.getImageData(0, 0, videoWidth, videoHeight);

        intervalRef.current = window.setInterval(() => {
          drawCount++;

          for (let y = 0; y < videoHeight; ++y) {
            for (let x = 0; x < videoWidth; ++x) {
              const xDiff = Math.abs(x - halfVideoWidth);
              const yDiff = Math.abs(y - halfVideoHeight) * 0.8;
              const xFactor =
                (halfVideoWidth - drawCount - xDiff) / halfVideoWidth;
              const yFactor =
                (halfVideoHeight -
                  drawCount -
                  (y & 1) * 10 -
                  yDiff +
                  Math.pow(xDiff, 1 / 2)) /
                halfVideoHeight;

              const index = (x + y * videoWidth) * 4 + 3;
              pixelData.data[index] *=
                Math.pow(xFactor, 1 / 3) * Math.pow(yFactor, 1 / 2);
            }
          }

          context.putImageData(pixelData, 0, 0);

          if (drawCount > drawCountMax) cancelFade();
        }, drawIntervalTimeout);
      };

      fadeImage.src = url;
      copyCanvasRef.current = copyCanvas;

      return cancelFade;
    },
    [cancelFade]
  );

  return { startFade, cancelFade };
};
