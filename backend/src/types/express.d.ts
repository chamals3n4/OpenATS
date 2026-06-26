import { User } from "../db";

type AppRole = "super_admin" | "hiring_manager" | "interviewer";

declare global {
  namespace Express {
    interface Request {
      user: User & { role: AppRole };
    }
  }
}
