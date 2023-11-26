import { PwaPrompt as IOSPwaPrompt } from 'react-ios-pwa-prompt-ts';
import { useLocalStorage } from 'usehooks-ts';

import { productTourLocalStorageKey } from '../product-tour/consts.tsx';

import type { CompletedProductTourSteps } from '../product-tour/product-tour-intro';

export const PwaPrompt = () => {
  const [hasCompletedProductTourSteps] =
    useLocalStorage<CompletedProductTourSteps>(productTourLocalStorageKey, {
      hasCompletedProductTourIntro: false
    });

  // dont render if product tour intro is not complete
  if (!hasCompletedProductTourSteps?.hasCompletedProductTourIntro) return null;

  return <IOSPwaPrompt />;
};
