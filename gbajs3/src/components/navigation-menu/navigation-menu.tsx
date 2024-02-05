import { useMediaQuery } from '@mui/material';
import { domToPng } from 'modern-screenshot';
import { useId, useState } from 'react';
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
  BiFileFind
} from 'react-icons/bi';
import { styled, useTheme } from 'styled-components';

import { NavigationMenuWidth } from './consts.tsx';
import { NavComponent } from './nav-component.tsx';
import { NavLeaf } from './nav-leaf.tsx';
import {
  useEmulatorContext,
  useAuthContext,
  useModalContext
} from '../../hooks/context.tsx';
import { useLogout } from '../../hooks/use-logout.tsx';
import { AboutModal } from '../modals/about.tsx';
import { CheatsModal } from '../modals/cheats.tsx';
import { ControlsModal } from '../modals/controls.tsx';
import { DownloadSaveModal } from '../modals/download-save.tsx';
import { FileSystemModal } from '../modals/file-system.tsx';
import { LegalModal } from '../modals/legal.tsx';
import { LoadLocalRomModal } from '../modals/load-local-rom.tsx';
import { LoadRomModal } from '../modals/load-rom.tsx';
import { LoadSaveModal } from '../modals/load-save.tsx';
import { LoginModal } from '../modals/login.tsx';
import { SaveStatesModal } from '../modals/save-states.tsx';
import { UploadCheatsModal } from '../modals/upload-cheats.tsx';
import { UploadRomToServerModal } from '../modals/upload-rom-to-server.tsx';
import { UploadRomModal } from '../modals/upload-rom.tsx';
import { UploadSaveToServerModal } from '../modals/upload-save-to-server.tsx';
import { UploadSavesModal } from '../modals/upload-saves.tsx';
import { ButtonBase } from '../shared/custom-button-base.tsx';

type ExpandableComponentProps = {
  $isExpanded?: boolean;
};

const NavigationMenuWrapper = styled.div<ExpandableComponentProps>`
  width: ${NavigationMenuWidth}px;
  height: 100dvh;
  position: fixed;
  background-color: ${({ theme }) => theme.mediumBlack};
  transition: 0.4s ease-in-out;
  -webkit-transition: 0.4s ease-in-out;
  z-index: 150;
  overflow-y: auto;
  text-align: left;
  left: 0;
  top: 0;

  ${({ $isExpanded = false }) =>
    !$isExpanded &&
    `left: -${NavigationMenuWidth + 5}px;
    `}

  &::-webkit-scrollbar {
    display: none;
  }
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
  display: flex;
  flex-direction: column;
  padding-left: 0;
  margin-bottom: 0;
  margin-top: 0;
  list-style: none;
  padding: 0;
`;

