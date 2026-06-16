type LogLevel = "info" | "warn" | "error";

function pretty(level: LogLevel, event: string, data: Record<string, unknown>) {
  const method = data.method ?? "";
  const path = data.path ?? data.pathname ?? "";
  const status = data.status ?? "";
  const duration = data.durationMs ? ` ${data.durationMs}ms` : "";
  const message = data.message ?? "";
  const keyval = [method, path, status, duration, message].filter(Boolean).join(" ");
  return `[${level.toUpperCase()}] ${event}${keyval ? " — " : ""}${keyval}`;
}

function write(level: LogLevel, event: string, data: Record<string, unknown> = {}) {
  const entry = {
    level,
    event,
    service: "linq-backend",
    timestamp: new Date().toISOString(),
    ...data,
  };
  const json = JSON.stringify(entry);
  const readable = pretty(level, event, data);
  const line = `${readable}\n${json}`;
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  info: (event: string, data?: Record<string, unknown>) => write("info", event, data),
  warn: (event: string, data?: Record<string, unknown>) => write("warn", event, data),
  error: (event: string, data?: Record<string, unknown>) => write("error", event, data),
};
