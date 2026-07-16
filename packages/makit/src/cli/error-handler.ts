import { EXIT_CODE } from "../core/exit-code.js";
import { MakitError } from "../core/errors.js";
import type { Logger } from "../core/logger.js";

export function handleCliError(error: unknown, logger: Logger): void {
  if (error instanceof MakitError) {
    logger.error(error.message, error.code);
    if (error.cause) {
      logger.debug(
        error.cause instanceof Error
          ? (error.cause.stack ?? String(error.cause))
          : String(error.cause),
      );
    }
    process.exitCode = EXIT_CODE.ERROR;
    return;
  }
  const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
  logger.error(message);
  process.exitCode = EXIT_CODE.ERROR;
}
