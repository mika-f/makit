import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type {
  DeploymentAdapter,
  GeneratedHeaderRule,
  GeneratedRedirect,
} from "@natsuneko-laboratory/makit/adapter";

export interface NetlifyOptions {
  generateConfig?: boolean;
  configPath?: string;
  redirects?: { format?: "toml" | "file" };
  headers?: { format?: "toml" | "file" };
  prettyUrls?: boolean;
  i18nRouting?: "client" | "native";
}

const quote = (value: string): string => JSON.stringify(value);

function redirectsFile(redirects: GeneratedRedirect[]): string {
  return `${redirects
    .map((rule) => {
      const conditions = [
        rule.conditions?.language?.length
          ? `Language=${rule.conditions.language.join(",")}`
          : undefined,
        rule.conditions?.country?.length
          ? `Country=${rule.conditions.country.join(",")}`
          : undefined,
      ].filter(Boolean);
      return `${rule.from} ${rule.to} ${rule.status}${rule.force ? "!" : ""}${conditions.length ? ` ${conditions.join(" ")}` : ""}`;
    })
    .join("\n")}\n`;
}

function headersFile(rules: GeneratedHeaderRule[]): string {
  return `${rules
    .map(
      (rule) =>
        `${rule.path}\n${Object.entries(rule.headers)
          .map(([key, value]) => `  ${key}: ${value}`)
          .join("\n")}`,
    )
    .join("\n\n")}\n`;
}

function redirectToml(rule: GeneratedRedirect): string {
  const lines = [
    "[[redirects]]",
    `from = ${quote(rule.from)}`,
    `to = ${quote(rule.to)}`,
    `status = ${rule.status}`,
    `force = ${rule.force ?? false}`,
  ];
  const conditions = [
    rule.conditions?.language?.length
      ? `Language = ${quote(rule.conditions.language.join(","))}`
      : undefined,
    rule.conditions?.country?.length
      ? `Country = ${quote(rule.conditions.country.join(","))}`
      : undefined,
  ].filter((condition): condition is string => !!condition);
  if (conditions.length) {
    lines.push(`conditions = { ${conditions.join(", ")} }`);
  }
  return lines.join("\n");
}

function headerToml(rule: GeneratedHeaderRule): string {
  return `[[headers]]\nfor = ${quote(rule.path)}\n\n[headers.values]\n${Object.entries(rule.headers)
    .map(([key, value]) => `${key} = ${quote(value)}`)
    .join("\n")}`;
}

function generatedToml(
  outDir: string,
  redirects: GeneratedRedirect[],
  headers: GeneratedHeaderRule[],
  includeBuild = true,
): string {
  return `${includeBuild ? `[build]\ncommand = "npm run build"\npublish = ${quote(outDir)}\n` : ""}${
    redirects.length ? `\n${redirects.map(redirectToml).join("\n\n")}\n` : ""
  }${headers.length ? `\n${headers.map(headerToml).join("\n\n")}\n` : ""}`;
}

async function mergeToml(path: string, managed: string, outDir: string): Promise<string> {
  let existing = "";
  try {
    existing = await readFile(path, "utf8");
  } catch {
    return `${generatedToml(outDir, [], [], true)}${managed}`;
  }
  existing = existing.replace(/\n?# makit:start[\s\S]*?# makit:end\n?/g, "\n").trimEnd();
  const hasBuild = /^\[build\]\s*$/m.test(existing);
  if (hasBuild) {
    const section = /(^\[build\]\s*$)([\s\S]*?)(?=^\[|(?![\s\S]))/m;
    existing = existing.replace(section, (_all, heading: string, body: string) => {
      const withoutManaged = body
        .replace(/^\s*command\s*=.*$/m, "")
        .replace(/^\s*publish\s*=.*$/m, "")
        .trim();
      return `${heading}\ncommand = "npm run build"\npublish = ${quote(outDir)}${withoutManaged ? `\n${withoutManaged}` : ""}\n\n`;
    });
  }
  const block = generatedToml(outDir, [], [], !hasBuild) + managed;
  return `${existing}${existing ? "\n\n" : ""}# makit:start\n${block.trim()}\n# makit:end\n`;
}

export default function netlify(options: NetlifyOptions = {}): DeploymentAdapter {
  const redirectFormat = options.redirects?.format ?? "toml";
  const headerFormat = options.headers?.format ?? "toml";
  const generateConfig = options.generateConfig ?? true;
  const configPath = options.configPath ?? "netlify.toml";
  return {
    name: "@natsuneko-laboratory/makit-adapter-netlify",
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
      if ((options.i18nRouting ?? "client") === "client") {
        return context.redirects
          .filter((redirect) => redirect.conditions?.language?.length)
          .map((redirect) => ({
            level: "warning" as const,
            code: "netlify.client-i18n-condition",
            message: `Language condition on ${redirect.from} is omitted while i18nRouting is client.`,
          }));
      }
      return [];
    },
    async generate(context) {
      const nativeRedirects =
        (options.i18nRouting ?? "client") === "native"
          ? context.redirects
          : context.redirects.map(({ conditions, ...redirect }) => ({
              ...redirect,
              conditions: conditions?.country ? { country: conditions.country } : undefined,
            }));
      const files = [];
      if (redirectFormat === "file" && nativeRedirects.length) {
        files.push({
          path: "_redirects",
          content: redirectsFile(nativeRedirects),
          destination: "output-directory" as const,
          overwrite: true,
        });
      }
      if (headerFormat === "file" && context.headers.length) {
        files.push({
          path: "_headers",
          content: headersFile(context.headers),
          destination: "output-directory" as const,
          overwrite: true,
        });
      }
      if (generateConfig) {
        const managed = generatedToml(
          context.config.outDir,
          redirectFormat === "toml" ? nativeRedirects : [],
          headerFormat === "toml" ? context.headers : [],
          context.config.deployment.configFile.mode !== "merge",
        );
        const content =
          context.config.deployment.configFile.mode === "merge"
            ? await mergeToml(join(context.projectRoot, configPath), managed, context.config.outDir)
            : managed;
        files.push({
          path: configPath,
          content,
          destination: "project-root" as const,
          overwrite: true,
        });
      }
      return { files, warnings: [] };
    },
  };
}
