import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Button
} from '@mui/material';
import { useTheme, styled } from '@mui/material/styles';
import { useId, useState } from 'react';
import { BiError } from 'react-icons/bi';
import { FaArrowDown } from 'react-icons/fa';

import { ModalBody } from './modal-body.tsx';
import { ModalFooter } from './modal-footer.tsx';
import { ModalHeader } from './modal-header.tsx';
import { useEmulatorContext, useModalContext } from '../../hooks/context.tsx';
import { useAddCallbacks } from '../../hooks/emulator/use-add-callbacks.tsx';
import { useRunGame } from '../../hooks/emulator/use-run-game.tsx';
import { useLoadExternalRom } from '../../hooks/use-load-external-rom.tsx';
import { ErrorWithIcon } from '../shared/error-with-icon.tsx';
import {
  LoadingIndicator,
  PacmanIndicator
} from '../shared/loading-indicator.tsx';
import { Copy } from '../shared/styled.tsx';

import type { PublicRomUploadStatus } from '../../hooks/use-show-load-public-roms.tsx';

type UploadPublicExternalRomsModalProps = {
  url: URL;
  onLoadOrDismiss: (statusMsg: PublicRomUploadStatus) => void;
};

const LinkBreakWord = styled('a')`
  word-break: break-all;
`;

const URLDisplay = ({ url }: { url: URL }) => {
  return (
    <Accordion>
      <AccordionSummary expandIcon={<FaArrowDown />}>
        <Copy>View Full URL</Copy>
      </AccordionSummary>
      <AccordionDetails>
        <LinkBreakWord href={url.href} target="_blank" rel="noopener">
          {url.href}
        </LinkBreakWord>
      </AccordionDetails>
    </Accordion>
  );
};

export const UploadPublicExternalRomsModal = ({
  url,
  onLoadOrDismiss
}: UploadPublicExternalRomsModalProps) => {
  const theme = useTheme();
  const { setIsModalOpen } = useModalContext();
  const { emulator } = useEmulatorContext();
  const [currentRomURL, setCurrentRomURL] = useState<string | null>(null);
  const uploadRomButtonId = useId();
  const runGame = useRunGame();
  const { syncActionIfEnabled } = useAddCallbacks();
  const {
    isPending: isExternalRomLoading,
    error: externalRomLoadError,
    mutate: executeLoadExternalRom
  } = useLoadExternalRom({
    onSuccess: (file) => {
      const runCallback = async () => {
        await syncActionIfEnabled();
        const hasSucceeded = runGame(file.name);
        if (hasSucceeded) {
          onLoadOrDismiss('loaded');
          setIsModalOpen(false);
        }
      };

      emulator?.uploadRom(file, runCallback);
      setCurrentRomURL(null);
    }
  });

  return (
    <>
      <ModalHeader
        title="Upload Public Rom"
        onClose={() => {
          onLoadOrDismiss('temporarily-dismissed');
        }}
      />
      <ModalBody>
        <LoadingIndicator
          isLoading={isExternalRomLoading}
          currentName={currentRomURL}
          indicator={<PacmanIndicator />}
          loadingCopy="Loading rom from url:"
        >
          <p>A public rom URL has been shared with you.</p>
          <p>You can load it using the upload button!</p>
          <p>Make sure you trust the provider before uploading:</p>
          <URLDisplay url={url} />
          {!!externalRomLoadError && (
            <ErrorWithIcon
              icon={<BiError style={{ color: theme.errorRed }} />}
              text="Loading rom from URL has failed"
            />
          )}
        </LoadingIndicator>
      </ModalBody>
      <ModalFooter>
        <Button
          id={uploadRomButtonId}
          disabled={isExternalRomLoading}
          onClick={() => {
            setCurrentRomURL(url.href);
            executeLoadExternalRom({ url: url });
          }}
          type="submit"
          variant="contained"
        >
          Upload
        </Button>
        <Button
          variant="outlined"
          onClick={() => {
            onLoadOrDismiss(externalRomLoadError ? 'skipped-error' : 'skipped');
            setIsModalOpen(false);
          }}
        >
          Don't ask again
        </Button>
      </ModalFooter>
    </>
  );
};
