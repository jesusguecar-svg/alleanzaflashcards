import Link from "next/link";
import { getDomainSummaries } from "@/lib/markdown";

export default function Home() {
  const domains = getDomainSummaries();
  const totalCards = domains.reduce((sum, d) => sum + d.cardCount, 0);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 p-5 sm:p-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold sm:text-3xl">
          Flashcards del examen Life &amp; Health
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {domains.length} mazos · {totalCards} tarjetas. Elige un dominio para
          empezar a estudiar.
        </p>
      </header>

      <ul className="grid gap-3 sm:grid-cols-2">
        {domains.map((d) => (
          <li key={d.slug}>
            <Link
              href={`/${d.slug}/`}
              className="group flex h-full flex-col rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4 transition-colors hover:border-[var(--accent)]"
            >
              {d.domain && (
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">
                  {d.domain}
                  {d.weight ? ` · ${d.weight}%` : ""}
                </span>
              )}
              <span className="mt-1 font-semibold leading-snug group-hover:text-[var(--accent)]">
                {d.title}
              </span>
              <span className="mt-auto pt-3 text-sm text-[var(--muted)]">
                {d.cardCount} tarjetas →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
