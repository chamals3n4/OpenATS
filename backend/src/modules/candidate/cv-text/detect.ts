export type CvFileType = "pdf" | "docx";

/**
 * The file type from the bytes themselves. The name and the content type come from whoever
 * uploaded the file, so they are never used to decide how it is parsed.
 */
export function detectFileType(file: Buffer): CvFileType | null {
  // The PDF header may be preceded by a little junk, so look in the first kilobyte.
  if (file.subarray(0, 1024).includes("%PDF-")) return "pdf";

  // A .docx is a zip archive holding word/document.xml.
  const isZip =
    file.length > 4 && file[0] === 0x50 && file[1] === 0x4b && file[2] === 0x03 && file[3] === 0x04;
  if (isZip && file.includes("word/document.xml")) return "docx";

  return null;
}
