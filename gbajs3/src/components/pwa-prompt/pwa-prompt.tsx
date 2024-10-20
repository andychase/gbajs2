import { useLocalStorage } from '@uidotdev/usehooks';
import { PwaPrompt as IOSPwaPrompt } from 'react-ios-pwa-prompt-ts';

import { usePublicRoms } from '../../hooks/use-show-load-public-roms.tsx';
import { productTourLocalStorageKey } from '../product-tour/consts.tsx';

import type { CompletedProductTourSteps } from '../product-tour/product-tour-intro';

export const PwaPrompt = () => {
  const [hasCompletedProductTourSteps] = useLocalStorage<
    CompletedProductTourSteps | undefined
  >(productTourLocalStorageKey);
  const { shouldShowPublicRomModal } = usePublicRoms();

  // don't render if product tour intro is not complete,
  // or if public rom modal should render
  if (
    !hasCompletedProductTourSteps?.hasCompletedProductTourIntro ||
    shouldShowPublicRomModal
  )
    return null;

  return <IOSPwaPrompt />;
};
