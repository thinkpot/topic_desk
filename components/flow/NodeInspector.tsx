"use client";

import type { Node } from "@xyflow/react";
import type { FlowOption, ConditionOperator, GotoFlowMode } from "@/lib/flow-engine";
import { Field } from "@/components/ui/primitives";

type AnyNode = Node<Record<string, unknown>>;

const ANSWER_HINT = "Insert a saved answer with {name}, or {name|there} for a fallback when it\u2019s missing.";

export interface FlowChoice {
  id: string;
  name: string;
}

export default function NodeInspector({
  node,
  onChange,
  onDelete,
  onClose,
  otherFlows,
  onOpenFlow,
  onCreateFlow,
}: {
  node: AnyNode;
  onChange: (data: Record<string, unknown>) => void;
  onDelete: () => void;
  onClose: () => void;
  /** The chatbot's flows other than the one being edited. */
  otherFlows: FlowChoice[];
  onOpenFlow: (flowId: string) => void;
  onCreateFlow: () => void;
}) {
  const data = node.data;

  function set(patch: Record<string, unknown>) {
    onChange({ ...data, ...patch });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <h3 className="text-[14px] font-semibold capitalize">
          {node.type === "goto_flow" ? "Go to flow" : node.type} node
        </h3>
        <button onClick={onClose} className="btn-ghost btn-sm -mr-2">
          Close
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {node.type === "message" && (
          <Field label="Message text" hint={ANSWER_HINT}>
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
            <Field label="Question" hint={ANSWER_HINT}>
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

        {node.type === "goto_flow" && (
          <GotoFlowInspector
            data={data}
            onChange={set}
            otherFlows={otherFlows}
            onOpenFlow={onOpenFlow}
            onCreateFlow={onCreateFlow}
          />
        )}

        {node.type === "end" && (
          <p className="text-[12.5px] leading-relaxed text-ink-2">
            If this flow was started by a <strong>Run flow, then come back</strong> step, End returns there instead of
            ending the chat.
          </p>
        )}

        {(node.type === "handoff" || node.type === "end") && (
          <Field
            label={node.type === "handoff" ? "Message before handoff (optional)" : "Closing message (optional)"}
            hint={ANSWER_HINT}
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
      <Field label="Prompt" hint={ANSWER_HINT}>
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

function GotoFlowInspector({
  data,
  onChange,
  otherFlows,
  onOpenFlow,
  onCreateFlow,
}: {
  data: Record<string, unknown>;
  onChange: (patch: Record<string, unknown>) => void;
  otherFlows: FlowChoice[];
  onOpenFlow: (flowId: string) => void;
  onCreateFlow: () => void;
}) {
  const flowId = (data.flowId as string) ?? "";
  const mode = ((data.mode as GotoFlowMode) ?? "return") as GotoFlowMode;
  const targetMissing = !!flowId && !otherFlows.some((f) => f.id === flowId);

  if (otherFlows.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-[13px] leading-relaxed text-ink-2">
          This chatbot has no other flows yet. Create one — for example &ldquo;Collect contact details&rdquo; — and
          you can run it from here.
        </p>
        <button onClick={onCreateFlow} className="btn-secondary btn-sm">
          + New flow
        </button>
      </div>
    );
  }

  return (
    <>
      <Field label="Flow">
        <select className="input" value={targetMissing ? "" : flowId} onChange={(e) => onChange({ flowId: e.target.value })}>
          <option value="" disabled>
            Pick a flow…
          </option>
          {otherFlows.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </Field>
      {targetMissing && <p className="text-[12.5px] text-critical">The flow this pointed at was deleted. Pick another.</p>}

      <div>
        <label className="field-label">When it gets there</label>
        <div className="space-y-2">
          {(
            [
              {
                value: "return",
                title: "Run it, then come back",
                hint: "When that flow finishes, carry on from this step's connection. Use this to reuse a flow.",
              },
              {
                value: "jump",
                title: "Switch to it",
                hint: "Carry on in that flow and don't come back here.",
              },
            ] as const
          ).map((option) => (
            <label
              key={option.value}
              className={`flex cursor-pointer gap-2.5 rounded-md border p-2.5 ${
                mode === option.value ? "border-ink" : "border-line hover:border-line-strong"
              }`}
            >
              <input
                type="radio"
                name="goto-mode"
                className="mt-0.5"
                checked={mode === option.value}
                onChange={() => onChange({ mode: option.value })}
              />
              <span>
                <span className="block text-[13px] font-medium">{option.title}</span>
                <span className="block text-[12px] leading-snug text-ink-3">{option.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      {flowId && !targetMissing && (
        <button onClick={() => onOpenFlow(flowId)} className="btn-ghost btn-sm -ml-2">
          Open that flow →
        </button>
      )}
      <p className="text-[12.5px] leading-relaxed text-ink-2">
        Answers saved in one flow can be used in any other — a Condition here can check{" "}
        <span className="font-mono">{"{name}"}</span> collected over there.
      </p>
    </>
  );
}
