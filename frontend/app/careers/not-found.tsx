import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { JobClosedIllustration } from "./_components/job-closed-illustration";

export default function CareersNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-6 py-16 dark:bg-neutral-950">
      <div className="w-full max-w-xl text-center">
        <JobClosedIllustration />
        <h1 className="mt-8 text-3xl font-semibold leading-tight text-slate-900 sm:text-[32px] dark:text-neutral-100">
          This job is no longer open
        </h1>
        <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-slate-600 dark:text-neutral-400">
          It may have been filled or closed, or the link may be wrong.
        </p>
        <Button
          size="lg"
          className="mt-8 h-12 gap-2.5 rounded-full bg-neutral-900 px-8 text-[15px] font-medium text-white shadow-none hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
          render={<Link href="/careers" />}
        >
          See open roles
          <HugeiconsIcon icon={ArrowRight02Icon} className="size-5" strokeWidth={2} />
        </Button>
      </div>
    </div>
  );
}
