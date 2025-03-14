import { useMediaQuery } from '@mui/material';
import { useId, useRef, useState } from 'react';
import Draggable from 'react-draggable';
import toast from 'react-hot-toast';
import {
  BiInfoCircle,
  BiFolderPlus,
  BiCloudUpload,
  BiUpload,
  BiGame,
  BiScreenshot,
  BiFullscreen,
  BiCloudDownload,
  BiRedo,
  BiBookmarks,
  BiEdit,
  BiJoystick,
  BiUserCheck,
  BiLogInCircle,
  BiLogOutCircle,
  BiCheckShield,
  BiConversation,
  BiMenu,
  BiFileFind,
  BiBrain
} from 'react-icons/bi';
import { styled, useTheme } from 'styled-components';

import { NavigationMenuWidth } from './consts.tsx';
import { NavComponent } from './nav-component.tsx';
import { NavLeaf } from './nav-leaf.tsx';
import {
  useEmulatorContext,
  useAuthContext,
  useModalContext,
  useRunningContext,
  useDragContext,
  useLayoutContext
} from '../../hooks/context.tsx';
import { useQuickReload } from '../../hooks/emulator/use-quick-reload.tsx';
import { useLogout } from '../../hooks/use-logout.tsx';
import { useShowLoadPublicRoms } from '../../hooks/use-show-load-public-roms.tsx';
import { AboutModal } from '../modals/about.tsx';
import { CheatsModal } from '../modals/cheats.tsx';
import { ControlsModal } from '../modals/controls.tsx';
import { DownloadSaveModal } from '../modals/download-save.tsx';
import { EmulatorSettingsModal } from '../modals/emulator-settings.tsx';
import { FileSystemModal } from '../modals/file-system.tsx';
import { LegalModal } from '../modals/legal.tsx';
import { LoadLocalRomModal } from '../modals/load-local-rom.tsx';
import { LoadRomModal } from '../modals/load-rom.tsx';
import { LoadSaveModal } from '../modals/load-save.tsx';
import { LoginModal } from '../modals/login.tsx';
import { SaveStatesModal } from '../modals/save-states.tsx';
import { UploadCheatsModal } from '../modals/upload-cheats.tsx';
import { UploadPatchesModal } from '../modals/upload-patches.tsx';
import { UploadRomToServerModal } from '../modals/upload-rom-to-server.tsx';
import { UploadRomsModal } from '../modals/upload-roms.tsx';
import { UploadSaveToServerModal } from '../modals/upload-save-to-server.tsx';
import { UploadSavesModal } from '../modals/upload-saves.tsx';
import { ButtonBase } from '../shared/custom-button-base.tsx';

type ExpandableComponentProps = {
  $isExpanded?: boolean;
};

const NavigationMenuWrapper = styled.div<ExpandableComponentProps>`
  display: flex;
  flex-direction: column;
  width: ${NavigationMenuWidth}px;
  height: 100dvh;
  position: fixed;
  background-color: ${({ theme }) => theme.mediumBlack};
  transition: 0.4s ease-in-out;
  -webkit-transition: 0.4s ease-in-out;
  z-index: 150;
  text-align: left;
  left: 0;
  top: 0;
  touch-action: none;

  ${({ $isExpanded = false }) =>
    !$isExpanded &&
    `left: -${NavigationMenuWidth + 5}px;
  `};
`;

const StyledMenuHeader = styled.h2`
  color: ${({ theme }) => theme.pureWhite};
  padding: 0.5rem 1rem;
  font-size: calc(1.3rem + 0.6vw);
  font-weight: 500;
  line-height: 1.2;
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;

  &:hover {
    background-color: ${({ theme }) => theme.menuHighlight};
  }
`;

const MenuItemWrapper = styled.ul`
  margin-bottom: 0;
  margin-top: 0;
  list-style: none;
  padding: 0;
  overflow-y: auto;
  overscroll-behavior: none;
  touch-action: pan-y;

  &::-webkit-scrollbar {
    display: none;
  }
`;

const HamburgerButton = styled(ButtonBase)<
  ExpandableComponentProps & { $areItemsDraggable: boolean }
