"use client";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";

interface AddStageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newStageType: string;
  setNewStageType: (type: string) => void;
  newStageName: string;
  setNewStageName: (name: string) => void;
  handleAddStage: () => void;
  isPending: boolean;
}

export function AddStageDialog({
  open,
  onOpenChange,
  newStageType,
  setNewStageType,
  newStageName,
  setNewStageName,
  handleAddStage,
  isPending,
}: AddStageDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!top-[18%] !translate-y-0 max-w-[460px] rounded-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-lg p-7 duration-0 data-open:zoom-in-100 data-closed:zoom-out-100">
        <DialogHeader className="mb-3">
          <DialogTitle className="text-[19px] font-semibold text-slate-900 dark:text-neutral-100">
            Add New Stage
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-[13px] font-medium text-slate-700 dark:text-neutral-300 mb-1.5 block">
              Stage Type
            </Label>
            <Select
              value={newStageType}
              onValueChange={(v) => setNewStageType(v ?? "screening")}
            >
              <SelectTrigger className="h-10 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 rounded-md shadow-none focus-visible:ring-0 focus-visible:border-slate-300 text-[14px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-lg shadow-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                <SelectItem value="screening">Screening</SelectItem>
                <SelectItem value="interview">Interview</SelectItem>
                <SelectItem value="offer">Offer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[13px] font-medium text-slate-700 dark:text-neutral-300 mb-1.5 block">
              Stage Name
            </Label>
            <Input
              autoFocus
              placeholder="e.g., First Interview, Technical Interview"
              value={newStageName}
              onChange={(e) => setNewStageName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddStage()}
              className="h-10 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 rounded-md shadow-none focus-visible:ring-0 focus-visible:border-slate-300 text-[14px] placeholder:text-slate-300 dark:placeholder:text-neutral-600"
            />
          </div>
          <div className="text-[13px] text-slate-500 dark:text-neutral-400 space-y-0.5 pl-0.5">
            <p className="font-medium text-slate-600 dark:text-neutral-300 mb-1">
              Tips:
            </p>
            <p>• Keep stage names short and descriptive</p>
            <p>• Use consistent naming conventions</p>
            <p>• Drag to reorder stages in the pipeline</p>
          </div>
        </div>

        <DialogFooter className="mt-5 gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-10 px-6 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-slate-600 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-neutral-800 font-medium shadow-none rounded-md"
          >
            Cancel
          </Button>
          <Button
            onClick={handleAddStage}
            disabled={!newStageName.trim() || isPending}
            className="h-10 px-6 bg-[var(--theme-color)] hover:bg-[var(--theme-color-hover)] text-white font-medium shadow-none rounded-md border-none disabled:opacity-50"
          >
            {isPending ? (
              <span className="inline-flex items-center gap-2">
                <Spinner className="text-white" />
                Adding…
              </span>
            ) : (
              "Add Stage"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
