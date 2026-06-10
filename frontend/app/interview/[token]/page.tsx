import { notFound } from "next/navigation";
import LoadingState from "../_components/loading-state";
import ErrorState from "../_components/error-state";
import ConfirmedState from "../_components/confirmed-state";
import AlreadyScheduled from "../_components/already-scheduled";
import SlotPicker from "../_components/slot-picker";
import { InterviewData } from "../types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

async function getInterview(token: string): Promise<InterviewData | null> {
  try {
    const res = await fetch(`${API_BASE}/public/interview/${token}`, {
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

  // For server-rendered states that don't need client interactivity
  if (data.status === "scheduled") {
    return <AlreadyScheduled timeSlots={data.timeSlots} />;
  }

  // SlotPicker handles its own client-side confirmation flow
  return (
    <SlotPicker
      data={data}
      token={token}
      apiBase={API_BASE}
      onConfirmed={() => {
        // This callback runs client-side; we use a key-based re-mount or
        // you can lift state. For simplicity, SlotPicker handles its own
        // confirmed state internally, but we pass these for flexibility.
      }}
      onError={() => {}}
    />
  );
}
