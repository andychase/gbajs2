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
import { useAddCallbacks } from '../../hooks/emulator/use-add-callbacks.tsx';
import { EmbeddedProductTour } from '../product-tour/embedded-product-tour.tsx';
import { CircleCheckButton } from '../shared/circle-check-button.tsx';
import { ManagedCheckbox } from '../shared/managed-checkbox.tsx';
import { NumberInput } from '../shared/number-input.tsx';
import { Copy } from '../shared/styled.tsx';

import type { TourSteps } from '../product-tour/embedded-product-tour.tsx';
import type { SubmitHandler } from 'react-hook-form';

export type EmulatorSettings = {
  allowOpposingDirections: boolean;
  fileSystemNotificationsEnabled: boolean;
  frameSkip?: number;
  baseFpsTarget?: number;
  muteOnFastForward: boolean;
  muteOnRewind: boolean;
  rewindBufferCapacity?: number;
  rewindBufferInterval?: number;
  saveFileName?: string;
  saveFileSystemOnCreateUpdateDelete: boolean;
  saveFileSystemOnInGameSave: boolean;
  audioSampleRate?: number;
  audioBufferSize?: number;
  timestepSync: boolean;
  videoSync: boolean;
  audioSync: boolean;
  threadedVideo: boolean;
  rewindEnable: boolean;
  showFpsCounter: boolean;
};

const StyledForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 15px;
`;

const GridContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
`;

