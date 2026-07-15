import { notFound } from "next/navigation";
import AlreadyScheduled from "../_components/already-scheduled";
import SlotPicker from "../_components/slot-picker";
import { InterviewData } from "../types";

// The server-side fetch may reach the API over an internal network (Docker),
// while SlotPicker fetches from the browser and needs the public URL.
const SERVER_API_BASE =
  process.env.OPENATS_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8080";
const BROWSER_API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

async function getInterview(token: string): Promise<InterviewData | null> {
  try {
    const res = await fetch(`${SERVER_API_BASE}/public/interview/${token}`, {
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

  return <SlotPicker data={data} token={token} apiBase={BROWSER_API_BASE} />;
}
