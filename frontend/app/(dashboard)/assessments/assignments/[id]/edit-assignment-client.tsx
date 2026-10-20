"use client";

import Link from "next/link";
import { DashboardMainLoading } from "@/components/dashboard-main-loading";
import { Button } from "@/components/ui/button";
import { useAssignment } from "@/hooks/queries/use-assignments";
import { AssignmentFormPage } from "../../_components/assignments/assignment-form-page";

export function EditAssignmentClient({ id }: { id: number }) {
  const { data, isLoading } = useAssignment(id);

  if (isLoading) return <DashboardMainLoading />;
  if (!data?.data) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-[15px] font-semibold text-slate-900 dark:text-neutral-100">Assignment not found</p>
        <Button variant="cancel" render={<Link href="/assessments?tab=assignments" />} className="h-9">
          Back to assignments
        </Button>
      </div>
    );
  }
  return <AssignmentFormPage assignment={data.data} />;
}
