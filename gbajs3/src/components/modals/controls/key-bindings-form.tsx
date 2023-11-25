import { TextField } from '@mui/material';
import { useContext } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { styled } from 'styled-components';
import { useLocalStorage } from 'usehooks-ts';

import { emulatorKeyBindingsLocalStorageKey } from '../../../context/emulator/consts.tsx';
import { EmulatorContext } from '../../../context/emulator/emulator.tsx';

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
  const { emulator, isEmulatorRunning } = useContext(EmulatorContext);
  const {
    handleSubmit,
    setValue,
    control,
    formState: { errors }
  } = useForm<KeyBindingInputProps>();

  const defaultKeyBindings = emulator?.defaultKeyBindings();

  const [currentKeyBindings, setCurrentKeyBindings] = useLocalStorage(
    emulatorKeyBindingsLocalStorageKey,
    defaultKeyBindings ?? []
  );

  const onSubmit = (formData: KeyBindingInputProps) => {
    const keyBindings = Object.entries(formData)
      .filter(([, v]) => !!v)
      .map(([, k]) => k);

    if (isEmulatorRunning) emulator?.remapKeyBindings(keyBindings);

    setCurrentKeyBindings(keyBindings);
  };

  return (
    <StyledForm id={id} onSubmit={handleSubmit(onSubmit)}>
      {currentKeyBindings?.map((keyBinding) => {
        return (
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
                }}
                error={!!errors[keyBinding.gbaInput]}
                helperText={errors?.[keyBinding.gbaInput]?.message}
              />
            )}
          />
        );
      })}
    </StyledForm>
  );
};
