import { useCallback } from 'react';

import { useEmulatorContext } from '../context.tsx';

import type { FileTypes } from '../../emulator/mgba/mgba-emulator.tsx';

export const useWriteFileToEmulator = () => {
  const { emulator } = useEmulatorContext();

  const writeFileToEmulator = useCallback(
    async (file: File, fileType?: keyof FileTypes): Promise<void> => {
      const name = file.name;
      const nameLower = name.toLowerCase();

      if (
        // additional type overrides are given for external uploads, that may/may not have a proper name, but do have a proper type
        fileType === 'rom' ||
        emulator?.isFileExtensionOfType(nameLower, 'rom')
      ) {
        return new Promise<void>((resolve) =>
          emulator?.uploadRom(file, resolve)
        );
      } else if (
        fileType === 'autosave' ||
        emulator?.isFileExtensionOfType(nameLower, 'autosave')
      ) {
        const arrayBuffer = await file.arrayBuffer();
        await emulator?.uploadAutoSaveState(
          `${emulator.filePaths().autosave}/${name}`,
          new Uint8Array(arrayBuffer)
        );
        return;
      } else if (
        fileType === 'save' ||
        emulator?.isFileExtensionOfType(nameLower, 'save')
      ) {
        return new Promise<void>((resolve) =>
          emulator?.uploadSaveOrSaveState(file, resolve)
        );
      } else if (
        fileType === 'cheat' ||
        emulator?.isFileExtensionOfType(nameLower, 'cheat')
      ) {
        return new Promise<void>((resolve) =>
          emulator?.uploadCheats(file, resolve)
        );
      } else if (
        fileType === 'patch' ||
        emulator?.isFileExtensionOfType(nameLower, 'patch')
      ) {
        return new Promise<void>((resolve) =>
          emulator?.uploadPatch(file, resolve)
        );
      } else if (
        fileType === 'screenshot' ||
        emulator?.isFileExtensionOfType(nameLower, 'screenshot')
      ) {
        return new Promise<void>((resolve) =>
          emulator?.uploadScreenshot(file, resolve)
        );
      }
    },
    [emulator]
  );

  return writeFileToEmulator;
};
