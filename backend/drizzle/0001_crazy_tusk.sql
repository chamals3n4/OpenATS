CREATE TABLE "candidate_chat_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"candidate_id" integer NOT NULL,
	"sender_id" integer NOT NULL,
	"message" text,
	"reply_to_id" integer,
	"sent_at" timestamp DEFAULT now() NOT NULL,
	"is_system_message" boolean DEFAULT false NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "job_chat_messages" ADD COLUMN "is_system_message" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "candidate_chat_messages" ADD CONSTRAINT "candidate_chat_messages_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_chat_messages" ADD CONSTRAINT "candidate_chat_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_chat_messages" ADD CONSTRAINT "candidate_chat_messages_reply_to_id_candidate_chat_messages_id_fk" FOREIGN KEY ("reply_to_id") REFERENCES "public"."candidate_chat_messages"("id") ON DELETE set null ON UPDATE no action;