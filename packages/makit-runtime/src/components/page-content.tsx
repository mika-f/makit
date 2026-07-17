import { CodeCopyEnhancer } from "./code-copy-enhancer.js";

export function PageContent({ html, copyButton }: { html: string; copyButton: boolean }) {
  return (
    <CodeCopyEnhancer enabled={copyButton}>
      <div className="makit-prose prose max-w-none" dangerouslySetInnerHTML={{ __html: html }} />
    </CodeCopyEnhancer>
  );
}
