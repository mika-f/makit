import type { StaticPageComponentProps } from "@natsuneko-laboratory/makit-runtime";
import { Hero } from "./_components/hero";

export default function Landing({ locale }: StaticPageComponentProps) {
  const ja = locale === "ja-jp";
  return (
    <Hero
      title={ja ? "ようこそ Makit へ" : "Welcome to Makit"}
      lead={
        ja
          ? "Markdown のドキュメントと、自由に作れる固定ページを一つのサイトに。"
          : "Markdown documentation and fully custom pages, in one site."
      }
      cta={ja ? "はじめる" : "Get started"}
      href={`/${locale}/getting-started/`}
    />
  );
}
