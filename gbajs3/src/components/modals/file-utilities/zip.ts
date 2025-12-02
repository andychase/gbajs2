import {
  BlobReader,
  BlobWriter,
  TextReader,
  TextWriter,
  Uint8ArrayReader,
  Uint8ArrayWriter,
  ZipReader,
  ZipWriter,
  type Entry,
  type EntryMetaData,
  type FileEntry,
  type ZipWriterConstructorOptions
} from '@zip.js/zip.js';

import { downloadBlob } from './blob.ts';

export type ZipTarget = {
  writer: ZipWriter<void | Blob>;
  finalize: () => Promise<void>;
};

const zipTypes: FilePickerAcceptType[] = [
  {
    description: 'ZIP archive',
    accept: { 'application/zip': ['.zip'] }
  }
];

export const zipOptions = {
  level: 6,
  bufferedWrite: true
};

export const generateExportZipName = (prefix = 'gbajs-files') =>
  `${prefix}-${new Date()
    .toISOString()
    .slice(0, 19)
    .replace(/[:T]/g, '-')}.zip`;

export const setupZipTarget = async (
  name: string,
  opts: ZipWriterConstructorOptions
): Promise<ZipTarget> => {
  const usePicker = typeof window.showSaveFilePicker === 'function';

  // if showSaveFilePicker is available, we can stream into the downloaded file natively
  if (usePicker) {
    const handle = await window.showSaveFilePicker({
      suggestedName: name,
      types: zipTypes
    });
    const sink = await handle.createWritable();
    const writer = new ZipWriter<void>(sink, opts);
    return { writer, finalize: () => writer.close() };
  }

  // else we build a blob in memory
  const blobWriter = new BlobWriter('application/zip');
  const writer = new ZipWriter<Blob>(blobWriter, opts);
  return {
    writer,
    finalize: async () => downloadBlob(name, await writer.close())
  };
};

/** zip requires leading slashes to be removed, for
 * consistency when unpacking across platforms
 * */
export const stripLeadingSlashes = (filePath: string) =>
  filePath.replace(/^\/+/, '');

export const addLocalStorageToZip = (
  writer: ZipWriter<void | Blob>
): Promise<EntryMetaData> =>
  writer.add(
    'local-storage.json',
    new TextReader(JSON.stringify(localStorage)),
    zipOptions
  );

export const restoreLocalStorageFromZip = async (
  entry: FileEntry
): Promise<void> => {
  const textJson = await entry.getData(new TextWriter());

  Object.entries(JSON.parse(textJson) as Record<string, unknown>).forEach(
    ([k, v]) => localStorage.setItem(k, String(v))
  );
};

export const addUint8ArrayToZip = (
  writer: ZipWriter<void | Blob>,
  relativePath: string,
  bytes: Uint8Array
) => writer.add(relativePath, new Uint8ArrayReader(bytes), zipOptions);

export const readZipEntriesFromBlob = async (
  zipFile: File,
  onReadEntry: (entry: Entry) => Promise<void>
) => {
  const reader = new ZipReader(new BlobReader(zipFile));

  const entries = await reader.getEntries();

  await Promise.allSettled(entries.map(onReadEntry));

  await reader.close();
};

export const readFileFromZipEntry = async (entry: FileEntry) => {
  const bytes = await entry.getData(new Uint8ArrayWriter());
  const name = entry.filename.split('/').pop();

  return name
    ? new File(
        [new Blob([new Uint8Array(bytes)], { type: 'text/plain' })],
        name
      )
    : null;
};
