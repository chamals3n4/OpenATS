"use client";

import type { Block } from "../../../lib/template-form-types";
import { VARS } from "../../../lib/template-form-constants";
import { EmailSubjectField } from "./email-subject-field";
import { VariableButtons } from "./variable-buttons";
import { BlockToolbar } from "./block-toolbar";
import { BlockEditor } from "./block-editor";
import { EmailPreview } from "./email-preview";

interface EmailBuilderProps {
  subject: string;
  onSubjectChange: (value: string) => void;
  blocks: Block[];
  onAddBlock: (kind: Block["kind"]) => void;
  onUpdateBlock: (id: string, content: string) => void;
  onDeleteBlock: (id: string) => void;
}

export function EmailBuilder({
  subject,
  onSubjectChange,
  blocks,
  onAddBlock,
  onUpdateBlock,
  onDeleteBlock,
}: EmailBuilderProps) {
  return (
    <>
      <EmailSubjectField value={subject} onChange={onSubjectChange} />
      <VariableButtons variables={VARS} />
      <BlockToolbar onAddBlock={onAddBlock} />
      {blocks.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[120px] rounded-xl border-2 border-dashed border-slate-200 dark:border-neutral-700 text-center gap-2">
          <p className="text-[13px] font-medium text-slate-400 dark:text-neutral-500">
            No blocks yet
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {blocks.map((block) => (
            <BlockEditor
              key={block.id}
              block={block}
              onUpdate={onUpdateBlock}
              onDelete={onDeleteBlock}
            />
          ))}
        </div>
      )}
      {blocks.length > 0 && <EmailPreview blocks={blocks} />}
    </>
  );
}
