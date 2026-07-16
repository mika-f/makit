import { resolve as resolvePath } from "node:path";
import type { Logger, LogFormat } from "../core/logger.js";
import { createLogger } from "../core/logger.js";
import type { CommonArgs } from "./common-args.js";

export interface CliContext {
  cwd: string;
  configPath?: string;
  logger: Logger;
}

function resolveLogFormat(value: string | undefined, logger: Logger): LogFormat {
  if (value === "pretty" || value === "json") return value;
  if (value !== undefined) {
    logger.warn(`Unknown --log-format "${value}", falling back to "pretty".`);
  }
  return "pretty";
}

export function createCliContext(args: CommonArgs): CliContext {
  // Resolve the format/verbosity first so the fallback warning above can use it.
  const bootstrapLogger = createLogger({ verbose: args.verbose, silent: args.silent });
  const format = resolveLogFormat(args["log-format"], bootstrapLogger);

  return {
    cwd: args.cwd ? resolvePath(args.cwd) : process.cwd(),
    configPath: args.config,
    logger: createLogger({ format, verbose: args.verbose, silent: args.silent }),
  };
}
