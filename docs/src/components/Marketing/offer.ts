// Placeholders for the Cloud and Pricing pages: change them here and both pages follow.
export const CONTACT_EMAIL = 'chamals004@gmail.com';
export const CLOUD_PRICE = {amount: '$30', period: 'per month', note: 'Flat price. Every user and candidate included.'};
export const FREE_TIER = {jobs: 2, note: 'No card required. Keep everything when you upgrade.'};

/** A mailto link, with the subject and optional body filled in. */
export const mailto = (subject: string, body?: string) =>
  `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}${body ? `&body=${encodeURIComponent(body)}` : ''}`;
