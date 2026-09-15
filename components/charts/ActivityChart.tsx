"use client";

import { useState } from "react";
import type { DailyPoint } from "@/lib/analytics";

type MetricKey = "conversations" | "messages" | "views" | "opens";

const METRICS: { key: MetricKey; label: string }[] = [
  { key: "conversations", label: "Chats started" },
  { key: "messages", label: "Messages" },
  { key: "views", label: "Widget seen" },
  { key: "opens", label: "Chat opened" },
];

function formatDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

export default function ActivityChart({ series }: { series: DailyPoint[] }) {
  const [metric, setMetric] = useState<MetricKey>("conversations");
  const [showTable, setShowTable] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);

  const values = series.map((point) => point[metric]);
  const max = Math.max(...values, 1);
  const total = values.reduce((sum, v) => sum + v, 0);
  const activeLabel = METRICS.find((m) => m.key === metric)!.label;

  return (
    <section className="surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">{activeLabel}</h2>
          <p className="metric mt-0.5 text-[13px] text-ink-3">
            {total.toLocaleString("en-IN")} over the last {series.length} days
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {METRICS.map((m) => (
            <button
              key={m.key}
              onClick={() => setMetric(m.key)}
              className={`rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors ${
                metric === m.key ? "bg-ink text-white" : "text-ink-2 hover:bg-surface-sunken"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {showTable ? (
        <div className="mt-5 max-h-64 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-surface text-left">
              <tr className="border-b border-line">
                <th className="py-2 font-medium text-ink-3">Date</th>
                <th className="py-2 text-right font-medium text-ink-3">{activeLabel}</th>
              </tr>
            </thead>
            <tbody>
              {series.map((point) => (
                <tr key={point.date} className="border-b border-line last:border-0">
                  <td className="py-1.5 text-ink-2">{formatDay(point.date)}</td>
                  <td className="metric py-1.5 text-right">{point[metric].toLocaleString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative mt-6">
          <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-between text-[11px] text-ink-3">
            <span className="metric">{max.toLocaleString("en-IN")}</span>
          </div>
          <div className="absolute inset-x-0 top-[7px] border-t border-line" />
          <div className="absolute inset-x-0 top-[calc(50%+3px)] border-t border-line" />

          <div className="relative flex h-40 items-end gap-[2px] pt-4">
            {series.map((point, i) => {
              const value = point[metric];
              const heightPct = (value / max) * 100;
              return (
                <div
                  key={point.date}
                  className="group relative flex h-full flex-1 items-end justify-center"
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <div
                    className="w-full max-w-[30px] rounded-t-[4px] transition-opacity"
                    style={{
                      height: `${Math.max(heightPct, value > 0 ? 2 : 0)}%`,
                      minHeight: value > 0 ? 2 : 0,
                      background: "var(--series-1)",
                      opacity: hovered === null || hovered === i ? 1 : 0.45,
                    }}
                  />
                  {hovered === i && (
                    <div className="pointer-events-none absolute -top-1 left-1/2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border border-line bg-surface px-2.5 py-1.5 text-[12px] shadow-pop">
                      <span className="metric font-semibold">{value.toLocaleString("en-IN")}</span>
                      <span className="text-ink-3"> · {formatDay(point.date)}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-2 flex justify-between border-t border-line pt-2 text-[11px] text-ink-3">
            <span>{series.length > 0 && formatDay(series[0].date)}</span>
            <span>{series.length > 0 && formatDay(series[series.length - 1].date)}</span>
          </div>
        </div>
      )}

      <button
        onClick={() => setShowTable((v) => !v)}
        className="mt-3 text-[13px] font-medium text-ink-2 underline underline-offset-2 hover:text-ink"
      >
        {showTable ? "Show chart" : "Show as table"}
      </button>
    </section>
  );
}
