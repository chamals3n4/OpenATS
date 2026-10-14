// Better Auth error to a message

export type AuthClientError = {
  code?: string;
  status?: number;
  message?: string;
} | null;

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
export const PASSWORD_RULE = `Use ${PASSWORD_MIN_LENGTH} to ${PASSWORD_MAX_LENGTH} characters.`;

const TOO_MANY_ATTEMPTS = "Too many attempts. Please wait a moment and try again.";
const GENERIC = "Something went wrong. Please try again.";

export function isRateLimited(error: AuthClientError) {
  return error?.status === 429;
}

export function signInErrorMessage(error: AuthClientError): string {
  if (!error) return GENERIC;
  if (isRateLimited(error)) return TOO_MANY_ATTEMPTS;

  if (error.code === "ACCOUNT_DEACTIVATED" || error.code === "BANNED_USER") {
    return "This account has been deactivated. Contact your administrator.";
  }

  // Don't say which one was wrong
  if (error.status === 401 || error.code === "INVALID_EMAIL_OR_PASSWORD") {
    return "Invalid email or password.";
  }

  return GENERIC;
}

export type SignInFieldErrors = { email?: string; password?: string };

/** Check before sending, empty when ok */
export function validateSignIn(values: {
  email: string;
  password: string;
}): SignInFieldErrors {
  const errors: SignInFieldErrors = {};
  const email = values.email.trim();

  if (!email) {
    errors.email = "Enter your email.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Enter a valid email address.";
  }

  // No length rules on sign in
  if (!values.password) {
    errors.password = "Enter your password.";
  }

  return errors;
}

export function isInvalidResetToken(error: AuthClientError) {
  return error?.code === "INVALID_TOKEN" || error?.code === "USER_NOT_FOUND";
}

export function resetPasswordErrorMessage(error: AuthClientError): string {
  if (!error) return GENERIC;
  if (isRateLimited(error)) return TOO_MANY_ATTEMPTS;

  if (
    error.code === "PASSWORD_TOO_SHORT" ||
    error.code === "PASSWORD_TOO_LONG"
  ) {
    return PASSWORD_RULE;
  }

  return GENERIC;
}

export function changePasswordErrorMessage(error: AuthClientError): string {
  if (!error) return GENERIC;
  if (isRateLimited(error)) return TOO_MANY_ATTEMPTS;

  if (error.code === "INVALID_PASSWORD") {
    return "Your current password is incorrect.";
  }
  if (
    error.code === "PASSWORD_TOO_SHORT" ||
    error.code === "PASSWORD_TOO_LONG"
  ) {
    return PASSWORD_RULE;
  }

  return GENERIC;
}

/** Check the password rules, null when ok */
export function validateNewPassword(
  password: string,
  confirmation: string,
): string | null {
  if (
    password.length < PASSWORD_MIN_LENGTH ||
    password.length > PASSWORD_MAX_LENGTH
  ) {
    return PASSWORD_RULE;
  }
  if (password !== confirmation) return "The passwords do not match.";
  return null;
}
