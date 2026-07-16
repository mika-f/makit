import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type {
  DeploymentAdapter,
  DeploymentDiagnostic,
  GeneratedDeploymentFile,
} from "@natsuneko-laboratory/makit/adapter";

export interface GitHubPagesOptions {
  repository?: string | "auto";
  siteType?: "project" | "user" | "organization";
  basePath?: "auto" | string;
  customDomain?: string;
  generateWorkflow?: boolean;
  workflowPath?: string;
  branch?: string;
}

function parseRepository(remote: string): string | undefined {
  const match = remote.match(/github\.com(?::|\/)([^/\s]+)\/([^/\s]+?)(?:\.git)?$/m);
  return match ? `${match[1]}/${match[2]}` : undefined;
}

async function repositoryFromGitConfig(projectRoot: string): Promise<string | undefined> {
  try {
    const config = await readFile(join(projectRoot, ".git", "config"), "utf8");
    const origin = config.match(/\[remote\s+"origin"\][\s\S]*?\n\s*url\s*=\s*(\S+)/)?.[1];
    return origin ? parseRepository(origin) : undefined;
  } catch {
    return undefined;
  }
}

function redirectPath(from: string): string {
  const clean = from.replace(/^\/+|\/+$/g, "");
  return clean ? `${clean}/index.html` : "index.html";
}

function redirectHtml(destination: string): string {
  const html = destination.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
  const js = JSON.stringify(destination).replaceAll("<", "\\u003c");
  return `<!doctype html>\n<html><head><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=${html}"><link rel="canonical" href="${html}"><script>location.replace(${js})</script><title>Redirecting…</title></head><body><a href="${html}">Continue</a></body></html>\n`;
}

function workflow(branch: string, outDir: string): string {
  return `name: Deploy Makit documentation

on:
  push:
    branches:
      - ${branch}
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: ${outDir}
  deploy:
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy
        id: deployment
        uses: actions/deploy-pages@v4
`;
}

export default function githubPages(options: GitHubPagesOptions = {}): DeploymentAdapter {
  let repository: string | undefined;
  const siteType = options.siteType ?? "project";
  return {
    name: "@natsuneko-laboratory/makit-adapter-github-pages",
    version: "0.1.0",
    capabilities: {
      nativeRedirects: false,
      conditionalRedirects: false,
      customHeaders: false,
      custom404: true,
      basePath: true,
      customDomainFile: true,
      generatedCi: true,
      edgeRuntime: false,
    },
    async resolve(context) {
      const diagnostics: DeploymentDiagnostic[] = [];
      const configuredRepository = options.repository;
      repository =
        configuredRepository && configuredRepository !== "auto"
          ? configuredRepository
          : context.environment.GITHUB_REPOSITORY ||
            (configuredRepository === "auto" || options.basePath === "auto"
              ? await repositoryFromGitConfig(context.projectRoot)
              : undefined);

      if (configuredRepository === "auto" && !repository) {
        diagnostics.push({
          level: "error",
          code: "github-pages.repository-unresolved",
          message: "Could not resolve the GitHub repository.",
          suggestion: "Set repository to owner/name or provide GITHUB_REPOSITORY.",
        });
      }

      const customDomain = options.customDomain ?? context.config.deployment?.customDomain;
      let basePath: string | undefined;
      if (customDomain || siteType !== "project") {
        if (customDomain && context.config.basePath) {
          diagnostics.push({
            level: "error",
            code: "github-pages.custom-domain-base-path",
            message: "GitHub Pages custom domains must use an empty basePath.",
          });
        }
        basePath = "";
      } else if (options.basePath === "auto") {
        if (!repository) {
          if (configuredRepository !== "auto") {
            diagnostics.push({
              level: "error",
              code: "github-pages.repository-unresolved",
              message: "Could not resolve the GitHub repository required for basePath: auto.",
              suggestion: "Set repository to owner/name or provide GITHUB_REPOSITORY.",
            });
          }
        } else {
          basePath = `/${repository.split("/")[1]}`;
          if (context.config.basePath && context.config.basePath !== basePath) {
            diagnostics.push({
              level: "error",
              code: "github-pages.base-path-conflict",
              message: `Configured basePath ${context.config.basePath} conflicts with the resolved project Pages basePath ${basePath}.`,
            });
          }
        }
      } else if (options.basePath !== undefined) {
        basePath = options.basePath;
      }

      let siteUrl: string | undefined;
      if (customDomain) {
        siteUrl = `https://${customDomain}`;
        if (context.config.siteUrl && context.config.siteUrl !== siteUrl) {
          diagnostics.push({
            level: "error",
            code: "github-pages.site-url-conflict",
            message: `Configured siteUrl ${context.config.siteUrl} conflicts with custom domain ${customDomain}.`,
          });
        }
      } else if (repository) {
        const owner = repository.split("/")[0];
        siteUrl = `https://${owner}.github.io${basePath ?? context.config.basePath ?? ""}`;
      }
      return { basePath, siteUrl, diagnostics };
    },
    async validate(context) {
      const diagnostics: DeploymentDiagnostic[] = [];
      if (context.headers.length > 0) {
        diagnostics.push({
          level: "warning",
          code: "github-pages.unsupported-headers",
          message: "GitHub Pages does not support custom response headers.",
          suggestion: "Remove the header rules or use another deployment adapter.",
        });
      }
      for (const redirect of context.redirects) {
        if (redirect.conditions) {
          diagnostics.push({
            level: "warning",
            code: "github-pages.unsupported-redirect-conditions",
            message: `Conditional redirect ${redirect.from} will be emitted as an unconditional HTML redirect.`,
          });
        }
      }
      const customDomain = options.customDomain ?? context.config.deployment.customDomain;
      if (customDomain && context.config.basePath) {
        diagnostics.push({
          level: "error",
          code: "github-pages.custom-domain-base-path",
          message: "GitHub Pages custom domains must use an empty basePath.",
        });
      }
      return diagnostics;
    },
    async generate(context) {
      const files: GeneratedDeploymentFile[] = [
        {
          path: ".nojekyll",
          content: "",
          destination: "output-directory",
          overwrite: true,
        },
        ...context.redirects.map((redirect) => ({
          path: redirectPath(redirect.from),
          content: redirectHtml(redirect.to),
          destination: "output-directory" as const,
          overwrite: true,
        })),
      ];
      const customDomain = options.customDomain ?? context.config.deployment.customDomain;
      if (customDomain) {
        files.push({
          path: "CNAME",
          content: `${customDomain}\n`,
          destination: "output-directory",
          overwrite: true,
        });
      }
      if (options.generateWorkflow ?? context.config.deployment.generateCi) {
        files.push({
          path: options.workflowPath ?? ".github/workflows/deploy-makit.yml",
          content: workflow(options.branch ?? "main", context.config.outDir),
          destination: "project-root",
          overwrite: true,
        });
      }
      return { files, warnings: [] };
    },
  };
}
