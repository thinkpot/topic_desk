"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { FlowNodeType, FlowOption, ConditionOperator } from "@/lib/flow-engine";
import { FLOW_PALETTE } from "@/lib/flow-node-defs";

function paletteFor(type: FlowNodeType) {
  return FLOW_PALETTE.find((p) => p.type === type);
}

function NodeShell({
  type,
  title,
  selected,
  children,
}: {
  type: FlowNodeType;
  title: string;
  selected?: boolean;
  children: React.ReactNode;
}) {
  const meta = paletteFor(type);
  return (
    <div
      className={`w-[220px] overflow-hidden rounded-lg border bg-surface shadow-card ${
        selected ? "border-ink ring-1 ring-ink" : "border-line"
      }`}
    >
      <div className="flex items-center gap-2 border-b border-line px-3 py-2" style={{ background: (meta?.color ?? "#666") + "14" }}>
        <span className="text-[13px]">{meta?.icon ?? "▶"}</span>
        <span className="text-[12.5px] font-semibold" style={{ color: meta?.color ?? "#111" }}>
          {title}
        </span>
      </div>
      <div className="px-3 py-2.5 text-[12.5px] text-ink-2">{children}</div>
    </div>
  );
}

function Truncated({ text, placeholder }: { text?: string; placeholder: string }) {
  return <p className="line-clamp-2 break-words">{text?.trim() ? text : <span className="italic text-ink-3">{placeholder}</span>}</p>;
}

export function StartNode({ selected }: NodeProps) {
  return (
    <div className={`w-[160px] rounded-full border bg-ink px-4 py-2.5 text-center shadow-card ${selected ? "ring-2 ring-ink" : ""}`}>
      <span className="text-[13px] font-semibold text-white">▶ Start</span>
      <Handle type="source" position={Position.Right} style={{ background: "#fff", borderColor: "#0a0a0a" }} />
    </div>
  );
}

export function MessageNode({ data, selected }: NodeProps) {
  const d = data as { text?: string };
  return (
    <NodeShell type="message" title="Message" selected={selected}>
      <Handle type="target" position={Position.Left} />
      <Truncated text={d.text} placeholder="No message text yet" />
      <Handle type="source" position={Position.Right} />
    </NodeShell>
  );
}

export function QuestionNode({ data, selected }: NodeProps) {
  const d = data as { prompt?: string; variableName?: string };
  return (
    <NodeShell type="question" title="Question" selected={selected}>
      <Handle type="target" position={Position.Left} />
      <Truncated text={d.prompt} placeholder="No question text yet" />
      {d.variableName && (
        <p className="mt-1.5 font-mono text-[11px] text-ink-3">saves as {"{" + d.variableName + "}"}</p>
      )}
      <Handle type="source" position={Position.Right} />
    </NodeShell>
  );
}

export function ButtonsNode({ data, selected }: NodeProps) {
  const d = data as { prompt?: string; options?: FlowOption[] };
  const options = d.options ?? [];
  return (
    <NodeShell type="buttons" title="Buttons" selected={selected}>
      <Handle type="target" position={Position.Left} />
      <Truncated text={d.prompt} placeholder="No prompt text yet" />
      <div className="mt-2 space-y-1.5">
        {options.map((opt) => (
          <div key={opt.id} className="relative rounded-md border border-line bg-surface-sunken px-2 py-1 pr-4 text-[12px]">
            {opt.label || "Untitled option"}
            <Handle type="source" position={Position.Right} id={opt.id} style={{ top: "auto", position: "absolute", right: -9, transform: "none" }} />
          </div>
        ))}
        {options.length === 0 && <p className="italic text-ink-3">No options yet</p>}
      </div>
    </NodeShell>
  );
}

const OPERATOR_LABEL: Record<ConditionOperator, string> = {
  equals: "=",
  contains: "contains",
  not_empty: "is not empty",
};

export function ConditionNode({ data, selected }: NodeProps) {
  const d = data as { variable?: string; operator?: ConditionOperator; value?: string };
  return (
    <NodeShell type="condition" title="Condition" selected={selected}>
      <Handle type="target" position={Position.Left} />
      {d.variable ? (
        <p className="font-mono text-[12px]">
          {"{" + d.variable + "}"} {OPERATOR_LABEL[d.operator ?? "equals"]} {d.operator !== "not_empty" && `"${d.value ?? ""}"`}
        </p>
      ) : (
        <p className="italic text-ink-3">No condition set yet</p>
      )}
      <div className="mt-2 space-y-1.5">
        <div className="relative rounded-md border border-line bg-surface-sunken px-2 py-1 pr-4 text-[12px] text-positive">
          True
          <Handle type="source" position={Position.Right} id="true" style={{ top: "auto", position: "absolute", right: -9, transform: "none" }} />
        </div>
        <div className="relative rounded-md border border-line bg-surface-sunken px-2 py-1 pr-4 text-[12px] text-critical">
          False
          <Handle type="source" position={Position.Right} id="false" style={{ top: "auto", position: "absolute", right: -9, transform: "none" }} />
        </div>
      </div>
    </NodeShell>
  );
}

export function HandoffNode({ data, selected }: NodeProps) {
  const d = data as { message?: string };
  return (
    <NodeShell type="handoff" title="Hand off to Telegram" selected={selected}>
      <Handle type="target" position={Position.Left} />
      <Truncated text={d.message} placeholder="No message — hands off silently" />
      <p className="mt-1.5 text-[11px] text-ink-3">Opens a topic; the flow ends here.</p>
    </NodeShell>
  );
}

export function EndNode({ data, selected }: NodeProps) {
  const d = data as { message?: string };
  return (
    <NodeShell type="end" title="End" selected={selected}>
      <Handle type="target" position={Position.Left} />
      <Truncated text={d.message} placeholder="No closing message" />
    </NodeShell>
  );
}

export const nodeTypes = {
  start: StartNode,
  message: MessageNode,
  question: QuestionNode,
  buttons: ButtonsNode,
  condition: ConditionNode,
  handoff: HandoffNode,
  end: EndNode,
};
