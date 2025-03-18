import {
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField
} from '@mui/material';
import { useLocalStorage } from '@uidotdev/usehooks';
import { useId } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { styled } from 'styled-components';

import { ModalBody } from './modal-body.tsx';
import { ModalFooter } from './modal-footer.tsx';
import { ModalHeader } from './modal-header.tsx';
import { emulatorSettingsLocalStorageKey } from '../../context/emulator/consts.ts';
import {
  useEmulatorContext,
  useModalContext,
  useRunningContext
} from '../../hooks/context.tsx';
import { CircleCheckButton } from '../shared/circle-check-button.tsx';
import { ManagedCheckbox } from '../shared/managed-checkbox.tsx';
import { NumberInput } from '../shared/number-input.tsx';
import { Copy } from '../shared/styled.tsx';

import type { SubmitHandler } from 'react-hook-form';

export type EmulatorSettings = {
  allowOpposingDirections: boolean;
  fileSystemNotificationsEnabled: boolean;
  frameSkip?: number;
  muteOnFastForward: boolean;
  muteOnRewind: boolean;
  rewindBufferCapacity?: number;
  rewindBufferInterval?: number;
  saveFileName?: string;
  saveFileSystemOnCreateUpdateDelete: boolean;
  saveFileSystemOnInGameSave: boolean;
  audioSampleRate?: number;
  audioBufferSize?: number;
  videoSync: boolean;
  audioSync: boolean;
  threadedVideo: boolean;
  rewindEnable: boolean;
};

const StyledForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 15px;
`;

const FlexContainer = styled.div`
  display: flex;
  gap: 15px;
  min-width: 0;
  flex-direction: column;

  @media ${({ theme }) => theme.isLargerThanPhone} {
    flex-direction: row;
    * {
      flex-grow: 1;
    }
  }
`;

const GridContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px 0;
`;

