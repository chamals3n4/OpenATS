import { AssignmentBrief } from "@/components/assignment/assignment-brief";
import { SubmissionFields } from "@/components/assignment/submission-fields";
import type { AssignmentResource, SubmissionField } from "@/types";

interface AssignmentPreviewProps {
  title: string;
  description: string;
  resources: AssignmentResource[];
  submissionFields: SubmissionField[];
  dueDays: number;
}

/** The page the candidate will see, built from the same components, with the hand-in form switched off. */
export function AssignmentPreview({ title, description, resources, submissionFields, dueDays }: AssignmentPreviewProps) {
  const days = Number.isFinite(dueDays) && dueDays > 0 ? dueDays : 7;
  return (
    <div className="rounded-lg border border-slate-300 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-950">
      <AssignmentBrief
        title={title}
        description={description}
        resources={resources}
        deadline={`You have ${days} ${days === 1 ? "day" : "days"} to hand in, counted from when it is sent`}
      />

      <div className="mt-8 border-t border-slate-200 pt-6 dark:border-neutral-800">
        <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-neutral-100">Hand in your work</h3>
        <SubmissionFields fields={submissionFields} values={{}} disabled />
      </div>
    </div>
  );
}
