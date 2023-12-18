import { useLocalStorage } from '@uidotdev/usehooks';
import { PwaPrompt as IOSPwaPrompt } from 'react-ios-pwa-prompt-ts';

import { productTourLocalStorageKey } from '../product-tour/consts.tsx';

import type { CompletedProductTourSteps } from '../product-tour/product-tour-intro';

export const PwaPrompt = () => {
  const [hasCompletedProductTourSteps] = useLocalStorage<
    CompletedProductTourSteps | undefined
  >(productTourLocalStorageKey);

  // dont render if product tour intro is not complete
  if (!hasCompletedProductTourSteps?.hasCompletedProductTourIntro) return null;

  return <IOSPwaPrompt />;
};
