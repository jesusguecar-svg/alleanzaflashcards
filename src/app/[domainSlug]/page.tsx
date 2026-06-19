import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getAllDomains,
  getDomain,
  getDomainSummaries,
} from "@/lib/markdown";
import { FlashcardDeck } from "@/components/FlashcardDeck";

interface PageProps {
  params: Promise<{ domainSlug: string }>;
}

// Pre-render one static HTML page per domain at build time.
export function generateStaticParams() {
  return getAllDomains().map((d) => ({ domainSlug: d.slug }));
}

// Any slug not produced above 404s instead of attempting on-demand rendering.
export const dynamicParams = false;

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { domainSlug } = await params;
  const domain = getDomain(domainSlug);
  if (!domain) return { title: "Mazo no encontrado" };
  return {
    title: `${domain.title} · Flashcards`,
    description: `${domain.cardCount} flashcards de estudio sobre ${domain.title}.`,
  };
}

export default async function DomainPage({ params }: PageProps) {
  const { domainSlug } = await params;
  const domain = getDomain(domainSlug);
  if (!domain) notFound();

  return <FlashcardDeck domain={domain} allDomains={getDomainSummaries()} />;
}