const HamburgerButton = styled(ButtonBase)<ExpandableComponentProps>`
  background-color: ${({ theme }) => theme.mediumBlack};
  color: ${({ theme }) => theme.pureWhite};
  z-index: 200;
  position: fixed;
  left: ${NavigationMenuWidth - 6}px;
  top: 12px;
  transition: 0.4s ease-in-out;
  -webkit-transition: 0.4s ease-in-out;
  cursor: pointer;
  padding: 0.375rem 0.75rem;
  border-radius: 0.25rem;
  border: none;
  min-height: 36px;
  min-width: 40px;

  ${({ $isExpanded = false }) =>
    !$isExpanded &&
    `left: -8px;
    `}

  &:focus {
    outline: 0;
    box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.25);
  }
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
  const { setModalContent, setIsModalOpen } = useModalContext();
  const { isAuthenticated } = useAuthContext();
  const { isEmulatorRunning, canvas, emulator } = useEmulatorContext();
  const { execute: executeLogout } = useLogout();
  const theme = useTheme();
  const isLargerThanPhone = useMediaQuery(theme.isLargerThanPhone);
  const menuHeaderId = useId();

  const isMenuItemDisabledByAuth = !isAuthenticated();

  return (
    <>
      <HamburgerButton
        id="menu-btn"
        $isExpanded={isExpanded}
        onClick={() => setIsExpanded((prevState) => !prevState)}
        aria-label="Menu Toggle"
      >
        <BiMenu />
      </HamburgerButton>
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
            $disabled={isEmulatorRunning}
            $isExpanded={!isEmulatorRunning}
            icon={<BiFolderPlus />}
          >
            <NavLeaf
              title="Upload Save"
              $disabled={isEmulatorRunning}
              icon={<BiCloudUpload />}
              onClick={() => {
                setModalContent(<UploadSavesModal />);
                setIsModalOpen(true);
              }}
            />
            <NavLeaf
              title="Upload Cheat File"
              $disabled={isEmulatorRunning}
              icon={<BiCloudUpload />}
              onClick={() => {
                setModalContent(<UploadCheatsModal />);
                setIsModalOpen(true);
              }}
            />
            <NavLeaf
              title="Upload Rom"
              $disabled={isEmulatorRunning}
              icon={<BiUpload />}
              onClick={() => {
                setModalContent(<UploadRomModal />);
                setIsModalOpen(true);
              }}
            />
            <NavLeaf
              title="Load Local Rom"
              $disabled={isEmulatorRunning}
              icon={<BiUpload />}
              onClick={() => {
                setModalContent(<LoadLocalRomModal />);
                setIsModalOpen(true);
              }}
            />
          </NavComponent>

          <NavComponent
            title="In Game Actions"
            $disabled={!isEmulatorRunning}
            $isExpanded={isEmulatorRunning}
            icon={<BiGame />}
          >
            <NavLeaf
              title="Screenshot"
              $disabled={!isEmulatorRunning}
              icon={<BiScreenshot />}
              onClick={() => {
                if (!canvas) return;

                emulator?.screenShot(() =>
                  domToPng(canvas)
                    .then((dataUrl) => {
                      const link = document.createElement('a');
                      const gameName = emulator?.getCurrentGameName();
                      const screenshotName =
                        gameName?.substring(0, gameName?.lastIndexOf('.')) ??
                        'screenshot.png';

                      link.download = screenshotName;
                      link.href = dataUrl;
                      link.click();
                      link.remove();
                    })
                    .catch(() => {
                      toast.error('Screenshot has failed');
                    })
                );
              }}
            />
            <NavLeaf
              title="Full Screen"
              $disabled={!isEmulatorRunning}
              icon={<BiFullscreen />}
              onClick={() => {
                canvas?.requestFullscreen().catch(() => {
                  toast.error('Full screen request has failed');
                });
              }}
            />
            <NavLeaf
              title="Download Save"
              $disabled={!isEmulatorRunning}
              icon={<BiCloudDownload />}
              onClick={() => {
                setModalContent(<DownloadSaveModal />);
                setIsModalOpen(true);
              }}
            />
            <NavLeaf
              title="Quick Reload"
              $disabled={!isEmulatorRunning}
              icon={<BiRedo />}
              onClick={emulator?.quickReload}
            />
            <NavLeaf
              title="Manage Save States"
              $disabled={!isEmulatorRunning}
              icon={<BiBookmarks />}
              onClick={() => {
                setModalContent(<SaveStatesModal />);
                setIsModalOpen(true);
              }}
            />
            <NavLeaf
              title="Manage Cheats"
              $disabled={!isEmulatorRunning}
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

          <NavComponent title="Profile" icon={<BiUserCheck />}>
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
              $disabled={isMenuItemDisabledByAuth || !isEmulatorRunning}
              icon={<BiCloudUpload />}
              onClick={() => {
                setModalContent(<UploadSaveToServerModal />);
                setIsModalOpen(true);
              }}
            />
            <NavLeaf
              title="Send Rom to Server"
              $disabled={isMenuItemDisabledByAuth || !isEmulatorRunning}
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
      {isExpanded && !isLargerThanPhone && (
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
