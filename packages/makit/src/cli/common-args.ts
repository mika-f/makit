import type { ArgsDef } from "citty";

/** Options shared by every `makit` subcommand (spec §9.1). */
export const commonArgs = {
  config: {
    type: "string",
    description: "Path to the Makit config file",
  },
  cwd: {
    type: "string",
    description: "Project root directory",
  },
  verbose: {
    type: "boolean",
    description: "Show verbose logs",
    default: false,
  },
  silent: {
    type: "boolean",
    description: "Only show errors",
    default: false,
  },
  "log-format": {
    type: "string",
    description: "Log output format: pretty | json",
    default: "pretty",
  },
} satisfies ArgsDef;

export type CommonArgs = {
  config?: string;
  cwd?: string;
  verbose?: boolean;
  silent?: boolean;
  "log-format"?: string;
};
