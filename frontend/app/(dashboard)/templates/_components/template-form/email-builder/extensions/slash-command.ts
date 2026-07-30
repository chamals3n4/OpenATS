import { Extension } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import { ReactRenderer } from "@tiptap/react";
import { SlashMenu, type SlashMenuItem, type SlashMenuRef } from "./slash-menu";

export interface SlashCommandOptions {
  items: (query: string) => SlashMenuItem[];
}

function positionAt(el: HTMLDivElement, rect: DOMRect | null | undefined) {
  if (!rect) return;
  el.style.left = `${rect.left + window.scrollX}px`;
  el.style.top = `${rect.bottom + window.scrollY + 6}px`;
}

export const SlashCommand = Extension.create<SlashCommandOptions>({
  name: "slashCommand",

  addOptions() {
    return {
      items: () => [],
    };
  },

  addProseMirrorPlugins() {
    const options = this.options;

    return [
      Suggestion<SlashMenuItem>({
        editor: this.editor,
        char: "/",
        allowSpaces: false,
        startOfLine: false,
        items: ({ query }) => options.items(query),
        command: ({ editor, range, props }) => {
          props.command({ editor, range });
        },
        render: () => {
          let component: ReactRenderer<SlashMenuRef>;
          let popupEl: HTMLDivElement;

          return {
            onStart: (props) => {
              component = new ReactRenderer(SlashMenu, {
                props: {
                  items: props.items,
                  command: (item: SlashMenuItem) => props.command(item),
                },
                editor: props.editor,
              });
              popupEl = document.createElement("div");
              popupEl.style.position = "absolute";
              popupEl.style.zIndex = "60";
              document.body.appendChild(popupEl);
              popupEl.appendChild(component.element);
              positionAt(popupEl, props.clientRect?.() ?? null);
            },
            onUpdate(props) {
              component.updateProps({
                items: props.items,
                command: (item: SlashMenuItem) => props.command(item),
              });
              positionAt(popupEl, props.clientRect?.() ?? null);
            },
            onKeyDown(props) {
              if (props.event.key === "Escape") {
                popupEl.remove();
                return true;
              }
              return component.ref?.onKeyDown(props) ?? false;
            },
            onExit() {
              popupEl.remove();
              component.destroy();
            },
          };
        },
      }),
    ];
  },
});
