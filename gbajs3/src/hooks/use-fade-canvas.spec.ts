import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useFadeCanvas } from './use-fade-canvas.tsx';

describe('useFadeCanvas', () => {
  beforeEach(() => {
    vi.useFakeTimers();

    vi.stubGlobal(
      'Image',
      class {
        onload: (() => void) | null = null;
        _src = '';

        set src(value: string) {
          this._src = value;
          setTimeout(() => {
            if (this.onload) this.onload();
          }, 0);
        }

        get src() {
          return this._src;
        }
      }
    );

    vi.stubGlobal('URL', {
      createObjectURL: () => 'blob:url',
      revokeObjectURL: vi.fn()
    });

    HTMLCanvasElement.prototype.getContext = function (contextId: string) {
      if (contextId === '2d') {
        return {
          drawImage: vi.fn(),
          getImageData: vi.fn(() => ({
            data: new Uint8ClampedArray(40000),
            width: 0,
            height: 0
          })),
          putImageData: vi.fn()
        };
      } else if (contextId === 'webgl2') {
        return {
          clearColor: vi.fn(),
          clear: vi.fn(),
          COLOR_BUFFER_BIT: 0x4000
        };
      }
      return null;
    } as typeof HTMLCanvasElement.prototype.getContext;
  });

  it('does nothing if canvas or screenshot is null', () => {
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
    const { result } = renderHook(() => useFadeCanvas());

    act(() => {
      result.current.startFade(null, new Blob());
      result.current.startFade(document.createElement('canvas'), null);
    });

    expect(setIntervalSpy).not.toHaveBeenCalled();
  });

  it('clears interval after drawCountMax', async () => {
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');

    const canvas = document.createElement('canvas');
    const parent = document.createElement('div');
    parent.appendChild(canvas);
    document.body.appendChild(parent);

    const originalAppendChild = parent.appendChild.bind(parent);

    vi.spyOn(parent, 'appendChild').mockImplementation((node) =>
      originalAppendChild(node)
    );

    const blob = new Blob();
    const { result } = renderHook(() => useFadeCanvas());

    act(() => result.current.startFade(canvas, blob));

    vi.advanceTimersByTime(50 * 41); // drawIntervalTimeout * drawCountMax + 1

    expect(clearIntervalSpy).toHaveBeenCalled();
    expect(parent.contains(canvas)).toBe(true);
  });
});
