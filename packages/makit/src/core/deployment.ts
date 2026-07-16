import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { normalizeBasePath } from "../config/normalize.js";
import type {
  DeploymentAdapter,
  DeploymentAdapterContext,
  DeploymentDiagnostic,
  GeneratedDeploymentFile,
  GeneratedHeaderRule,
  GeneratedRedirect,
} from "../types/adapter.js";
import type { MakitConfig } from "../types/config.js";
import type { GeneratedPage } from "../types/page.js";
import type { ResolvedConfig } from "../types/resolved-config.js";
import { MakitError } from "./errors.js";

const STANDARD_HEADERS: GeneratedHeaderRule = {
  path: "/*",
  headers: {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
  },
};

export interface DeploymentModels {
  redirects: GeneratedRedirect[];
  headers: GeneratedHeaderRule[];
}

export interface DeploymentRunResult {
  files: GeneratedDeploymentFile[];
  diagnostics: DeploymentDiagnostic[];
  models: DeploymentModels;
}

export interface PreparedDeployment {
  context?: DeploymentAdapterContext;
  diagnostics: DeploymentDiagnostic[];
  models: DeploymentModels;
}

export interface WriteDeploymentOptions {
  check?: boolean;
  dryRun?: boolean;
  force?: boolean;
}

export interface WriteDeploymentResult {
  changed: string[];
  unchanged: string[];
  skipped: string[];
}

export function isDeploymentAdapter(value: unknown): value is DeploymentAdapter {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<DeploymentAdapter>;
  const capabilities = candidate.capabilities;
  return (
    typeof candidate.name === "string" &&
    candidate.name.length > 0 &&
    typeof candidate.resolve === "function" &&
    typeof candidate.validate === "function" &&
    typeof candidate.generate === "function" &&
    !!capabilities &&
    typeof capabilities === "object" &&
    [
      "nativeRedirects",
      "conditionalRedirects",
      "customHeaders",
      "custom404",
      "basePath",
      "customDomainFile",
      "generatedCi",
      "edgeRuntime",
    ].every((key) => typeof capabilities[key as keyof typeof capabilities] === "boolean")
  );
}

function throwForErrors(diagnostics: DeploymentDiagnostic[]): void {
  const errors = diagnostics.filter((diagnostic) => diagnostic.level === "error");
  if (errors.length === 0) return;
  throw new MakitError(
    "adapter-validation-failed",
    errors.map((diagnostic) => `[${diagnostic.code}] ${diagnostic.message}`).join("\n"),
  );
}

export async function resolveDeployment(
  config: ResolvedConfig,
  environment: Readonly<Record<string, string | undefined>> = process.env,
): Promise<ResolvedConfig> {
  const adapter = config.deployment.adapter;
  if (!adapter) return config;
  if (!isDeploymentAdapter(adapter)) {
    throw new MakitError(
      "adapter-invalid",
      "deployment.adapter must be a DeploymentAdapter returned by an adapter factory.",
    );
  }

  const resolved = await adapter.resolve({
    projectRoot: config.root,
    config: config as MakitConfig,
    environment,
  });
  throwForErrors(resolved.diagnostics ?? []);

  return {
    ...config,
    basePath:
      resolved.basePath === undefined ? config.basePath : normalizeBasePath(resolved.basePath),
    siteUrl: resolved.siteUrl ?? config.siteUrl,
    outDir: resolved.outDir ?? config.outDir,
    build: {
      ...config.build,
      trailingSlash: resolved.trailingSlash ?? config.build.trailingSlash,
    },
  };
}

export function createDeploymentModels(config: ResolvedConfig): DeploymentModels {
  const redirects = [...config.redirects];
  if (config.i18n.enabled && config.i18n.root.behavior === "default") {
    const locale = config.i18n.locales.find(
      (entry) => entry.locale === (config.i18n.root.locale ?? config.i18n.defaultLocale),
    );
    if (locale && !redirects.some((redirect) => redirect.from === "/")) {
      redirects.unshift({
        from: "/",
        to: `${config.basePath}/${locale.urlLocale}/`.replace(/\/+/g, "/"),
        status: 302,
        force: true,
        source: "i18n-root",
      });
    }
  }

  const headers = config.deployment.headers
    ? mergeHeaderRules([STANDARD_HEADERS, ...config.headers])
    : mergeHeaderRules(config.headers);
  return {
    redirects: config.deployment.redirects ? redirects : [],
    headers,
  };
}

function mergeHeaderRules(rules: GeneratedHeaderRule[]): GeneratedHeaderRule[] {
  const merged = new Map<string, Record<string, string>>();
  for (const rule of rules) {
    merged.set(rule.path, { ...merged.get(rule.path), ...rule.headers });
  }
  return [...merged].map(([path, headers]) => ({ path, headers }));
}

