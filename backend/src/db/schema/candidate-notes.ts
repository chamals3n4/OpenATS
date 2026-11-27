import { index, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { candidates } from "./candidates";
import { users } from "./users";

export const candidateNotes = pgTable("candidate_notes", {
  id: serial("id").primaryKey(),
  candidateId: integer("candidate_id").notNull().references(() => candidates.id, { onDelete: "cascade" }),
  authorId: integer("author_id").references(() => users.id, { onDelete: "set null" }),
  body: text("body").notNull(),
  stageName: text("stage_name"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [index("idx_candidate_notes_candidate_id").on(table.candidateId)]);
