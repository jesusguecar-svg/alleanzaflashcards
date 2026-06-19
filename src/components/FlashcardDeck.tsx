"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Domain, DomainSummary } from "@/lib/markdown";
import { Flashcard } from "./Flashcard";

export type CardStatus = "known" | "unknown" | undefined;

interface FlashcardDeckProps {
  domain: Domain;
  allDomains: DomainSummary[];
}

/** Fisher–Yates shuffle returning a new array. */
function shuffled<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function FlashcardDeck({ domain, allDomains }: FlashcardDeckProps) {
  // Embed mode (?embed=true) is read from the URL after mount rather than via
  // useSearchParams, so the full deck still prerenders to static HTML at build
  // time. We default to the non-embed layout (matching the prerender) and
  // switch on the client to avoid any hydration mismatch.
  const [embed, setEmbed] = useState(false);

  const total = domain.cards.length;
  const naturalOrder = useMemo(
    () => domain.cards.map((_, i) => i),
    [domain.cards],
  );

  const [order, setOrder] = useState<number[]>(naturalOrder);
  const [pos, setPos] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [statuses, setStatuses] = useState<Record<string, CardStatus>>({});
  const [hydrated, setHydrated] = useState(false);

  const storageKey = `flashcards:status:${domain.slug}`;

  // Detect embed mode from the URL and expose it to global CSS via a body
  // attribute (lets the host iframe show a clean, chrome-free card).
  useEffect(() => {
    const isEmbed =
      new URLSearchParams(window.location.search).get("embed") === "true";
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setEmbed(isEmbed);
    document.body.dataset.embed = isEmbed ? "true" : "false";
    return () => {
      delete document.body.dataset.embed;
    };
  }, []);

  // Restore saved progress for this deck (per-deck, survives reloads).
  // localStorage is only available after mount, so this must run in an effect
  // — reading it during render would diverge from the prerendered HTML and
  // cause a hydration mismatch. The one-time post-mount setState is intended.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) setStatuses(JSON.parse(raw));
    } catch {
      /* ignore malformed storage */
    }
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [storageKey]);

  // Persist on change (only after the initial restore to avoid clobbering).
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(statuses));
    } catch {
      /* storage may be unavailable in some embeds */
    }
  }, [statuses, hydrated, storageKey]);

  const currentIndex = order[pos];
  const currentCard = domain.cards[currentIndex];

  const knownCount = Object.values(statuses).filter((s) => s === "known").length;
  const unknownCount = Object.values(statuses).filter(
    (s) => s === "unknown",
  ).length;
  const answered = knownCount + unknownCount;

  const goTo = useCallback(
    (next: number) => {
      setPos((p) => {
        const clamped = Math.max(0, Math.min(total - 1, next));
        if (clamped !== p) setFlipped(false);
        return clamped;
      });
    },
    [total],
  );

  const next = useCallback(() => goTo(pos + 1), [goTo, pos]);
  const prev = useCallback(() => goTo(pos - 1), [goTo, pos]);
  const flip = useCallback(() => setFlipped((f) => !f), []);

  const mark = useCallback(
    (status: NonNullable<CardStatus>) => {
      if (!currentCard) return;
      setStatuses((prevStatuses) => ({
        ...prevStatuses,
        [currentCard.id]: status,
      }));
      // Advance to keep momentum going through the deck.
      if (pos < total - 1) {
        setFlipped(false);
        setPos((p) => p + 1);
      }
    },
    [currentCard, pos, total],
  );

  const shuffle = useCallback(() => {
    setOrder(shuffled(naturalOrder));
    setPos(0);
    setFlipped(false);
  }, [naturalOrder]);

  const resetOrder = useCallback(() => {
    setOrder(naturalOrder);
    setPos(0);
    setFlipped(false);
  }, [naturalOrder]);

  const resetScore = useCallback(() => {
    setStatuses({});
    setFlipped(false);
  }, []);

  // Keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement) {
        const tag = e.target.tagName;
        if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      }
      switch (e.key) {
        case "ArrowRight":
          next();
          break;
        case "ArrowLeft":
          prev();
          break;
        case " ":
        case "Enter":
          e.preventDefault();
          flip();
          break;
        case "k":
        case "K":
          mark("known");
          break;
        case "j":
        case "J":
          mark("unknown");
          break;
        case "s":
        case "S":
          shuffle();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, flip, mark, shuffle]);

  const progressPct = total ? Math.round(((pos + 1) / total) * 100) : 0;

  return (
    <main
      className={`mx-auto flex w-full max-w-3xl flex-1 flex-col ${
        embed ? "gap-4 p-3" : "gap-6 p-5 sm:p-8"
      }`}
    >
      {/* Header / multi-deck index — hidden inside embeds */}
      {!embed && (
        <header className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <Link
              href="/"
              className="text-sm font-medium text-[var(--muted)] hover:text-[var(--accent)]"
            >
              ← Todos los mazos
            </Link>
            <DeckSwitcher current={domain.slug} domains={allDomains} />
          </div>
          <div>
            {domain.domain && (
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">
                {domain.domain}
                {domain.weight ? ` · ${domain.weight}% del examen` : ""}
              </p>
            )}
            <h1 className="text-xl font-bold sm:text-2xl">{domain.title}</h1>
          </div>
        </header>
      )}

      {/* Progress + score */}
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">
            Tarjeta {pos + 1} / {total}
          </span>
          <span className="flex items-center gap-3 text-xs">
            <span className="text-[var(--known)]">● {knownCount} dominadas</span>
            <span className="text-[var(--unknown)]">● {unknownCount} repasar</span>
            <span className="text-[var(--muted)]">{answered}/{total} hechas</span>
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--card-border)]">
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        {/* Progressive per-card status dots */}
        <div className="flex flex-wrap gap-1 pt-1" aria-hidden="true">
          {order.map((cardIdx, i) => {
            const st = statuses[domain.cards[cardIdx].id];
            const color =
              st === "known"
                ? "bg-[var(--known)]"
                : st === "unknown"
                  ? "bg-[var(--unknown)]"
                  : "bg-[var(--card-border)]";
            return (
              <button
                key={domain.cards[cardIdx].id}
                type="button"
                onClick={() => goTo(i)}
                title={`Ir a la tarjeta ${i + 1}`}
                className={`h-2.5 w-2.5 rounded-full transition-transform hover:scale-125 ${color} ${
                  i === pos ? "ring-2 ring-offset-1 ring-[var(--accent)]" : ""
                }`}
              />
            );
          })}
        </div>
      </section>

      {/* The card */}
      {currentCard && (
        <Flashcard
          card={currentCard}
          flipped={flipped}
          status={statuses[currentCard.id]}
          onFlip={flip}
        />
      )}

      {/* Known / review controls */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => mark("unknown")}
          className="rounded-lg border border-[var(--unknown)] py-2.5 text-sm font-semibold text-[var(--unknown)] transition-colors hover:bg-[var(--unknown)] hover:text-white"
        >
          En estudio (J)
        </button>
        <button
          type="button"
          onClick={() => mark("known")}
          className="rounded-lg border border-[var(--known)] py-2.5 text-sm font-semibold text-[var(--known)] transition-colors hover:bg-[var(--known)] hover:text-white"
        >
          Dominada (K)
        </button>
      </div>

      {/* Navigation + deck tools */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={prev}
            disabled={pos === 0}
            className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-4 py-2 text-sm font-medium disabled:opacity-40"
          >
            ← Anterior
          </button>
          <button
            type="button"
            onClick={flip}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white"
          >
            Voltear
          </button>
          <button
            type="button"
            onClick={next}
            disabled={pos === total - 1}
            className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-4 py-2 text-sm font-medium disabled:opacity-40"
          >
            Siguiente →
          </button>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={shuffle}
            className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 text-sm font-medium hover:border-[var(--accent)]"
            title="Barajar el mazo (S)"
          >
            🔀 Barajar
          </button>
          <button
            type="button"
            onClick={resetOrder}
            className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 text-sm font-medium hover:border-[var(--accent)]"
            title="Restaurar el orden original"
          >
            ↺ Orden
          </button>
          <button
            type="button"
            onClick={resetScore}
            className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 text-sm font-medium hover:border-[var(--accent)]"
            title="Borrar el progreso de este mazo"
          >
            ✕ Reiniciar
          </button>
        </div>
      </div>

      {!embed && (
        <p className="text-center text-xs text-[var(--muted)]">
          Atajos: ← / → navegar · Espacio voltear · K dominada · J en estudio · S barajar
        </p>
      )}
    </main>
  );
}

function DeckSwitcher({
  current,
  domains,
}: {
  current: string;
  domains: DomainSummary[];
}) {
  return (
    <div className="relative">
      <select
        aria-label="Cambiar de mazo"
        value={current}
        onChange={(e) => {
          window.location.href = `/${e.target.value}/`;
        }}
        className="max-w-[60vw] rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-1.5 text-sm font-medium"
      >
        {domains.map((d) => (
          <option key={d.slug} value={d.slug}>
            {d.domain ? `${d.domain} — ` : ""}
            {d.title} ({d.cardCount})
          </option>
        ))}
      </select>
    </div>
  );
}
