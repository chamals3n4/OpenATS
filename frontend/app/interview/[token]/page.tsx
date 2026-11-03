import { browserApiUrl, serverApiUrl } from "@/lib/api-url";
import { notFound } from "next/navigation";
import AlreadyScheduled from "../_components/already-scheduled";
import SlotPicker from "../_components/slot-picker";
import { InterviewData } from "../types";


async function getInterview(token: string): Promise<InterviewData | null> {
  try {
    const res = await fetch(`${serverApiUrl()}/public/interview/${token}`, {
      cache: "no-store",
    });
    const json = await res.json();
    if (json.error) return null;
    return json.data;
  } catch {
    return null;
  }
}

export default async function PublicInterviewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = await getInterview(token);

  if (!data) {
    notFound();
  }

  if (data.status === "scheduled") {
    return <AlreadyScheduled timeSlots={data.timeSlots} />;
  }

  return <SlotPicker data={data} token={token} apiBase={browserApiUrl()} />;
}
