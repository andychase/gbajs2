import { Button, Collapse } from '@mui/material';
import { useLocalStorage } from '@uidotdev/usehooks';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { css, styled } from 'styled-components';

import { emulatorCoreCallbacksLocalStorageKey } from '../../../context/emulator/consts.ts';
import { useAddCallbacks } from '../../../hooks/emulator/use-add-callbacks.tsx';
import { MinusSquare, PlusSquare } from '../../shared/action-box-icons.tsx';
import { ButtonBase } from '../../shared/custom-button-base.tsx';
import { ManagedCheckbox } from '../../shared/managed-checkbox.tsx';
import { ManagedSwitch } from '../../shared/managed-switch.tsx';

import type { CoreCallbackOptions } from '../../../hooks/emulator/use-add-callbacks.tsx';

type FileSystemOptionsFormProps = {
  id: string;
};

// copying styles from the treeitem to match file system display
const fileSystemFontStyle = css`
  font-family: 'Roboto', 'Helvetica', 'Arial', sans-serif;
  font-weight: 400;
  font-size: 1rem;
  line-height: 1.5;
  letter-spacing: 0.00938em;
`;

const StyledForm = styled.form`
  display: flex;
  flex-direction: column;

  /* copying styles from the treeitem to match file system display */
  & p {
    ${fileSystemFontStyle}
  }
`;

const OptionsFormTitle = styled.p`
  margin: 0;
  ${fileSystemFontStyle}
`;

const OptionsFormToggle = styled(ButtonBase)`
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: unset;
  border: none;
  color: inherit;
  margin: 0;
`;

export const FileSystemOptionsForm = ({ id }: FileSystemOptionsFormProps) => {
  const [coreCallbackOptions] = useLocalStorage<
    CoreCallbackOptions | undefined
  >(emulatorCoreCallbacksLocalStorageKey);
  const { addCallbacksAndSaveSettings } = useAddCallbacks();
  const [areOptionsVisible, setAreOptionsVisible] = useState(false);

  const { register, handleSubmit, watch } = useForm<CoreCallbackOptions>({
    values: coreCallbackOptions,
    resetOptions: {
      keepDirtyValues: true
    }
  });

  return (
    <div id={id}>
      <OptionsFormToggle
        onClick={() => setAreOptionsVisible((prevState) => !prevState)}
      >
        <OptionsFormTitle>Options</OptionsFormTitle>
        {!areOptionsVisible ? <PlusSquare /> : <MinusSquare />}
      </OptionsFormToggle>
      <Collapse in={areOptionsVisible}>
        <StyledForm
          aria-label="File System Options Form"
          onSubmit={handleSubmit(addCallbacksAndSaveSettings)}
        >
          <ManagedCheckbox
            label="Save file system on in-game save"
            watcher={watch('saveFileSystemOnInGameSave')}
            {...register('saveFileSystemOnInGameSave')}
          />
          <ManagedSwitch
            label="Enable Notifications"
            watcher={watch('notificationsEnabled')}
            {...register('notificationsEnabled')}
          />
          <Button sx={{ width: 'fit-content' }} type="submit">
            Save Options
          </Button>
        </StyledForm>
      </Collapse>
    </div>
  );
};
