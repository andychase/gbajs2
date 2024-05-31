import { useMediaQuery } from '@mui/material';
import { useLocalStorage } from '@uidotdev/usehooks';
import { useId } from 'react';
import toast from 'react-hot-toast';
import { IconContext } from 'react-icons';
import {
  BiRefresh,
  BiSolidCloudUpload,
  BiSave,
  BiSolidBookmark
} from 'react-icons/bi';
import { styled, useTheme } from 'styled-components';

import {
  saveStateSlotLocalStorageKey,
  virtualControlsLocalStorageKey
} from './consts.tsx';
import { OPad } from './o-pad.tsx';
import { VirtualButton } from './virtual-button.tsx';
import {
  useEmulatorContext,
  useLayoutContext,
  useAuthContext,
  useModalContext,
  useRunningContext
} from '../../hooks/context.tsx';
import { useQuickReload } from '../../hooks/emulator/use-quick-reload.tsx';
import { UploadSaveToServerModal } from '../modals/upload-save-to-server.tsx';

import type { AreVirtualControlsEnabledProps } from '../modals/controls/virtual-controls-form.tsx';

const VirtualButtonTextLarge = styled.p`
  text-align: center;
  vertical-align: middle;
  line-height: 54px;
  color: ${({ theme }) => theme.pureWhite};
  margin: 0;
  font-size: 1.5em;
`;

const VirtualButtonTextSmall = styled.p`
  color: ${({ theme }) => theme.pureWhite};
  margin: 4px 5px;
`;

