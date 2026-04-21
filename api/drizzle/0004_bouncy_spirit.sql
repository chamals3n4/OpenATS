CREATE TABLE "offer_response_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"offer_id" integer NOT NULL,
	"candidate_id" integer NOT NULL,
	"token" varchar(255) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"responded_at" timestamp,
	"responder_name" varchar(255),
	"candidate_message" text,
	"reminder_48h_sent_at" timestamp,
	"reminder_24h_sent_at" timestamp,
	"expiry_notified_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "offer_response_attempts_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "offer_response_attempts" ADD CONSTRAINT "offer_response_attempts_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_response_attempts" ADD CONSTRAINT "offer_response_attempts_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;