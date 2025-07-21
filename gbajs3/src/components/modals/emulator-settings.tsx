import {
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Tab,
  Tabs,
  TextField
} from '@mui/material';
import { useLocalStorage } from '@uidotdev/usehooks';
import { useId, useState, type ReactNode } from 'react';
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
// import {
//   EmbeddedProductTour,
//   type TourSteps
// } from '../product-tour/embedded-product-tour.tsx';
import { CircleCheckButton } from '../shared/circle-check-button.tsx';
import { ManagedCheckbox } from '../shared/managed-checkbox.tsx';
import { NumberInput } from '../shared/number-input.tsx';

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
  autoSaveStateTimerIntervalSeconds?: number;
  autoSaveStateEnable?: boolean;
  restoreAutoSaveStateOnLoad?: boolean;
  autoSaveStateLoadNotificationEnabled: boolean;
  autoSaveStateCaptureNotificationEnabled: boolean;
};

type TabPanelProps = {
  children: ReactNode;
  index: number;
  value: number;
};

const StyledForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 15px;
`;

const StyledModalBody = styled(ModalBody)`
  padding: 0;
`;

const TabWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
`;

const TabFlexWrapper = styled.div`
  flex-grow: 1;
  display: flex;
`;

const TabPanel = ({ children, index, value }: TabPanelProps) => (
  <div
    role="tabpanel"
    hidden={value !== index}
    id={`tabpanel-${index}`}
    aria-labelledby={`tab-${index}`}
    style={{ width: '100%' }}
  >
    <TabWrapper>{children}</TabWrapper>
  </div>
);

