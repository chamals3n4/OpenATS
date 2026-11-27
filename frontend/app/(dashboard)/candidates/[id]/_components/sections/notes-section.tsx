"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { Edit02Icon, Delete01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useCandidateNotes, useDeleteCandidateNote, useSaveCandidateNote, type CandidateNote } from "@/hooks/queries/use-candidate-notes";
import { formatDateTime } from "@/lib/format";

const markdownStyle = "space-y-3 break-words text-sm leading-relaxed text-slate-700 dark:text-neutral-200 [&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_a]:text-theme [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:pl-4 [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-slate-100 [&_pre]:p-3 dark:[&_pre]:bg-neutral-800";

export function NotesSection({ candidateId }: { candidateId: number }) {
  const { data, isLoading, isError } = useCandidateNotes(candidateId);
  const save = useSaveCandidateNote(candidateId);
  const remove = useDeleteCandidateNote(candidateId);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState<CandidateNote | null>(null);
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState("");
  const [preview, setPreview] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const start = (item: CandidateNote | null) => { setNote(item); setBody(item?.body ?? ""); setEditing(!item); setPreview(false); setConfirmDelete(false); setOpen(true); };
  const close = () => { setOpen(false); setConfirmDelete(false); };
  const busy = save.isPending || remove.isPending;

  return <div className="p-6">
    <div className="mb-6 flex items-start justify-between gap-4"><div><h3 className="text-sm font-bold text-slate-900 dark:text-neutral-100">Notes</h3><p className="mt-1 text-sm text-slate-500">Shared with the candidate’s hiring team.</p></div><Button onClick={() => start(null)}>Add note</Button></div>
    {isLoading ? <p className="text-sm text-slate-500">Loading notes…</p> : isError ? <p role="alert" className="text-sm text-red-700">Could not load notes. Try again.</p> : !data?.data.length ? <p className="text-sm text-slate-500">No notes yet.</p> : <ul className="space-y-3">{data.data.map((item) => (
      <li key={item.id} className="relative rounded-md border border-slate-300 dark:border-neutral-700">
        <button type="button" onClick={() => start(item)} className="w-full rounded-md p-4 pr-24 text-left hover:bg-slate-50 dark:hover:bg-neutral-900">
          <span className="block text-sm font-semibold">{item.authorName ?? "Former user"} <span className="font-normal text-slate-500">· {formatDateTime(item.createdAt)} · {item.stageName ?? "Stage unknown"}</span></span>
          <span className="mt-2 line-clamp-2 block whitespace-pre-wrap text-sm text-slate-600 dark:text-neutral-400">{item.body}</span>
        </button>
        <div className="absolute right-3 top-3 flex gap-1">
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Edit note" title="Edit note" onClick={() => { start(item); setEditing(true); }}><HugeiconsIcon icon={Edit02Icon} className="size-4" strokeWidth={1.75} /></Button>
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Delete note" title="Delete note" onClick={() => { start(item); setConfirmDelete(true); }}><HugeiconsIcon icon={Delete01Icon} className="size-4" strokeWidth={1.75} /></Button>
        </div>
      </li>
    ))}</ul>}
    <Dialog open={open} onOpenChange={(next) => { if (!next && !busy) close(); }}>
      <DialogContent instant className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>{note ? (editing ? "Edit note" : "Note") : "Add note"}</DialogTitle><DialogDescription>{note ? `${note.authorName ?? "Former user"} · ${formatDateTime(note.createdAt)} · ${note.stageName ?? "Stage unknown"}` : "Write a note for the hiring team."}</DialogDescription></DialogHeader>
        {editing ? <><div className="flex gap-2"><Button type="button" variant={!preview ? "default" : "cancel"} onClick={() => setPreview(false)}>Write</Button><Button type="button" variant={preview ? "default" : "cancel"} onClick={() => setPreview(true)}>Preview</Button></div>{preview ? <div className={markdownStyle}><ReactMarkdown>{body}</ReactMarkdown></div> : <div><label htmlFor="candidate-note" className="mb-2 block text-sm font-medium">Note</label><Textarea id="candidate-note" value={body} maxLength={20000} onChange={(event) => setBody(event.target.value)} rows={10} placeholder="Write your note…" /><p className="mt-2 text-xs text-slate-500">Markdown supported: headings, lists, links, bold and italic.</p></div>}<div className="flex gap-2"><Button disabled={busy || !body.trim()} onClick={() => save.mutate({ id: note?.id, body }, { onSuccess: () => { close(); toast.success(note ? "Note updated" : "Note added"); }, onError: (error) => toast.error(error.message) })}>Save note</Button><Button variant="cancel" disabled={busy} onClick={() => note ? (setBody(note.body), setEditing(false), setPreview(false)) : close()}>Cancel</Button></div></> : <><div className={markdownStyle}><ReactMarkdown>{note?.body ?? ""}</ReactMarkdown></div>{confirmDelete ? <div role="alert" className="space-y-3"><p>Delete this note?</p><div className="flex gap-2"><Button variant="destructive" disabled={busy} onClick={() => note && remove.mutate(note.id, { onSuccess: () => { close(); toast.success("Note deleted"); }, onError: (error) => toast.error(error.message) })}>Delete note</Button><Button variant="cancel" onClick={() => setConfirmDelete(false)}>Cancel</Button></div></div> : <div className="flex gap-2"><Button onClick={() => setEditing(true)}>Edit</Button><Button variant="cancel" onClick={() => setConfirmDelete(true)}>Delete</Button></div>}</>}
      </DialogContent>
    </Dialog>
  </div>;
}
