export const downloadBlob = (name: string, blob: Blob) => {
  const link = document.createElement('a');

  link.download = name;
  link.href = URL.createObjectURL(blob);

  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(link.href), 0);
};
