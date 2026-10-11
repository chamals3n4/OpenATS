import { Spinner } from "@/components/ui/spinner";

export default function PublicAssessmentLoading() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-white dark:bg-neutral-950">
      <Spinner className="size-5 text-theme" />
    </main>
  );
}
