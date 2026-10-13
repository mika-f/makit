export interface MarkdownNode {
  type: string;
  name?: string;
  value?: string;
  attributes?: Record<string, string | null | undefined>;
  children?: MarkdownNode[];
  position?: { start: { offset?: number }; end: { offset?: number } };
  data?: Record<string, unknown>;
}

function text(node: MarkdownNode): string {
  return node.value ?? node.children?.map(text).join("") ?? "";
}

export function directiveLabel(node: MarkdownNode): string {
  const first = node.children?.[0];
  return first?.data?.directiveLabel ? text(first).trim() : "";
}

export function directiveBody(node: MarkdownNode): MarkdownNode[] {
  const children = node.children ?? [];
  return children[0]?.data?.directiveLabel ? children.slice(1) : children;
}
