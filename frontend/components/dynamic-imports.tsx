"use client";

import dynamic from "next/dynamic";

export const DragDropProvider = dynamic(
  () =>
    import("@/components/providers/drag-drop-provider").then((mod) => ({
      default: mod.DragDropProvider,
    })),
  { ssr: false },
);
