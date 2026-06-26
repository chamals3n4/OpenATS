"use client";

import type { Block } from "../../../lib/template-form-types";
import { VARS } from "../../../lib/template-form-constants";
import { EmailSubjectField } from "./email-subject-field";
import { VariableButtons } from "./variable-buttons";
import { BlockToolbar } from "./block-toolbar";
import { BlockEditor } from "./block-editor";

interface EmailBuilderProps {
  subject: string;
  onSubjectChange: (value: string) => void;
  blocks: Block[];
  onAddBlock: (kind: Block["kind"]) => void;
  onUpdateBlock: (id: string, content: string) => void;
  onDeleteBlock: (id: string) => void;
  readOnly?: boolean;
}

export function EmailBuilder({
  subject,
  onSubjectChange,
  blocks,
  onAddBlock,
  onUpdateBlock,
  onDeleteBlock,
  readOnly = false,
}: EmailBuilderProps) {
  return (
    <>
      <EmailSubjectField value={subject} onChange={onSubjectChange} readOnly={readOnly} />
      {!readOnly && <VariableButtons variables={VARS} />}
      {!readOnly && <BlockToolbar onAddBlock={onAddBlock} />}
      {blocks.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[80px] rounded-md border border-dashed border-slate-200 dark:border-neutral-700 text-center">
          <p className="text-[12px] text-slate-400 dark:text-neutral-500">
            No blocks yet — add one above
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {blocks.map((block) => (
            <BlockEditor
              key={block.id}
              block={block}
              onUpdate={onUpdateBlock}
              onDelete={onDeleteBlock}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}
    </>
  );
}
