"use client";

import type { Flashcard as FlashcardData } from "@/lib/markdown";
import type { CardStatus } from "./FlashcardDeck";

interface FlashcardProps {
  card: FlashcardData;
  flipped: boolean;
  status: CardStatus;
  onFlip: () => void;
}

const statusRing: Record<NonNullable<CardStatus>, string> = {
  known: "ring-2 ring-[var(--known)]",
  unknown: "ring-2 ring-[var(--unknown)]",
};

/**
 * A single flashcard rendered with a 3D perspective flip. The flipped state is
 * controlled by the parent deck so keyboard shortcuts and buttons stay in sync.
 */
export function Flashcard({ card, flipped, status, onFlip }: FlashcardProps) {
  return (
    <div className="flip-scene h-[58vh] min-h-80 w-full">
      <button
        type="button"
        onClick={onFlip}
        aria-pressed={flipped}
        aria-label={flipped ? "Mostrar pregunta" : "Mostrar respuesta"}
        className={`flip-card cursor-pointer text-left outline-none focus-visible:[&>*]:ring-2 focus-visible:[&>*]:ring-[var(--accent)] ${
          flipped ? "is-flipped" : ""
        }`}
      >
        {/* FRONT — the heading/question */}
        <div
          className={`flip-face flip-face--front items-center justify-center p-8 ${
            status ? statusRing[status] : ""
          }`}
        >
          {card.breadcrumb.length > 0 && (
            <p className="mb-4 text-center text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
              {card.breadcrumb.join("  ›  ")}
            </p>
          )}
          <h2 className="text-center text-2xl font-bold leading-snug sm:text-3xl">
            {card.question}
          </h2>
          <span className="mt-6 text-xs text-[var(--muted)]">
            Toca o pulsa Espacio para ver la respuesta
          </span>
        </div>

        {/* BACK — the answer prose (scrolls when long) */}
        <div className={`flip-face flip-face--back ${status ? statusRing[status] : ""}`}>
          <div className="border-b border-[var(--card-border)] px-6 py-3">
            <p className="truncate text-sm font-semibold text-[var(--accent)]">
              {card.question}
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <div
              className="prose-answer"
              // Content is authored markdown from our own repo, rendered to
              // HTML at build time — trusted, not user-supplied at runtime.
              dangerouslySetInnerHTML={{ __html: card.answerHtml }}
            />
          </div>
        </div>
      </button>
    </div>
  );
}
