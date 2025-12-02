import { describe, expect, it, vi } from 'vitest';

import { downloadBlob } from './blob.ts';

describe('downloadBlob', () => {
  it('should click anchor and download file', async () => {
    vi.useFakeTimers();

    const createObjectURLSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('object_url:test-download.txt');
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL');

    const anchorClickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockReturnValue();
    const anchorRemoveSpy = vi.spyOn(HTMLAnchorElement.prototype, 'remove');

    const blob = new Blob(['hello world'], {
      type: 'text/plain'
    });

    downloadBlob('test-download.txt', blob);

    await vi.runAllTimersAsync();

    expect(createObjectURLSpy).toHaveBeenCalledWith(blob);
    expect(revokeObjectURLSpy).toHaveBeenCalledWith(
      expect.stringMatching(/object_url:test-download\.txt$/)
    );

    expect(anchorClickSpy).toHaveBeenCalledOnce();
    expect(anchorRemoveSpy).toHaveBeenCalledOnce();

    vi.useRealTimers();
  });
});
