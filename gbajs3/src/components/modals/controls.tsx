import { Button, Tabs, Tab } from '@mui/material';
import { useId, useState, type Dispatch, type ReactNode } from 'react';
import { styled } from 'styled-components';

import { KeyBindingsForm } from './controls/key-bindings-form.tsx';
import { VirtualControlsForm } from './controls/virtual-controls-form.tsx';
import { ModalBody } from './modal-body.tsx';
import { ModalFooter } from './modal-footer.tsx';
import { ModalHeader } from './modal-header.tsx';
import { useLayoutContext, useModalContext } from '../../hooks/context.tsx';
import {
  EmbeddedProductTour,
  type TourSteps
} from '../product-tour/embedded-product-tour.tsx';

type TabPanelProps = {
  children: ReactNode;
  index: number;
  value: number;
};

type ControlTabsProps = {
  setFormId: Dispatch<React.SetStateAction<string>>;
  virtualControlsFormId: string;
  keyBindingsFormId: string;
  resetPositionsButtonId: string;
};

const TabsWithBorder = styled(Tabs)`
  border-bottom: 1px solid;
  border-color: rgba(0, 0, 0, 0.12);
`;

const TabWrapper = styled.div`
  padding: 24px;
`;

const a11yProps = (index: number) => {
  return {
    id: `control-tab-${index}`,
    'aria-controls': `tabpanel-${index}`
  };
};

const TabPanel = ({ children, index, value }: TabPanelProps) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
    >
      {value === index && <TabWrapper>{children}</TabWrapper>}
    </div>
  );
};

const ControlTabs = ({
  setFormId,
  virtualControlsFormId,
  keyBindingsFormId,
  resetPositionsButtonId
}: ControlTabsProps) => {
  const { clearLayouts } = useLayoutContext();
  const [value, setValue] = useState(0);

  const handleChange = (_: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
    setFormId(newValue === 0 ? virtualControlsFormId : keyBindingsFormId);
  };

  return (
    <>
      <TabsWithBorder
        value={value}
        onChange={handleChange}
        aria-label="Control tabs"
      >
        <Tab label="Virtual Controls" {...a11yProps(0)} />
        <Tab label="Key Bindings" {...a11yProps(1)} />
      </TabsWithBorder>
      <TabPanel value={value} index={0}>
        <VirtualControlsForm id={virtualControlsFormId} />
        <Button
          id={resetPositionsButtonId}
          sx={{ marginTop: '10px' }}
          onClick={clearLayouts}
        >
          Reset All Positions
        </Button>
      </TabPanel>
      <TabPanel value={value} index={1}>
        <KeyBindingsForm id={keyBindingsFormId} />
      </TabPanel>
    </>
  );
};

export const ControlsModal = () => {
  const { setIsModalOpen } = useModalContext();
  const virtualControlsFormId = useId();
  const keyBindingsFormId = useId();
  const saveChangesButtonId = useId();
  const resetPositionsButtonId = useId();
  const [formId, setFormId] = useState<string>(virtualControlsFormId);

  const tourSteps: TourSteps = [
    {
      content: (
        <p>
          Select which virtual controls you wish to enable in this form tab.
        </p>
      ),
      target: `#${CSS.escape(virtualControlsFormId)}`
    },
    {
      content: (
        <p>
          Use this button to reset the positions of the screen, control panel,
          and all virtual controls.
        </p>
      ),
      target: `#${CSS.escape(resetPositionsButtonId)}`
    },
    {
      content: (
        <>
          <p>Use the tab panel to change which form you are seeing.</p>
          <p>
            Select the <i>KEY BINDINGS</i> tab above, then click next!
          </p>
        </>
      ),
      placement: 'right',
      target: `#${CSS.escape(a11yProps(1).id)}`,
      disableBeacon: true,
      disableOverlayClose: true,
      hideCloseButton: false,
      spotlightClicks: true
    },
    {
      content: (
        <p>
          Remap keybindings by selecting a form field and typing your desired
          input.
        </p>
      ),
      placement: 'top-end',
      target: `#${CSS.escape(keyBindingsFormId)}`
    },
    {
      content: (
        <p>
          Use the <i>Save Changes</i> button to persist changes from the current
          form tab.
        </p>
      ),
      target: `#${CSS.escape(saveChangesButtonId)}`
    }
  ];

  return (
    <>
      <ModalHeader title="Controls" />
      <ModalBody>
        <ControlTabs
          setFormId={setFormId}
          virtualControlsFormId={virtualControlsFormId}
          keyBindingsFormId={keyBindingsFormId}
          resetPositionsButtonId={resetPositionsButtonId}
        />
      </ModalBody>
      <ModalFooter>
        <Button
          id={saveChangesButtonId}
          form={formId}
          type="submit"
          variant="contained"
        >
          Save Changes
        </Button>
        <Button variant="outlined" onClick={() => setIsModalOpen(false)}>
          Close
        </Button>
      </ModalFooter>
      <EmbeddedProductTour
        steps={tourSteps}
        completedProductTourStepName="hasCompletedControlsTour"
      />
    </>
  );
};
