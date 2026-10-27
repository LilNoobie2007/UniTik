/**
 * UniTik Structured Telemetry & Terminal Logger
 *
 * Provides standardized, ISO-timestamped console output for both
 * client-side error boundaries and server-side middleware execution.
 */

export type LogLevel = "INFO" | "WARN" | "ERROR" | "SECURITY";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  context: string;
  message: string;
}

function formatEntry(level: LogLevel, context: string, message: string): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    context,
    message,
  };
}

export function logInfo(message: string, context = "App", ...args: unknown[]): void {
  const entry = formatEntry("INFO", context, message);
  console.log(`[${entry.timestamp}] [${entry.level}] [${entry.context}]: ${entry.message}`, ...args);
}

export function logWarn(message: string, context = "App", ...args: unknown[]): void {
  const entry = formatEntry("WARN", context, message);
  console.warn(`[${entry.timestamp}] [${entry.level}] [${entry.context}]: ${entry.message}`, ...args);
}

export function logError(message: string, context = "API", ...args: unknown[]): void {
  const entry = formatEntry("ERROR", context, message);
  console.error(`[${entry.timestamp}] [${entry.level}] [${entry.context}]: ${entry.message}`, ...args);
}

export function logSecurity(message: string, ...args: unknown[]): void {
  const entry = formatEntry("SECURITY", "ZeroTrust", message);
  console.log(`[${entry.timestamp}] [${entry.level}] [${entry.context}]: ${entry.message}`, ...args);
}