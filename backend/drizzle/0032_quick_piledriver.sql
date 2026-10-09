CREATE TABLE "app_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"ai_cv_analysis_enabled" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
