import TemplatesPageClient from "./_components/templates-client";

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  return <TemplatesPageClient tab={tab === "automatic" ? "automatic" : "yours"} />;
}
