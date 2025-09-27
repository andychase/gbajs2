import { useIsFirstRender, useLocalStorage } from '@uidotdev/usehooks';
import { useEffect } from 'react';
import toast from 'react-hot-toast';

import { useModalContext } from './context.tsx';
import { UploadPublicExternalRomsModal } from '../components/modals/upload-public-external-roms.tsx';

export type PublicRomUploadStatus =
  | 'loaded'
  | 'error'
  | 'skipped-error'
  | 'skipped'
  | 'temporarily-dismissed'
  | 'pending';

export type HasLoadedPublicRoms = {
  [url: string]: PublicRomUploadStatus;
};

const romURLQueryParamName = 'romURL';
const loadedPublicRomsLocalStorageKey = 'hasLoadedPublicExternalRoms';

export const usePublicRoms = () => {
  const [hasLoadedPublicRoms, setHasLoadedPublicRoms] = useLocalStorage<
    HasLoadedPublicRoms | undefined
  >(loadedPublicRomsLocalStorageKey);
  const isFirstRender = useIsFirstRender();

  const params = new URLSearchParams(window?.location?.search);
  const romURL = params.get(romURLQueryParamName);

  const shouldShowPublicRomModal =
    !!romURL &&
    hasLoadedPublicRoms?.[romURL] != 'loaded' &&
    hasLoadedPublicRoms?.[romURL] != 'skipped' &&
    hasLoadedPublicRoms?.[romURL] != 'temporarily-dismissed';

  if (isFirstRender)
    setHasLoadedPublicRoms((prevState) =>
      Object.fromEntries(
        Object.entries(prevState ?? {}).map(([key, value]) => [
          key,
          value === 'temporarily-dismissed' ? 'pending' : value
        ])
      )
    );

  return {
    shouldShowPublicRomModal,
    setHasLoadedPublicRoms,
    romURL
  };
};

// Note: query parameters are NOT persisted when saving the app as a PWA to the home screen.
// This is still an outstanding issue that needs to be addressed through other means.
export const useShowLoadPublicRoms = () => {
  const { setModalContent, isModalOpen, setIsModalOpen } = useModalContext();
  const { shouldShowPublicRomModal, setHasLoadedPublicRoms, romURL } =
    usePublicRoms();

  useEffect(() => {
    if (shouldShowPublicRomModal && romURL && !isModalOpen) {
      try {
        const url = new URL(romURL);

        const storeResult = (statusMsg: PublicRomUploadStatus) => {
          setHasLoadedPublicRoms((prevState) => ({
            ...prevState,
            [romURL]: statusMsg
          }));
        };

        setModalContent(
          <UploadPublicExternalRomsModal
            url={url}
            onLoadOrDismiss={storeResult}
          />
        );
        setIsModalOpen(true);
      } catch {
        toast.error('Invalid external rom URL');
        setHasLoadedPublicRoms((prevState) => ({
          ...prevState,
          [romURL]: 'error'
        }));
      }
    }
  }, [
    romURL,
    shouldShowPublicRomModal,
    setIsModalOpen,
    setModalContent,
    setHasLoadedPublicRoms,
    isModalOpen
  ]);
};
