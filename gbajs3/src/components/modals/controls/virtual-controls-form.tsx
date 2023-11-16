import { useMediaQuery } from '@mui/material';
import { useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { styled, useTheme } from 'styled-components';
import { useLocalStorage } from 'usehooks-ts';

import { ManagedCheckbox } from '../../shared/managed-checkbox.tsx';

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
};

export type AreVirtualControlsEnabledProps = {
  DPadAndButtons?: boolean;
  SaveState?: boolean;
  LoadState?: boolean;
  QuickReload?: boolean;
  SendSaveToServer?: boolean;
};

export const VirtualControlsForm = ({ id }: VirtualControlsFormProps) => {
  const [areVirtualControlsEnabled, setAreVirtualControlsEnabled] =
    useLocalStorage<AreVirtualControlsEnabledProps>(
      'areVirtualControlsEnabled',
      {}
    );
  const theme = useTheme();
  const isLargerThanPhone = useMediaQuery(theme.isLargerThanPhone);
  const areDPadAndButtonsEnabled =
    areVirtualControlsEnabled?.DPadAndButtons ??
    (areVirtualControlsEnabled?.DPadAndButtons === undefined &&
      !isLargerThanPhone);

  const { register, handleSubmit, setValue, watch } =
    useForm<ControlsInputProps>({
      defaultValues: {
        ...areVirtualControlsEnabled,
        DPadAndButtons: areDPadAndButtonsEnabled
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
    <StyledForm id={id} onSubmit={handleSubmit(onSubmit)}>
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
    </StyledForm>
  );
};