>`
  background-color: ${({ theme }) => theme.mediumBlack};
  color: ${({ theme }) => theme.pureWhite};
  z-index: 200;
  position: fixed;
  left: ${NavigationMenuWidth - 50}px;
  top: 12px;
  transition: 0.4s ease-in-out;
  -webkit-transition: 0.4s ease-in-out;
  transition-property: left;
  cursor: pointer;
  border-radius: 0.25rem;
  border: none;
  min-height: 36px;
  min-width: 40px;

  @media ${({ theme }) => theme.isMobileLandscape} {
    bottom: 15px;
    top: unset;
  }

  ${({ $isExpanded = false }) =>
    !$isExpanded &&
    `left: -5px;
    `}

  &:focus {
    outline: 0;
    box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.25);
  }

  ${({ $areItemsDraggable = false, theme }) =>
    $areItemsDraggable &&
    `
    outline-color: ${theme.gbaThemeBlue};
    outline-style: dashed;
    outline-width: 2px;
  `}
`;

const NavigationMenuClearDismiss = styled.button`
  position: absolute;
  width: calc(100dvw - ${NavigationMenuWidth}px);
  left: ${NavigationMenuWidth}px;
  height: 99%;
  background: 0 0;
  z-index: 140;
  border: none;
`;

export const NavigationMenu = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const { setModalContent, setIsModalOpen } = useModalContext();
  const { isAuthenticated } = useAuthContext();
  const { canvas, emulator } = useEmulatorContext();
  const { isRunning } = useRunningContext();
  const { execute: executeLogout } = useLogout();
  const { areItemsDraggable } = useDragContext();
  const { getLayout, setLayout } = useLayoutContext();
  const menuButtonLayout = getLayout('menuButton');
  const theme = useTheme();
  const isLargerThanPhone = useMediaQuery(theme.isLargerThanPhone);
  const isMobileLandscape = useMediaQuery(theme.isMobileLandscape);
  const menuHeaderId = useId();
  const quickReload = useQuickReload();

  const isMenuItemDisabledByAuth = !isAuthenticated();
  const hasApiLocation = !!import.meta.env.VITE_GBA_SERVER_LOCATION;

  useShowLoadPublicRoms();

  return (
    <>
      <Draggable
        nodeRef={menuButtonRef}
        bounds="parent"
        axis="y"
        position={menuButtonLayout?.position ?? { x: 0, y: 0 }}
        disabled={!areItemsDraggable}
        onStop={(_, data) =>
          setLayout('menuButton', {
            position: { x: 0, y: data.y },
            standalone: true
          })
        }
      >
        <HamburgerButton
          ref={menuButtonRef}
          id="menu-btn"
          $isExpanded={isExpanded}
          onClick={() => setIsExpanded((prevState) => !prevState)}
          aria-label="Menu Toggle"
          $areItemsDraggable={areItemsDraggable}
        >
          <BiMenu
            style={{ height: '29px', width: '29px', verticalAlign: 'middle' }}
          />
        </HamburgerButton>
      </Draggable>
      <NavigationMenuWrapper
        data-testid="menu-wrapper"
        id="menu-wrapper"
        $isExpanded={isExpanded}
      >
        <StyledMenuHeader id={menuHeaderId}>Menu</StyledMenuHeader>
        <MenuItemWrapper aria-labelledby={menuHeaderId}>
          <NavLeaf
            title="About"
            icon={<BiInfoCircle />}
            $withPadding
            onClick={() => {
              setModalContent(<AboutModal />);
              setIsModalOpen(true);
            }}
          />

          <NavComponent
            title="Pre Game Actions"
            $disabled={isRunning}
            $isExpanded={!isRunning}
            icon={<BiFolderPlus />}
          >
            <NavLeaf
              title="Upload Saves"
              $disabled={isRunning}
              icon={<BiCloudUpload />}
              onClick={() => {
                setModalContent(<UploadSavesModal />);
                setIsModalOpen(true);
              }}
            />
            <NavLeaf
              title="Upload Cheats"
              $disabled={isRunning}
              icon={<BiCloudUpload />}
              onClick={() => {
                setModalContent(<UploadCheatsModal />);
                setIsModalOpen(true);
              }}
            />
            <NavLeaf
              title="Upload Patches"
              $disabled={isRunning}
              icon={<BiCloudUpload />}
              onClick={() => {
                setModalContent(<UploadPatchesModal />);
                setIsModalOpen(true);
              }}
            />
            <NavLeaf
              title="Upload Roms"
              $disabled={isRunning}
              icon={<BiUpload />}
              onClick={() => {
                setModalContent(<UploadRomsModal />);
                setIsModalOpen(true);
              }}
            />
            <NavLeaf
              title="Load Local Rom"
              $disabled={isRunning}
              icon={<BiUpload />}
              onClick={() => {
                setModalContent(<LoadLocalRomModal />);
                setIsModalOpen(true);
              }}
            />
          </NavComponent>

          <NavComponent
            title="In Game Actions"
            $disabled={!isRunning}
            $isExpanded={isRunning}
            icon={<BiGame />}
          >
            <NavLeaf
              title="Screenshot"
              $disabled={!isRunning}
              icon={<BiScreenshot />}
              onClick={() => {
                if (emulator?.screenshot())
                  toast.success('Screenshot saved successfully');
                else toast.error('Screenshot has failed');
              }}
            />
            <NavLeaf
              title="Full Screen"
              $disabled={!isRunning}
              icon={<BiFullscreen />}
              onClick={() => {
                canvas?.requestFullscreen().catch(() => {
                  toast.error('Full screen request has failed');
                });
              }}
            />
            <NavLeaf
              title="Download Save"
              $disabled={!isRunning}
              icon={<BiCloudDownload />}
              onClick={() => {
                setModalContent(<DownloadSaveModal />);
                setIsModalOpen(true);
              }}
            />
            <NavLeaf
              title="Quick Reload"
              $disabled={!isRunning}
              icon={<BiRedo />}
              onClick={quickReload}
            />
            <NavLeaf
              title="Manage Save States"
              $disabled={!isRunning}
              icon={<BiBookmarks />}
              onClick={() => {
                setModalContent(<SaveStatesModal />);
                setIsModalOpen(true);
              }}
            />
            <NavLeaf
              title="Manage Cheats"
              $disabled={!isRunning}
              icon={<BiEdit />}
              onClick={() => {
                setModalContent(<CheatsModal />);
                setIsModalOpen(true);
              }}
            />
          </NavComponent>

          <NavLeaf
            title="Controls"
            icon={<BiJoystick />}
            $withPadding
            onClick={() => {
              setModalContent(<ControlsModal />);
              setIsModalOpen(true);
            }}
          />

          <NavLeaf
            title="File System"
            icon={<BiFileFind />}
            $withPadding
            onClick={() => {
              setModalContent(<FileSystemModal />);
              setIsModalOpen(true);
            }}
          />

          <NavLeaf
            title="Emulator Settings"
            icon={<BiBrain />}
            $withPadding
            onClick={() => {
              setModalContent(<EmulatorSettingsModal />);
              setIsModalOpen(true);
            }}
          />

          <NavComponent
            title="Profile"
            icon={<BiUserCheck />}
            $disabled={!hasApiLocation}
          >
            <NavLeaf
              title="Login"
              icon={<BiLogInCircle />}
              onClick={() => {
                setModalContent(<LoginModal />);
                setIsModalOpen(true);
              }}
            />
            <NavLeaf
              title="Logout"
              $disabled={isMenuItemDisabledByAuth}
              icon={<BiLogOutCircle />}
              onClick={executeLogout}
            />
            <NavLeaf
              title="Load Save (Server)"
              $disabled={isMenuItemDisabledByAuth}
              icon={<BiCloudDownload />}
              onClick={() => {
                setModalContent(<LoadSaveModal />);
                setIsModalOpen(true);
              }}
            />
            <NavLeaf
              title="Load Rom (Server)"
              $disabled={isMenuItemDisabledByAuth}
              icon={<BiCloudDownload />}
              onClick={() => {
                setModalContent(<LoadRomModal />);
                setIsModalOpen(true);
              }}
            />
            <NavLeaf
              title="Send Save to Server"
              $disabled={isMenuItemDisabledByAuth || !isRunning}
              icon={<BiCloudUpload />}
              onClick={() => {
                setModalContent(<UploadSaveToServerModal />);
                setIsModalOpen(true);
              }}
            />
            <NavLeaf
              title="Send Rom to Server"
              $disabled={isMenuItemDisabledByAuth || !isRunning}
              icon={<BiCloudUpload />}
              onClick={() => {
                setModalContent(<UploadRomToServerModal />);
                setIsModalOpen(true);
              }}
            />
          </NavComponent>

          <NavLeaf
            title="Legal"
            icon={<BiCheckShield />}
            onClick={() => {
              setModalContent(<LegalModal />);
              setIsModalOpen(true);
            }}
            $withPadding
          />

          <NavLeaf
            title="Contact"
            icon={<BiConversation />}
            $link="https://github.com/thenick775/gbajs3"
            $withPadding
          />
        </MenuItemWrapper>
      </NavigationMenuWrapper>
      {isExpanded && (!isLargerThanPhone || isMobileLandscape) && (
        <NavigationMenuClearDismiss
          aria-label="Menu Dismiss"
          onClick={() => {
            setIsExpanded(false);
          }}
        />
      )}
    </>
  );
};
