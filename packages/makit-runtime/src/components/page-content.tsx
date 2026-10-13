import { CodeCopyEnhancer } from "./code-copy-enhancer.js";
import { TabsEnhancer } from "./tabs-enhancer.js";

export interface PageContentProps {
  html: string;
  copyButton: boolean;
}

export function PageContent({ html, copyButton }: PageContentProps) {
  return (
    <CodeCopyEnhancer enabled={copyButton}>
      <TabsEnhancer html={html} />
    </CodeCopyEnhancer>
  );
}
