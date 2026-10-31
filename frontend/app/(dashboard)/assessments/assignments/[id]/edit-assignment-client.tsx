"use client";

import Link from "next/link";
import { DashboardMainLoading } from "@/components/dashboard-main-loading";
import { NotFoundState } from "@/components/not-found-state";
import { Button } from "@/components/ui/button";
import { useAssignment } from "@/hooks/queries/use-assignments";
import { AssignmentFormPage } from "../../_components/assignments/assignment-form-page";

export function EditAssignmentClient({ id }: { id: number }) {
  const { data, isLoading } = useAssignment(id);

  if (isLoading) return <DashboardMainLoading />;
  if (!data?.data) {
    return (
      <NotFoundState title="Assignment not found" description="It may have been deleted, or the link may be wrong.">
        <Button size="lg" render={<Link href="/assessments?tab=assignments" />}>
          Back to assignments
        </Button>
      </NotFoundState>
    );
  }
  return <AssignmentFormPage assignment={data.data} />;
}
