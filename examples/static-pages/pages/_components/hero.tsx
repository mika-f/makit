import Link from "next/link";

interface HeroProps {
  title: string;
  lead: string;
  cta: string;
  href: string;
}

/** A helper module — `_` keeps it from becoming a page of its own. */
export function Hero({ title, lead, cta, href }: HeroProps) {
  return (
    <section className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gradient-to-br from-indigo-600 to-fuchsia-600 px-6 text-center text-white">
      <h1 className="text-6xl font-black tracking-tight">{title}</h1>
      <p className="max-w-xl text-xl text-white/80">{lead}</p>
      <Link href={href} className="rounded-full bg-white px-6 py-3 font-semibold text-indigo-700">
        {cta}
      </Link>
    </section>
  );
}
