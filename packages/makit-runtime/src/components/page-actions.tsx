"use client";

import { useEffect, useState, type ReactNode } from "react";

type IconName = "edit" | "top" | "copy" | "chat" | "ai" | "external";

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    edit: (
      <path d="m16.86 3.49 3.65 3.65M4 20l3.28-.66L19.77 6.85a1.83 1.83 0 0 0 0-2.59l-.03-.03a1.83 1.83 0 0 0-2.59 0L4.66 16.72 4 20Z" />
    ),
    top: <path d="m18 15-6-6-6 6M12 9v12" />,
    copy: (
      <path d="M9 8h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2ZM5 16H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    ),
    chat: (
      <path d="M21 11.5a8.38 8.38 0 0 1-9 8.5 9.5 9.5 0 0 1-4.92-1.37L3 20l1.37-4.08A8.38 8.38 0 0 1 3 11.5a8.38 8.38 0 0 1 9-8.5 8.38 8.38 0 0 1 9 8.5Z" />
    ),
    ai: (
      <path d="m12 3-1.3 5.7L5 10l5.7 1.3L12 17l1.3-5.7L19 10l-5.7-1.3L12 3Zm7 12-.7 3.3L15 19l3.3.7L19 23l.7-3.3L23 19l-3.3-.7L19 15ZM5 16l-.8 2.2L2 19l2.2.8L5 22l.8-2.2L8 19l-2.2-.8L5 16Z" />
    ),
    external: (
      <path d="M14 4h6v6m-1-5L10 14M17 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h5" />
    ),
  };

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4 shrink-0"
    >
      {paths[name]}
    </svg>
  );
}

function SimpleIcon({ slug }: { slug: "claude" | "perplexity" }) {
  const iconUrl = `https://cdn.simpleicons.org/${slug}`;
  return (
    <span
      aria-hidden="true"
      className="size-4 shrink-0"
      style={{
        backgroundColor: "currentColor",
        mask: `url(${iconUrl}) center / contain no-repeat`,
        WebkitMask: `url(${iconUrl}) center / contain no-repeat`,
      }}
    />
  );
}

function markdownPathForRoute(route: string): string {
  const pathname = route.replace(/\/+$/, "") || "/";
  return pathname === "/" ? "/index.md" : `${pathname}.md`;
}

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Clipboard permission can be unavailable on non-secure origins.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("Clipboard access was denied");
}

function chatLinks(markdownUrl: string) {
  const prompt = encodeURIComponent(
    `Read ${markdownUrl} so I can ask you questions about this page.`,
  );
  return [
    {
      label: "ChatGPT",
      icon: <Icon name="ai" />,
      href: `https://chatgpt.com/?hints=search&prompt=${prompt}`,
    },
    {
      label: "Claude",
      icon: <SimpleIcon slug="claude" />,
      href: `https://claude.ai/new?q=${prompt}`,
    },
    {
      label: "Perplexity",
      icon: <SimpleIcon slug="perplexity" />,
      href: `https://www.perplexity.ai/?q=${prompt}`,
    },
  ];
}

export interface PageActionsProps {
  route: string;
  editUrl?: string;
  markdownEnabled: boolean;
  placement?: "content" | "table-of-contents";
}

/** Page-level actions for editing, sharing the source Markdown, and asking a chat assistant about it. */
export function PageActions({
  route,
  editUrl,
  markdownEnabled,
  placement = "content",
}: PageActionsProps) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [markdownUrl, setMarkdownUrl] = useState("");
  const markdownPath = markdownPathForRoute(route);

  useEffect(() => {
    setMarkdownUrl(new URL(markdownPath, window.location.origin).toString());
  }, [markdownPath]);

  const copyMarkdown = async () => {
    try {
      const response = await fetch(markdownPath);
      if (!response.ok) throw new Error(`Could not load ${markdownPath}`);
      await copyText(await response.text());
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1500);
    } catch {
      setCopyState("error");
      window.setTimeout(() => setCopyState("idle"), 2500);
    }
  };

  if (!editUrl && !markdownEnabled) return null;

  return (
    <nav
      className={
        placement === "table-of-contents"
          ? "mt-8 flex flex-col items-start gap-3 border-t border-[var(--makit-color-border)] pt-5 text-sm text-[var(--makit-color-subtle)]"
          : "mt-10 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[var(--makit-color-border)] pt-6 text-sm"
      }
      aria-label="Page actions"
    >
      {editUrl && (
        <a
          href={editUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 font-medium transition hover:text-[var(--makit-color-foreground)]"
        >
          <Icon name="edit" />
          Edit on GitHub
          <Icon name="external" />
        </a>
      )}
      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="inline-flex cursor-pointer items-center gap-2 font-medium transition hover:text-[var(--makit-color-foreground)]"
      >
        <Icon name="top" />
        Scroll to Top
      </button>
      {markdownEnabled && (
        <>
          <button
            type="button"
            onClick={copyMarkdown}
            className="inline-flex cursor-pointer items-center gap-2 font-medium transition hover:text-[var(--makit-color-foreground)]"
          >
            <Icon name="copy" />
            {copyState === "copied"
              ? "Copied Markdown"
              : copyState === "error"
                ? "Could not copy Markdown"
                : "Copy as Markdown"}
          </button>
          <details className="relative">
            <summary className="inline-flex cursor-pointer items-center gap-2 font-medium transition hover:text-[var(--makit-color-foreground)]">
              <Icon name="chat" />
              Open in Chat
            </summary>
            <div className="absolute bottom-7 left-0 z-10 grid min-w-36 gap-1 rounded-lg border border-[var(--makit-color-border)] bg-[var(--makit-color-background)] p-2 shadow-lg">
              {chatLinks(markdownUrl || markdownPath).map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded px-2 py-1 transition hover:bg-[var(--makit-color-muted)]"
                >
                  {link.icon}
                  {link.label}
                  <Icon name="external" />
                </a>
              ))}
            </div>
          </details>
        </>
      )}
    </nav>
  );
}
