import { TextField } from '@mui/material';
import { useLocalStorage } from '@uidotdev/usehooks';
import { Controller, useForm } from 'react-hook-form';
import { styled } from 'styled-components';

import { emulatorKeyBindingsLocalStorageKey } from '../../../context/emulator/consts.tsx';
import { useEmulatorContext } from '../../../hooks/context.tsx';

import type { KeyBinding } from '../../../emulator/mgba/mgba-emulator.tsx';

type KeyBindingsFormProps = {
  id: string;
};

type KeyBindingInputProps = {
  [gbaInput: string]: KeyBinding;
};

const StyledForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

export const KeyBindingsForm = ({ id }: KeyBindingsFormProps) => {
  const { emulator, isEmulatorRunning } = useEmulatorContext();
  const {
    handleSubmit,
    setValue,
    control,
    formState: { errors }
  } = useForm<KeyBindingInputProps>();

  const defaultKeyBindings = emulator?.defaultKeyBindings();

  const [currentKeyBindings, setCurrentKeyBindings] = useLocalStorage<
    KeyBinding[] | undefined
  >(emulatorKeyBindingsLocalStorageKey);

  const onSubmit = (formData: KeyBindingInputProps) => {
    const keyBindings = Object.entries(formData)
      .filter(([, v]) => !!v)
      .map(([, k]) => k);

    if (isEmulatorRunning) emulator?.remapKeyBindings(keyBindings);

    setCurrentKeyBindings(keyBindings);
  };

  const renderedBindings = currentKeyBindings ?? defaultKeyBindings;

  return (
    <StyledForm
      aria-label="Key Bindings Form"
      id={id}
      onSubmit={handleSubmit(onSubmit)}
    >
      {renderedBindings?.map((keyBinding) => (
        <Controller
          key={`gba_input_${keyBinding.gbaInput.toLowerCase()}`}
          control={control}
          name={keyBinding.gbaInput}
          defaultValue={keyBinding}
          rules={{
            validate: {
              noSpace: (value) =>
                value.key !== ' ' ||
                'Space is reserved for accessibility requirements',
              noTab: (value) =>
                value.key?.toLowerCase() !== 'tab' ||
                'Tab is reserved for accessibility requirements'
            }
          }}
          render={({ field: { value } }) => (
            <TextField
              variant="outlined"
              label={value.gbaInput}
              value={value.key}
              onKeyDown={(keyboardEvent) => {
                if (keyboardEvent.key.toLowerCase() === 'tab') return;

                setValue(value.gbaInput, {
                  gbaInput: value.gbaInput,
                  key: keyboardEvent.key,
                  location: keyboardEvent.location
                });

                keyboardEvent.preventDefault();
              }}
              error={!!errors[keyBinding.gbaInput]}
              helperText={errors?.[keyBinding.gbaInput]?.message}
            />
          )}
        />
      ))}
    </StyledForm>
  );
};
