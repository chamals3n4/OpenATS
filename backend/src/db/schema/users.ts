import {
  boolean,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

import { userRole } from "./enums";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  // `sub` claim from the Asgardeo JWT
  asgardeoUserId: varchar("asgardeo_user_id", { length: 255 })
    .notNull()
    .unique(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  avatarUrl: varchar("avatar_url", { length: 1000 }),
  role: userRole("role").notNull().default("interviewer"),
  // set FALSE to deactivate without destroying historical records
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
