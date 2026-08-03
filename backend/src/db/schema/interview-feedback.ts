import {
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { candidateInterviews } from "./interviews";
import { users } from "./users";

export const interviewFeedback = pgTable(
  "interview_feedback",
  {
    id: serial("id").primaryKey(),
    interviewId: integer("interview_id")
      .notNull()
      .references(() => candidateInterviews.id, { onDelete: "cascade" }),
    authorId: integer("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    rating: integer("rating"), // 1-5 star rating (optional)
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("idx_interview_feedback_interview_id").on(t.interviewId),
    index("idx_interview_feedback_author_id").on(t.authorId),
  ],
);

export type InterviewFeedback = typeof interviewFeedback.$inferSelect;
export type NewInterviewFeedback = typeof interviewFeedback.$inferInsert;
