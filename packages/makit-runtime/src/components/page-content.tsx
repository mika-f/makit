import { CodeCopyEnhancer } from "./code-copy-enhancer.js";

export interface PageContentProps {
  html: string;
  copyButton: boolean;
}

export function PageContent({ html, copyButton }: PageContentProps) {
  return (
    <CodeCopyEnhancer enabled={copyButton}>
      <div className="makit-prose prose max-w-none" dangerouslySetInnerHTML={{ __html: html }} />
    </CodeCopyEnhancer>
  );
}
