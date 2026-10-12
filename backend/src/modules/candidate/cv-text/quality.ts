/**
 * Whether extracted text is worth keeping. A scanned CV has pages but almost no text, and a PDF
 * whose fonts carry no character map comes out as symbols; neither is searchable, and saying so is
 * better than storing rubbish that looks like a result.
 */
export function hasUsableText(text: string, pageCount: number): boolean {
  const visible = text.replace(/\s/g, "");
  if (visible.length < 200) return false;
  if (visible.length / Math.max(1, pageCount) < 100) return false;

  const readable = visible.match(/[\p{L}\p{N}]/gu)?.length ?? 0;
  return readable / visible.length >= 0.6;
}
