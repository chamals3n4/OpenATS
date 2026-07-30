import type { Editor } from "@tiptap/core";

/** Swaps two top-level (direct child) nodes of the doc by index. */
export function moveTopLevelBlock(
  editor: Editor,
  fromIndex: number,
  toIndex: number,
) {
  const { state, view } = editor;
  const doc = state.doc;
  if (
    toIndex < 0 ||
    toIndex >= doc.childCount ||
    fromIndex < 0 ||
    fromIndex >= doc.childCount ||
    fromIndex === toIndex
  ) {
    return;
  }

  const fromNode = doc.child(fromIndex);

  let fromStart = 0;
  for (let i = 0; i < fromIndex; i++) fromStart += doc.child(i).nodeSize;
  const fromEnd = fromStart + fromNode.nodeSize;

  let toStart = 0;
  for (let i = 0; i < toIndex; i++) toStart += doc.child(i).nodeSize;
  const toEnd = toStart + doc.child(toIndex).nodeSize;

  const tr = state.tr;
  if (fromIndex < toIndex) {
    tr.delete(fromStart, fromEnd);
    tr.insert(toEnd - fromNode.nodeSize, fromNode);
  } else {
    tr.delete(fromStart, fromEnd);
    tr.insert(toStart, fromNode);
  }
  view.dispatch(tr);
  editor.commands.focus();
}
