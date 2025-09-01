import { describe, expect, it, vi } from 'vitest';

import { downloadBlob } from './blob.ts';

describe('downloadBlob', () => {
  it('should click anchor and download file', async () => {
    vi.useFakeTimers();

    // unimplemented in jsdom
    URL.createObjectURL = vi.fn(() => 'object_url:test-download.txt');
    URL.revokeObjectURL = vi.fn();

    const anchorClickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockReturnValue();
    const anchorRemoveSpy = vi.spyOn(HTMLAnchorElement.prototype, 'remove');

    const blob = new Blob(['hello world'], {
      type: 'text/plain'
    });

    downloadBlob('test-download.txt', blob);

    await vi.runAllTimersAsync();

    expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(
      expect.stringMatching(/object_url:test-download\.txt$/)
    );

    expect(anchorClickSpy).toHaveBeenCalledOnce();
    expect(anchorRemoveSpy).toHaveBeenCalledOnce();

    vi.useRealTimers();
  });
});
