import { AssessmentClient } from "../_components/assessment-client";

interface AssessmentPageProps {
  params: Promise<{ id: string }>;
}

export default async function AssessmentPage({ params }: AssessmentPageProps) {
  const { id } = await params;
  return <AssessmentClient token={id} />;
}
