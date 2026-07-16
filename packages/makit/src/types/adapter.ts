import type { MakitConfig } from "./config.js";
import type { GeneratedPage } from "./page.js";
import type { ResolvedConfig } from "./resolved-config.js";

export type DeploymentConfigFileMode = "generated" | "merge" | "manual";

export interface DeploymentConfig {
  adapter?: DeploymentAdapter;
  configFile?: {
    mode?: DeploymentConfigFileMode;
  };
  redirects?: boolean;
  headers?: boolean;
  cleanUrls?: boolean;
  customDomain?: string;
  generateCi?: boolean;
  preview?: {
    enabled?: boolean;
  };
}

export interface ResolvedDeploymentConfig {
  adapter?: DeploymentAdapter;
  configFile: {
    mode: DeploymentConfigFileMode;
  };
  redirects: boolean;
  headers: boolean;
  cleanUrls: boolean;
  customDomain?: string;
  generateCi: boolean;
  preview: {
    enabled: boolean;
  };
}

export interface DeploymentCapabilities {
  nativeRedirects: boolean;
  conditionalRedirects: boolean;
  customHeaders: boolean;
  custom404: boolean;
  basePath: boolean;
  customDomainFile: boolean;
  generatedCi: boolean;
  edgeRuntime: boolean;
}

export interface DeploymentResolveContext {
  projectRoot: string;
  config: Readonly<MakitConfig>;
  environment: Readonly<Record<string, string | undefined>>;
}

export interface DeploymentResolvedConfig {
  basePath?: string;
  siteUrl?: string;
  trailingSlash?: boolean;
  outDir?: string;
  diagnostics?: DeploymentDiagnostic[];
}

export type ResolvedMakitConfig = ResolvedConfig;

export interface DeploymentAdapterContext {
  projectRoot: string;
  outDir: string;
  config: ResolvedMakitConfig;
  pages: GeneratedPage[];
  redirects: GeneratedRedirect[];
  headers: GeneratedHeaderRule[];
  environment: Readonly<Record<string, string | undefined>>;
}

export interface DeploymentAdapterResult {
  files: GeneratedDeploymentFile[];
  warnings: DeploymentDiagnostic[];
}

export interface DeploymentAdapter {
  readonly name: string;
  readonly version?: string;
  readonly capabilities: DeploymentCapabilities;
  resolve(context: DeploymentResolveContext): Promise<DeploymentResolvedConfig>;
  validate(context: DeploymentAdapterContext): Promise<DeploymentDiagnostic[]>;
  generate(context: DeploymentAdapterContext): Promise<DeploymentAdapterResult>;
}

export interface DeploymentAdapterFactory<TOptions> {
  (options?: TOptions): DeploymentAdapter;
}

export interface GeneratedDeploymentFile {
  path: string;
  content: string | Uint8Array;
  destination: "project-root" | "output-directory";
  overwrite: boolean;
}

export interface DeploymentDiagnostic {
  level: "info" | "warning" | "error";
  code: string;
  message: string;
  file?: string;
  details?: string;
  suggestion?: string;
}

export interface GeneratedRedirect {
  from: string;
  to: string;
  status: 301 | 302 | 307 | 308;
  conditions?: {
    language?: string[];
    country?: string[];
  };
  force?: boolean;
  source: "user" | "i18n-root" | "i18n-fallback" | "clean-url" | "migration";
}

export interface GeneratedHeaderRule {
  path: string;
  headers: Record<string, string>;
}
