import { useState } from "react";
import type { BriefingItem } from "../types";
import { AttentionBadge } from "./AttentionBadge";
import { FactorBreakdown } from "./FactorBreakdown";

export function ChangeCard({
  item,
}: {
  item: BriefingItem;
}) {
  const [expanded, setExpanded] = useState(false);
  const { result } = item;

  const positive = result.percentChange >= 0;

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] p-6 shadow-2xl shadow-black/10 transition hover:border-sky-400/20 hover:bg-white/[0.05]">
      <div
        className={`absolute left-0 top-0 h-full w-1 ${
          result.attentionLevel === "HIGH_ATTENTION"
            ? "bg-red-500"
            : result.attentionLevel === "SIGNIFICANT"
              ? "bg-orange-400"
              : result.attentionLevel === "WORTH_WATCHING"
                ? "bg-yellow-400"
                : "bg-emerald-400"
        }`}
      />

      <div className="flex items-start justify-between gap-5">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold">
              {result.symbol}
            </span>

            <AttentionBadge
              level={result.attentionLevel}
            />
          </div>

          <p className="mt-1 text-xs text-slate-500">
            {result.companyName}
          </p>
        </div>

        <div className="text-right">
          <div className="text-xs uppercase tracking-wider text-slate-600">
            Attention
          </div>

          <div className="mt-1 text-2xl font-black tabular-nums">
            {result.score}
            <span className="text-sm text-slate-600">
              /100
            </span>
          </div>
        </div>
      </div>

      <div className="mt-7 flex items-end justify-between">
        <div>
          <div className="text-3xl font-bold tabular-nums">
            ₹
            {result.currentPrice.toLocaleString(
              "en-IN",
              {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }
            )}
          </div>

          <div
            className={`mt-2 text-sm font-bold ${
              positive
                ? "text-emerald-400"
                : "text-red-400"
            }`}
          >
            {positive ? "↑" : "↓"}{" "}
            {positive ? "+" : ""}
            {result.percentChange.toFixed(2)}%
            <span className="ml-2 font-normal text-slate-600">
              since last visit
            </span>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl bg-black/20 p-4">
        <p className="text-sm leading-6 text-slate-300">
          {result.explanation}
        </p>
      </div>

      {result.factors.length > 0 && (
        <>
          <button
            type="button"
            onClick={() =>
              setExpanded((value) => !value)
            }
            className="mt-5 text-xs font-bold uppercase tracking-wider text-sky-400 hover:text-sky-300"
          >
            {expanded
              ? "Hide analysis ↑"
              : "Why this matters ↓"}
          </button>

          {expanded && (
            <div className="mt-4 border-t border-white/10 pt-5">
              <FactorBreakdown
                factors={result.factors}
              />
            </div>
          )}
        </>
      )}
    </article>
  );
}