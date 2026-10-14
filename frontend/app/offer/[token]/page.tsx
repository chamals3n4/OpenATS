"use client";

import { use, useState } from "react";
import { usePublicOffer } from "./_hooks/use-public-offer";
import { OfferLoading, OfferNotFound } from "./_components/offer-message-screens";
import { OfferDetails } from "./_components/offer-details";
import { OfferResponse } from "./_components/offer-response";
import { DeclineOfferDialog } from "./_components/decline-offer-dialog";

// The page a candidate opens from the offer email
export default function OfferPortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const { offer, loading, error, actionLoading, actionError, accept, decline } =
    usePublicOffer(token);
  const [showDeclineConfirm, setShowDeclineConfirm] = useState(false);

  if (loading) return <OfferLoading />;
  if (error || !offer) return <OfferNotFound message={error} />;

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 transition-colors duration-300">
      <div className="max-w-[640px] mx-auto pt-14 pb-24 px-6 sm:px-8">
        <OfferDetails offer={offer} />

        <OfferResponse
          offer={offer}
          actionLoading={actionLoading}
          actionError={actionError}
          onAccept={accept}
          onDecline={() => setShowDeclineConfirm(true)}
        />

        <p className="text-center text-xs text-slate-400 dark:text-neutral-500 mt-12">
          Powered by OpenATS
        </p>
      </div>

      <DeclineOfferDialog
        open={showDeclineConfirm}
        onClose={() => setShowDeclineConfirm(false)}
        onConfirm={() => {
          setShowDeclineConfirm(false);
          void decline();
        }}
      />
    </div>
  );
}
