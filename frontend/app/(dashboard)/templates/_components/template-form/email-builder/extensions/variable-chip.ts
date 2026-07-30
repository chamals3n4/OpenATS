import { Node, mergeAttributes } from "@tiptap/core";

// Serializes to literal {{variable}} text so the backend's {{var}} regex substitution works.
export const VariableChip = Node.create({
  name: "variableChip",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      variable: {
        default: "",
        parseHTML: (element: HTMLElement) =>
          element.getAttribute("data-variable") || "",
        renderHTML: (attrs: { variable: string }) => ({
          "data-variable": attrs.variable,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-variable]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes), `{{${node.attrs.variable}}}`];
  },

  renderText({ node }) {
    return `{{${node.attrs.variable}}}`;
  },

  addNodeView() {
    return ({ node }) => {
      const span = document.createElement("span");
      span.setAttribute("data-variable", node.attrs.variable);
      span.contentEditable = "false";
      span.textContent = `{{${node.attrs.variable}}}`;
      span.style.cssText =
        "display:inline-block;background:color-mix(in srgb, var(--theme-color) 12%, transparent);color:var(--theme-color);border-radius:4px;padding:0 5px;font-size:0.85em;font-weight:600;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;";
      return { dom: span };
    };
  },
});
