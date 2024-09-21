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
import { CircleCheckButton } from '../shared/circle-check-button.tsx';
import { ControlProfiles } from './controls/control-profiles.tsx';

type TabPanelProps = {
  children: ReactNode;
  index: number;
  value: number;
};

type ControlTabsProps = {
  setFormId: Dispatch<React.SetStateAction<string>>;
  virtualControlsFormId: string;
  controlProfilesFormId: string;
  keyBindingsFormId: string;
  resetPositionsButtonId: string;
  setIsSuccessfulSubmit: (successfulSubmit: boolean) => void;
};

const TabsWithBorder = styled(Tabs)`
  border-bottom: 1px solid;
  border-color: rgba(0, 0, 0, 0.12);

  & .MuiTabs-scrollButtons {
    width: fit-content;
  }
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
  controlProfilesFormId,
  keyBindingsFormId,
  resetPositionsButtonId,
  setIsSuccessfulSubmit
}: ControlTabsProps) => {
  const { clearLayouts } = useLayoutContext();
  const [value, setValue] = useState(0);

  const tabIndexToFormId = (tabIndex: number) => {
    switch (tabIndex) {
      case 0:
        return virtualControlsFormId;
      case 1:
        return controlProfilesFormId;
      case 2:
        return keyBindingsFormId;
      default:
        return virtualControlsFormId;
    }
  };

  const handleTabChange = (_: React.SyntheticEvent, tabIndex: number) => {
    setValue(tabIndex);
    setFormId(tabIndexToFormId(tabIndex));
    setIsSuccessfulSubmit(false);
  };

  const onAfterSubmit = () => setIsSuccessfulSubmit(true);

  return (
    <>
      <TabsWithBorder
        variant="scrollable"
        value={value}
        onChange={handleTabChange}
        aria-label="Control tabs"
        allowScrollButtonsMobile
      >
        <Tab label="Virtual Controls" {...a11yProps(0)} />
        <Tab label="Profiles" {...a11yProps(1)} />
        <Tab label="Key Bindings" {...a11yProps(2)} />
      </TabsWithBorder>
      <TabPanel value={value} index={0}>
        <VirtualControlsForm
          id={virtualControlsFormId}
          onAfterSubmit={onAfterSubmit}
        />
        <Button
          id={resetPositionsButtonId}
          sx={{ marginTop: '10px' }}
          onClick={clearLayouts}
        >
          Reset All Positions
        </Button>
      </TabPanel>
      <TabPanel value={value} index={1}>
        <ControlProfiles id={controlProfilesFormId} />
      </TabPanel>
      <TabPanel value={value} index={2}>
        <KeyBindingsForm id={keyBindingsFormId} onAfterSubmit={onAfterSubmit} />
      </TabPanel>
    </>
  );
};

export const ControlsModal = () => {
  const { setIsModalOpen } = useModalContext();
  const baseId = useId();
  const [formId, setFormId] = useState<string>(
    `${baseId}--virtual-controls-form`
  );
  const [isSuccessfulSubmit, setIsSuccessfulSubmit] = useState<boolean>(false);

  const tourSteps: TourSteps = [
    {
      content: (
        <p>
          Select which virtual controls you wish to enable in this form tab.
        </p>
      ),
      target: `#${CSS.escape(`${baseId}--virtual-controls-form`)}`
    },
    {
      content: (
        <p>
          Use this button to reset the positions of the screen, control panel,
          and all virtual controls.
        </p>
      ),
      target: `#${CSS.escape(`${baseId}--reset-positions-button`)}`
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
      target: `#${CSS.escape(`${baseId}--key-bindings-form`)}`
    },
    {
      content: (
        <p>
          Use the <i>Save Changes</i> button to persist changes from the current
          form tab.
        </p>
      ),
      target: `#${CSS.escape(`${baseId}--save-changes-button`)}`
    }
  ];

  return (
    <>
      <ModalHeader title="Controls" />
      <ModalBody>
        <ControlTabs
          setFormId={setFormId}
          virtualControlsFormId={`${baseId}--virtual-controls-form`}
          controlProfilesFormId={`${baseId}--control-profiles`}
          keyBindingsFormId={`${baseId}--key-bindings-form`}
          resetPositionsButtonId={`${baseId}--reset-positions-button`}
          setIsSuccessfulSubmit={setIsSuccessfulSubmit}
        />
      </ModalBody>
      <ModalFooter>
        {formId !== `${baseId}--control-profiles` && (
          <CircleCheckButton
            copy="Save Changes"
            form={formId}
            id={`${baseId}--save-changes-button`}
            type="submit"
            showSuccess={isSuccessfulSubmit}
          />
        )}
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
