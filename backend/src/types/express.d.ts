import type { AuthenticatedUser } from "../shared/auth/verify-token";

declare global {
  namespace Express {
    interface Request {
      // The `users` row, with `role` narrowed to AppRole.
      user: AuthenticatedUser;
    }
  }
}
