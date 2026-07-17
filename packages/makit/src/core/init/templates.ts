export function makitConfigTemplate(title: string, lang: string): string {
  return `import { defineConfig } from "@natsuneko-laboratory/makit";

export default defineConfig({
  title: ${JSON.stringify(title)},
  lang: ${JSON.stringify(lang)},
  sourceDir: "docs",
  publicDir: "public",
  outDir: "dist",
});
`;
}

export function indexMarkdownTemplate(title: string): string {
  return `# ${title}

Welcome to your new Makit documentation site. Edit this file at \`docs/index.md\`
and run \`makit dev\` to see your changes live.
`;
}

export function indexMetaTemplate(title: string): string {
  return `import { definePageMetadata } from "@natsuneko-laboratory/makit/metadata";

export default definePageMetadata({
  id: "index",
  title: ${JSON.stringify(title)},
});
`;
}

const GITIGNORE_ENTRIES = ["node_modules/", ".makit/", "dist/"];

export function gitignoreTemplate(): string {
  return `${GITIGNORE_ENTRIES.join("\n")}\n`;
}

/** Entries `makit init` ensures are present in an existing `.gitignore`. */
export function gitignoreRequiredEntries(): readonly string[] {
  return GITIGNORE_ENTRIES;
}

export function packageJsonTemplate(projectName: string, makitVersion: string): string {
  const pkg = {
    name: projectName,
    private: true,
    type: "module",
    scripts: {
      dev: "makit dev",
      build: "makit build",
      preview: "makit preview",
    },
    devDependencies: {
      "@natsuneko-laboratory/makit": `^${makitVersion}`,
    },
  };
  return `${JSON.stringify(pkg, null, 2)}\n`;
}
