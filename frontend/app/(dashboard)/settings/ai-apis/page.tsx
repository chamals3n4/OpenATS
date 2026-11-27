"use client";

import { RoleGuard } from "@/components/guards/role-guard";
import { AiProviders } from "./_components/ai-providers";

export default function AiApisPage() {
  return <RoleGuard allow="super_admin" redirectTo="/settings/general">
    <div className="flex flex-1 flex-col bg-slate-50/70 dark:bg-neutral-950">
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8">
        <header className="mb-6">
          <h1 className="text-2xl font-medium leading-none text-slate-900 dark:text-neutral-100">AI APIs</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-neutral-400">Manage the provider used for AI CV analysis. Only one provider can be configured.</p>
        </header>
        <AiProviders />
      </div>
    </div>
  </RoleGuard>;
}
