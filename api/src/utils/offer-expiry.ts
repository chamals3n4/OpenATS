/**
 * Same rule as `offer-respond.controller`: date-only `expiryDate` allows responses
 * through the end of that calendar day (then one day added for the cutoff comparison).
 */
export function isPastOfferResponseDeadline(
  expiryDate: string | Date | null | undefined,
): boolean {
  if (expiryDate == null || expiryDate === "") return false;
  const expiry = new Date(expiryDate);
  if (Number.isNaN(expiry.getTime())) return false;
  expiry.setDate(expiry.getDate() + 1);
  return new Date() > expiry;
}
