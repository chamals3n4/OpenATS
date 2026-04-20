/**
 * Variable overrides for POST /templates/:id/preview with candidateId (offer type).
 * Keys match the API offer `_offerOverlay` template context fields.
 */
export function buildOfferTemplatePreviewContext(overlay: {
  salaryInput: string;
  currency: string;
  payFrequency: string;
  startDate: string;
  expiryDate: string;
  benefits: string;
}): Record<string, string | number> {
  const salaryTrim = overlay.salaryInput.trim();
  let salaryOut: string | number = "TBD";
  if (salaryTrim !== "") {
    const n = Number(salaryTrim);
    salaryOut = Number.isFinite(n) && !Number.isNaN(n) ? n : salaryTrim;
  }

  const payFreqRaw = overlay.payFrequency.trim();
  const pay_frequency = payFreqRaw ? payFreqRaw.replace(/_/g, " ") : "—";

  return {
    salary: salaryOut,
    currency: overlay.currency.trim().toUpperCase() || "",
    pay_frequency,
    start_date: overlay.startDate.trim() || "TBD",
    expiry_date: overlay.expiryDate.trim() || "TBD",
    benefits: overlay.benefits.trim() || "—",
  };
}
