CREATE INDEX "idx_jobs_department_id" ON "jobs" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "idx_jobs_created_by" ON "jobs" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_job_hiring_team_user_id" ON "job_hiring_team" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_offers_job_id" ON "offers" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "idx_offers_created_by" ON "offers" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_interview_feedback_interview_id" ON "interview_feedback" USING btree ("interview_id");--> statement-breakpoint
CREATE INDEX "idx_interview_feedback_author_id" ON "interview_feedback" USING btree ("author_id");