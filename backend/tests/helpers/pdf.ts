/** A line of text and where its left end sits on the page, in PDF points from the bottom-left. */
export interface PdfLine {
  text: string;
  x: number;
  y: number;
}

/**
 * Builds a small, valid, text-only PDF (A4, Helvetica 10pt) from positioned lines. It lets tests
 * run the real PDF reader on layouts they control, without keeping binary files in the repository.
 */
export function buildPdf(pages: PdfLine[][]): Buffer {
  const escape = (text: string) => text.replace(/[\\()]/g, (char) => `\\${char}`);

  const objects: string[] = [];
  const pageIds = pages.map((_, index) => 4 + index * 2);

  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`;
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";

  pages.forEach((lines, index) => {
    const stream = lines
      .map((line) => `BT /F1 10 Tf 1 0 0 1 ${line.x} ${line.y} Tm (${escape(line.text)}) Tj ET`)
      .join("\n");
    const pageId = 4 + index * 2;
    objects[pageId] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] ` +
      `/Resources << /Font << /F1 3 0 R >> >> /Contents ${pageId + 1} 0 R >>`;
    objects[pageId + 1] = `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`;
  });

  let body = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (let id = 1; id < objects.length; id++) {
    offsets[id] = Buffer.byteLength(body);
    body += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }

  const xrefAt = Buffer.byteLength(body);
  body += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objects.length; id++) {
    body += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  }
  body += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`;

  return Buffer.from(body, "latin1");
}