const keyToAriaLabel = (key: string) =>
  key
    .replace('-', ' ')
    .replace(
      /\w\S*/g,
      (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()
    );

export const VirtualControls = () => {
  const theme = useTheme();
  const isLargerThanPhone = useMediaQuery(theme.isLargerThanPhone);
  const isMobileWithUrlBar = useMediaQuery(theme.isMobileWithUrlBar);
  const { emulator } = useEmulatorContext();
  const { isRunning } = useRunningContext();
  const { isAuthenticated } = useAuthContext();
  const { setModalContent, setIsModalOpen } = useModalContext();
  const { layouts } = useLayoutContext();
  const virtualControlToastId = useId();
  const quickReload = useQuickReload();
  const [currentSaveStateSlot] = useLocalStorage(
    saveStateSlotLocalStorageKey,
    0
  );
  const [areVirtualControlsEnabled] = useLocalStorage<
    AreVirtualControlsEnabledProps | undefined
  >(virtualControlsLocalStorageKey);

  const controlPanelBounds = layouts?.controlPanel?.initialBounds;

  if (!controlPanelBounds) return null;

  const shouldShowVirtualControl = (virtualControlEnabled?: boolean) => {
    return (
      (virtualControlEnabled === undefined && !isLargerThanPhone) ||
      !!virtualControlEnabled
    );
  };

  const shouldShowVirtualButtonsAndOpad = shouldShowVirtualControl(
    areVirtualControlsEnabled?.OpadAndButtons
  );

  const areNotificationsEnabled =
    areVirtualControlsEnabled?.NotificationsEnabled ?? true;

  // align with initial control panel positioning
  const verticalStartPos = controlPanelBounds.bottom;
  const horizontalStartPos = controlPanelBounds.left;

  const positionVariations: {
    [key: string]: {
      mobileWithUrlBar?: { top?: string; left?: string };
      largerThanPhone?: { top?: string; left?: string };
      defaultMobile: { top: string; left: string };
    };
  } = {
    'a-button': {
      defaultMobile: {
        top: `calc(${verticalStartPos}px + 12%)`,
        left: 'calc(100dvw - 25px)'
      },
      mobileWithUrlBar: {
        top: `calc(${verticalStartPos}px + 10%)`
      },
      largerThanPhone: {
        top: `calc(${verticalStartPos}px + 35px - 3%)`,
        left: `calc(${horizontalStartPos}px + 450px)`
      }
    },
    'b-button': {
      defaultMobile: {
        top: `calc(${verticalStartPos}px + 15%)`,
        left: 'calc(100dvw - 100px)'
      },
      mobileWithUrlBar: {
        top: `calc(${verticalStartPos}px + 13%)`
      },
      largerThanPhone: {
        top: `calc(${verticalStartPos}px + 35px)`,
        left: `calc(${horizontalStartPos}px + 375px)`
      }
    },
    'start-button': {
      defaultMobile: {
        top: '88dvh',
        left: '25dvw'
      },
      mobileWithUrlBar: {
        top: '92dvh',
        left: '50dvw'
      },
      largerThanPhone: {
        top: `calc(${verticalStartPos}px + 60px)`,
        left: `${horizontalStartPos}px`
      }
    },
    'select-button': {
      defaultMobile: {
        top: '88dvh',
        left: '55dvw'
      },
      mobileWithUrlBar: {
        top: '92dvh',
        left: '75dvw'
      },
      largerThanPhone: {
        top: `calc(${verticalStartPos}px + 60px)`,
        left: `calc(${horizontalStartPos}px + 103px)`
      }
    },
    'l-button': {
      defaultMobile: {
        top: `${verticalStartPos + 15}px`,
        left: '15px'
      },
      largerThanPhone: {
        top: `calc(${verticalStartPos}px + 15px)`,
        left: `${horizontalStartPos}px`
      }
    },
    'r-button': {
      defaultMobile: {
        top: `${verticalStartPos + 15}px`,
        left: 'calc(100dvw - 15px)'
      },
      largerThanPhone: {
        top: `calc(${verticalStartPos}px + 15px)`,
        left: `calc(${horizontalStartPos}px + 190px)`
      }
    },
    'quickreload-button': {
      defaultMobile: {
        top: `${verticalStartPos + 10}px`,
        left: '135px'
      },
      largerThanPhone: {
        top: `calc(${verticalStartPos}px + 10px)`,
        left: `calc(${horizontalStartPos}px + 205px)`
      }
    },
    'uploadsave-button': {
      defaultMobile: {
        top: `${verticalStartPos + 10}px`,
        left: 'calc(100dvw - 135px)'
      },
      largerThanPhone: {
        top: `calc(${verticalStartPos}px + 10px)`,
        left: `calc(${horizontalStartPos}px + 300px)`
      }
    },
    'loadstate-button': {
      defaultMobile: {
        top: `calc(${verticalStartPos}px + 25%)`,
        left: 'calc(100dvw - 40px)'
      },
      mobileWithUrlBar: {
        top: `calc(${verticalStartPos}px + 23%)`
      },
      largerThanPhone: {
        top: `calc(${verticalStartPos}px + 60px)`,
        left: `calc(${horizontalStartPos}px + 248px)`
      }
    },
    'savestate-button': {
      defaultMobile: {
        top: `calc(${verticalStartPos}px + 27%)`,
        left: 'calc(100dvw - 100px)'
      },
      mobileWithUrlBar: {
        top: `calc(${verticalStartPos}px + 25%)`
      },
      largerThanPhone: {
        top: `calc(${verticalStartPos}px + 60px)`,
        left: `calc(${horizontalStartPos}px + 300px)`
      }
    },
    'o-pad': {
      defaultMobile: {
        top: `calc(${verticalStartPos}px + 11%)`,
        left: '10px'
      },
      largerThanPhone: {
        top: `calc(${verticalStartPos}px + 10px)`,
        left: `calc(${horizontalStartPos}px + 450px)`
      }
    }
  };

  const initialPositionForKey = (key: string) => {
    let variation = undefined;
    if (isMobileWithUrlBar && positionVariations[key]?.mobileWithUrlBar) {
      variation = positionVariations[key]?.mobileWithUrlBar;
    } else if (isLargerThanPhone && positionVariations[key]?.largerThanPhone) {
      variation = positionVariations[key]?.largerThanPhone;
    }

    return {
      ...positionVariations[key].defaultMobile,
      ...variation
    };
  };

  const toastOnCondition = (
    condition: boolean,
    successMessage: string,
    errorMessage: string
  ) => {
    if (areNotificationsEnabled)
      toast[condition ? 'success' : 'error'](
        condition ? successMessage : errorMessage,
        { id: virtualControlToastId }
      );
  };

  const virtualButtons = [
    {
      keyId: 'A',
      children: <VirtualButtonTextLarge>A</VirtualButtonTextLarge>,
      initialPosition: initialPositionForKey('a-button'),
      initialOffset: {
        x: '-100%',
        y: '0px'
      },
      keyName: 'a-button',
      enabled: shouldShowVirtualButtonsAndOpad
    },
    {
      keyId: 'B',
      children: <VirtualButtonTextLarge>B</VirtualButtonTextLarge>,
      initialPosition: initialPositionForKey('b-button'),
      initialOffset: {
        x: '-100%',
        y: '0px'
      },
      keyName: 'b-button',
      enabled: shouldShowVirtualButtonsAndOpad
    },
    {
      keyId: 'START',
      isRectangular: true,
      children: <VirtualButtonTextSmall>Start</VirtualButtonTextSmall>,
      initialPosition: initialPositionForKey('start-button'),
      keyName: 'start-button',
      enabled: shouldShowVirtualButtonsAndOpad
    },
    {
      keyId: 'SELECT',
      isRectangular: true,
      children: <VirtualButtonTextSmall>Select</VirtualButtonTextSmall>,
      initialPosition: initialPositionForKey('select-button'),
      keyName: 'select-button',
      enabled: shouldShowVirtualButtonsAndOpad
    },
    {
      keyId: 'L',
      isRectangular: true,
      children: <VirtualButtonTextSmall>L</VirtualButtonTextSmall>,
      initialPosition: initialPositionForKey('l-button'),
      keyName: 'l-button',
      enabled: shouldShowVirtualButtonsAndOpad
    },
    {
      keyId: 'R',
      isRectangular: true,
      children: <VirtualButtonTextSmall>R</VirtualButtonTextSmall>,
      initialPosition: initialPositionForKey('r-button'),
      initialOffset: {
        x: '-100%',
        y: '0px'
      },
      keyName: 'r-button',
      enabled: shouldShowVirtualButtonsAndOpad
    },
    {
      children: <BiRefresh />,
      onClick: () => {
        quickReload();

        if (!emulator?.getCurrentGameName() && areNotificationsEnabled)
          toast.error('Load a game to quick reload', {
            id: virtualControlToastId
          });
      },
      width: 40,
      initialPosition: initialPositionForKey('quickreload-button'),
      keyName: 'quickreload-button',
      enabled: shouldShowVirtualControl(areVirtualControlsEnabled?.QuickReload)
    },
    {
      children: <BiSolidCloudUpload />,
      onClick: () => {
        if (isAuthenticated() && isRunning) {
          setModalContent(<UploadSaveToServerModal />);
          setIsModalOpen(true);
        } else if (areNotificationsEnabled) {
          toast.error('Please log in and load a game', {
            id: virtualControlToastId
          });
        }
      },
      width: 40,
      initialPosition: initialPositionForKey('uploadsave-button'),
      initialOffset: {
        x: '-100%',
        y: '0px'
      },
      keyName: 'uploadsave-button',
      enabled: shouldShowVirtualControl(
        areVirtualControlsEnabled?.SendSaveToServer
      )
    },
    {
      children: <BiSolidBookmark />,
      onClick: () => {
        const wasSuccessful = emulator?.loadSaveState(currentSaveStateSlot);

        toastOnCondition(
          !!wasSuccessful,
          `Loaded slot: ${currentSaveStateSlot}`,
          `Failed to load slot: ${currentSaveStateSlot}`
        );
      },
      width: 40,
      initialPosition: initialPositionForKey('loadstate-button'),
      initialOffset: {
        x: '-100%',
        y: '0px'
      },
      keyName: 'loadstate-button',
      enabled: shouldShowVirtualControl(areVirtualControlsEnabled?.LoadState)
    },
    {
      children: <BiSave />,
      onClick: () => {
        const wasSuccessful = emulator?.createSaveState(currentSaveStateSlot);

        toastOnCondition(
          !!wasSuccessful,
          `Saved slot: ${currentSaveStateSlot}`,
          `Failed to save slot: ${currentSaveStateSlot}`
        );
      },
      width: 40,
      initialPosition: initialPositionForKey('savestate-button'),
      initialOffset: {
        x: '-100%',
        y: '0px'
      },
      keyName: 'savestate-button',
      enabled: shouldShowVirtualControl(areVirtualControlsEnabled?.SaveState)
    }
  ];

  return (
    <IconContext.Provider value={{ color: theme.pureWhite, size: '2em' }}>
      {shouldShowVirtualButtonsAndOpad && (
        <OPad initialPosition={initialPositionForKey('o-pad')} />
      )}
      {virtualButtons.map((virtualButtonProps) => (
        <VirtualButton
          ariaLabel={keyToAriaLabel(virtualButtonProps.keyName)}
          inputName={virtualButtonProps.keyName}
          key={virtualButtonProps.keyName}
          {...virtualButtonProps}
        />
      ))}
    </IconContext.Provider>
  );
};
