import type { AttentionLevel } from "../types";

const CONFIG: Record<AttentionLevel, { label: string; icon: string; classes: string }> = {
  HIGH_ATTENTION: { label: "High attention", icon: "🔴", classes: "bg-red-500/15 text-red-400 ring-1 ring-red-500/30" },
  SIGNIFICANT: { label: "Significant", icon: "🟠", classes: "bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30" },
  WORTH_WATCHING: { label: "Worth watching", icon: "🟡", classes: "bg-yellow-500/15 text-yellow-300 ring-1 ring-yellow-500/30" },
  NORMAL: { label: "Normal", icon: "🟢", classes: "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30" },
};

export function AttentionBadge({ level }: { level: AttentionLevel }) {
  const c = CONFIG[level];
  return (
    <span className={`attention-badge ${c.classes}`}>
      <span aria-hidden="true">{c.icon}</span>
      {c.label}
    </span>
  );
}
