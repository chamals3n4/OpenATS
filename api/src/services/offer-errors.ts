/** Thrown for client-fixable offer rules; maps to HTTP 400 in controllers. */
export class OfferValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OfferValidationError";
  }
}
