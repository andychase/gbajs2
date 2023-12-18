import { useLocalStorage } from '@uidotdev/usehooks';
import Joyride, { STATUS, type Step } from 'react-joyride';
import { styled } from 'styled-components';

import { productTourLocalStorageKey } from './consts.tsx';

export type CompletedProductTourSteps = {
  hasCompletedProductTourIntro?: string | boolean;
  [key: string]: string | boolean | undefined;
};

const StyledUl = styled.ul`
  text-align: left;
`;

const steps: Step[] = [
  {
    content: (
      <>
        <h2>Welcome to Gbajs3!</h2>
        <p>Would you like to take a product tour?</p>
        <p>
          Skipping here will skip all tour items. You can re-trigger the tour in
          the <i>About</i> menu item!
        </p>
      </>
    ),
    locale: {
      skip: <strong aria-label="Skip">Skip</strong>,
      next: <strong aria-label="Skip">Yes</strong>
    },
    placement: 'center',
    target: 'body'
  },
  {
    content: (
      <>
        <p>Use the sidebar navigation menu to:</p>
        <StyledUl>
          <li>
            Perform <i>Pre Game Actions</i> such as load roms (games), saves,
            and cheat files
          </li>
          <li>
            Perform <i>In Game Actions</i> such as managing save states and
            cheats
          </li>
          <li>
            Modify your <i>Controls</i>
          </li>
          <li>
            Save your local <i>File System</i>
          </li>
          <li>
            Interact with your <i>Profile</i>
          </li>
        </StyledUl>
      </>
    ),
    locale: { skip: <strong aria-label="Skip">Skip</strong> },
    placement: 'auto',
    spotlightPadding: 40,
    target: '#menu-wrapper'
  },
  {
    content: <p>Use the hamburger button to show and hide the menu</p>,
    locale: { skip: <strong aria-label="Skip">Skip</strong> },
    placement: 'right',
    spotlightPadding: 10,
    target: '#menu-btn'
  },
  {
    content: (
      <>
        <p>
          Guided tour items will appear as you use different features of Gbajs3.
        </p>
        <p>All interactive menu items will have a built in tour once opened.</p>
        <p>Watch for the red beacons, tap them to continue your tour!</p>
      </>
    ),
    locale: { skip: <strong aria-label="Skip">Skip</strong> },
    placement: 'center',
    target: 'body'
  }
];

export const ProductTourIntro = () => {
  const [hasCompletedProductTourSteps, setHasCompletedProductTourSteps] =
    useLocalStorage<CompletedProductTourSteps>(productTourLocalStorageKey, {
      hasCompletedProductTourIntro: false
    });

  if (hasCompletedProductTourSteps?.hasCompletedProductTourIntro) return null;

  return (
    <Joyride
      continuous
      hideCloseButton
      disableScrolling
      showProgress
      showSkipButton
      steps={steps}
      styles={{
        options: {
          zIndex: 1000
        }
      }}
      callback={({ status }) => {
        if (([STATUS.FINISHED, STATUS.SKIPPED] as string[]).includes(status)) {
          setHasCompletedProductTourSteps((prevState) => ({
            ...prevState,
            hasCompletedProductTourIntro: status
          }));
        }
      }}
    />
  );
};
