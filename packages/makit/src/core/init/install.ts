import { spawn } from "node:child_process";
import type { Logger } from "../logger.js";

export type PackageManager = "npm" | "pnpm" | "yarn" | "bun";

const PACKAGE_MANAGERS: readonly PackageManager[] = ["npm", "pnpm", "yarn", "bun"];

export function resolvePackageManager(value: string | undefined, logger: Logger): PackageManager {
  if (value === undefined) return "npm";
  if ((PACKAGE_MANAGERS as readonly string[]).includes(value)) return value as PackageManager;
  logger.warn(`Unknown --package-manager "${value}", falling back to "npm".`);
  return "npm";
}

export function installDependencies(cwd: string, packageManager: PackageManager): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(packageManager, ["install"], {
      cwd,
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`"${packageManager} install" exited with code ${code}`));
    });
  });
}
