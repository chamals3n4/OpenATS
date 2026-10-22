import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { ButtonView } from "./button-view";
import { BUTTON_STYLE } from "./button-style";

// A call-to-action button. Its text and link are set in the panel that opens when it is clicked.
export const ButtonNode = Node.create({
  name: "emailButton",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      label: {
        default: "",
        rendered: false,
        parseHTML: (el) => el.textContent?.trim() ?? "",
      },
      href: {
        default: "",
        rendered: false,
        // Buttons saved before links could be set have "[url]"
        parseHTML: (el) => {
          const value = el.getAttribute("href") ?? "";
          return value === "[url]" ? "" : value;
        },
      },
      // Opens the panel once, right after inserting. Never saved.
      autoOpen: { default: false, rendered: false },
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
          href: node.attrs.href || "#",
          style: BUTTON_STYLE,
        }),
        node.attrs.label || "Open",
      ],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ButtonView);
  },
});