export const EmulatorSettingsModal = () => {
  const { emulator } = useEmulatorContext();
  const { isRunning } = useRunningContext();
  const { setIsModalOpen } = useModalContext();
  const { addCallbacks } = useAddCallbacks();
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
      baseFpsTarget: emulatorSettings?.baseFpsTarget ?? 60,
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
      timestepSync: emulatorSettings?.timestepSync ?? true,
      videoSync: emulatorSettings?.videoSync ?? false,
      audioSync: emulatorSettings?.audioSync ?? false,
      threadedVideo: emulatorSettings?.threadedVideo ?? false,
      rewindEnable: emulatorSettings?.rewindEnable ?? true,
      showFpsCounter: emulatorSettings?.showFpsCounter ?? false
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

    addCallbacks({
      saveFileSystemOnInGameSave: rest.saveFileSystemOnInGameSave,
      fileSystemNotificationsEnabled: rest.fileSystemNotificationsEnabled
    });

    emulator?.setCoreSettings({
      allowOpposingDirections: rest.allowOpposingDirections,
      frameSkip: rest.frameSkip,
      baseFpsTarget: rest.baseFpsTarget,
      rewindBufferCapacity: rest.rewindBufferCapacity,
      rewindBufferInterval: rest.rewindBufferInterval,
      audioSampleRate: rest.audioSampleRate,
      audioBufferSize: rest.audioBufferSize,
      timestepSync: rest.timestepSync,
      videoSync: rest.videoSync,
      audioSync: rest.audioSync,
      threadedVideo: rest.threadedVideo,
      rewindEnable: rest.rewindEnable,
      showFpsCounter: rest.showFpsCounter
    });
  };

  const resetEmulatorSettings = () => {
    setEmulatorSettings(undefined);
    reset();

    addCallbacks({
      saveFileSystemOnInGameSave: true,
      fileSystemNotificationsEnabled: true
    });

    emulator?.setCoreSettings({
      allowOpposingDirections: true,
      frameSkip: 0,
      baseFpsTarget: 60,
      rewindBufferCapacity: 600,
      rewindBufferInterval: 1,
      audioSampleRate: 48000,
      audioBufferSize: 1024,
      timestepSync: true,
      videoSync: false,
      audioSync: false,
      threadedVideo: false,
      rewindEnable: true,
      showFpsCounter: false
    });
  };

  const tourSteps: TourSteps = [
    {
      content: <p>Use this form to adjust emulator core settings.</p>,
      target: `#${CSS.escape(`${baseId}--emulator-settings-form`)}`
    },
    {
      content: (
        <p>
          This form field changes the frame skip every render cycle, higher
          numbers mean more frames skipped.
        </p>
      ),
      target: `#${CSS.escape(`${baseId}--frame-skip`)}`
    },
    {
      content: (
        <p>
          This form field changes the rewind buffer capacity, this number
          represents how many frames are available when rewinding.
        </p>
      ),
      target: `#${CSS.escape(`${baseId}--rewind-capacity`)}`
    },
    {
      content: (
        <p>
          This form field changes how many frames are rewound in every rewind
          cycle, higher numbers mean faster rewind.
        </p>
      ),
      placement: 'right',
      target: `#${CSS.escape(`${baseId}--rewind-interval`)}`
    },
    {
      content: (
        <p>
          This form field changes the audio sample rate, and can only be set
          when the emulator is not running. This is best effort, and values will
          only apply if supported on your device.
        </p>
      ),
      target: `#${CSS.escape(`${baseId}--audio-sample-rate`)}`
    },
    {
      content: (
        <p>
          This form field changes the audio buffer size, and can only be set
          when the emulator is not running. If you experience audio cracking,
          try adjusting this value.
        </p>
      ),
      placement: 'right',
      target: `#${CSS.escape(`${baseId}--audio-buffer-size`)}`
    },
    {
      content: (
        <p>
          This form field changes the default save name, and can only be set
          when the emulator is not running.. Use this if your save file name
          does not match the rom file name.
        </p>
      ),
      target: `#${CSS.escape(`${baseId}--save-file-name`)}`
    },
    {
      content: (
        <p>
          This checkbox enables and disables using opposing opad directions at
          the same time.
        </p>
      ),
      target: `#${CSS.escape(`${baseId}--allow-opposing-directions`)}`
    },
    {
      content: (
        <p>
          This checkbox enables and disables toast notifications when creating,
          updating or deleting files in the file system.
        </p>
      ),
      placement: 'right',
      target: `#${CSS.escape(`${baseId}--file-system-notifications`)}`
    },
    {
      content: (
        <p>
          This checkbox enables and disables automatic muting when rewinding.
        </p>
      ),
      target: `#${CSS.escape(`${baseId}--mute-on-rewind`)}`
    },
    {
      content: (
        <p>
          This checkbox enables and disables automatic muting when fast forward
          is enabled.
        </p>
      ),
      placement: 'right',
      target: `#${CSS.escape(`${baseId}--mute-on-fast-forward`)}`
    },
    {
      content: (
        <p>
          This checkbox enables and disables automatic file system persistence
          on create, update and delete actions.
        </p>
      ),
      target: `#${CSS.escape(`${baseId}--save-file-system-on-cud`)}`
    },
    {
      content: (
        <p>
          This checkbox enables and disables automatic file system persistence
          when saving inside of a game.
        </p>
      ),
      placement: 'right',
      target: `#${CSS.escape(`${baseId}--save-file-system-on-in-game-save`)}`
    },
    {
      content: (
        <p>
          This checkbox enables and disables syncing to video frames, only one
          of video or audio sync should be checked at a time. If you dislike
          screen tearing, this option should be enabled.
        </p>
      ),
      target: `#${CSS.escape(`${baseId}--video-sync`)}`
    },
    {
      content: (
        <p>
          This checkbox enables and disables syncing to audio, only one of audio
          or video sync should be checked at a time. If you cannot get perfect
          audio using different audio buffer sizes, enable this option.
        </p>
      ),
      placement: 'right',
      target: `#${CSS.escape(`${baseId}--audio-sync`)}`
    },
    {
      content: (
        <p>
          This checkbox enables and disables threaded video, this sometimes
          helps or hurts the frame rate.
        </p>
      ),
      target: `#${CSS.escape(`${baseId}--threaded-video`)}`
    },
    {
      content: (
        <p>
          This checkbox enables and disables rewind capabilities, and can only
          take effect when the emulator is not running. Sometimes disabling can
          help with performance.
        </p>
      ),
      placement: 'right',
      target: `#${CSS.escape(`${baseId}--rewind-enabled`)}`
    },
    {
      content: (
        <p>
          Use the <i>Save</i> button to save your settings.
        </p>
      ),
      target: `#${CSS.escape(`${baseId}--save-button`)}`
    },
    {
      content: (
        <p>
          Use the <i>Reset</i> button to revert all settings to their original
          defaults.
        </p>
      ),
      placement: 'right',
      target: `#${CSS.escape(`${baseId}--reset-button`)}`
    }
  ];

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
          <GridContainer>
            <NumberInput
              id={`${baseId}--frame-skip`}
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
              id={`${baseId}--base-fps-target`}
              label="Base FPS Target"
              min={0}
              size="small"
              {...register('baseFpsTarget', {
                required: {
                  value: true,
                  message: 'Base FPS target is required'
                },
                valueAsNumber: true
              })}
            />
            <NumberInput
              id={`${baseId}--rewind-capacity`}
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
              id={`${baseId}--rewind-interval`}
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
            <FormControl id={`${baseId}--audio-sample-rate`} size="small">
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
            <FormControl id={`${baseId}--audio-buffer-size`} size="small">
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
          </GridContainer>
          <Controller
            control={control}
            name="saveFileName"
            render={({ field: { name, value, ...rest } }) => (
              <TextField
                id={`${baseId}--save-file-name`}
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
          <GridContainer>
            <ManagedCheckbox
              id={`${baseId}--allow-opposing-directions`}
              label="Allow opposing directions"
              watcher={watch('allowOpposingDirections')}
              {...register('allowOpposingDirections')}
            />
            <ManagedCheckbox
              id={`${baseId}--file-system-notifications`}
              label="File system notifications"
              watcher={watch('fileSystemNotificationsEnabled')}
              {...register('fileSystemNotificationsEnabled')}
            />
            <ManagedCheckbox
              id={`${baseId}--mute-on-rewind`}
              label="Mute on rewind"
              watcher={watch('muteOnRewind')}
              {...register('muteOnRewind')}
            />
            <ManagedCheckbox
              id={`${baseId}--mute-on-fast-forward`}
              label="Mute on fast forward"
              watcher={watch('muteOnFastForward')}
              {...register('muteOnFastForward')}
            />
            <ManagedCheckbox
              id={`${baseId}--save-file-system-on-cud`}
              label="Save file system on create / update / delete"
              watcher={watch('saveFileSystemOnCreateUpdateDelete')}
              {...register('saveFileSystemOnCreateUpdateDelete')}
            />
            <ManagedCheckbox
              id={`${baseId}--save-file-system-on-in-game-save`}
              label="Save file system on in-game save"
              watcher={watch('saveFileSystemOnInGameSave')}
              {...register('saveFileSystemOnInGameSave')}
            />
            <ManagedCheckbox
              id={`${baseId}--timesttep-sync`}
              label="Timestep Sync"
              watcher={watch('timestepSync')}
              {...register('timestepSync')}
            />
            <ManagedCheckbox
              id={`${baseId}--video-sync`}
              label="Video Sync"
              watcher={watch('videoSync')}
              {...register('videoSync')}
            />
            <ManagedCheckbox
              id={`${baseId}--audio-sync`}
              label="Audio Sync"
              watcher={watch('audioSync')}
              {...register('audioSync')}
            />
            <ManagedCheckbox
              id={`${baseId}--show-fps-counter`}
              label="FPS Counter"
              watcher={watch('showFpsCounter')}
              {...register('showFpsCounter')}
            />
            <ManagedCheckbox
              id={`${baseId}--threaded-video`}
              label="Threaded Video"
              watcher={watch('threadedVideo')}
              {...register('threadedVideo')}
            />
            <ManagedCheckbox
              id={`${baseId}--rewind-enabled`}
              label="Rewind Enabled"
              watcher={watch('rewindEnable')}
              {...register('rewindEnable')}
            />
          </GridContainer>
        </StyledForm>
      </ModalBody>
      <ModalFooter>
        <CircleCheckButton
          id={`${baseId}--save-button`}
          copy="Save"
          form={`${baseId}--emulator-settings-form`}
          showSuccess={isSubmitSuccessful}
          type="submit"
        />
        <Button
          id={`${baseId}--reset-button`}
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
      <EmbeddedProductTour
        steps={tourSteps}
        completedProductTourStepName="hasCompletedSettingsTour"
      />
    </>
  );
};
