import { IconButton } from '@mui/material';
import { useTheme, styled } from '@mui/material/styles';
import { useState, type ReactNode } from 'react';
import { ErrorCode, useDropzone } from 'react-dropzone';
import { BiCloudUpload, BiError, BiTrash } from 'react-icons/bi';

import { ErrorWithIcon } from './error-with-icon.tsx';

import type { Extension } from '../../emulator/mgba/mgba-emulator.tsx';

type DragAndDropInputProps = {
  ariaLabel: string;
  children: ReactNode;
  error?: string;
  hideAcceptedFiles?: boolean;
  sortAcceptedFiles?: (a: string, b: string) => number;
  hideErrors?: boolean;
  id: string;
  multiple?: boolean;
  name: string;
  onDrop: (acceptedFiles: File[]) => void;
  validFileExtensions: Extension[];
  renderAdditionalFileActions?: (fileInfo: {
    fileName: string;
    index: number;
  }) => ReactNode;
};

type DropAreaProps = {
  $isDragActive?: boolean;
};

const DropArea = styled('div')<DropAreaProps>`
  cursor: pointer;
  border-color: ${({ theme }) => theme.blackRussian};
  background-color: ${({ $isDragActive = false, theme }) =>
    $isDragActive ? theme.arcticAirBlue : theme.aliceBlue2};
  border-width: 1px;
  border-style: dashed;
  padding: 0.5rem;
  text-align: center;
`;

const BiCloudUploadLarge = styled(BiCloudUpload)`
  height: 60px;
  width: auto;
`;

const ErrorContainer = styled('div')`
  padding-top: 3px;
`;

const FileList = styled('ul')`
  display: flex;
  flex-direction: column;
  gap: 10px;
  list-style: none;
  margin: 0;
  max-width: 100%;
  padding: 10px 5px 5px 5px;

  > p {
    margin: 0;
  }
`;

const AcceptedFile = styled('li')`
  align-items: center;
  display: flex;
  gap: 10px;
  justify-content: space-between;

  > p {
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const IconSeparator = styled('div')`
  display: flex;
  gap: 8px;
`;

const AcceptedFiles = ({
  fileNames,
  renderAdditionalActions,
  onDeleteFile
}: {
  fileNames: string[];
  renderAdditionalActions?: (fileInfo: {
    fileName: string;
    index: number;
    totalFiles: number;
  }) => ReactNode;
  onDeleteFile: (fileName: string) => void;
}) => (
  <FileList>
    <p>File{fileNames.length > 1 && 's'} to upload:</p>
    {fileNames.map((fileName, index) => (
      <AcceptedFile key={`${fileName}_${index}`}>
        <p>{fileName}</p>
        <IconSeparator>
          {renderAdditionalActions?.({
            fileName,
            index,
            totalFiles: fileNames.length
          })}
          <IconButton
            aria-label={`Delete ${fileName}`}
            sx={{ padding: 0 }}
            onClick={() => onDeleteFile(fileName)}
          >
            <BiTrash />
          </IconButton>
        </IconSeparator>
      </AcceptedFile>
    ))}
  </FileList>
);

const hasValidFileExtension = (file: File, validExtensions: Extension[]) => {
  const fileExtension = `.${file.name.split('.').pop()}`;

  return validExtensions.some((e) =>
    typeof e === 'string' ? e === fileExtension : !!e.regex.exec(fileExtension)
  );
};

const getDescription = (extension: Extension) =>
  typeof extension === 'string' ? extension : extension.displayText;

const validateFile = (validFileExtensions: Extension[], multiple: boolean) => {
  if (!validFileExtensions.length) return undefined;

  const prefix = multiple ? 'At least one' : 'One';

  let fileRequiredError =
    `${prefix} ` +
    validFileExtensions.slice(0, -1).map(getDescription).join(', ') +
    `, or ${getDescription(validFileExtensions.slice(-1)[0])} file is required`;

  if (validFileExtensions.length === 1) {
    fileRequiredError = `${prefix} ${getDescription(
      validFileExtensions[0]
    )} file is required`;
  }

  return (file?: File | DataTransferItem) => {
    if (
      !(file instanceof File) ||
      hasValidFileExtension(file, validFileExtensions)
    )
      return null;

    return {
      message: fileRequiredError,
      code: ErrorCode.FileInvalidType
    };
  };
};

export const DragAndDropInput = ({
  ariaLabel,
  children,
  error,
  hideAcceptedFiles,
  sortAcceptedFiles,
  hideErrors,
  id,
  multiple = false,
  name,
  renderAdditionalFileActions,
  onDrop,
  validFileExtensions
}: DragAndDropInputProps) => {
  const theme = useTheme();
  const [acceptedFiles, setAcceptedFiles] = useState<File[]>([]);
  const { getRootProps, getInputProps, isDragActive, fileRejections } =
    useDropzone({
      multiple,
      onDrop: (acceptedFiles) => {
        setAcceptedFiles(acceptedFiles);
        onDrop(acceptedFiles);
      },
      validator: validateFile(validFileExtensions, multiple)
    });

  const rejectedFileErrors = error
    ? [error]
    : fileRejections.length && acceptedFiles.length
    ? ['Some files were rejected']
    : [
        ...new Set(
          fileRejections
            .flatMap((rejection) => rejection.errors)
            .map((error) => error.message)
        )
      ];

  const onDeleteFile = (name: string) => {
    const files = acceptedFiles.filter((file) => file.name !== name);
    setAcceptedFiles(files);
    onDrop(files);
  };

  const acceptedFileNames = acceptedFiles
    .map((file) => file.name)
    .toSorted(sortAcceptedFiles ?? (() => 0));

  return (
    <>
      <DropArea
        {...getRootProps({
          id: id,
          $isDragActive: isDragActive,
          'aria-label': ariaLabel
        })}
      >
        <input data-testid={`hidden-file-input`} {...getInputProps({ name })} />
        <BiCloudUploadLarge />
        {children}
      </DropArea>
      {!!acceptedFileNames.length && !hideAcceptedFiles && (
        <AcceptedFiles
          fileNames={acceptedFileNames}
          onDeleteFile={onDeleteFile}
          renderAdditionalActions={renderAdditionalFileActions}
        />
      )}
      {!!rejectedFileErrors.length && !hideErrors && (
        <ErrorContainer>
          {rejectedFileErrors.map((msg) => (
            <ErrorWithIcon
              key={msg}
              icon={<BiError style={{ color: theme.errorRed }} />}
              text={msg}
            />
          ))}
        </ErrorContainer>
      )}
    </>
  );
};
