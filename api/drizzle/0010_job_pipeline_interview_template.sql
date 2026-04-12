-- New transactional template kinds (one default per type in app logic).
ALTER TYPE "public"."template_type" ADD VALUE 'application_received';
ALTER TYPE "public"."template_type" ADD VALUE 'assessment_completion';
ALTER TYPE "public"."template_type" ADD VALUE 'interview_invite';
