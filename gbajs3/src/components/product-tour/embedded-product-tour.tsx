import { useLocalStorage } from '@uidotdev/usehooks';
import { useState } from 'react';
import Joyride, { STATUS, type Step } from 'react-joyride';

import { productTourLocalStorageKey } from './consts.tsx';
import { useModalContext } from '../../hooks/context.tsx';
import { useInterval } from '../../hooks/use-interval.ts';

import type { CompletedProductTourSteps } from './product-tour-intro.tsx';

type EmbeddedProductTourProps = {
  completedProductTourStepName: string;
  steps: TourSteps;
  isNotInModal?: boolean;
  millisecondDelay?: number;
  renderWithoutDelay?: boolean;
  skipIfIntroSkipped?: boolean;
  skipRenderCondition?: boolean;
  zIndex?: number;
};

const defaultStepOptions = {
  locale: { skip: <strong aria-label="Skip">Skip</strong> },
  placement: 'auto' as const,
  placementBeacon: 'right-end' as const,
  spotlightPadding: 10
};

export type TourSteps = Step[];

export const EmbeddedProductTour = ({
  completedProductTourStepName,
  steps,
  isNotInModal = false, // by default, this component is assumed to be used in modals
  millisecondDelay = 500,
  renderWithoutDelay = false,
  skipIfIntroSkipped = true,
  skipRenderCondition = false,
  zIndex = 500 // note, value here is +100 in react joyride/floater
}: EmbeddedProductTourProps) => {
  const [hasCompletedProductTourSteps, setHasCompletedProductTourSteps] =
    useLocalStorage<CompletedProductTourSteps | undefined>(
      productTourLocalStorageKey
    );
  const { isModalOpen } = useModalContext();
  const [shouldRender, setShouldRender] = useState(renderWithoutDelay);

  useInterval(
    () => {
      setShouldRender(true);
    },
    renderWithoutDelay ? null : millisecondDelay
  );

  if (
    !shouldRender || // delay for positioning
    hasCompletedProductTourSteps?.[completedProductTourStepName] || // if step is completed
    (skipIfIntroSkipped &&
      hasCompletedProductTourSteps?.hasCompletedProductTourIntro ===
        STATUS.SKIPPED) || // if intro has been skipped
    !hasCompletedProductTourSteps?.hasCompletedProductTourIntro || // if intro is not yet complete
    (!isNotInModal && !isModalOpen) || // if in modal and modal is not open
    skipRenderCondition // custom condition to skip evaluates to true
  )
    return null;

  const stepsWithDefault = steps.map((step) => ({
    ...defaultStepOptions,
    ...step
  }));

  return (
    <Joyride
      continuous
      hideCloseButton
      showProgress
      showSkipButton
      steps={stepsWithDefault}
      styles={{
        options: {
          zIndex: zIndex
        }
      }}
      callback={({ status }) => {
        if (([STATUS.FINISHED, STATUS.SKIPPED] as string[]).includes(status)) {
          setHasCompletedProductTourSteps((prevState) => ({
            ...prevState,
            [completedProductTourStepName]: status
          }));
        }
      }}
    />
  );
};
