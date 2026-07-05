"use client";

import dynamic from "next/dynamic";

export const ResumeScrollView = dynamic(
  () =>
    import("@/app/(dashboard)/candidates/[id]/_components/resume-scroll-view").then(
      (mod) => ({
        default: mod.ResumeScrollView,
      }),
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-[12rem] py-8">
        <p className="text-[13px] text-slate-500 dark:text-neutral-500">
          Loading resume viewer…
        </p>
      </div>
    ),
  },
);

export const JobDescriptionEditor = dynamic(
  () =>
    import("@/app/(dashboard)/jobs/_components/job-description-editor").then(
      (mod) => ({
        default: mod.JobDescriptionEditor,
      }),
    ),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[260px] border border-slate-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-900 flex items-center justify-center">
        <p className="text-[13px] text-slate-500 dark:text-neutral-500">
          Loading editor…
        </p>
      </div>
    ),
  },
);

export const CandidateSidePanel = dynamic(
  () =>
    import("@/app/(dashboard)/candidates/[id]/_components/candidate-side-panel").then(
      (mod) => ({
        default: mod.CandidateSidePanel,
      }),
    ),
  { ssr: false },
);

export const CandidateJobFitTab = dynamic(
  () =>
    import("@/app/(dashboard)/candidates/[id]/_components/candidate-job-fit-tab").then(
      (mod) => ({
        default: mod.CandidateJobFitTab,
      }),
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center px-4">
        <p className="text-[13px] text-slate-500 dark:text-neutral-500">
          Loading job fit analysis…
        </p>
      </div>
    ),
  },
);

export const DragDropProvider = dynamic(
  () =>
    import("@/components/providers/drag-drop-provider").then((mod) => ({
      default: mod.DragDropProvider,
    })),
  { ssr: false },
);
