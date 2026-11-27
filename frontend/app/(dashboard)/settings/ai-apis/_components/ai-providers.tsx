"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchSelect } from "@/components/form/search-select";
import { Switch } from "@/components/ui/switch";
import { useAiSettings, useUpdateAiSettings, useUpdateAiProvider, useDeleteAiProvider, useTestAiProvider, useAiModels, useUpdateAiModel } from "@/hooks/queries/use-settings";
import type { AiSettings } from "@/types";

const names: Record<AiSettings["provider"], string> = { gemini: "Google Gemini", openai: "OpenAI", anthropic: "Anthropic", grok: "xAI Grok" };

export function AiProviders() {
  const { data, isPending, isError } = useAiSettings();
  const update = useUpdateAiSettings();
  const save = useUpdateAiProvider();
  const remove = useDeleteAiProvider();
  const test = useTestAiProvider();
  const models = useAiModels(!!data?.data.configured, data?.data.provider);
  const updateModel = useUpdateAiModel();
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [chosen, setChosen] = useState<AiSettings["provider"]>("gemini");
  const [key, setKey] = useState("");
  const settings = data?.data;
  if (isPending) return <p>Loading AI settings…</p>;
  if (isError || !settings) return <p role="alert">Could not load AI settings. Try refreshing the page.</p>;
  const configured = settings.configured;
  const currentModel = models.data?.data.find((model) => model.id === settings.model);
  const modelChoice = selectedModel ?? settings.model;
  const close = () => { setEditing(false); setKey(""); };
  const edit = () => { setChosen(configured ? settings.provider : "gemini"); setKey(""); setEditing(true); };

  return <div className="max-w-3xl space-y-4">
    {configured ? <div className="rounded-lg border border-slate-300 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><h2 className="font-semibold">{names[settings.provider]}</h2><p className="mt-1 text-sm text-slate-500">API key configured</p></div>
        <div className="flex flex-wrap items-center gap-2"><Button variant="cancel" disabled={test.isPending || editing || confirming} onClick={() => test.mutate(undefined, { onSuccess: () => toast.success("Connection successful"), onError: (error) => toast.error(error.message || "Connection failed") })}>{test.isPending ? "Testing…" : "Test connection"}</Button><Button variant="cancel" onClick={edit} disabled={editing || confirming}>Edit</Button><Button variant="cancel" onClick={() => setConfirming(true)} disabled={editing || confirming}>Remove</Button></div>
      </div>
      <div className="mt-5 space-y-2 border-t border-slate-200 pt-4 dark:border-neutral-700">
        <p className="text-sm font-medium">Current model: {settings.model}</p>
        {models.isError && <p role="alert" className="text-sm text-amber-700 dark:text-amber-300">Could not check model availability or deprecation. <button className="underline" onClick={() => models.refetch()}>Try again</button></p>}
        {!models.isError && models.data && (!currentModel || currentModel.lifecycle === "deprecated") && <p role="alert" className="text-sm text-amber-700 dark:text-amber-300">{currentModel?.lifecycle === "deprecated" ? "This model is deprecated. Choose a supported model." : "This model is unavailable or no longer supported by this integration. Choose another model."}</p>}
        <label className="block text-sm font-medium" htmlFor="ai-model">Choose model</label>
        <div className="flex flex-wrap items-center gap-2">
          <SearchSelect
            id="ai-model"
            ariaLabel="Choose model"
            value={modelChoice}
            onChange={setSelectedModel}
            disabled={models.isPending || models.isError}
            className="min-w-0 flex-1"
            searchPlaceholder="Search models"
            options={() => (models.data?.data ?? []).filter((model) => model.lifecycle !== "deprecated").map((model) => ({ value: model.id, label: model.id, keywords: model.name }))}
          />
          <Button variant="cancel" disabled={!modelChoice || modelChoice === settings.model || updateModel.isPending} onClick={() => updateModel.mutate(modelChoice, { onSuccess: () => { setSelectedModel(null); toast.success("AI model saved"); }, onError: (error) => toast.error(error.message) })}>Save model</Button>
        </div>
        <p className="text-xs text-slate-500">Models come from your provider. Availability and deprecation details depend on what the provider reports. Save a model before testing it.</p>
      </div>
      <div className="mt-5 flex items-center justify-between gap-4 border-t border-slate-200 pt-4 dark:border-neutral-700">
        <div><p className="text-sm font-medium">AI CV analysis</p><p className="text-sm text-slate-500">Generate AI notes for candidate CVs using this provider.</p></div>
        <Switch aria-label="AI CV analysis" checked={settings.active} disabled={update.isPending} onCheckedChange={(enabled) => update.mutate(enabled, { onSuccess: () => toast.success(enabled ? "AI CV analysis turned on" : "AI CV analysis turned off"), onError: (error) => toast.error(error.message) })} />
      </div>
      {confirming && <div className="mt-4 space-y-3" role="alert"><p className="text-sm">Remove this provider and turn off AI CV analysis?</p><div className="flex gap-2"><Button variant="destructive" disabled={remove.isPending} onClick={() => remove.mutate(undefined, { onSuccess: () => { setConfirming(false); setSelectedModel(null); toast.success("AI provider removed"); }, onError: (error) => toast.error(error.message) })}>Remove provider</Button><Button variant="cancel" onClick={() => setConfirming(false)}>Cancel</Button></div></div>}
    </div> : <div className="rounded-lg border border-slate-300 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900"><p className="text-sm text-slate-600 dark:text-neutral-400">No AI provider configured.</p>{!editing && <Button className="mt-4" onClick={edit}>Add provider</Button>}</div>}
    {editing && <form className="space-y-4 rounded-lg border border-slate-300 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900" onSubmit={(event) => {
      event.preventDefault();
      save.mutate({ provider: chosen, ...(key.trim() ? { apiKey: key.trim() } : {}) }, { onSuccess: () => { close(); setSelectedModel(null); toast.success("AI provider saved"); }, onError: (error) => toast.error(error.message) });
    }}>
      <h2 className="font-semibold">{configured ? "Edit provider" : "Add provider"}</h2>
      <div className="space-y-2"><label className="block text-sm font-medium" htmlFor="ai-provider">Provider</label><select id="ai-provider" className="w-full rounded-md border bg-transparent px-3 py-2 text-sm" value={chosen} onChange={(event) => setChosen(event.target.value as AiSettings["provider"])}>{Object.entries(names).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></div>
      <div className="space-y-2"><label className="block text-sm font-medium" htmlFor="ai-api-key">API key</label><Input id="ai-api-key" type="password" autoComplete="off" value={key} onChange={(event) => setKey(event.target.value)} required={!configured || chosen !== settings.provider} placeholder={configured && chosen === settings.provider ? "Leave blank to keep the current key" : "Enter API key"} /></div>
      <p className="text-xs text-slate-500">Keys are encrypted and cannot be viewed after saving. Changing providers turns analysis off until you enable it again.</p>
      <div className="flex gap-2"><Button type="submit" disabled={save.isPending}>Save provider</Button><Button type="button" variant="cancel" onClick={close}>Cancel</Button></div>
    </form>}
  </div>;
}
