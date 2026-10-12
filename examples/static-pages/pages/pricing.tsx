import { getCollections, type StaticPageComponentProps } from "@natsuneko-laboratory/makit-runtime";

/** An async Server Component can read Makit's generated data. */
export default async function Pricing({ locale, page }: StaticPageComponentProps) {
  const collections = await getCollections();
  return (
    <div className="mx-auto max-w-5xl px-6 py-20">
      <h1 className="text-4xl font-semibold">{page.title}</h1>
      <p className="mt-4 text-[var(--makit-color-subtle)]">
        {locale === "ja-jp"
          ? `${collections.length} 個のコレクションを含むすべてのドキュメントが無料です。`
          : `All documentation across ${collections.length} collection(s) is free.`}
      </p>
    </div>
  );
}
