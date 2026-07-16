import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { DeploymentAdapter, DeploymentDiagnostic } from "makit/adapter";

export interface VercelOptions {
  generateConfig?: boolean;
  configPath?: string;
  cleanUrls?: boolean;
  trailingSlash?: boolean;
}

interface VercelConfig {
  [key: string]: unknown;
}

async function existingJson(path: string): Promise<VercelConfig> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as VercelConfig;
  } catch {
    return {};
  }
}

function sourcePath(path: string): string {
  if (path === "/*") return "/(.*)";
  return path.replaceAll("*", "(.*)");
}

export default function vercel(options: VercelOptions = {}): DeploymentAdapter {
  const generateConfig = options.generateConfig ?? true;
  const configPath = options.configPath ?? "vercel.json";
  return {
    name: "@makit/adapter-vercel",
    version: "0.1.0",
    capabilities: {
      nativeRedirects: true,
      conditionalRedirects: true,
      customHeaders: true,
      custom404: true,
      basePath: false,
      customDomainFile: false,
      generatedCi: false,
      edgeRuntime: false,
    },
    async resolve() {
      return { trailingSlash: options.trailingSlash };
    },
    async validate(context) {
      const diagnostics: DeploymentDiagnostic[] = [];
      for (const redirect of context.redirects) {
        if (redirect.status === 301 || redirect.status === 302) {
          diagnostics.push({
            level: "warning",
            code: "vercel.redirect-status-converted",
            message: `Vercel represents redirect ${redirect.from} with ${redirect.status === 301 ? 308 : 307} semantics.`,
          });
        }
        if (redirect.conditions?.country?.length) {
          diagnostics.push({
            level: "warning",
            code: "vercel.redirect-condition-omitted",
            message: `Country condition on redirect ${redirect.from} cannot be represented in vercel.json.`,
          });
        }
      }
      return diagnostics;
    },
    async generate(context) {
      if (!generateConfig) return { files: [], warnings: [] };
      const generated: VercelConfig = {
        $schema: "https://openapi.vercel.sh/vercel.json",
        buildCommand: "npm run build",
        outputDirectory: context.config.outDir,
        framework: null,
        cleanUrls: options.cleanUrls ?? context.config.deployment.cleanUrls,
        trailingSlash: options.trailingSlash ?? context.config.build.trailingSlash,
      };
      if (context.redirects.length) {
        generated.redirects = context.redirects.map((redirect) => ({
          source: redirect.from,
          destination: redirect.to,
          permanent: redirect.status === 301 || redirect.status === 308,
        }));
      }
      if (context.headers.length) {
        generated.headers = context.headers.map((rule) => ({
          source: sourcePath(rule.path),
          headers: Object.entries(rule.headers).map(([key, value]) => ({ key, value })),
        }));
      }
      const config =
        context.config.deployment.configFile.mode === "merge"
          ? { ...(await existingJson(join(context.projectRoot, configPath))), ...generated }
          : generated;
      return {
        files: [
          {
            path: configPath,
            content: `${JSON.stringify(config, null, 2)}\n`,
            destination: "project-root",
            overwrite: true,
          },
        ],
        warnings: [],
      };
    },
  };
}
