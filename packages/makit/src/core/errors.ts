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
  | "duplicate-collection-id"
  | "duplicate-collection-path"
  | "front-matter-not-supported"
  | "front-matter-conflicts-with-metadata"
  | "metadata-eval-failed"
  | "metadata-missing-default-export"
  | "metadata-wrong-define-function"
  | "metadata-async"
  | "metadata-not-serializable"
  | "metadata-circular-reference"
  | "markdown-processing-failed"
  | "missing-navigation-target"
  | "navigation-source-conflict"
  | "navigation-circular"
  | "missing-primary-position"
  | "home-page-not-found"
  | "ambiguous-home-page"
  | "home-root-conflict"
  | "unknown-home-collection"
  | "next-build-failed"
  | "adapter-invalid"
  | "adapter-validation-failed"
  | "adapter-invalid-file"
  | "adapter-file-conflict"
  | "adapter-not-configured"
  | "adapter-files-outdated"
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
    return new MakitConfigError(`Invalid configuration in ${source}:\n${formatZodError(error)}`, {
      cause: error,
    });
  }
}

export function formatZodError(error: z.ZodError): string {
  return z.prettifyError(error);
}
