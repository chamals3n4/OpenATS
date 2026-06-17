CREATE INDEX "idx_assessment_attempts_candidate_id" ON "candidate_assessment_attempts" USING btree ("candidate_id");--> statement-breakpoint
CREATE INDEX "idx_candidate_stage_history_candidate_id" ON "candidate_stage_history" USING btree ("candidate_id");--> statement-breakpoint
CREATE INDEX "idx_candidate_stage_history_stage_id" ON "candidate_stage_history" USING btree ("stage_id");--> statement-breakpoint
CREATE INDEX "idx_candidates_job_id" ON "candidates" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "idx_candidates_current_stage_id" ON "candidates" USING btree ("current_stage_id");--> statement-breakpoint
CREATE INDEX "idx_candidate_activities_candidate_id" ON "candidate_activities" USING btree ("candidate_id");--> statement-breakpoint
CREATE INDEX "idx_candidate_activities_job_id" ON "candidate_activities" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "idx_candidate_chat_messages_candidate_id" ON "candidate_chat_messages" USING btree ("candidate_id");--> statement-breakpoint
CREATE INDEX "idx_email_messages_candidate_id" ON "email_messages" USING btree ("candidate_id");--> statement-breakpoint
CREATE INDEX "idx_job_chat_messages_job_id" ON "job_chat_messages" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "idx_candidate_interviews_candidate_id" ON "candidate_interviews" USING btree ("candidate_id");--> statement-breakpoint
CREATE INDEX "idx_candidate_interviews_job_id" ON "candidate_interviews" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "idx_candidate_interviews_stage_id" ON "candidate_interviews" USING btree ("stage_id");