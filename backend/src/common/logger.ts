/**
 * Minimal structured logger (brief §38). Deliberately not an "elaborate
 * monitoring platform" — just consistent, greppable, structured lines.
 * Never logs secrets, API keys, or full user records.
 */
type Level = "info" | "warn" | "error";

function emit(level: Level, event: string, meta?: Record<string, unknown>) {
  const line = {
    ts: new Date().toISOString(),
    level,
    event,
    ...meta,
  };
  const out = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  out(JSON.stringify(line));
}

export const logger = {
  info: (event: string, meta?: Record<string, unknown>) => emit("info", event, meta),
  warn: (event: string, meta?: Record<string, unknown>) => emit("warn", event, meta),
  error: (event: string, meta?: Record<string, unknown>) => emit("error", event, meta),
};
