import { Header as DefaultHeader } from "@natsuneko-laboratory/makit-runtime";
import type { HeaderProps } from "@natsuneko-laboratory/makit-runtime";
import { Banner } from "./banner";

/**
 * The `Header` slot, picked up from `theme/header.tsx` with no configuration.
 *
 * A server component (the default) that wraps the built-in header instead of
 * replacing it, which is the shortest way to add something around it.
 */
export default function Header(props: HeaderProps) {
  return (
    <>
      <Banner href="/guides/theming/">
        This site's header, footer, and title block are custom.
      </Banner>
      <DefaultHeader {...props} />
    </>
  );
}
