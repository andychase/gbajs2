import { PromptLocalStorageKey } from 'react-ios-pwa-prompt-ts';
import { describe, expect, it, vi } from 'vitest';

import * as contextHooks from './context.tsx';
import { useShowLoadPublicRoms } from './use-show-load-public-roms.tsx';
import { testRomLocation } from '../../test/mocks/handlers.ts';
import { renderHookWithContext } from '../../test/render-hook-with-context.tsx';
import { productTourLocalStorageKey } from '../components/product-tour/consts.tsx';

const valid_url = `${testRomLocation}/good_rom.gba`;
const invalid_url = `bad url`;

describe('useShowLoadPublicRoms', () => {
  it('should open modal if all conditions are met', async () => {
    const setIsModalOpenSpy = vi.fn();
    const setModalContextSpy = vi.fn();
    const isModalOpenSpy = vi.fn(() => true).mockReturnValueOnce(false);
    const { useModalContext: original } = await vi.importActual<
      typeof contextHooks
    >('./context.tsx');

    // tour intro must be completed
    localStorage.setItem(
      productTourLocalStorageKey,
      '{"hasCompletedProductTourIntro":"finished"}'
    );
    // pwa prompt must also have appeared if iOS and been dismissed if so
    localStorage.setItem(PromptLocalStorageKey, '{"isiOS":"true","visits":2}');

    vi.spyOn(window, 'location', 'get').mockReturnValue({
      search: `?romURL=${valid_url}`
    } as Location);

    vi.spyOn(contextHooks, 'useModalContext').mockImplementation(() => ({
      ...original(),
      setModalContent: setModalContextSpy,
      setIsModalOpen: setIsModalOpenSpy,
      isModalOpen: isModalOpenSpy()
    }));

    renderHookWithContext(() => useShowLoadPublicRoms());

    expect(setModalContextSpy).toHaveBeenCalledOnce();
    expect(setModalContextSpy).toHaveBeenCalledWith(expect.anything());
  });

  it('marks url as error if invalid', async () => {
    const setIsModalOpenSpy = vi.fn();
    const setModalContextSpy = vi.fn();
    const { useModalContext: original } = await vi.importActual<
      typeof contextHooks
    >('./context.tsx');

    // tour intro must be completed
    localStorage.setItem(
      productTourLocalStorageKey,
      '{"hasCompletedProductTourIntro":"finished"}'
    );
    // pwa prompt must also have appeared if iOS and been dismissed if so
    localStorage.setItem(PromptLocalStorageKey, '{"isiOS":"true","visits":2}');

    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    vi.spyOn(window, 'location', 'get').mockReturnValue({
      search: `?romURL=${invalid_url}`
    } as Location);

    vi.spyOn(contextHooks, 'useModalContext').mockImplementation(() => ({
      ...original(),
      setModalContent: setModalContextSpy,
      setIsModalOpen: setIsModalOpenSpy
    }));

    renderHookWithContext(() => useShowLoadPublicRoms());

    expect(setModalContextSpy).not.toHaveBeenCalled();
    expect(setModalContextSpy).not.toHaveBeenCalled();
    expect(setItemSpy).toHaveBeenCalledWith(
      'hasLoadedPublicExternalRoms',
      '{"bad url":"error"}'
    );
  });
});
