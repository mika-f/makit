/** CI-friendly exit codes shared by every CLI command. */
export const EXIT_CODE = {
  SUCCESS: 0,
  ERROR: 1,
  VALIDATION_FAILED: 2,
} as const;

export type ExitCode = (typeof EXIT_CODE)[keyof typeof EXIT_CODE];
