import { Node, mergeAttributes } from "@tiptap/core";

// Matches the pill-button look in backend/src/services/mail.service.ts (emailButton).
const BUTTON_STYLE =
  "display:inline-block;background:#0a0a0a;color:#ffffff;padding:10px 24px;border-radius:9999px;font-size:14px;font-weight:600;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;";

// Static pill node, mirrors VariableChip — no in-place editing UI, deletes like any atom node.
export const ButtonNode = Node.create({
  name: "emailButton",
  group: "block",
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      label: { default: "Click Here" },
      href: { default: "[url]" },
    };
  },

  parseHTML() {
    return [{ tag: "a[data-email-button]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "div",
      { style: "margin: 16px 0;" },
      [
        "a",
        mergeAttributes(HTMLAttributes, {
          "data-email-button": "",
          href: node.attrs.href || "[url]",
          style: BUTTON_STYLE,
        }),
        node.attrs.label || "Click Here",
      ],
    ];
  },

  addNodeView() {
    return ({ node }) => {
      const wrapper = document.createElement("div");
      wrapper.style.cssText = "margin:16px 0;";
      wrapper.contentEditable = "false";

      const btn = document.createElement("span");
      btn.style.cssText = BUTTON_STYLE;
      btn.textContent = node.attrs.label || "Click Here";

      const urlHint = document.createElement("span");
      urlHint.style.cssText =
        "display:block;margin-top:4px;font-size:11px;color:#94a3b8;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;";
      urlHint.textContent = node.attrs.href || "[url]";

      wrapper.append(btn, urlHint);

      return {
        dom: wrapper,
        update: (updatedNode) => {
          if (updatedNode.type.name !== "emailButton") return false;
          btn.textContent = updatedNode.attrs.label || "Click Here";
          urlHint.textContent = updatedNode.attrs.href || "[url]";
          return true;
        },
      };
    };
  },
});
