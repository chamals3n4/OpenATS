"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { SentIcon } from "@hugeicons/core-free-icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { timeAgo, type SentEmail } from "../constants";

interface EmailSectionProps {
  candidate: any;
}

export function EmailSection({ candidate }: EmailSectionProps) {
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [sentEmails, setSentEmails] = useState<SentEmail[]>([]);

  const sendEmail = () => {
    const subject = emailSubject.trim();
    const body = emailBody.trim();
    if (!subject || !body) return;

    setSentEmails((emails) => [
      {
        id: Date.now(),
        subject,
        body,
        sentAt: new Date().toISOString(),
      },
      ...emails,
    ]);
    setEmailSubject("");
    setEmailBody("");
  };

  return (
    <div className="p-5 sm:p-6">
      <div className="mb-6">
        <h3 className="text-[15px] font-bold text-slate-900 dark:text-neutral-100">
          Send Email
        </h3>
        <p className="text-[13px] text-slate-500 dark:text-neutral-400 mt-0.5">
          Compose and send a message to the candidate
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-1 flex-col rounded-xl border border-slate-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex flex-1 flex-col space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
                To
              </Label>
              <Input
                value={candidate.email}
                readOnly
                className="h-10 border-slate-200 dark:border-neutral-700 shadow-none bg-slate-50 dark:bg-neutral-950 text-slate-700 dark:text-neutral-300 text-[13px] focus-visible:ring-0 rounded-lg cursor-default"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
                Subject
              </Label>
              <Input
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="e.g. Interview Invitation - Software Engineer"
                className="h-10 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 shadow-none text-[13px] focus-visible:ring-0 focus-visible:border-[var(--theme-color)] rounded-lg"
              />
            </div>
            <div className="flex min-h-0 flex-1 flex-col space-y-1.5">
              <Label className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
                Message
              </Label>
              <textarea
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                placeholder="Write your message here..."
                className="min-h-[180px] w-full flex-1 resize-none rounded-lg border border-slate-200 bg-white px-4 py-3 text-[13px] leading-relaxed text-slate-700 transition-[border-color] duration-200 focus:border-[var(--theme-color)] focus:outline-none dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-300"
              />
            </div>
            <div className="flex shrink-0 items-center justify-between pt-2">
              <span className="text-[12px] text-slate-400">
                Sending to{" "}
                <strong className="text-slate-600 dark:text-neutral-300">
                  {candidate.email}
                </strong>
              </span>
              <Button
                type="button"
                onClick={sendEmail}
                disabled={!emailSubject.trim() || !emailBody.trim()}
                className="h-9 rounded-md border-none bg-[var(--theme-color)] px-3.5 text-[13px] font-semibold text-white shadow-none hover:bg-[var(--theme-color-hover)] disabled:bg-neutral-700 disabled:text-neutral-400 disabled:opacity-70"
              >
                <HugeiconsIcon
                  icon={SentIcon}
                  className="size-4 rotate-[-45deg]"
                  strokeWidth={2.5}
                />
                Send Email
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h4 className="text-[14px] font-bold text-slate-900 dark:text-neutral-100">
                Sent Emails
              </h4>
              <p className="mt-0.5 text-[12px] text-slate-500 dark:text-neutral-400">
                {sentEmails.length} total
              </p>
            </div>
            <HugeiconsIcon
              icon={SentIcon}
              className="size-4 rotate-[-45deg] text-slate-400 dark:text-neutral-500"
              strokeWidth={2.3}
            />
          </div>
          {sentEmails.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center dark:border-neutral-700 dark:bg-neutral-950/50">
              <p className="text-[13px] font-semibold text-slate-500 dark:text-neutral-400">
                No emails sent yet
              </p>
              <p className="mt-1 text-[12px] text-slate-400 dark:text-neutral-500">
                Sent messages will appear here.
              </p>
            </div>
          ) : (
            <div className="max-h-[430px] space-y-3 overflow-y-auto pr-1">
              {sentEmails.map((email) => (
                <div
                  key={email.id}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-neutral-800 dark:bg-neutral-950"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="line-clamp-2 text-[13px] font-bold text-slate-800 dark:text-neutral-200">
                      {email.subject}
                    </p>
                    <span className="shrink-0 text-[11px] font-medium text-slate-400 dark:text-neutral-500">
                      {timeAgo(email.sentAt)}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-4 whitespace-pre-line text-[12px] leading-relaxed text-slate-500 dark:text-neutral-400">
                    {email.body}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
