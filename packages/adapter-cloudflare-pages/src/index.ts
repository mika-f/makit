import type {
  DeploymentAdapter,
  DeploymentDiagnostic,
  GeneratedDeploymentFile,
  GeneratedHeaderRule,
  GeneratedRedirect,
} from "@natsuneko-laboratory/makit/adapter";

export interface CloudflarePagesOptions {
  projectName?: string;
  generateWranglerConfig?: boolean;
  redirects?: { mode?: "native" | "html" };
  headers?: { enabled?: boolean };
}

function redirectLines(redirects: GeneratedRedirect[]): string {
  return `${redirects.map((rule) => `${rule.from} ${rule.to} ${rule.status}`).join("\n")}\n`;
}

function headerLines(rules: GeneratedHeaderRule[]): string {
  return `${rules
    .map(
      (rule) =>
        `${rule.path}\n${Object.entries(rule.headers)
          .map(([name, value]) => `  ${name}: ${value}`)
          .join("\n")}`,
    )
    .join("\n\n")}\n`;
}

function redirectHtml(destination: string): string {
  const escaped = destination.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
  return `<!doctype html>\n<meta charset="utf-8">\n<meta http-equiv="refresh" content="0; url=${escaped}">\n<link rel="canonical" href="${escaped}">\n<title>Redirecting…</title>\n<p><a href="${escaped}">Continue</a></p>\n`;
}

function redirectPath(from: string): string {
  const clean = from.replace(/^\/+|\/+$/g, "");
  return clean ? `${clean}/index.html` : "index.html";
}

export default function cloudflarePages(options: CloudflarePagesOptions = {}): DeploymentAdapter {
  const redirectMode = options.redirects?.mode ?? "native";
  const headersEnabled = options.headers?.enabled ?? true;
  return {
    name: "@natsuneko-laboratory/makit-adapter-cloudflare-pages",
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
      return {};
    },
    async validate(context) {
      const diagnostics: DeploymentDiagnostic[] = [];
      for (const redirect of context.redirects) {
        if (redirect.conditions?.country?.length) {
          diagnostics.push({
            level: "warning",
            code: "cloudflare-pages.unsupported-country-condition",
            message: `Country conditions on ${redirect.from} cannot be represented in a Pages _redirects file.`,
          });
        }
      }
      return diagnostics;
    },
    async generate(context) {
      const files: GeneratedDeploymentFile[] = [];
      if (context.redirects.length > 0) {
        if (redirectMode === "native") {
          files.push({
            path: "_redirects",
            content: redirectLines(context.redirects),
            destination: "output-directory",
            overwrite: true,
          });
        } else {
          files.push(
            ...context.redirects.map((redirect) => ({
              path: redirectPath(redirect.from),
              content: redirectHtml(redirect.to),
              destination: "output-directory" as const,
              overwrite: true,
            })),
          );
        }
      }
      if (headersEnabled && context.headers.length > 0) {
        files.push({
          path: "_headers",
          content: headerLines(context.headers),
          destination: "output-directory",
          overwrite: true,
        });
      }
      if (options.generateWranglerConfig) {
        files.push({
          path: "wrangler.jsonc",
          content: `${JSON.stringify(
            {
              name: options.projectName,
              pages_build_output_dir: context.config.outDir,
              compatibility_date: "2026-01-01",
            },
            null,
            2,
          )}\n`,
          destination: "project-root",
          overwrite: true,
        });
      }
      return { files, warnings: [] };
    },
  };
}
