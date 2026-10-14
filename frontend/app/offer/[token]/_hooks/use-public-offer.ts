"use client";

import { useEffect, useState } from "react";
import {
  acceptPublicOffer,
  declinePublicOffer,
  fetchPublicOffer,
  markPublicOfferViewed,
} from "@/hooks/queries/use-offers";
import type { PublicOfferView } from "@/types";

// Loads the offer by its link token and handles accept and decline
export function usePublicOffer(token: string) {
  const [offer, setOffer] = useState<PublicOfferView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    fetchPublicOffer(token)
      .then((data) => {
        setOffer(data);
        setLoading(false);
      })
      .catch((err) => {
        setError((err as Error).message || "Failed to load offer");
        setLoading(false);
      });
  }, [token]);

  // Mark viewed once it is on screen
  const isUnseen = offer?.status === "sent";
  useEffect(() => {
    if (isUnseen) void markPublicOfferViewed(token);
  }, [isUnseen, token]);

  // Reload the offer after a failed answer
  const reload = () =>
    fetchPublicOffer(token)
      .then(setOffer)
      .catch(() => undefined);

  const respond = async (answer: "accepted" | "declined") => {
    setActionLoading(true);
    setActionError(null);
    try {
      await (answer === "accepted" ? acceptPublicOffer(token) : declinePublicOffer(token));
      setOffer((prev) => (prev ? { ...prev, status: answer } : prev));
    } catch (err) {
      const fallback = answer === "accepted" ? "Failed to accept offer" : "Failed to decline offer";
      setActionError((err as Error).message || fallback);
      await reload();
    } finally {
      setActionLoading(false);
    }
  };

  return {
    offer,
    loading,
    error,
    actionLoading,
    actionError,
    accept: () => respond("accepted"),
    decline: () => respond("declined"),
  };
}
