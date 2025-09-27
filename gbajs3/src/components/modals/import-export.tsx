import { Button } from '@mui/material';
import { type Entry } from '@zip.js/zip.js';
import { useCallback, useId, useState } from 'react';
import { Controller, useForm, type SubmitHandler } from 'react-hook-form';

import { ModalBody } from './modal-body.tsx';
import { ModalFooter } from './modal-footer.tsx';
import { ModalHeader } from './modal-header.tsx';
import { useEmulatorContext, useModalContext } from '../../hooks/context.tsx';
import { useAddCallbacks } from '../../hooks/emulator/use-add-callbacks.tsx';
import { DragAndDropInput } from '../shared/drag-and-drop-input.tsx';
import {
  addLocalStorageToZip,
  addUint8ArrayToZip,
  generateExportZipName,
  readFileFromZipEntry,
  readZipEntriesFromBlob,
  restoreLocalStorageFromZip,
  setupZipTarget,
  stripLeadingSlashes,
  zipOptions
} from './file-utilities/zip.ts';
import { useWriteFileToEmulator } from '../../hooks/emulator/use-write-file-to-emulator.tsx';

import type {
  FileNode,
  GBAEmulator
} from '../../emulator/mgba/mgba-emulator.tsx';

type InputProps = {
  zipFile: File;
};

const validFileExtensions = ['.zip'];

const flattenFiles = (node?: FileNode): string[] =>
  !node
    ? []
    : [
        ...(node.nextNeighbor ? flattenFiles(node.nextNeighbor) : []),
        ...(!node.isDir
          ? [node.path]
          : (node.children ?? []).flatMap(flattenFiles))
      ];

const exportEmscriptenFsAsZip = async (
  emulator: GBAEmulator | null
): Promise<void> => {
  const zipName = generateExportZipName();
  const files = flattenFiles(emulator?.listAllFiles()).map(stripLeadingSlashes);

  const { writer, finalize } = await setupZipTarget(zipName, zipOptions);

  await files.reduce<Promise<void>>(
    (chain, relPath) =>
      chain.then(async () => {
        const bytes = emulator?.getFile('/' + relPath);
        return bytes && bytes.length
          ? addUint8ArrayToZip(writer, relPath, bytes).then(() => void 0)
          : Promise.resolve();
      }),
    Promise.resolve()
  );

  await addLocalStorageToZip(writer);

  await finalize();
};

const importZipToEmulatorFs = (
  zipFile: File,
  writeFileToEmulator: (file: File) => Promise<void>
) => {
  const writeEntryToEmulator = async (entry: Entry) => {
    if (!entry || !entry.filename) return;
    if (entry.directory) return;

    const normalized = entry.filename.replace(/\\/g, '/').replace(/^\/+/, '');

    if (normalized.includes('..')) {
      console.warn('Skipping unsafe path in ZIP:', normalized);
      return;
    }

    if (normalized === 'local-storage.json') {
      await restoreLocalStorageFromZip(entry);
      return;
    }

    const file = await readFileFromZipEntry(entry);

    if (file) await writeFileToEmulator(file);
  };

  return readZipEntriesFromBlob(zipFile, writeEntryToEmulator);
};

export const ImportExportModal = () => {
  const { setIsModalOpen } = useModalContext();
  const { emulator } = useEmulatorContext();
  const writeFileToEmulator = useWriteFileToEmulator();
  const { syncActionIfEnabled } = useAddCallbacks();
  const {
    reset,
    handleSubmit,
    setValue,
    control,
    formState: { isSubmitting }
  } = useForm<InputProps>();
  const [isExportLoading, setIsExportLoading] = useState(false);
  const importFormId = useId();

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      reset();
      setValue('zipFile', acceptedFiles[0], { shouldValidate: true });
    },
    [reset, setValue]
  );

  const onSubmit: SubmitHandler<InputProps> = async ({ zipFile }) => {
    await importZipToEmulatorFs(zipFile, writeFileToEmulator);
    await syncActionIfEnabled();
    setIsModalOpen(false);
  };

  return (
    <>
      <ModalHeader title="Import/Export" />
      <ModalBody>
        <form
          id={importFormId}
          aria-label="Upload Emulator Zip Form"
          onSubmit={handleSubmit(onSubmit)}
        >
          <Controller
            control={control}
            name="zipFile"
            rules={{
              validate: (zipFile) =>
                !!zipFile || 'At least one export .zip file is required'
            }}
            render={({ field: { name, value }, fieldState: { error } }) => (
              <DragAndDropInput
                ariaLabel="Upload Saves"
                id={`${importFormId}--drag-and-drop`}
                onDrop={onDrop}
                name={name}
                validFileExtensions={validFileExtensions}
                error={error?.message}
                hideAcceptedFiles={!value}
              >
                <p>
                  Drag and drop your exported zip file here, or click to upload
                </p>
              </DragAndDropInput>
            )}
          />
        </form>
      </ModalBody>
      <ModalFooter>
        <Button
          form={importFormId}
          type="submit"
          variant="contained"
          loading={isSubmitting}
        >
          Import
        </Button>
        <Button
          variant="contained"
          color="secondary"
          onClick={async () => {
            setIsExportLoading(true);
            await exportEmscriptenFsAsZip(emulator);
            setIsExportLoading(false);
          }}
          loading={isExportLoading}
        >
          Export
        </Button>
        <Button variant="outlined" onClick={() => setIsModalOpen(false)}>
          Close
        </Button>
      </ModalFooter>
    </>
  );
};
