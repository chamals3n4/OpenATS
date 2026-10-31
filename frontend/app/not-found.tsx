import Link from "next/link";
import { NotFoundState } from "@/components/not-found-state";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <NotFoundState
      fullPage
      title="Page not found"
      description="This page does not exist, or the link is old or mistyped."
    >
      <Button size="lg" render={<Link href="/" />}>
        Go to the dashboard
      </Button>
      <Button size="lg" variant="cancel" render={<Link href="/careers" />}>
        See open roles
      </Button>
    </NotFoundState>
  );
}
