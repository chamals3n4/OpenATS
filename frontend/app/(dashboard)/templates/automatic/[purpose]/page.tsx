import { AutomaticEmailClient } from "../../_components/automatic-email-client";

export default async function AutomaticEmailPage({ params }: { params: Promise<{ purpose: string }> }) {
  const { purpose } = await params;
  return <AutomaticEmailClient purpose={purpose} />;
}
