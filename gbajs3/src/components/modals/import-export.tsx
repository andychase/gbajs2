import { Button } from '@mui/material';
import { type Entry } from '@zip.js/zip.js';
import { useCallback, useId, useState } from 'react';
import { Controller, useForm, type SubmitHandler } from 'react-hook-form';

import { ModalBody } from './modal-body.tsx';
import { ModalFooter } from './modal-footer.tsx';
import { ModalHeader } from './modal-header.tsx';
import { useEmulatorContext, useModalContext } from '../../hooks/context.tsx';
import { useAddCallbacks } from '../../hooks/emulator/use-add-callbacks.tsx';
import {
  EmbeddedProductTour,
  type TourSteps
} from '../product-tour/embedded-product-tour.tsx';
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

const writeFileToEmulator = async (
  emulator: GBAEmulator | null,
  file: File
) => {
  const name = file.name;
  const nameLower = name.toLowerCase();

  if (
    nameLower.endsWith('.gba') ||
    nameLower.endsWith('.gbc') ||
    nameLower.endsWith('.gb') ||
    nameLower.endsWith('.zip') ||
    nameLower.endsWith('.7z')
  ) {
    emulator?.uploadRom(file);
    return;
  }
  if (nameLower.endsWith('_auto.ss')) {
    const arrayBuffer = await file.arrayBuffer();
    await emulator?.uploadAutoSaveState(
      `${emulator?.filePaths().autosave}/${name}`,
      new Uint8Array(arrayBuffer)
    );
    return;
  }
  if (nameLower.endsWith('.sav') || nameLower.match(/\.ss[0-9]+/)) {
    emulator?.uploadSaveOrSaveState(file);
    return;
  }
  if (nameLower.endsWith('.cheats')) {
    emulator?.uploadCheats(file);
    return;
  }
  if (
    nameLower.endsWith('.ips') ||
    nameLower.endsWith('.ups') ||
    nameLower.endsWith('.bps')
  ) {
    emulator?.uploadPatch(file);
    return;
  }
  if (nameLower.endsWith('.png')) {
    emulator?.uploadScreenshot(file);
    return;
  }

  console.warn(`No supported write path for ${name}`);
};

const importZipToEmulatorFs = (emulator: GBAEmulator | null, zipFile: File) => {
  const writeEntryToEmulator = async (entry: Entry) => {
    if (!entry || !entry.filename) return;
    if (entry.directory) return;

    const normalized = entry.filename.replace(/\\/g, '/').replace(/^\/+/, '');

    if (normalized.includes('..')) {
      console.warn('Skipping unsafe path in ZIP:', normalized);
      return;
    }

    if (normalized === 'local-storage.json') {
      restoreLocalStorageFromZip(entry);
      return;
    }

    const file = await readFileFromZipEntry(entry);

    if (file) await writeFileToEmulator(emulator, file);
  };

  return readZipEntriesFromBlob(zipFile, writeEntryToEmulator);
};

export const ImportExportModal = () => {
  const { setIsModalOpen } = useModalContext();
  const { emulator } = useEmulatorContext();
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
  const buttonBaseId = useId();

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      reset();
      setValue('zipFile', acceptedFiles[0], { shouldValidate: true });
    },
    [reset, setValue]
  );

  const onSubmit: SubmitHandler<InputProps> = async ({ zipFile }) => {
    await importZipToEmulatorFs(emulator, zipFile);
    await syncActionIfEnabled();
    setIsModalOpen(false);
  };

  const tourSteps: TourSteps = [
    {
      content: (
        <>
          <p>
            Use this area to drag and drop the exported zip file, or click to
            select a file.
          </p>
          <p>
            Uploaded exports should have an extension of:{' '}
            {validFileExtensions.map((ext) => `'${ext}'`).join(', ')}.
          </p>
        </>
      ),
      target: `#${CSS.escape(`${importFormId}--drag-and-drop`)}`
    },
    {
      content: <p>Use this button to import your zip file once loaded.</p>,
      target: `#${CSS.escape(`${buttonBaseId}-import`)}`
    },
    {
      content: (
        <p>
          Use this button to export a zip file containing your file system, and
          all emulator related settings/state.
        </p>
      ),
      target: `#${CSS.escape(`${buttonBaseId}-export`)}`
    }
  ];

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
          id={`${buttonBaseId}-import`}
          form={importFormId}
          type="submit"
          variant="contained"
          loading={isSubmitting}
        >
          Import
        </Button>
        <Button
          id={`${buttonBaseId}-export`}
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
      <EmbeddedProductTour
        steps={tourSteps}
        completedProductTourStepName="hasCompletedImportExportTour"
      />
    </>
  );
};