export const EmulatorSettingsModal = () => {
  const { emulator } = useEmulatorContext();
  const { isRunning } = useRunningContext();
  const { setIsModalOpen } = useModalContext();
  const [emulatorSettings, setEmulatorSettings] = useLocalStorage<
    EmulatorSettings | undefined
  >(emulatorSettingsLocalStorageKey);
  const {
    register,
    reset,
    control,
    watch,
    handleSubmit,
    formState: { isSubmitSuccessful }
  } = useForm<EmulatorSettings>({
    values: {
      frameSkip: emulatorSettings?.frameSkip ?? 0,
      rewindBufferCapacity: emulatorSettings?.rewindBufferCapacity ?? 600,
      rewindBufferInterval: emulatorSettings?.rewindBufferInterval ?? 1,
      allowOpposingDirections:
        emulatorSettings?.allowOpposingDirections ?? true,
      muteOnFastForward: emulatorSettings?.muteOnFastForward ?? true,
      muteOnRewind: emulatorSettings?.muteOnRewind ?? true,
      saveFileName:
        emulatorSettings?.saveFileName ??
        (isRunning ? emulator?.getCurrentSaveName() : ''),
      saveFileSystemOnInGameSave:
        emulatorSettings?.saveFileSystemOnInGameSave ?? true,
      saveFileSystemOnCreateUpdateDelete:
        emulatorSettings?.saveFileSystemOnCreateUpdateDelete ?? true,
      fileSystemNotificationsEnabled:
        emulatorSettings?.fileSystemNotificationsEnabled ?? true,
      audioSampleRate: emulatorSettings?.audioSampleRate ?? 48000,
      audioBufferSize: emulatorSettings?.audioBufferSize ?? 1024,
      videoSync: emulatorSettings?.videoSync ?? true,
      audioSync: emulatorSettings?.audioSync ?? false,
      threadedVideo: emulatorSettings?.threadedVideo ?? false,
      rewindEnable: emulatorSettings?.rewindEnable ?? true
    }
  });
  const baseId = useId();

  const defaultAudioSampleRates = emulator?.defaultAudioSampleRates();
  const defaultAudioBufferSizes = emulator?.defaultAudioBufferSizes();

  const onSubmit: SubmitHandler<EmulatorSettings> = ({
    saveFileName,
    ...rest
  }) => {
    setEmulatorSettings({
      ...rest,
      saveFileName:
        !!saveFileName && saveFileName !== emulator?.getCurrentSaveName()
          ? saveFileName
          : undefined
    });

    emulator?.setCoreSettings({
      allowOpposingDirections: rest.allowOpposingDirections,
      frameSkip: rest.frameSkip,
      rewindBufferCapacity: rest.rewindBufferCapacity,
      rewindBufferInterval: rest.rewindBufferInterval,
      audioSampleRate: rest.audioSampleRate,
      audioBufferSize: rest.audioBufferSize,
      videoSync: rest.videoSync,
      audioSync: rest.audioSync,
      threadedVideo: rest.threadedVideo,
      rewindEnable: rest.rewindEnable
    });
  };

  const resetEmulatorSettings = () => {
    setEmulatorSettings(undefined);
    reset();

    emulator?.setCoreSettings({
      allowOpposingDirections: true,
      frameSkip: 0,
      rewindBufferCapacity: 600,
      rewindBufferInterval: 1,
      audioSampleRate: 48000,
      audioBufferSize: 1024,
      videoSync: false,
      audioSync: true,
      threadedVideo: false,
      rewindEnable: true
    });
  };

  return (
    <>
      <ModalHeader title="Emulator Settings" />
      <ModalBody>
        <StyledForm
          id={`${baseId}--emulator-settings-form`}
          aria-label="Emulator Settings Form"
          onSubmit={handleSubmit(onSubmit)}
        >
          <Copy>Core: {emulator?.coreName}</Copy>
          <FlexContainer>
            <NumberInput
              label="Frame Skip"
              min={0}
              max={32}
              size="small"
              {...register('frameSkip', {
                required: { value: true, message: 'Frame skip is required' },
                valueAsNumber: true
              })}
            />
            <NumberInput
              label="Rewind Capacity"
              min={1}
              max={3600}
              size="small"
              {...register('rewindBufferCapacity', {
                required: {
                  value: true,
                  message: 'Rewind buffer capacity is required'
                },
                valueAsNumber: true
              })}
            />
            <NumberInput
              label="Rewind Interval"
              min={1}
              max={100}
              size="small"
              {...register('rewindBufferInterval', {
                required: {
                  value: true,
                  message: 'Rewind buffer interval is required'
                },
                valueAsNumber: true
              })}
            />
          </FlexContainer>
          <Controller
            control={control}
            name="saveFileName"
            render={({ field: { name, value, ...rest } }) => (
              <TextField
                value={value}
                name={name}
                label="Save File Name"
                variant="outlined"
                size="small"
                disabled={isRunning}
                {...rest}
              />
            )}
          />
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Audio Sample Rate</InputLabel>
            <Select
              label="Audio Sample Rate"
              disabled={isRunning}
              value={watch('audioSampleRate')}
              {...register('audioSampleRate', {
                required: { value: true, message: 'Sample rate is required' },
                valueAsNumber: true
              })}
            >
              {defaultAudioSampleRates?.map((sampleRate, idx) => (
                <MenuItem key={`${sampleRate}_${idx}`} value={sampleRate}>
                  {sampleRate}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 170 }}>
            <InputLabel>Audio Buffer Size</InputLabel>
            <Select
              label="Audio Buffer Size"
              disabled={isRunning}
              value={watch('audioBufferSize')}
              {...register('audioBufferSize', {
                required: { value: true, message: 'Buffer size is required' },
                valueAsNumber: true
              })}
            >
              {defaultAudioBufferSizes?.map((bufferSize, idx) => (
                <MenuItem key={`${bufferSize}_${idx}`} value={bufferSize}>
                  {bufferSize}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <GridContainer>
            <ManagedCheckbox
              label="Allow opposing directions"
              watcher={watch('allowOpposingDirections')}
              {...register('allowOpposingDirections')}
            />
            <ManagedCheckbox
              label="File system notifications"
              watcher={watch('fileSystemNotificationsEnabled')}
              {...register('fileSystemNotificationsEnabled')}
            />
            <ManagedCheckbox
              label="Mute on rewind"
              watcher={watch('muteOnRewind')}
              {...register('muteOnRewind')}
            />
            <ManagedCheckbox
              label="Mute on fast forward"
              watcher={watch('muteOnFastForward')}
              {...register('muteOnFastForward')}
            />
            <ManagedCheckbox
              label="Save file system on create / update / delete"
              watcher={watch('saveFileSystemOnCreateUpdateDelete')}
              {...register('saveFileSystemOnCreateUpdateDelete')}
            />
            <ManagedCheckbox
              label="Save file system on in-game save"
              watcher={watch('saveFileSystemOnInGameSave')}
              {...register('saveFileSystemOnInGameSave')}
            />
            <ManagedCheckbox
              label="Video Sync"
              watcher={watch('videoSync')}
              {...register('videoSync')}
            />
            <ManagedCheckbox
              label="Audio Sync"
              watcher={watch('audioSync')}
              {...register('audioSync')}
            />
            <ManagedCheckbox
              label="Threaded Video"
              watcher={watch('threadedVideo')}
              {...register('threadedVideo')}
            />
            <ManagedCheckbox
              label="Rewind Enabled"
              watcher={watch('rewindEnable')}
              {...register('rewindEnable')}
            />
          </GridContainer>
        </StyledForm>
      </ModalBody>
      <ModalFooter>
        <CircleCheckButton
          copy="Save"
          form={`${baseId}--emulator-settings-form`}
          id={`${baseId}--submit-button`}
          showSuccess={isSubmitSuccessful}
          type="submit"
        />
        <Button
          id={`${baseId}--toggle-raw-cheats`}
          color="info"
          variant="contained"
          onClick={resetEmulatorSettings}
        >
          Reset
        </Button>
        <Button variant="outlined" onClick={() => setIsModalOpen(false)}>
          Close
        </Button>
      </ModalFooter>
    </>
  );
};
