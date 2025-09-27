import { PwaPrompt as IOSPwaPrompt } from 'react-ios-pwa-prompt-ts';

import { usePublicRoms } from '../../hooks/use-show-load-public-roms.tsx';

export const PwaPrompt = () => {
  const { shouldShowPublicRomModal } = usePublicRoms();

  // or if public rom modal should render
  if (shouldShowPublicRomModal) return null;

  return <IOSPwaPrompt />;
};
