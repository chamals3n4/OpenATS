import Link from "next/link";
import { NotFoundState } from "@/components/not-found-state";
import { Button } from "@/components/ui/button";

export default function DashboardNotFound() {
  return (
    <NotFoundState
      title="Page not found"
      description="This page does not exist, or the link is old or mistyped."
    >
      <Button size="lg" render={<Link href="/" />}>
        Back to overview
      </Button>
      <Button size="lg" variant="cancel" render={<Link href="/jobs" />}>
        View jobs
      </Button>
    </NotFoundState>
  );
}
