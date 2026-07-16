import { CodeCopyEnhancer } from "./code-copy-enhancer.js";

export function PageContent({ html, copyButton }: { html: string; copyButton: boolean }) {
  return (
    <CodeCopyEnhancer enabled={copyButton}>
      <div
        className="prose max-w-none dark:prose-invert"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </CodeCopyEnhancer>
  );
}