export function validateDeploymentModels(models: DeploymentModels): DeploymentDiagnostic[] {
  const diagnostics: DeploymentDiagnostic[] = [];
  const redirectsByFrom = new Map<string, GeneratedRedirect>();
  for (const redirect of models.redirects) {
    const existing = redirectsByFrom.get(redirect.from);
    if (existing) {
      diagnostics.push({
        level: "error",
        code: "deployment.duplicate-redirect",
        message: `Multiple redirects use the same source path: ${redirect.from}`,
      });
    } else {
      redirectsByFrom.set(redirect.from, redirect);
    }
  }
  for (const redirect of models.redirects) {
    const visited = new Set<string>([redirect.from]);
    let next = redirect;
    while (redirectsByFrom.has(next.to)) {
      if (visited.has(next.to)) {
        diagnostics.push({
          level: "error",
          code: "deployment.redirect-cycle",
          message: `Redirect cycle detected from ${redirect.from}.`,
        });
        break;
      }
      visited.add(next.to);
      next = redirectsByFrom.get(next.to)!;
    }
  }
  return diagnostics;
}

export async function prepareDeploymentAdapter(
  config: ResolvedConfig,
  pages: GeneratedPage[],
  environment: Readonly<Record<string, string | undefined>> = process.env,
): Promise<PreparedDeployment> {
  const adapter = config.deployment.adapter;
  const models = createDeploymentModels(config);
  if (!adapter) return { diagnostics: [], models };

  const context: DeploymentAdapterContext = {
    projectRoot: config.root,
    outDir: resolve(config.root, config.outDir),
    config,
    pages,
    ...models,
    environment,
  };
  const diagnostics = [...validateDeploymentModels(models), ...(await adapter.validate(context))];
  throwForErrors(diagnostics);
  return { context, diagnostics, models };
}

export async function generateDeploymentAdapter(
  config: ResolvedConfig,
  prepared: PreparedDeployment,
): Promise<DeploymentRunResult> {
  const adapter = config.deployment.adapter;
  if (!adapter || !prepared.context) {
    return { files: [], diagnostics: prepared.diagnostics, models: prepared.models };
  }
  const result = await adapter.generate(prepared.context);
  const allDiagnostics = [...prepared.diagnostics, ...result.warnings];
  throwForErrors(allDiagnostics);
  return { files: result.files, diagnostics: allDiagnostics, models: prepared.models };
}

export async function runDeploymentAdapter(
  config: ResolvedConfig,
  pages: GeneratedPage[],
  environment: Readonly<Record<string, string | undefined>> = process.env,
): Promise<DeploymentRunResult> {
  const prepared = await prepareDeploymentAdapter(config, pages, environment);
  return generateDeploymentAdapter(config, prepared);
}

function contentBuffer(content: string | Uint8Array): Buffer {
  return typeof content === "string" ? Buffer.from(content, "utf8") : Buffer.from(content);
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function destinationPath(config: ResolvedConfig, file: GeneratedDeploymentFile): string {
  if (isAbsolute(file.path)) {
    throw new MakitError(
      "adapter-invalid-file",
      `Adapter generated an absolute path: ${file.path}`,
    );
  }
  const root =
    file.destination === "project-root" ? config.root : resolve(config.root, config.outDir);
  const target = resolve(root, file.path);
  if (relative(root, target).startsWith("..")) {
    throw new MakitError(
      "adapter-invalid-file",
      `Adapter generated a path outside ${file.destination}: ${file.path}`,
    );
  }
  return target;
}

export async function writeDeploymentFiles(
  config: ResolvedConfig,
  files: GeneratedDeploymentFile[],
  options: WriteDeploymentOptions = {},
): Promise<WriteDeploymentResult> {
  const result: WriteDeploymentResult = { changed: [], unchanged: [], skipped: [] };
  const mode = config.deployment.configFile.mode;

  for (const file of files) {
    const target = destinationPath(config, file);
    const displayPath = relative(config.root, target) || file.path;
    if (mode === "manual") {
      result.skipped.push(displayPath);
      continue;
    }

    const expected = contentBuffer(file.content);
    const exists = await fileExists(target);
    const actual = exists ? await readFile(target) : undefined;
    if (actual?.equals(expected)) {
      result.unchanged.push(displayPath);
      continue;
    }

    result.changed.push(displayPath);
    if (options.check || options.dryRun) continue;
    if (exists && !file.overwrite && !options.force) {
      throw new MakitError(
        "adapter-file-conflict",
        `Refusing to overwrite ${displayPath}. Re-run with --force or manage it manually.`,
      );
    }
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, expected);
  }
  return result;
}
