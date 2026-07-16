import { spawn } from "node:child_process";

/** Opens `url` in the user's default browser, best-effort (no-op on failure). */
export function openBrowser(url: string): void {
  const platform = process.platform;
  const command = platform === "darwin" ? "open" : platform === "win32" ? "start" : "xdg-open";
  const args = platform === "win32" ? ["", url] : [url];

  try {
    spawn(command, args, { shell: platform === "win32", stdio: "ignore", detached: true }).unref();
  } catch {
    // Best-effort only — failing to open a browser window isn't fatal.
  }
}
