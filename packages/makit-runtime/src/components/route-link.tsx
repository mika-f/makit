import Link from "next/link";
import type { ComponentProps } from "react";
import { toLinkHref } from "../navigation/route-href.js";

export type RouteLinkProps = Omit<ComponentProps<typeof Link>, "href"> & { href: string };

/**
 * `next/link` for Makit's generated hrefs, which already include `basePath`
 * (spec §28). Strips it so `next/link` adding it back yields a single
 * prefix; hrefs without it are passed through unchanged.
 */
export function RouteLink({ href, ...props }: RouteLinkProps) {
  return <Link href={toLinkHref(href)} {...props} />;
}
