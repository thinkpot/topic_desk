"use client";

import { ReactNode, useState } from "react";

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "positive" | "warning" | "critical" | "solid";
}) {
  const tones: Record<string, string> = {
    neutral: "border-line bg-surface-sunken text-ink-2",
    positive: "border-[#bfe7bf] bg-[#f1faf1] text-[#0a7a0a]",
    warning: "border-[#f4dfa8] bg-[#fdf8ea] text-[#8a6300]",
    critical: "border-[#f2c9c9] bg-[#fdf3f3] text-[#a72c2c]",
    solid: "border-ink bg-ink text-white",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[12px] font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function StatTile({
  label,
  value,
  sublabel,
}: {
  label: string;
  value: string | number;
  sublabel?: string;
}) {
  return (
    <div className="surface p-5">
      <p className="label-eyebrow">{label}</p>
      <p className="metric mt-2 text-[28px] font-semibold leading-none tracking-[-0.02em]">{value}</p>
      {sublabel && <p className="mt-2 text-[13px] text-ink-3">{sublabel}</p>}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="surface flex flex-col items-center px-6 py-16 text-center">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-2">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function Alert({ tone = "critical", children }: { tone?: "critical" | "warning" | "info"; children: ReactNode }) {
  const tones = {
    critical: "border-[#f2c9c9] bg-[#fdf3f3] text-[#a72c2c]",
    warning: "border-[#f4dfa8] bg-[#fdf8ea] text-[#7a5800]",
    info: "border-line bg-surface-sunken text-ink-2",
  };
  return <div className={`rounded-md border px-3.5 py-3 text-[13px] leading-snug ${tones[tone]}`}>{children}</div>;
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="field-label">{label}</label>
      {children}
      {hint && <p className="field-hint">{hint}</p>}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
        checked ? "bg-ink" : "bg-line-strong"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
          checked ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

export function CopyButton({ value, className = "" }: { value: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }}
      className={`btn-secondary btn-sm ${className}`}
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export function CodeBlock({ code, label }: { code: string; label?: string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-[#0f0f0f]">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2">
        <span className="text-[11px] font-medium uppercase tracking-[0.09em] text-white/50">{label ?? "Snippet"}</span>
        <CopyButton value={code} className="border-white/20 bg-white/10 text-white hover:bg-white/20" />
      </div>
      <pre className="overflow-x-auto px-4 py-3.5 text-[12.5px] leading-relaxed text-[#e8e8e8]">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 px-4 py-10">
      <div className="w-full max-w-lg rounded-xl border border-line bg-surface shadow-pop">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-base font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="btn-ghost btn-sm -mr-2">
            Close
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line px-5 py-4">{footer}</div>}
      </div>
    </div>
  );
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-ink-3">
      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-line-strong border-t-ink" />
      {label}
    </div>
  );
}
