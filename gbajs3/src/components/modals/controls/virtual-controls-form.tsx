import { useMediaQuery } from '@mui/material';
import { useLocalStorage } from '@uidotdev/usehooks';
import { useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { styled, useTheme } from 'styled-components';

import { virtualControlsLocalStorageKey } from '../../controls/consts.tsx';
import { ManagedCheckbox } from '../../shared/managed-checkbox.tsx';
import { ManagedSwitch } from '../../shared/managed-switch.tsx';

const StyledForm = styled.form`
  display: flex;
  flex-direction: column;
`;

type VirtualControlsFormProps = {
  id: string;
};

type ControlsInputProps = {
  DPadAndButtons: boolean;
  SaveState: boolean;
  LoadState: boolean;
  QuickReload: boolean;
  SendSaveToServer: boolean;
  NotificationsEnabled: boolean;
};

export type AreVirtualControlsEnabledProps = {
  DPadAndButtons?: boolean;
  SaveState?: boolean;
  LoadState?: boolean;
  QuickReload?: boolean;
  SendSaveToServer?: boolean;
  NotificationsEnabled?: boolean;
};

export const VirtualControlsForm = ({ id }: VirtualControlsFormProps) => {
  const [areVirtualControlsEnabled, setAreVirtualControlsEnabled] =
    useLocalStorage<AreVirtualControlsEnabledProps | undefined>(
      virtualControlsLocalStorageKey
    );
  const theme = useTheme();
  const isLargerThanPhone = useMediaQuery(theme.isLargerThanPhone);
  const areDPadAndButtonsEnabled =
    areVirtualControlsEnabled?.DPadAndButtons ?? !isLargerThanPhone;
  const areNotificationsEnabled =
    areVirtualControlsEnabled?.NotificationsEnabled ?? true;

  const { register, handleSubmit, setValue, watch } =
    useForm<ControlsInputProps>({
      defaultValues: {
        ...areVirtualControlsEnabled,
        DPadAndButtons: areDPadAndButtonsEnabled,
        NotificationsEnabled: areNotificationsEnabled
      }
    });

  useEffect(() => {
    // DPadAndButtons is the only value that can dynamically change without user input
    setValue('DPadAndButtons', areDPadAndButtonsEnabled);
  }, [areDPadAndButtonsEnabled, setValue]);

  const onSubmit: SubmitHandler<ControlsInputProps> = async (formData) => {
    setAreVirtualControlsEnabled((prevState) => ({
      ...prevState,
      ...formData
    }));
  };

  return (
    <StyledForm
      aria-label="Virtual Controls Form"
      id={id}
      onSubmit={handleSubmit(onSubmit)}
    >
      <ManagedCheckbox
        label="Virtual D-pad/Buttons"
        watcher={watch('DPadAndButtons')}
        registerProps={register('DPadAndButtons')}
      />
      <ManagedCheckbox
        label="Save State"
        watcher={watch('SaveState')}
        registerProps={register('SaveState')}
      />
      <ManagedCheckbox
        label="Load State"
        watcher={watch('LoadState')}
        registerProps={register('LoadState')}
      />
      <ManagedCheckbox
        label="Quick Reload"
        watcher={watch('QuickReload')}
        registerProps={register('QuickReload')}
      />
      <ManagedCheckbox
        label="Send save to server"
        watcher={watch('SendSaveToServer')}
        registerProps={register('SendSaveToServer')}
      />
      <ManagedSwitch
        label="Enable Notifications"
        watcher={watch('NotificationsEnabled')}
        registerProps={register('NotificationsEnabled')}
      />
    </StyledForm>
  );
};
