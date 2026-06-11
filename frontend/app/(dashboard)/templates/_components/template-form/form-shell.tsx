"use client";

import { ReactNode } from "react";

interface TemplateFormShellProps {
  children: ReactNode;
}

export function TemplateFormShell({ children }: TemplateFormShellProps) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-7 py-8 space-y-6">{children}</div>
    </div>
  );
}
