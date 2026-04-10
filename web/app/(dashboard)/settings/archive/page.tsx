"use client";

import { useState, useEffect, useCallback } from "react";
import { Archive01Icon, Delete02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  getArchived,
  permanentlyDelete,
  type ArchiveType,
  type ArchiveEntry,
} from "@/lib/archive-store";
import { useDeleteOffer } from "@/hooks/use-api";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const TYPE_LABELS: Record<ArchiveType, string> = {
  job: "Jobs",
  candidate: "Candidates",
  offer: "Offers",
};

const TYPE_BADGE: Record<ArchiveType, string> = {
  job: "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50",
  candidate: "bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-400 border border-violet-100 dark:border-violet-900/50",
  offer: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function ArchivePage() {
  const [items, setItems] = useState<ArchiveEntry[]>([]);
  const [activeTab, setActiveTab] = useState<ArchiveType>("job");
  const [deleteTarget, setDeleteTarget] = useState<ArchiveEntry | null>(null);
  const deleteOfferMutation = useDeleteOffer();

  const refresh = useCallback(() => setItems(getArchived()), []);
  useEffect(() => {
    refresh();
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [refresh]);

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const t = deleteTarget;

    if (t.type === "offer") {
      const id = Number(t.id);
      if (Number.isNaN(id) || id < 1) {
        toast.error("Invalid offer id");
        return;
      }
      deleteOfferMutation.mutate(id, {
        onSuccess: () => {
          permanentlyDelete(t.id, t.type);
          refresh();
          setDeleteTarget(null);
          toast.success("Offer deleted");
        },
        onError: (e) => {
          const msg = e instanceof Error ? e.message : "";
          if (/not found|404/i.test(msg)) {
            permanentlyDelete(t.id, t.type);
            refresh();
            setDeleteTarget(null);
            toast.success("Removed from archive");
            return;
          }
          toast.error(msg || "Could not delete offer");
        },
      });
      return;
    }

    permanentlyDelete(t.id, t.type);
    refresh();
    setDeleteTarget(null);
  };

  const filtered = items.filter((i) => i.type === activeTab);

  return (
    <div className="flex flex-1 flex-col bg-white dark:bg-neutral-950">
      <div className="px-8 py-4 flex items-center justify-between">
        <h1 className="text-[28px] font-medium text-slate-900 dark:text-neutral-100 leading-none">
          Archive
        </h1>
        <p className="text-sm text-slate-400 dark:text-neutral-500">
          {items.length} archived item{items.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="border-y border-slate-200 dark:border-neutral-800 px-8 py-3.5 flex items-center gap-2">
        {(["job", "candidate", "offer"] as ArchiveType[]).map((t) => {
          const count = items.filter((i) => i.type === t).length;
          return (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`h-9 px-4 rounded-lg text-sm font-medium transition-colors ${
                activeTab === t
                  ? "bg-[#355872] text-white"
                  : "bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-slate-600 dark:text-neutral-400 hover:border-slate-300 dark:hover:border-neutral-700"
              }`}
            >
              {TYPE_LABELS[t]}
              {count > 0 && (
                <span
                  className={`ml-2 text-xs font-semibold px-1.5 py-0.5 rounded-full ${activeTab === t ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-neutral-800 text-slate-500 dark:text-neutral-400"}`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="px-8 py-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-52 gap-3 text-slate-400">
            <HugeiconsIcon
              icon={Archive01Icon}
              className="size-10 opacity-30"
            />
            <p className="text-sm">
              No archived {TYPE_LABELS[activeTab].toLowerCase()} yet.
            </p>
          </div>
        ) : (
          <div className="border border-slate-200 dark:border-neutral-800 rounded-xl overflow-hidden">
            <div className="grid grid-cols-[1fr_auto_auto_auto] items-center px-6 h-11 border-b border-slate-200 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-900/50">
              <span className="text-xs font-semibold text-slate-700 dark:text-neutral-300 uppercase tracking-wide">
                Name
              </span>
              <span className="text-xs font-semibold text-slate-700 dark:text-neutral-300 uppercase tracking-wide w-40 text-left pr-6">
                Type
              </span>
              <span className="text-xs font-semibold text-slate-700 dark:text-neutral-300 uppercase tracking-wide w-36 text-left pr-6">
                Archived On
              </span>
              <span className="w-10" />
            </div>

            {filtered.map((entry) => (
              <div
                key={`${entry.type}-${entry.id}`}
                className="grid grid-cols-[1fr_auto_auto_auto] items-center px-6 h-14 border-b border-slate-100 dark:border-neutral-800 last:border-0 hover:bg-slate-50/60 dark:hover:bg-neutral-800/60 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-neutral-200 truncate">
                    {entry.name}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-neutral-500 truncate">
                    {entry.detail}
                  </p>
                </div>
                <span
                  className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full w-40 text-left ${TYPE_BADGE[entry.type]}`}
                >
                  {TYPE_LABELS[entry.type].slice(0, -1)}{" "}
                  {/* "Job", "Candidate", "Offer" */}
                </span>
                <span className="text-xs text-slate-400 dark:text-neutral-500 w-36 pr-6">
                  {formatDate(entry.archivedAt)}
                </span>
                <button
                  onClick={() => setDeleteTarget(entry)}
                  className="flex items-center justify-center size-8 rounded-lg text-slate-400 dark:text-neutral-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                  title="Permanently delete"
                >
                  <HugeiconsIcon icon={Delete02Icon} className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent className="max-w-sm rounded-xl border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[17px] font-semibold text-slate-900 dark:text-neutral-100">
              Permanently Delete?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[13px] text-slate-500 dark:text-neutral-400 leading-relaxed">
              <strong className="text-slate-700 dark:text-neutral-200">{deleteTarget?.name}</strong>{" "}
              will be permanently removed and cannot be recovered.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="h-9 px-5 rounded-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-600 dark:text-neutral-400 text-[13px] font-medium shadow-none hover:bg-slate-50 dark:hover:bg-neutral-800">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteOfferMutation.isPending}
              className="h-9 px-5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-[13px] font-medium shadow-none border-none"
            >
              {deleteOfferMutation.isPending ? "Deleting…" : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
