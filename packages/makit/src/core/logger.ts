import pc from "picocolors";

export type LogFormat = "pretty" | "json";

export interface LoggerOptions {
  format?: LogFormat;
  verbose?: boolean;
  silent?: boolean;
}

export interface Logger {
  /** Informational line. Suppressed by `--silent`. */
  info(message: string): void;
  /** A completed step, prefixed with a checkmark in pretty mode. Suppressed by `--silent`. */
  success(message: string): void;
  /** A recoverable problem (spec §31.2). Suppressed by `--silent`. */
  warn(message: string, code?: string): void;
  /** A fatal problem (spec §31.1). Always shown, even with `--silent`. */
  error(message: string, code?: string): void;
  /** Extra detail, only shown with `--verbose`. */
  debug(message: string): void;
  /** Unprefixed output line (e.g. build summary). Suppressed by `--silent`. */
  raw(message: string): void;
}

function jsonLine(level: string, message: string, code?: string): string {
  return JSON.stringify({
    level,
    message,
    ...(code ? { code } : {}),
    timestamp: new Date().toISOString(),
  });
}

export function createLogger(options: LoggerOptions = {}): Logger {
  const format = options.format ?? "pretty";
  const verbose = options.verbose ?? false;
  const silent = options.silent ?? false;

  const stdout = (line: string) => process.stdout.write(`${line}\n`);
  const stderr = (line: string) => process.stderr.write(`${line}\n`);

  return {
    info(message) {
      if (silent) return;
      stdout(format === "json" ? jsonLine("info", message) : message);
    },
    success(message) {
      if (silent) return;
      stdout(format === "json" ? jsonLine("success", message) : `${pc.green("✓")} ${message}`);
    },
    warn(message, code) {
      if (silent) return;
      stderr(format === "json" ? jsonLine("warn", message, code) : `${pc.yellow("⚠")} ${message}`);
    },
    error(message, code) {
      stderr(format === "json" ? jsonLine("error", message, code) : `${pc.red("✗")} ${message}`);
    },
    debug(message) {
      if (!verbose || silent) return;
      stdout(format === "json" ? jsonLine("debug", message) : pc.dim(message));
    },
    raw(message) {
      if (silent) return;
      stdout(message);
    },
  };
}
