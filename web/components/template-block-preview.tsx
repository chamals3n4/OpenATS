import type { TemplateBodyBlock } from "@/types";

export type TemplateEditorBlockKind = TemplateBodyBlock["type"];

export interface TemplateEditorBlock {
  id: string;
  kind: TemplateEditorBlockKind;
  content: string;
}

/** Sample values for live preview (must cover all variable keys used in editors). */
export const SAMPLE_PREVIEW_VALUES: Record<string, string> = {
  candidate_name: "Alex Johnson",
  job_title: "Senior Software Engineer",
  salary: "5,000",
  currency: "USD",
  pay_frequency: "monthly",
  start_date: "March 15, 2026",
  expiry_date: "March 5, 2026",
  benefits: "Health insurance, 20 days PTO, remote-friendly workplace",
  company_name: "OpenATS Inc.",
  assessment_link: "https://openats.io/assess/abc123",
};

/**
 * Replace {{var}} with styled sample values. Keeps chips small and readable so
 * long “heading” blocks don’t turn the whole paragraph into giant bold text.
 */
export function renderPreviewHtml(text: string, vars: string[]) {
  let out = text;
  vars.forEach((key) => {
    const sample = SAMPLE_PREVIEW_VALUES[key] ?? key;
    out = out.replaceAll(
      `{{${key}}}`,
      `<span data-template-var="1" style="display:inline;background:#e0f2fe;color:#0c4a6e;border-radius:4px;padding:1px 6px;font-weight:500;font-size:0.92em;line-height:inherit;vertical-align:baseline">${sample}</span>`,
    );
  });
  return out;
}

export function TemplateBlockPreview({
  block,
  vars,
}: {
  block: TemplateEditorBlock;
  vars: string[];
}) {
  const html = renderPreviewHtml(block.content, vars);

  switch (block.kind) {
    case "heading":
      return (
        <div
          role="heading"
          aria-level={2}
          className="text-[15px] font-semibold leading-[1.65] text-slate-700 [&_span[data-template-var]]:font-medium [&_span[data-template-var]]:text-[0.95em]"
          dangerouslySetInnerHTML={{
            __html: html.replace(/\n/g, "<br/>"),
          }}
        />
      );
    case "text":
      return (
        <div
          className="text-[15px] font-normal leading-[1.65] text-slate-700 [&_span[data-template-var]]:font-medium [&_span[data-template-var]]:text-[0.95em]"
          dangerouslySetInnerHTML={{
            __html: html.replace(/\n/g, "<br/>"),
          }}
        />
      );
    case "button":
      return (
        <div className="flex justify-center my-3">
          <span
            role="presentation"
            className="inline-flex items-center justify-center rounded-full px-2.5 py-1 text-[12px] font-semibold bg-[var(--theme-color)]/10 text-[var(--theme-color)] border border-[var(--theme-color)]/25"
          >
            {block.content}
          </span>
        </div>
      );
    case "image":
      return (
        <div className="flex h-[120px] items-center justify-center rounded-lg bg-slate-100">
          <span className="text-[13px] text-slate-400">Image placeholder</span>
        </div>
      );
    case "divider":
      return <hr className="my-1 border-0 border-t border-slate-200" />;
    case "spacer":
      return <div className="h-6" />;
    default:
      return null;
  }
}
