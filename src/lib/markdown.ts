import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";

/**
 * Build-time markdown ingestion.
 *
 * Course content lives as `.md` files in the repo's top-level `/content`
 * directory. Each file is one "domain" (a flashcard deck). The body is
 * long-form study-guide prose organised under markdown headings, so we derive
 * flashcards from that structure: every heading that has prose directly beneath
 * it becomes a card (heading = question/front, prose = answer/back).
 *
 * Everything here runs only on the server at build time (it touches `fs`), and
 * the parsed result is serialised into the statically exported pages.
 */

export interface Flashcard {
  id: string;
  /** The heading text — shown on the front of the card. */
  question: string;
  /** Rendered HTML for the prose under the heading — shown on the back. */
  answerHtml: string;
  /** Parent heading trail (excluding the document title) for context. */
  breadcrumb: string[];
}

export interface DomainSummary {
  slug: string;
  title: string;
  domain: string;
  order: number;
  weight: number;
  cardCount: number;
}

export interface Domain extends DomainSummary {
  cards: Flashcard[];
}

const CONTENT_DIR = path.join(process.cwd(), "content");

marked.setOptions({ gfm: true, breaks: false });

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Strip noise that survives from the source documents: AI research citation
 * tokens (`citeturn49view0...`), bare `turn12view3` fragments, `entity[...]`
 * markup, and broken inline image placeholders like `![][image1]`.
 */
function cleanSource(text: string): string {
  return text
    .replace(/cite(?:turn[\w-]+)+/gi, "")
    .replace(/\bturn\d+\w*\b/gi, "")
    .replace(/entity\["([^"]*)"(?:,\s*"[^"]*")*\]/g, "$1")
    .replace(/!\[\]\[[^\]]*\]/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Reduce a markdown heading to clean plain text for use as a question. */
function headingToText(raw: string): string {
  return cleanSource(raw)
    .replace(/\\([.\-*_#])/g, "$1") // markdown escapes: `1\.` -> `1.`
    .replace(/\*\*?([^*]+)\*\*?/g, "$1") // bold/italic markers
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

interface RawSection {
  level: number;
  heading: string;
  bodyLines: string[];
}

/**
 * Walk the markdown body line-by-line, splitting it into heading-delimited
 * sections. Fenced code blocks are respected so `#` inside them is ignored.
 */
function splitSections(body: string): RawSection[] {
  const lines = body.split("\n");
  const sections: RawSection[] = [];
  let current: RawSection | null = null;
  let inFence = false;

  for (const line of lines) {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
    const headingMatch = !inFence ? line.match(/^(#{1,6})\s+(.*\S)\s*$/) : null;
    if (headingMatch) {
      current = {
        level: headingMatch[1].length,
        heading: headingMatch[2],
        bodyLines: [],
      };
      sections.push(current);
    } else if (current) {
      current.bodyLines.push(line);
    }
    // Lines before the first heading (rare) are ignored.
  }
  return sections;
}

function extractCards(body: string, slug: string): Flashcard[] {
  const sections = splitSections(cleanSource(body));
  const cards: Flashcard[] = [];
  const trail: { level: number; text: string }[] = [];

  sections.forEach((section, i) => {
    const headingText = headingToText(section.heading);

    // Maintain the ancestor heading stack for breadcrumbs.
    while (trail.length && trail[trail.length - 1].level >= section.level) {
      trail.pop();
    }

    const answerMd = cleanSource(section.bodyLines.join("\n"));
    // The first H1 is the document title; never a card. A heading only becomes
    // a card when it has real prose directly beneath it.
    const isTitle = section.level === 1 && i === 0;
    if (!isTitle && answerMd) {
      const breadcrumb = trail.map((t) => headingToText(t.text));
      cards.push({
        id: `${slug}-${cards.length}`,
        question: headingText,
        answerHtml: marked.parse(answerMd) as string,
        breadcrumb,
      });
    }

    // The document title is not part of any card's breadcrumb (the deck header
    // already shows it); every other heading provides ancestor context.
    if (!isTitle) {
      trail.push({ level: section.level, text: section.heading });
    }
  });

  return cards;
}

let cache: Domain[] | null = null;

export function getAllDomains(): Domain[] {
  if (cache) return cache;
  if (!fs.existsSync(CONTENT_DIR)) return [];

  const files = fs
    .readdirSync(CONTENT_DIR)
    .filter((f) => /\.mdx?$/i.test(f));

  const domains: Domain[] = [];
  for (const file of files) {
    const raw = fs.readFileSync(path.join(CONTENT_DIR, file), "utf8");
    const { data, content } = matter(raw);
    const baseName = file.replace(/\.mdx?$/i, "");
    const slug = slugify(String(data.slug ?? baseName));
    const cards = extractCards(content, slug);
    if (cards.length === 0) continue;

    domains.push({
      slug,
      title: String(data.title ?? data.domain ?? baseName),
      domain: String(data.domain ?? ""),
      order: typeof data.order === "number" ? data.order : 999,
      weight: typeof data.weight === "number" ? data.weight : 0,
      cardCount: cards.length,
      cards,
    });
  }

  domains.sort(
    (a, b) => a.order - b.order || a.title.localeCompare(b.title),
  );
  cache = domains;
  return domains;
}

export function getDomain(slug: string): Domain | undefined {
  return getAllDomains().find((d) => d.slug === slug);
}

export function getDomainSummaries(): DomainSummary[] {
  return getAllDomains().map((d) => ({
    slug: d.slug,
    title: d.title,
    domain: d.domain,
    order: d.order,
    weight: d.weight,
    cardCount: d.cardCount,
  }));
}
