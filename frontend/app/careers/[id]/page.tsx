import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JobApplicationForm } from "./_components/job-application-form";
import { getCompanyInfo, getPublicJob, getPublicQuestions } from "../_lib/careers-api";
import { jobMetadata, jobPostingData, serializeJsonLd } from "../_lib/job-seo";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const [job, company] = await Promise.all([getPublicJob(Number(id)), getCompanyInfo()]);
  return job ? jobMetadata(job, company) : {};
}

export default async function JobApplicationPage({ params }: PageProps) {
  const { id } = await params;
  const jobId = Number(id);

  const [job, questions, company] = await Promise.all([
    getPublicJob(jobId),
    getPublicQuestions(jobId),
    getCompanyInfo(),
  ]);

  if (!job) notFound();

  const posting = jobPostingData(job, company);

  return (
    <>
      {posting && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(posting) }}
        />
      )}
      <JobApplicationForm job={job} questions={questions} />
    </>
  );
}
