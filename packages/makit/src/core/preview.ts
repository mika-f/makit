import { createServer, type Server } from "node:http";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sirv from "sirv";
import type { ResolvedConfig } from "../types/resolved-config.js";

export interface PreviewOptions {
  port: number;
  host: string;
}

export interface PreviewServer {
  url: string;
  close: () => Promise<void>;
}

/** Serves `outDir` as a plain static file server (spec §9.5) — no Next.js dev server involved. */
export async function startPreviewServer(
  config: ResolvedConfig,
  options: PreviewOptions,
): Promise<PreviewServer> {
  const outDirAbsolute = join(config.root, config.outDir);
  const notFoundPath = join(outDirAbsolute, "404.html");

  const serve = sirv(outDirAbsolute, {
    onNoMatch: async (_req, res) => {
      try {
        const notFoundHtml = await readFile(notFoundPath, "utf-8");
        res.statusCode = 404;
        res.setHeader("content-type", "text/html; charset=utf-8");
        res.end(notFoundHtml);
      } catch {
        res.statusCode = 404;
        res.end("404 Not Found");
      }
    },
  });

  const server: Server = createServer(serve);

  await new Promise<void>((resolvePromise, reject) => {
    server.once("error", reject);
    server.listen(options.port, options.host, () => resolvePromise());
  });

  return {
    url: `http://${options.host}:${options.port}${config.basePath}/`,
    close: () => new Promise((resolvePromise) => server.close(() => resolvePromise())),
  };
}
