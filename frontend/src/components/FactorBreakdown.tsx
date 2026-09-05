import type { ChangeFactor } from "../types";

export function FactorBreakdown({ factors }: { factors: ChangeFactor[] }) {
  if (factors.length === 0) return null;
  const maxPossible = (f: ChangeFactor) => Math.round(f.weight * 100);
  return (
    <div className="space-y-2" role="list" aria-label="Score factor breakdown">
      {factors.map((f) => {
        const pct = Math.min(100, Math.round((f.rawValue) * 100));
        return (
          <div key={f.key} role="listitem" className="text-xs">
            <div className="flex justify-between text-slate-400 mb-1">
              <span>{f.label}</span>
              <span className="tabular-nums">
                {f.contribution.toFixed(1)} / {maxPossible(f)} pts
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-800" aria-hidden="true">
              <div
                className="h-1.5 rounded-full bg-sky-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
