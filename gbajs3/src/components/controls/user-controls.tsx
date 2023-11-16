import { useState } from 'react';

import { ControlPanel } from './control-panel.tsx';
import { VirtualControls } from './virtual-controls.tsx';

export const UserControls = () => {
  const [controlPanelBounds, setControlPanelBounds] = useState<
    DOMRect | undefined
  >();

  return (
    <>
      <ControlPanel setExternalBounds={setControlPanelBounds} />
      <VirtualControls controlPanelBounds={controlPanelBounds} />
    </>
  );
};