const a11yProps = (index: number) => ({
  id: `settings-tab-${index}`,
  'aria-controls': `tabpanel-${index}`
});

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
      showFpsCounter: emulatorSettings?.showFpsCounter ?? false,
      autoSaveStateTimerIntervalSeconds:
        emulatorSettings?.autoSaveStateTimerIntervalSeconds ?? 30,
      autoSaveStateEnable: emulatorSettings?.autoSaveStateEnable ?? true,
      restoreAutoSaveStateOnLoad:
        emulatorSettings?.restoreAutoSaveStateOnLoad ?? true,
      autoSaveStateLoadNotificationEnabled:
        emulatorSettings?.autoSaveStateLoadNotificationEnabled ?? true,
      autoSaveStateCaptureNotificationEnabled:
        emulatorSettings?.autoSaveStateCaptureNotificationEnabled ?? true
    }
  });
  const [tabValue, setTabValue] = useState(0);
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
      fileSystemNotificationsEnabled: rest.fileSystemNotificationsEnabled,
      autoSaveStateLoadNotificationEnabled:
        rest.autoSaveStateLoadNotificationEnabled,
      autoSaveStateCaptureNotificationEnabled:
        rest.autoSaveStateCaptureNotificationEnabled
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
      showFpsCounter: rest.showFpsCounter,
      autoSaveStateTimerIntervalSeconds: rest.autoSaveStateTimerIntervalSeconds,
      autoSaveStateEnable: rest.autoSaveStateEnable,
      restoreAutoSaveStateOnLoad: rest.restoreAutoSaveStateOnLoad
    });
  };

  const resetEmulatorSettings = () => {
    setEmulatorSettings(undefined);
    reset();

    addCallbacks({
      saveFileSystemOnInGameSave: true,
      fileSystemNotificationsEnabled: true,
      autoSaveStateLoadNotificationEnabled: true,
      autoSaveStateCaptureNotificationEnabled: true
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
      showFpsCounter: false,
      autoSaveStateTimerIntervalSeconds: 30,
      autoSaveStateEnable: true,
      restoreAutoSaveStateOnLoad: true
    });
  };

  // TODO: break this tour apart, tabs have broken the current functionality
  // const tourSteps: TourSteps = [
  //   {
  //     content: <p>Use this form to adjust emulator core settings.</p>,
  //     target: `#${CSS.escape(`${baseId}--emulator-settings-form`)}`
  //   },
  //   {
  //     content: (
  //       <p>
  //         This form field changes the frame skip every render cycle, higher
  //         numbers mean more frames skipped.
  //       </p>
  //     ),
  //     target: `#${CSS.escape(`${baseId}--frame-skip`)}`
  //   },
  //   {
  //     content: (
  //       <p>
  //         This form field changes the rewind buffer capacity, this number
  //         represents how many frames are available when rewinding.
  //       </p>
  //     ),
  //     target: `#${CSS.escape(`${baseId}--rewind-capacity`)}`
  //   },
  //   {
  //     content: (
  //       <p>
  //         This form field changes how many frames are rewound in every rewind
  //         cycle, higher numbers mean faster rewind.
  //       </p>
  //     ),
  //     placement: 'right',
  //     target: `#${CSS.escape(`${baseId}--rewind-interval`)}`
  //   },
  //   {
  //     content: (
  //       <p>
  //         This form field changes the audio sample rate, and can only be set
  //         when the emulator is not running. This is best effort, and values will
  //         only apply if supported on your device.
  //       </p>
  //     ),
  //     target: `#${CSS.escape(`${baseId}--audio-sample-rate`)}`
  //   },
  //   {
  //     content: (
  //       <p>
  //         This form field changes the audio buffer size, and can only be set
  //         when the emulator is not running. If you experience audio cracking,
  //         try adjusting this value.
  //       </p>
  //     ),
  //     placement: 'right',
  //     target: `#${CSS.escape(`${baseId}--audio-buffer-size`)}`
  //   },
  //   {
  //     content: (
  //       <p>
  //         This form field changes the default save name, and can only be set
  //         when the emulator is not running.. Use this if your save file name
  //         does not match the rom file name.
  //       </p>
  //     ),
  //     target: `#${CSS.escape(`${baseId}--save-file-name`)}`
  //   },
  //   {
  //     content: (
  //       <p>
  //         This checkbox enables and disables using opposing opad directions at
  //         the same time.
  //       </p>
  //     ),
  //     target: `#${CSS.escape(`${baseId}--allow-opposing-directions`)}`
  //   },
  //   {
  //     content: (
  //       <p>
  //         This checkbox enables and disables toast notifications when creating,
  //         updating or deleting files in the file system.
  //       </p>
  //     ),
  //     placement: 'right',
  //     target: `#${CSS.escape(`${baseId}--file-system-notifications`)}`
  //   },
  //   {
  //     content: (
  //       <p>
  //         This checkbox enables and disables automatic muting when rewinding.
  //       </p>
  //     ),
  //     target: `#${CSS.escape(`${baseId}--mute-on-rewind`)}`
  //   },
  //   {
  //     content: (
  //       <p>
  //         This checkbox enables and disables automatic muting when fast forward
  //         is enabled.
  //       </p>
  //     ),
  //     placement: 'right',
  //     target: `#${CSS.escape(`${baseId}--mute-on-fast-forward`)}`
  //   },
  //   {
  //     content: (
  //       <p>
  //         This checkbox enables and disables automatic file system persistence
  //         on create, update and delete actions.
  //       </p>
  //     ),
  //     target: `#${CSS.escape(`${baseId}--save-file-system-on-cud`)}`
  //   },
  //   {
  //     content: (
  //       <p>
  //         This checkbox enables and disables automatic file system persistence
  //         when saving inside of a game.
  //       </p>
  //     ),
  //     placement: 'right',
  //     target: `#${CSS.escape(`${baseId}--save-file-system-on-in-game-save`)}`
  //   },
  //   {
  //     content: (
  //       <p>
  //         This checkbox enables and disables syncing to video frames, only one
  //         of video or audio sync should be checked at a time. If you dislike
  //         screen tearing, this option should be enabled.
  //       </p>
  //     ),
  //     target: `#${CSS.escape(`${baseId}--video-sync`)}`
  //   },
  //   {
  //     content: (
  //       <p>
  //         This checkbox enables and disables syncing to audio, only one of audio
  //         or video sync should be checked at a time. If you cannot get perfect
  //         audio using different audio buffer sizes, enable this option.
  //       </p>
  //     ),
  //     placement: 'right',
  //     target: `#${CSS.escape(`${baseId}--audio-sync`)}`
  //   },
  //   {
  //     content: (
  //       <p>
  //         This checkbox enables and disables threaded video, this sometimes
  //         helps or hurts the frame rate.
  //       </p>
  //     ),
  //     target: `#${CSS.escape(`${baseId}--threaded-video`)}`
  //   },
  //   {
  //     content: (
  //       <p>
  //         This checkbox enables and disables rewind capabilities, and can only
  //         take effect when the emulator is not running. Sometimes disabling can
  //         help with performance.
  //       </p>
  //     ),
  //     placement: 'right',
  //     target: `#${CSS.escape(`${baseId}--rewind-enabled`)}`
  //   },
  //   {
  //     content: (
  //       <p>
  //         Use the <i>Save</i> button to save your settings.
  //       </p>
  //     ),
  //     target: `#${CSS.escape(`${baseId}--save-button`)}`
  //   },
  //   {
  //     content: (
  //       <p>
  //         Use the <i>Reset</i> button to revert all settings to their original
  //         defaults.
  //       </p>
  //     ),
  //     placement: 'right',
  //     target: `#${CSS.escape(`${baseId}--reset-button`)}`
  //   }
  // ];

  const handleTabChange = (_: React.SyntheticEvent, tabIndex: number) =>
    setTabValue(tabIndex);

  return (
    <>
      <ModalHeader title="Emulator Settings" />
      <StyledModalBody>
        <StyledForm
          id={`${baseId}--emulator-settings-form`}
          aria-label="Emulator Settings Form"
          onSubmit={handleSubmit(onSubmit)}
        >
          <TabFlexWrapper>
            <Tabs
              orientation="vertical"
              variant="scrollable"
              value={tabValue}
              onChange={handleTabChange}
              aria-label="Settings tabs"
              sx={{
                borderRight: 1,
                borderColor: 'divider',
                minWidth: 'fit-content'
              }}
            >
              <Tab label="Game" {...a11yProps(0)} />
              <Tab label="Audio" {...a11yProps(1)} />
              <Tab label="Video" {...a11yProps(2)} />
              <Tab label="File" {...a11yProps(3)} />
              <Tab label="Alert" {...a11yProps(4)} />
            </Tabs>
            <TabPanel value={tabValue} index={0}>
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
              <NumberInput
                id={`${baseId}--auto-save-state-interval`}
                label="Auto Save State Interval"
                min={1}
                max={100}
                size="small"
                {...register('autoSaveStateTimerIntervalSeconds', {
                  required: {
                    value: true,
                    message: 'Auto save state interval is required'
                  },
                  valueAsNumber: true
                })}
              />
              <ManagedCheckbox
                id={`${baseId}--allow-opposing-directions`}
                label="Allow opposing directions"
                watcher={watch('allowOpposingDirections')}
                {...register('allowOpposingDirections')}
              />
              <ManagedCheckbox
                id={`${baseId}--rewind-enabled`}
                label="Rewind enabled"
                watcher={watch('rewindEnable')}
                {...register('rewindEnable')}
              />
              <ManagedCheckbox
                id={`${baseId}--auto-save-state-enabled`}
                label="Auto save state enabled"
                watcher={watch('autoSaveStateEnable')}
                {...register('autoSaveStateEnable')}
              />
              <ManagedCheckbox
                id={`${baseId}--restore-auto-save-state-on-load`}
                label="Restore auto save state"
                watcher={watch('restoreAutoSaveStateOnLoad')}
                {...register('restoreAutoSaveStateOnLoad')}
              />
            </TabPanel>
            <TabPanel value={tabValue} index={1}>
              <FormControl id={`${baseId}--audio-sample-rate`} size="small">
                <InputLabel>Audio Sample Rate</InputLabel>
                <Select
                  label="Audio Sample Rate"
                  disabled={isRunning}
                  value={watch('audioSampleRate')}
                  {...register('audioSampleRate', {
                    required: {
                      value: true,
                      message: 'Sample rate is required'
                    },
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
                    required: {
                      value: true,
                      message: 'Buffer size is required'
                    },
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
            </TabPanel>
            <TabPanel value={tabValue} index={2}>
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
            </TabPanel>
            <TabPanel value={tabValue} index={3}>
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
            </TabPanel>
            <TabPanel value={tabValue} index={4}>
              <ManagedCheckbox
                id={`${baseId}--file-system-notifications`}
                label="File system notifications"
                watcher={watch('fileSystemNotificationsEnabled')}
                {...register('fileSystemNotificationsEnabled')}
              />
              <ManagedCheckbox
                id={`${baseId}--save-state-load-notification`}
                label="Auto save state load notification"
                watcher={watch('autoSaveStateLoadNotificationEnabled')}
                {...register('autoSaveStateLoadNotificationEnabled')}
              />
              <ManagedCheckbox
                id={`${baseId}--save-state-capture-notification`}
                label="Auto save state capture notification"
                watcher={watch('autoSaveStateCaptureNotificationEnabled')}
                {...register('autoSaveStateCaptureNotificationEnabled')}
              />
            </TabPanel>
          </TabFlexWrapper>
        </StyledForm>
      </StyledModalBody>
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
      {/* <EmbeddedProductTour
        steps={tourSteps}
        completedProductTourStepName="hasCompletedSettingsTour"
      /> */}
    </>
  );
};
