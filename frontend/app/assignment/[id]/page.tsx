import { AssignmentClient } from "../_components/assignment-client";

interface AssignmentPageProps {
  params: Promise<{ id: string }>;
}

export default async function AssignmentPage({ params }: AssignmentPageProps) {
  const { id } = await params;
  return <AssignmentClient token={id} />;
}
