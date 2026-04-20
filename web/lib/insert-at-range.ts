/**
 * Splices `tag` into `content` replacing the selection from `start` to `end`.
 * Returns the new string and the new cursor position (right after the tag).
 */
export function insertAtRange(
  content: string,
  start: number,
  end: number,
  tag: string,
): { next: string; np: number } {
  const next = content.slice(0, start) + tag + content.slice(end);
  const np = start + tag.length;
  return { next, np };
}
