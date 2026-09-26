"use client";

import type { Node } from "@xyflow/react";
import type { FlowOption, ConditionOperator } from "@/lib/flow-engine";
import { Field } from "@/components/ui/primitives";

type AnyNode = Node<Record<string, unknown>>;

export default function NodeInspector({
  node,
  onChange,
  onDelete,
  onClose,
}: {
  node: AnyNode;
  onChange: (data: Record<string, unknown>) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const data = node.data;

  function set(patch: Record<string, unknown>) {
    onChange({ ...data, ...patch });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <h3 className="text-[14px] font-semibold capitalize">{node.type} node</h3>
        <button onClick={onClose} className="btn-ghost btn-sm -mr-2">
          Close
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {node.type === "message" && (
          <Field label="Message text">
            <textarea
              className="input resize-none"
              rows={4}
              value={(data.text as string) ?? ""}
              onChange={(e) => set({ text: e.target.value })}
              placeholder="What should the bot say?"
            />
          </Field>
        )}

        {node.type === "question" && (
          <>
            <Field label="Question">
              <textarea
                className="input resize-none"
                rows={3}
                value={(data.prompt as string) ?? ""}
                onChange={(e) => set({ prompt: e.target.value })}
                placeholder="e.g. What's your email?"
              />
            </Field>
            <Field label="Save reply as" hint="Use this name in a later Condition node, e.g. email.">
              <input
                className="input font-mono text-[13px]"
                value={(data.variableName as string) ?? ""}
                onChange={(e) => set({ variableName: e.target.value.replace(/[^a-zA-Z0-9_]/g, "") })}
                placeholder="email"
              />
            </Field>
          </>
        )}

        {node.type === "buttons" && (
          <ButtonsInspector data={data} onChange={set} />
        )}

        {node.type === "condition" && <ConditionInspector data={data} onChange={set} />}

        {(node.type === "handoff" || node.type === "end") && (
          <Field
            label={node.type === "handoff" ? "Message before handoff (optional)" : "Closing message (optional)"}
          >
            <textarea
              className="input resize-none"
              rows={3}
              value={(data.message as string) ?? ""}
              onChange={(e) => set({ message: e.target.value })}
              placeholder={node.type === "handoff" ? "Connecting you with our team…" : "Thanks for chatting!"}
            />
          </Field>
        )}

        {node.type === "start" && <p className="text-[13px] text-ink-2">Every conversation begins here.</p>}
      </div>

      {node.type !== "start" && (
        <div className="border-t border-line px-4 py-3">
          <button onClick={onDelete} className="btn-ghost btn-sm text-critical">
            Delete node
          </button>
        </div>
      )}
    </div>
  );
}

function ButtonsInspector({
  data,
  onChange,
}: {
  data: Record<string, unknown>;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const options = (data.options as FlowOption[]) ?? [];

  function updateOption(id: string, label: string) {
    onChange({ options: options.map((o) => (o.id === id ? { ...o, label } : o)) });
  }
  function addOption() {
    if (options.length >= 6) return;
    onChange({ options: [...options, { id: `opt_${Math.random().toString(36).slice(2, 8)}`, label: "New option" }] });
  }
  function removeOption(id: string) {
    onChange({ options: options.filter((o) => o.id !== id) });
  }

  return (
    <>
      <Field label="Prompt">
        <textarea
          className="input resize-none"
          rows={3}
          value={(data.prompt as string) ?? ""}
          onChange={(e) => onChange({ prompt: e.target.value })}
          placeholder="e.g. What would you like to do?"
        />
      </Field>
      <div>
        <label className="field-label">Buttons</label>
        <div className="space-y-2">
          {options.map((opt) => (
            <div key={opt.id} className="flex items-center gap-1.5">
              <input
                className="input"
                value={opt.label}
                onChange={(e) => updateOption(opt.id, e.target.value)}
                maxLength={40}
              />
              {options.length > 1 && (
                <button onClick={() => removeOption(opt.id)} className="btn-ghost btn-sm shrink-0 px-2 text-critical">
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
        {options.length < 6 && (
          <button onClick={addOption} className="btn-secondary btn-sm mt-2">
            + Add button
          </button>
        )}
        <p className="field-hint">Drag a connection from each button's own dot to branch the flow.</p>
      </div>
    </>
  );
}

const OPERATORS: { value: ConditionOperator; label: string }[] = [
  { value: "equals", label: "equals" },
  { value: "contains", label: "contains" },
  { value: "not_empty", label: "is not empty" },
];

function ConditionInspector({
  data,
  onChange,
}: {
  data: Record<string, unknown>;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const operator = (data.operator as ConditionOperator) ?? "equals";
  return (
    <>
      <Field label="Variable" hint="The name you gave a Question node's saved reply.">
        <input
          className="input font-mono text-[13px]"
          value={(data.variable as string) ?? ""}
          onChange={(e) => onChange({ variable: e.target.value.replace(/[^a-zA-Z0-9_]/g, "") })}
          placeholder="email"
        />
      </Field>
      <Field label="Operator">
        <select className="input" value={operator} onChange={(e) => onChange({ operator: e.target.value })}>
          {OPERATORS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </Field>
      {operator !== "not_empty" && (
        <Field label="Value">
          <input
            className="input"
            value={(data.value as string) ?? ""}
            onChange={(e) => onChange({ value: e.target.value })}
            placeholder="gmail.com"
          />
        </Field>
      )}
      <p className="text-[12.5px] text-ink-2">Connect the True and False dots on the node to different next steps.</p>
    </>
  );
}
