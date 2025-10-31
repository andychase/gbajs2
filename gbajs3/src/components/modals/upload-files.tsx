import {
  Button,
  Checkbox,
  Divider,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  type CheckboxProps
} from '@mui/material';
import { useId, useCallback, useState } from 'react';
import {
  Controller,
  useFieldArray,
  useForm,
  type SubmitHandler
} from 'react-hook-form';
import { BiTrash } from 'react-icons/bi';
import { styled } from 'styled-components';

import { ModalBody } from './modal-body.tsx';
import { ModalFooter } from './modal-footer.tsx';
import { ModalHeader } from './modal-header.tsx';
import { useModalContext, useEmulatorContext } from '../../hooks/context.tsx';
import { useAddCallbacks } from '../../hooks/emulator/use-add-callbacks.tsx';
import { useRunGame } from '../../hooks/emulator/use-run-game.tsx';
import { useWriteFileToEmulator } from '../../hooks/emulator/use-write-file-to-emulator.tsx';
import { DragAndDropInput } from '../shared/drag-and-drop-input.tsx';
import { StyledBiPlus } from '../shared/styled.tsx';

import type { FileTypes } from '../../emulator/mgba/mgba-emulator.tsx';

type InputProps = {
  files?: File[];
  fileUrls?: { url: string; type: keyof FileTypes }[];
  romFileToRun?: string;
};

type RunRomCheckboxProps = {
  fileName: string;
} & Pick<CheckboxProps, 'checked' | 'onChange'>;

type AdditionalFileActionsProps = {
  fileName: string;
  selectedFileName?: string;
  setSelectedFileName: (name: string | null) => void;
  isChecked: boolean;
  isRomFile: boolean;
};

const defaultFileUrl: { url: string; type: keyof FileTypes } = {
  url: '',
  type: 'rom'
};

const defaultNoSelectedRom = 'none';

const GridContainer = styled.div`
  display: grid;
`;

const GridItem = styled.div<{ $isVisible: boolean }>`
  grid-area: 1 / 1;
  visibility: ${({ $isVisible }) => ($isVisible ? 'visible' : 'hidden')};
  min-width: 0;
`;

const UrlFieldContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const UrlInputsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1em;
`;

const orderFileNamesByExtension = (types?: FileTypes) => {
  if (!types) return;

  const specs = Object.values(types)
    .flat()
    .map((s) =>
      typeof s === 'string'
        ? (n: string) => n.toLowerCase().endsWith(s.toLowerCase())
        : (n: string) => s.regex.test(n)
    );

  const rank = (n: string) => {
    n = n.toLowerCase();
    const i = specs.findIndex((t) => t(n));
    return i === -1 ? Number.POSITIVE_INFINITY : i;
  };

  return (a: string, b: string) => rank(a) - rank(b);
};

// TODO: find a better place for this logic, slightly duplicated
const fetchFileFromUrl = async (fileUrl: URL) => {
  const options: RequestInit = {
    method: 'GET'
  };

  const res = await fetch(fileUrl, options);

  // extract file name from response headers if possible
  const fileName = res.headers
    .get('Content-Disposition')
    ?.split(';')
    .pop()
    ?.split('=')
    .pop()
    ?.replace(/"/g, '');

  const fallbackFileName = decodeURIComponent(
    fileUrl.pathname.split('/').pop() ?? 'unknown_external.unknown'
  );

  if (!res.ok) {
    throw new Error(`Received unexpected status code: ${res.status}`);
  }

  const blob = await res.blob();
  const file = new File([blob], fileName ?? fallbackFileName);

  return file;
};

const RunRomCheckboxProps = ({
  fileName,
  checked,
  onChange
}: RunRomCheckboxProps) => (
  <Checkbox
    slotProps={{ input: { 'aria-label': `Run ${fileName}` } }}
    checked={checked}
    onChange={onChange}
    sx={{ padding: '0 ' }}
  />
);

const AdditionalFileActions = ({
  fileName,
  isChecked,
  selectedFileName,
  setSelectedFileName,
  isRomFile
}: AdditionalFileActionsProps) => {
  if (!isRomFile) return;

  return (
    <RunRomCheckboxProps
      fileName={fileName}
      checked={isChecked || fileName === selectedFileName}
      onChange={() => setSelectedFileName(isChecked ? null : fileName)}
    />
  );
};

export const UploadFilesModal = () => {
  const { setIsModalOpen } = useModalContext();
  const { emulator } = useEmulatorContext();
  const runGame = useRunGame();
  const writeFileToEmulator = useWriteFileToEmulator();
  const { syncActionIfEnabled } = useAddCallbacks();
  const [uploadType, setUploadType] = useState<'files' | 'urls'>('files');
  const uploadFilesFormId = useId();
  const {
    handleSubmit,
    setValue,
    control,
    watch,
    register,
    formState: { errors, isSubmitting }
  } = useForm<InputProps>({
    defaultValues: { fileUrls: [defaultFileUrl] }
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'fileUrls'
  });

  const validFileExtensions = Object.values(
    emulator?.defaultFileTypes() ?? {}
  ).flatMap((_) => _);

  const findFirstRomFile = (files?: File[]) =>
    files?.find((file) => emulator?.isFileExtensionOfType(file.name, 'rom'))
      ?.name;

  const onDrop = useCallback(
    (acceptedFiles: File[]) =>
      setValue('files', acceptedFiles, { shouldValidate: true }),
    [setValue]
  );

  const onSubmit: SubmitHandler<InputProps> = async ({
    files,
    fileUrls,
    romFileToRun
  }) => {
    if (files)
      await Promise.all(files.map((file) => writeFileToEmulator(file)));

    if (fileUrls) {
      const externalFilesSettled = await Promise.allSettled(
        fileUrls
          .filter((u) => !!u.url)
          .map(async ({ url, type }) => {
            // note: the url is validated below, this is safe
            const file = await fetchFileFromUrl(new URL(url));

            return {
              file,
              type
            };
          })
      );

      const writePromises = externalFilesSettled.flatMap((r) =>
        r.status === 'fulfilled'
          ? [writeFileToEmulator(r.value.file, r.value.type)]
          : []
      );

      await Promise.all(writePromises);
    }

    await syncActionIfEnabled();

    const gameToRun = romFileToRun ?? findFirstRomFile(files);

    if (gameToRun !== defaultNoSelectedRom && gameToRun) runGame(gameToRun);

    setIsModalOpen(false);
  };

  const files = watch('files');
  const firstRomName = findFirstRomFile(files);
  const romFileToRun = watch('romFileToRun');

  const handleUploadType = (
    _: React.MouseEvent<HTMLElement>,
    uploadType: 'files' | 'urls' | null
  ) => {
    if (uploadType) setUploadType(uploadType);
  };

  return (
    <>
      <ModalHeader title="Upload Files" />
      <ModalBody>
        <form
          id={uploadFilesFormId}
          aria-label="Upload Files Form"
          onSubmit={handleSubmit(onSubmit)}
        >
          <GridContainer>
            <GridItem $isVisible={uploadType === 'files'}>
              <Controller
                control={control}
                name="files"
                rules={{
                  validate: (files) =>
                    (files?.length ?? 0) > 0 ||
                    uploadType === 'urls' ||
                    `At least one ${validFileExtensions
                      .map(
                        (ext) =>
                          `'${typeof ext === 'string' ? ext : ext.displayText}'`
                      )
                      .join(', ')} file is required`
                }}
                render={({ field: { name, value }, fieldState: { error } }) => (
                  <DragAndDropInput
                    ariaLabel="Upload Files"
                    id={`${uploadFilesFormId}--drag-and-drop`}
                    onDrop={onDrop}
                    name={name}
                    validFileExtensions={validFileExtensions}
                    error={error?.message}
                    hideAcceptedFiles={!value?.length}
                    sortAcceptedFiles={orderFileNamesByExtension(
                      emulator?.defaultFileTypes()
                    )}
                    multiple
                    renderAdditionalFileActions={({ fileName }) => (
                      <AdditionalFileActions
                        selectedFileName={watch('romFileToRun')}
                        setSelectedFileName={(name) =>
                          setValue('romFileToRun', name ?? defaultNoSelectedRom)
                        }
                        isRomFile={
                          emulator?.isFileExtensionOfType(fileName, 'rom') ??
                          false
                        }
                        fileName={fileName}
                        isChecked={
                          (firstRomName === fileName && !romFileToRun) ||
                          romFileToRun === fileName
                        }
                      />
                    )}
                  >
                    <p>
                      Drag and drop or click to upload roms, saves, cheats, or
                      patch files
                    </p>
                  </DragAndDropInput>
                )}
              />
            </GridItem>
            <GridItem $isVisible={uploadType === 'urls'}>
              <UrlFieldContainer>
                {fields.map((item, index) => {
                  return (
                    <div key={item.id}>
                      {index !== 0 && (
                        <Divider flexItem sx={{ margin: '10px 0' }} />
                      )}
                      <UrlInputsContainer>
                        <TextField
                          id={`${uploadFilesFormId}--file-url-${index}`}
                          error={!!errors?.fileUrls?.[index]?.url}
                          label="URL"
                          size="small"
                          autoComplete="url"
                          variant="filled"
                          helperText={errors?.fileUrls?.[index]?.url?.message}
                          aria-label="Upload File From URL"
                          fullWidth
                          slotProps={{
                            input: {
                              endAdornment: (
                                <InputAdornment position="end">
                                  <IconButton
                                    aria-label={`Remove URL ${index}`}
                                    sx={{ padding: '5px' }}
                                    onClick={() => remove(index)}
                                  >
                                    <BiTrash />
                                  </IconButton>
                                </InputAdornment>
                              )
                            }
                          }}
                          {...register(`fileUrls.${index}.url`, {
                            validate: (fileUrl) => {
                              if (uploadType === 'urls') {
                                try {
                                  if (fileUrl) new URL(fileUrl);
                                  else return 'Invalid url - empty';
                                } catch {
                                  return 'Invalid url';
                                }
                              }
                            }
                          })}
                        />
                        <FormControl size="small">
                          <InputLabel>File Type</InputLabel>
                          <Controller
                            control={control}
                            name={`fileUrls.${index}.type`}
                            defaultValue={item.type}
                            render={({ field }) => (
                              <Select
                                labelId={`file-type-label-${index}`}
                                label="File Type"
                                {...field}
                              >
                                {Object.keys(
                                  emulator?.defaultFileTypes() ?? {
                                    rom: '.gba'
                                  }
                                ).map((fileType) => (
                                  <MenuItem key={fileType} value={fileType}>
                                    {fileType}
                                  </MenuItem>
                                ))}
                              </Select>
                            )}
                          />
                        </FormControl>
                      </UrlInputsContainer>
                    </div>
                  );
                })}
              </UrlFieldContainer>
              <IconButton
                aria-label={`Add upload url`}
                sx={{ padding: 0, marginTop: '10px' }}
                onClick={() => append(defaultFileUrl)}
              >
                <StyledBiPlus />
              </IconButton>
            </GridItem>
          </GridContainer>
        </form>
      </ModalBody>
      <ModalFooter>
        <div style={{ width: '100%' }}>
          <ToggleButtonGroup
            value={uploadType}
            size="small"
            exclusive
            onChange={handleUploadType}
            aria-label="upload type"
          >
            <ToggleButton value="files" aria-label="files">
              Files
            </ToggleButton>
            <ToggleButton value="urls" aria-label="urls">
              Urls
            </ToggleButton>
          </ToggleButtonGroup>
        </div>
        <Button
          style={{ minWidth: 'fit-content' }}
          form={uploadFilesFormId}
          type="submit"
          variant="contained"
          loading={isSubmitting}
        >
          Upload
        </Button>
        <Button
          style={{ minWidth: 'fit-content' }}
          variant="outlined"
          onClick={() => setIsModalOpen(false)}
        >
          Close
        </Button>
      </ModalFooter>
    </>
  );
};
