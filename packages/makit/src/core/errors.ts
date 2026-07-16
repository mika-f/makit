import { z } from "zod";

/**
 * Stable error codes. Errors always stop the pipeline (spec §31.1);
 * warnings are handled separately via `MakitWarningCode` and may be
 * promoted to errors through `validation.failOn` / `validation.strict`.
 */
export type MakitErrorCode =
  | "config-not-found"
  | "config-ambiguous"
  | "config-load-failed"
  | "config-invalid"
  | "default-locale-not-found"
  | "duplicate-locale"
  | "duplicate-route"
  | "duplicate-page-id"
  | "frontmatter-parse-failed"
  | "markdown-processing-failed"
  | "missing-navigation-target"
  | "next-build-failed"
  | "output-write-failed"
  | "project-exists"
  | "not-implemented";

export class MakitError extends Error {
  readonly code: MakitErrorCode;

  constructor(code: MakitErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.code = code;
    this.name = "MakitError";
  }
}

export class MakitConfigError extends MakitError {
  constructor(message: string, options?: { cause?: unknown }) {
    super("config-invalid", message, options);
    this.name = "MakitConfigError";
  }

  static fromZodError(error: z.ZodError, source: string): MakitConfigError {
    const details = z.prettifyError(error);
    return new MakitConfigError(`Invalid configuration in ${source}:\n${details}`, {
      cause: error,
    });
  }
}
