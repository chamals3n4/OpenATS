import {
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const activeLogs = pgTable("active_logs", {
  id: serial("id").primaryKey(),

  timestamp: timestamp("timestamp").notNull().defaultNow(),

  level: varchar("level", { length: 20 }).notNull(),
  service: varchar("service", { length: 100 }).notNull(),
  action: text("action").notNull(),
  endpoint: varchar("endpoint", { length: 500 }).notNull(),

  actor: varchar("actor", { length: 255 }).notNull(),
  statusCode: integer("status_code").notNull(),
  latencyMs: integer("latency_ms").notNull(),

  requestId: varchar("request_id", { length: 255 }).notNull(),
  ip: varchar("ip", { length: 100 }).notNull(),
  device: varchar("device", { length: 255 }).notNull(),

  meta: jsonb("meta"),
});

export type ActiveLog = typeof activeLogs.$inferSelect;
export type NewActiveLog = typeof activeLogs.$inferInsert;
