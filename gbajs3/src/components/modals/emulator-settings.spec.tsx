import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EmulatorSettingsModal } from './emulator-settings.tsx';
import { renderWithContext } from '../../../test/render-with-context.tsx';
import { emulatorSettingsLocalStorageKey } from '../../context/emulator/consts.ts';
import * as contextHooks from '../../hooks/context.tsx';
import * as addCallbackHooks from '../../hooks/emulator/use-add-callbacks.tsx';
import { productTourLocalStorageKey } from '../product-tour/consts.tsx';

import type { GBAEmulator } from '../../emulator/mgba/mgba-emulator.tsx';
import type { CoreCallbackOptions } from '../../hooks/emulator/use-add-callbacks.tsx';
import type { coreSettings } from '@thenick775/mgba-wasm';

describe('<EmulatorSettingsModal />', () => {
  const defaultSampleRates = [22050, 32000, 44100, 48000];
  const defaultAudioBufferSizes = [256, 512, 768, 1024, 1536, 2048, 3072, 4096];

  beforeEach(async () => {
    const { useEmulatorContext: originalEmulator } = await vi.importActual<
      typeof contextHooks
    >('../../hooks/context.tsx');

    vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
      ...originalEmulator(),
      emulator: {
        defaultAudioSampleRates: () => defaultSampleRates,
        defaultAudioBufferSizes: () => defaultAudioBufferSizes,
        getCurrentAutoSaveStatePath: () => null
      } as GBAEmulator
    }));
  });

  it('renders modal with form fields', () => {
    renderWithContext(<EmulatorSettingsModal />);

    expect(screen.getByLabelText('Emulator Settings Form')).toBeInTheDocument();
    expect(screen.getByLabelText('Frame Skip')).toBeInTheDocument();
  });

  it('updates frame only value', async () => {
    renderWithContext(<EmulatorSettingsModal />);

    const frameSkipInput = screen.getByLabelText('Frame Skip');

    await userEvent.clear(frameSkipInput);
    await userEvent.type(frameSkipInput, '5');

    expect(frameSkipInput).toHaveValue(5);
  });

  it('toggles checkboxes', async () => {
    renderWithContext(<EmulatorSettingsModal />);

    const checkbox = screen.getByLabelText('Mute on rewind');
    expect(checkbox).toBeChecked();

    await userEvent.click(checkbox);

    expect(checkbox).not.toBeChecked();
  });

  it('submits the form and saves default values', async () => {
    const addCallbacksSpy: (options: CoreCallbackOptions) => void = vi.fn();
    const setCoreSettingsSpy: (coreSettings: coreSettings) => void = vi.fn();

    const { useEmulatorContext: originalEmulator } = await vi.importActual<
      typeof contextHooks
    >('../../hooks/context.tsx');
    const { useAddCallbacks: originalCallbacks } = await vi.importActual<
      typeof addCallbackHooks
    >('../../hooks/emulator/use-add-callbacks.tsx');

    vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
      ...originalEmulator(),
      emulator: {
        setCoreSettings: setCoreSettingsSpy,
        defaultAudioSampleRates: () => defaultSampleRates,
        defaultAudioBufferSizes: () => defaultAudioBufferSizes,
        getCurrentAutoSaveStatePath: () => null
      } as GBAEmulator
    }));

    vi.spyOn(addCallbackHooks, 'useAddCallbacks').mockImplementation(() => ({
      ...originalCallbacks(),
      addCallbacks: addCallbacksSpy
    }));

    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    renderWithContext(<EmulatorSettingsModal />);

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(setItemSpy).toHaveBeenCalledWith(
      'emulatorSettings',
      '{"frameSkip":0,"baseFpsTarget":60,"rewindBufferCapacity":600,"rewindBufferInterval":1,"allowOpposingDirections":true,"muteOnFastForward":true,"muteOnRewind":true,"saveFileSystemOnInGameSave":true,"saveFileSystemOnCreateUpdateDelete":true,"fileSystemNotificationsEnabled":true,"audioSampleRate":48000,"audioBufferSize":1024,"timestepSync":true,"videoSync":false,"audioSync":false,"threadedVideo":false,"rewindEnable":true,"showFpsCounter":false,"autoSaveStateTimerIntervalSeconds":30,"autoSaveStateEnable":true,"restoreAutoSaveStateOnLoad":true,"autoSaveStateLoadNotificationEnabled":true,"autoSaveStateCaptureNotificationEnabled":true}'
    );

    expect(addCallbacksSpy).toHaveBeenCalledOnce();
    expect(addCallbacksSpy).toHaveBeenCalledWith({
      autoSaveStateCaptureNotificationEnabled: true,
      autoSaveStateLoadNotificationEnabled: true,
      fileSystemNotificationsEnabled: true,
      saveFileSystemOnInGameSave: true
    });

    expect(setCoreSettingsSpy).toHaveBeenCalledOnce();
    expect(setCoreSettingsSpy).toHaveBeenCalledWith({
      allowOpposingDirections: true,
      audioBufferSize: 1024,
      audioSampleRate: 48000,
      audioSync: false,
      frameSkip: 0,
      baseFpsTarget: 60,
      rewindBufferCapacity: 600,
      rewindBufferInterval: 1,
      rewindEnable: true,
      showFpsCounter: false,
      threadedVideo: false,
      timestepSync: true,
      videoSync: false,
      autoSaveStateTimerIntervalSeconds: 30,
      autoSaveStateEnable: true,
      restoreAutoSaveStateOnLoad: true
    });
  });

  // TODO: refactor this test or add a new one surrounding the emulator settings tabs - should probably be broken down by tab
  it('submits the form and saves edited values', async () => {
    const addCallbacksSpy: (options: CoreCallbackOptions) => void = vi.fn();
    const setCoreSettingsSpy: (coreSettings: coreSettings) => void = vi.fn();

    const { useEmulatorContext: originalEmulator } = await vi.importActual<
      typeof contextHooks
    >('../../hooks/context.tsx');
    const { useAddCallbacks: originalCallbacks } = await vi.importActual<
      typeof addCallbackHooks
    >('../../hooks/emulator/use-add-callbacks.tsx');

    vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
      ...originalEmulator(),
      emulator: {
        setCoreSettings: setCoreSettingsSpy,
        getCurrentSaveName: () => 'current_save.sav',
        defaultAudioSampleRates: () => defaultSampleRates,
        defaultAudioBufferSizes: () => defaultAudioBufferSizes,
        getCurrentAutoSaveStatePath: () => null
      } as GBAEmulator
    }));

    vi.spyOn(addCallbackHooks, 'useAddCallbacks').mockImplementation(() => ({
      ...originalCallbacks(),
      addCallbacks: addCallbacksSpy
    }));

    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    renderWithContext(<EmulatorSettingsModal />);

    const frameSkipInput = screen.getByLabelText('Frame Skip');
    const baseFpsTargetInput = screen.getByLabelText('Base FPS Target');
    const rewindCapacityInput = screen.getByLabelText('Rewind Capacity');
    const rewindIntervalInput = screen.getByLabelText('Rewind Interval');
    const saveFileNameInput = screen.getByLabelText('Save File Name');
    const autoSaveStateIntervalInput = screen.getByLabelText(
      'Auto Save State Interval'
    );
    // TODO: test select inputs

    const allowOpposingDirectionsCheckbox = screen.getByLabelText(
      'Allow opposing directions'
    );
    const fileSystemNotificationsCheckbox = screen.getByLabelText(
      'File system notifications'
    );
    const muteOnRewindCheckbox = screen.getByLabelText('Mute on rewind');
    const muteOnFastForwardCheckbox = screen.getByLabelText(
      'Mute on fast forward'
    );
    const saveFileSystemOnFSOperationCheckbox = screen.getByLabelText(
      'Save file system on create / update / delete'
    );
    const saveOnInGameSaveCheckbox = screen.getByLabelText(
      'Save file system on in-game save'
    );
    const timestepSyncCheckbox = screen.getByLabelText('Timestep Sync');
    const videoSyncCheckbox = screen.getByLabelText('Video Sync');
    const audioSyncCheckbox = screen.getByLabelText('Audio Sync');
    const fpsCounterCheckbox = screen.getByLabelText('FPS Counter');
    const threadedVideoCheckbox = screen.getByLabelText('Threaded Video');
    const rewindEnabledCheckbox = screen.getByLabelText('Rewind enabled');
    const autoSaveStateEnabledCheckbox = screen.getByLabelText(
      'Auto save state enabled'
    );
    const restoreAutoSaveStateCheckbox = screen.getByLabelText(
      'Restore auto save state'
    );
    const autoSaveStateCaptureNotificationCheckbox = screen.getByLabelText(
      'Auto save state capture notification'
    );
    const autoSaveStateLoadNotificationCheckbox = screen.getByLabelText(
      'Auto save state load notification'
    );

    await userEvent.type(frameSkipInput, '25');

    await userEvent.clear(baseFpsTargetInput);
    await userEvent.type(baseFpsTargetInput, '30');

    await userEvent.clear(rewindCapacityInput);
    await userEvent.type(rewindCapacityInput, '1000');

    await userEvent.clear(rewindIntervalInput);
    await userEvent.type(rewindIntervalInput, '10');

    await userEvent.clear(saveFileNameInput);
    await userEvent.type(saveFileNameInput, 'custom_save_override.sav');

    await userEvent.clear(autoSaveStateIntervalInput);
    await userEvent.type(autoSaveStateIntervalInput, '10');

    await userEvent.click(allowOpposingDirectionsCheckbox);
    await userEvent.click(fileSystemNotificationsCheckbox);
    await userEvent.click(muteOnRewindCheckbox);
    await userEvent.click(muteOnFastForwardCheckbox);
    await userEvent.click(saveFileSystemOnFSOperationCheckbox);
    await userEvent.click(saveOnInGameSaveCheckbox);
    await userEvent.click(timestepSyncCheckbox);
    await userEvent.click(videoSyncCheckbox);
    await userEvent.click(audioSyncCheckbox);
    await userEvent.click(fpsCounterCheckbox);
    await userEvent.click(threadedVideoCheckbox);
    await userEvent.click(rewindEnabledCheckbox);
    await userEvent.click(autoSaveStateEnabledCheckbox);
    await userEvent.click(restoreAutoSaveStateCheckbox);
    await userEvent.click(autoSaveStateCaptureNotificationCheckbox);
    await userEvent.click(autoSaveStateLoadNotificationCheckbox);

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(setItemSpy).toHaveBeenCalledWith(
      'emulatorSettings',
      '{"frameSkip":25,"baseFpsTarget":30,"rewindBufferCapacity":1000,"rewindBufferInterval":10,"allowOpposingDirections":false,"muteOnFastForward":false,"muteOnRewind":false,"saveFileSystemOnInGameSave":false,"saveFileSystemOnCreateUpdateDelete":false,"fileSystemNotificationsEnabled":false,"audioSampleRate":48000,"audioBufferSize":1024,"timestepSync":false,"videoSync":true,"audioSync":true,"threadedVideo":true,"rewindEnable":false,"showFpsCounter":true,"autoSaveStateTimerIntervalSeconds":10,"autoSaveStateEnable":false,"restoreAutoSaveStateOnLoad":false,"autoSaveStateLoadNotificationEnabled":false,"autoSaveStateCaptureNotificationEnabled":false,"saveFileName":"custom_save_override.sav"}'
    );

    expect(addCallbacksSpy).toHaveBeenCalledOnce();
    expect(addCallbacksSpy).toHaveBeenCalledWith({
      autoSaveStateCaptureNotificationEnabled: false,
      autoSaveStateLoadNotificationEnabled: false,
      fileSystemNotificationsEnabled: false,
      saveFileSystemOnInGameSave: false
    });

    expect(setCoreSettingsSpy).toHaveBeenCalledOnce();
    expect(setCoreSettingsSpy).toHaveBeenCalledWith({
      allowOpposingDirections: false,
      audioBufferSize: 1024,
      audioSampleRate: 48000,
      audioSync: true,
      frameSkip: 25,
      baseFpsTarget: 30,
      rewindBufferCapacity: 1000,
      rewindBufferInterval: 10,
      rewindEnable: false,
      showFpsCounter: true,
      threadedVideo: true,
      timestepSync: false,
      videoSync: true,
      autoSaveStateTimerIntervalSeconds: 10,
      autoSaveStateEnable: false,
      restoreAutoSaveStateOnLoad: false
    });
  });

  it('removes settings when reset button is clicked', async () => {
    const addCallbacksSpy: (options: CoreCallbackOptions) => void = vi.fn();
    const setCoreSettingsSpy: (coreSettings: coreSettings) => void = vi.fn();

    const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem');

    const {
      useEmulatorContext: originalEmulator,
      useRunningContext: originalRunning
    } = await vi.importActual<typeof contextHooks>('../../hooks/context.tsx');
    const { useAddCallbacks: originalCallbacks } = await vi.importActual<
      typeof addCallbackHooks
    >('../../hooks/emulator/use-add-callbacks.tsx');

    vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
      ...originalEmulator(),
      emulator: {
        setCoreSettings: setCoreSettingsSpy,
        getCurrentSaveName: () => 'current_save.sav',
        defaultAudioSampleRates: () => defaultSampleRates,
        defaultAudioBufferSizes: () => defaultAudioBufferSizes,
        getCurrentAutoSaveStatePath: () => null
      } as GBAEmulator
    }));

    vi.spyOn(addCallbackHooks, 'useAddCallbacks').mockImplementation(() => ({
      ...originalCallbacks(),
      addCallbacks: addCallbacksSpy
    }));

    vi.spyOn(contextHooks, 'useRunningContext').mockImplementation(() => ({
      ...originalRunning(),
      isRunning: true
    }));

    renderWithContext(<EmulatorSettingsModal />);

    await userEvent.click(screen.getByRole('button', { name: 'Reset' }));

    expect(removeItemSpy).toHaveBeenCalledWith(emulatorSettingsLocalStorageKey);

    expect(addCallbacksSpy).toHaveBeenCalledOnce();
    expect(addCallbacksSpy).toHaveBeenCalledWith({
      autoSaveStateCaptureNotificationEnabled: true,
      autoSaveStateLoadNotificationEnabled: true,
      fileSystemNotificationsEnabled: true,
      saveFileSystemOnInGameSave: true
    });

    expect(setCoreSettingsSpy).toHaveBeenCalledWith({
      allowOpposingDirections: true,
      audioBufferSize: 1024,
      audioSampleRate: 48000,
      baseFpsTarget: 60,
      audioSync: false,
      frameSkip: 0,
      rewindBufferCapacity: 600,
      rewindBufferInterval: 1,
      rewindEnable: true,
      showFpsCounter: false,
      threadedVideo: false,
      timestepSync: true,
      videoSync: false,
      autoSaveStateTimerIntervalSeconds: 30,
      autoSaveStateEnable: true,
      restoreAutoSaveStateOnLoad: true
    });
  });

  it('displays current save name from emulator when running if no override is present', async () => {
    const {
      useEmulatorContext: originalEmulator,
      useRunningContext: originalRunning
    } = await vi.importActual<typeof contextHooks>('../../hooks/context.tsx');

    vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
      ...originalEmulator(),
      emulator: {
        getCurrentSaveName: () => 'current_save.sav',
        defaultAudioSampleRates: () => defaultSampleRates,
        defaultAudioBufferSizes: () => defaultAudioBufferSizes,
        getCurrentAutoSaveStatePath: () => null
      } as GBAEmulator
    }));

    vi.spyOn(contextHooks, 'useRunningContext').mockImplementation(() => ({
      ...originalRunning(),
      isRunning: true
    }));

    renderWithContext(<EmulatorSettingsModal />);

    expect(screen.getByDisplayValue('current_save.sav')).toBeVisible();
  });

  it('closes modal using the close button', async () => {
    const setIsModalOpenSpy = vi.fn();
    const { useModalContext: original } = await vi.importActual<
      typeof contextHooks
    >('../../hooks/context.tsx');

    vi.spyOn(contextHooks, 'useModalContext').mockImplementation(() => ({
      ...original(),
      setIsModalOpen: setIsModalOpenSpy
    }));

    renderWithContext(<EmulatorSettingsModal />);

    await userEvent.click(screen.getByText('Close', { selector: 'button' }));

    expect(setIsModalOpenSpy).toHaveBeenCalledWith(false);
  });

  it.skip('renders tour steps', async () => {
    const { useModalContext: original } = await vi.importActual<
      typeof contextHooks
    >('../../hooks/context.tsx');

    vi.spyOn(contextHooks, 'useModalContext').mockImplementation(() => ({
      ...original(),
      isModalOpen: true
    }));

    localStorage.setItem(
      productTourLocalStorageKey,
      '{"hasCompletedProductTourIntro":"finished"}'
    );

    renderWithContext(<EmulatorSettingsModal />);

    expect(
      await screen.findByText('Use this form to adjust emulator core settings.')
    ).toBeInTheDocument();

    // click joyride floater
    await userEvent.click(
      screen.getByRole('button', { name: 'Open the dialog' })
    );

    expect(
      screen.getByText('Use this form to adjust emulator core settings.')
    ).toBeVisible();
  }, 15000);
});
