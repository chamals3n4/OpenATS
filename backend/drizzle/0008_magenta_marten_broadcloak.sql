CREATE TABLE "public_page_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"allowed_origins" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
