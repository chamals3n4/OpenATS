import { User } from "../db";

declare global {
  namespace Express {
    interface Request {
      user: User;
    }
  }
}