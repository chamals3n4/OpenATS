import AssessmentsPageClient from "./_components/assessments-client";

export default async function AssessmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  return <AssessmentsPageClient tab={tab === "assignments" ? "assignments" : "assessments"} />;
}
