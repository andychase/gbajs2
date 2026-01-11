import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import { useInterval } from './use-interval.ts';

describe('useInterval', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('should call the callback at the specified interval', () => {
    const callback = vi.fn();

    renderHook(() => {
      useInterval(callback, 1000);
    });

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(callback).toHaveBeenCalledTimes(3);
  });

  it('should not call the callback if delay is null', () => {
    const callback = vi.fn();

    renderHook(() => {
      useInterval(callback, null);
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it('should not call the callback after unmounting', () => {
    const callback = vi.fn();

    const { unmount } = renderHook(() => {
      useInterval(callback, 1000);
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(callback).toHaveBeenCalledTimes(1);

    unmount();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should update the callback without resetting the interval', () => {
    const initialCallback = vi.fn();
    const updatedCallback = vi.fn();

    const { rerender } = renderHook(
      ({ callback }) => {
        useInterval(callback, 1000);
      },
      {
        initialProps: { callback: initialCallback }
      }
    );

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(initialCallback).toHaveBeenCalledTimes(1);
    expect(updatedCallback).not.toHaveBeenCalled();

    rerender({ callback: updatedCallback });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(initialCallback).toHaveBeenCalledTimes(1);
    expect(updatedCallback).toHaveBeenCalledTimes(1);
  });

  it('should update the interval when delay changes', () => {
    const callback = vi.fn();

    const { rerender } = renderHook(
      ({ delay }) => {
        useInterval(callback, delay);
      },
      {
        initialProps: { delay: 1000 }
      }
    );

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(callback).toHaveBeenCalledTimes(1);

    rerender({ delay: 200 });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(callback).toHaveBeenCalledTimes(3);
  });

  it('should clear the interval when delay becomes null', () => {
    const callback = vi.fn();
    const initialProps: { delay: number | null } = { delay: 1000 };

    const { rerender } = renderHook(
      ({ delay }: { delay: number | null }) => {
        useInterval(callback, delay);
      },
      {
        initialProps: initialProps
      }
    );

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(callback).toHaveBeenCalledTimes(1);

    rerender({ delay: null });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(callback).toHaveBeenCalledTimes(1);
  });
});
