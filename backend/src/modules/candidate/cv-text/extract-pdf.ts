import { getDocumentProxy } from "unpdf";
import { pageToText, type TextItem } from "./layout";

/** Pages read from one CV. Longer files are almost never CVs, and each page costs time. */
export const MAX_CV_PAGES = 30;

export async function extractPdfText(
  file: Buffer,
): Promise<{ text: string; pageCount: number }> {
  // PDF.js takes ownership of the bytes it is given, so it gets its own copy.
  const pdf = await getDocumentProxy(new Uint8Array(file));

  try {
    const pageCount = Math.min(pdf.numPages, MAX_CV_PAGES);
    const pages: string[] = [];

    for (let number = 1; number <= pageCount; number++) {
      const page = await pdf.getPage(number);
      const { width } = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();

      const items: TextItem[] = [];
      for (const item of content.items) {
        if (!("str" in item)) continue;
        const [, , , scaleY = 0, x = 0, y = 0] = item.transform as number[];
        items.push({
          str: item.str,
          x,
          y,
          width: item.width,
          height: item.height || Math.abs(scaleY),
        });
      }

      pages.push(pageToText(items, width));
      page.cleanup();
    }

    return { text: pages.join("\n\n"), pageCount };
  } finally {
    await pdf.loadingTask.destroy();
  }
}
