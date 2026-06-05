CREATE TABLE "active_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"level" varchar(20) NOT NULL,
	"service" varchar(100) NOT NULL,
	"action" text NOT NULL,
	"endpoint" varchar(500) NOT NULL,
	"actor" varchar(255) NOT NULL,
	"status_code" integer NOT NULL,
	"latency_ms" integer NOT NULL,
	"request_id" varchar(255) NOT NULL,
	"ip" varchar(100) NOT NULL,
	"device" varchar(255) NOT NULL,
	"meta" jsonb
);
