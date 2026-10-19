"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  boardKey,
  useBulkMoveCandidates,
  useMoveCandidateStage,
} from "@/hooks/queries/use-candidates";
import type { BoardCandidate, PipelineStage, StageAutomationFlags } from "@/types";
import {
  fullName,
  groupByStage,
  hasEffects,
  moveCard,
  moveEffects,
  stageKeyOf,
  type MoveEffects,
} from "../_lib/board-utils";

type Board = { data: BoardCandidate[] };

/** Move waiting for confirm */
export interface PendingMove {
  kind: "single" | "bulk";
  candidates: BoardCandidate[];
  stage: PipelineStage;
  /** Slot in the column. Bulk moves go to the top */
  index: number;
  effects: MoveEffects;
}

interface Options {
  /** Called after a bulk move */
  onBulkMoved?: () => void;
}

function showAutomationToasts(automation: StageAutomationFlags | undefined) {
  if (automation?.assessmentInvite === "skipped_active_invite") {
    toast.message("Assessment", {
      description: "An invite is already active, so no new email was sent. The existing link still works.",
    });
  } else if (automation?.assessmentInvite === "sent") {
    toast.success("Assessment invite sent");
  }
  if (automation?.assignmentInvite === "sent") {
    toast.success("Assignment sent");
  } else if (automation?.assignmentInvite === "skipped_active_invite") {
    toast.message("Assignment", { description: "They already have this assignment, so no new email was sent." });
  } else if (automation?.assignmentInvite === "failed") {
    toast.error("The assignment could not be sent", { description: "Send it again from the candidate's page." });
  }
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Move cards with optimistic update, undo and confirm */
export function useBoardMoves(
  jobId: number,
  stages: PipelineStage[],
  assessmentStageIds: ReadonlySet<number>,
  options: Options = {},
) {
  const queryClient = useQueryClient();
  const moveStage = useMoveCandidateStage();
  const bulkMove = useBulkMoveCandidates();
  const [movingIds, setMovingIds] = useState<ReadonlySet<number>>(new Set());
  const [pending, setPending] = useState<PendingMove | null>(null);
  // Latest value for the undo toast
  const runMoveRef = useRef<(id: number, stageId: number, index: number, undoable: boolean) => void>(
    () => {},
  );
  const onBulkMovedRef = useRef(options.onBulkMoved);
  useEffect(() => {
    onBulkMovedRef.current = options.onBulkMoved;
  }, [options.onBulkMoved]);

  const setMoving = (ids: number[], on: boolean) =>
    setMovingIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });

  const settle = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: boardKey(jobId) });
    void queryClient.invalidateQueries({ queryKey: ["candidates"] });
  }, [queryClient, jobId]);

  const runMove = useCallback(
    (candidateId: number, toStageId: number, index: number, undoable: boolean) => {
      const key = boardKey(jobId);
      const before = queryClient.getQueryData<Board>(key);
      const card = before?.data.find((c) => c.id === candidateId);
      const stage = stages.find((s) => s.id === toStageId);
      if (!before || !card || !stage) return;

      const fromStageId = stageKeyOf(card);
      const fromIndex = (groupByStage(before.data).get(fromStageId) ?? []).findIndex(
        (c) => c.id === candidateId,
      );

      const next = moveCard(before.data, candidateId, toStageId, index);
      if (next === before.data) return;
      const position = (groupByStage(next).get(toStageId) ?? []).findIndex(
        (c) => c.id === candidateId,
      );
      const crossesStage = fromStageId !== toStageId;
      const effects = moveEffects(stage, assessmentStageIds);

      void queryClient.cancelQueries({ queryKey: key });
      queryClient.setQueryData<Board>(key, { data: next });
      setMoving([candidateId], true);

      moveStage.mutate(
        { id: candidateId, newStageId: toStageId, position },
        {
          onSuccess: (res) => {
            showAutomationToasts(res.stageAutomation);
            if (!crossesStage) return;
            const label = `Moved ${fullName(card)} to ${stage.name}`;
            // No undo once an email is sent
            if (undoable && !hasEffects(effects) && fromStageId !== -1) {
              toast.success(label, {
                action: {
                  label: "Undo",
                  onClick: () => runMoveRef.current(candidateId, fromStageId, fromIndex, false),
                },
              });
            } else {
              toast.success(label);
            }
          },
          onError: (error) => {
            queryClient.setQueryData<Board>(key, before);
            toast.error(error.message || "Couldn't move the candidate. Try again.");
          },
          onSettled: () => {
            setMoving([candidateId], false);
            settle();
          },
        },
      );
    },
    [jobId, stages, assessmentStageIds, queryClient, moveStage, settle],
  );
  useEffect(() => {
    runMoveRef.current = runMove;
  }, [runMove]);

  const runBulk = useCallback(
    (candidateIds: number[], toStageId: number) => {
      const key = boardKey(jobId);
      const before = queryClient.getQueryData<Board>(key);
      const stage = stages.find((s) => s.id === toStageId);
      if (!before || !stage) return;

      // Last first to keep the order
      let next = before.data;
      for (const id of [...candidateIds].reverse()) next = moveCard(next, id, toStageId, 0);

      void queryClient.cancelQueries({ queryKey: key });
      queryClient.setQueryData<Board>(key, { data: next });
      setMoving(candidateIds, true);

      bulkMove.mutate(
        { candidateIds, newStageId: toStageId },
        {
          onSuccess: ({ data }) => {
            if (data.moved.length > 0) {
              toast.success(`Moved ${plural(data.moved.length, "candidate", "candidates")} to ${stage.name}`);
            }
            if (data.failed.length > 0) {
              toast.error(`${plural(data.failed.length, "candidate", "candidates")} couldn't be moved`, {
                description: data.failed[0]?.error,
              });
            }
            if (data.assessmentInvitesSent > 0) {
              toast.success(`Assessment sent to ${plural(data.assessmentInvitesSent, "candidate", "candidates")}`);
            }
            if (data.assessmentInvitesSkipped > 0) {
              toast.message("Assessment", {
                description: `${plural(data.assessmentInvitesSkipped, "candidate", "candidates")} already had an active invite, so no new email was sent.`,
              });
            }
            if (data.assignmentInvitesSent > 0) {
              toast.success(`Assignment sent to ${plural(data.assignmentInvitesSent, "candidate", "candidates")}`);
            }
            if (data.assignmentInvitesSkipped > 0) {
              toast.message("Assignment", {
                description: `${plural(data.assignmentInvitesSkipped, "candidate", "candidates")} already had it, so no new email was sent.`,
              });
            }
            if (data.assignmentInvitesFailed > 0) {
              toast.error(`The assignment could not be sent to ${plural(data.assignmentInvitesFailed, "candidate", "candidates")}`, {
                description: "Send it again from their pages.",
              });
            }
            onBulkMovedRef.current?.();
          },
          onError: (error) => {
            queryClient.setQueryData<Board>(key, before);
            toast.error(error.message || "Couldn't move the candidates. Try again.");
          },
          onSettled: () => {
            setMoving(candidateIds, false);
            settle();
          },
        },
      );
    },
    [jobId, stages, queryClient, bulkMove, settle],
  );

  /** Move one card. Confirm first if needed */
  const requestMove = useCallback(
    (candidateId: number, toStageId: number, index: number) => {
      if (movingIds.has(candidateId)) return;
      const board = queryClient.getQueryData<Board>(boardKey(jobId));
      const candidate = board?.data.find((c) => c.id === candidateId);
      const stage = stages.find((s) => s.id === toStageId);
      if (!candidate || !stage) return;

      const effects = moveEffects(stage, assessmentStageIds);
      if (stageKeyOf(candidate) !== toStageId && hasEffects(effects)) {
        setPending({ kind: "single", candidates: [candidate], stage, index, effects });
        return;
      }
      runMove(candidateId, toStageId, index, true);
    },
    [movingIds, queryClient, jobId, stages, assessmentStageIds, runMove],
  );

  /** Move many cards to the top of a stage */
  const requestBulkMove = useCallback(
    (candidateIds: number[], toStageId: number) => {
      const board = queryClient.getQueryData<Board>(boardKey(jobId));
      const stage = stages.find((s) => s.id === toStageId);
      if (!board || !stage) return;

      const byId = new Map(board.data.map((c) => [c.id, c]));
      const candidates = candidateIds
        .map((id) => byId.get(id))
        .filter((c): c is BoardCandidate => !!c && stageKeyOf(c) !== toStageId && !movingIds.has(c.id));
      if (candidates.length === 0) {
        toast.message(`Already in ${stage.name}`);
        return;
      }

      const effects = moveEffects(stage, assessmentStageIds);
      if (hasEffects(effects)) {
        setPending({ kind: "bulk", candidates, stage, index: 0, effects });
        return;
      }
      runBulk(candidates.map((c) => c.id), toStageId);
    },
    [queryClient, jobId, stages, assessmentStageIds, movingIds, runBulk],
  );

  const confirmPending = useCallback(() => {
    if (!pending) return;
    if (pending.kind === "bulk") {
      runBulk(pending.candidates.map((c) => c.id), pending.stage.id);
    } else {
      runMove(pending.candidates[0].id, pending.stage.id, pending.index, false);
    }
    setPending(null);
  }, [pending, runMove, runBulk]);

  const cancelPending = useCallback(() => setPending(null), []);

  return { movingIds, pending, requestMove, requestBulkMove, confirmPending, cancelPending };
}
