"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const PROVIDER_LABELS: Record<string, string> = {
  google_meet: "Google Meet",
};

export function OAuthCallbackToast() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");
    if (!connected && !error) return;

    if (connected) {
      toast.success(`${PROVIDER_LABELS[connected] ?? connected} connected`);
      queryClient.invalidateQueries({ queryKey: ["integrations", "status"] });
    } else if (error) {
      toast.error(`Failed to connect ${PROVIDER_LABELS[error] ?? error}`);
    }

    router.replace("/settings/integrations");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
