import type { ReactNode } from "react";

/**
 * Dependency-free renderer for the small slice of markdown the Tutor produces.
 *
 * ACED has no markdown library, so this handles only what the tutor actually
 * emits — headings (`###`), bullet and numbered lists, and inline `**bold**` /
 * `` `code` `` — and falls back to a plain paragraph for everything else. Single
 * newlines are kept as line breaks inside a block so streamed text never
 * collapses into one run-on paragraph.
 *
 * Every block is wrapped by the caller with break-words styling, so long words
 * and long code tokens wrap instead of forcing horizontal scroll.
 */

type Block =
  | { kind: "heading"; text: string; level: number }
  | { kind: "list"; items: string[]; ordered: boolean }
  | { kind: "paragraph"; lines: string[] };

const HEADING_PATTERN = /^(#{1,4})\s+(.*)$/;
const BULLET_PATTERN = /^\s*[-*+]\s+(.*)$/;
const ORDERED_PATTERN = /^\s*\d+[.)]\s+(.*)$/;

function parseBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  const lines = text.split("\n");

  let paragraph: string[] = [];
  let listItems: string[] = [];
  let listOrdered = false;

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push({ kind: "paragraph", lines: paragraph });
      paragraph = [];
    }
  };

  const flushList = () => {
    if (listItems.length > 0) {
      blocks.push({ kind: "list", items: listItems, ordered: listOrdered });
      listItems = [];
    }
  };

  for (const line of lines) {
    const heading = HEADING_PATTERN.exec(line);

    if (heading) {
      flushParagraph();
      flushList();
      blocks.push({
        kind: "heading",
        text: heading[2],
        level: Math.min(heading[1].length, 3),
      });
      continue;
    }

    const bullet = BULLET_PATTERN.exec(line);

    if (bullet) {
      flushParagraph();
      if (listItems.length > 0 && listOrdered) flushList();
      listOrdered = false;
      listItems.push(bullet[1]);
      continue;
    }

    const ordered = ORDERED_PATTERN.exec(line);

    if (ordered) {
      flushParagraph();
      if (listItems.length > 0 && !listOrdered) flushList();
      listOrdered = true;
      listItems.push(ordered[1]);
      continue;
    }

    // A blank line ends the current block.
    flushList();

    if (line.trim() === "") {
      flushParagraph();
      continue;
    }

    paragraph.push(line);
  }

  flushParagraph();
  flushList();

  return blocks;
}

const INLINE_PATTERN = /(\*\*[^*\n]+\*\*|`[^`\n]+`)/g;

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const parts = text.split(INLINE_PATTERN).filter((part) => part !== "");

  return parts.map((part, index) => {
    const key = `${keyPrefix}-${index}`;

    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={key} className="font-semibold text-zinc-900 dark:text-zinc-100">
          {part.slice(2, -2)}
        </strong>
      );
    }

    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code
          key={key}
          className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-[0.85em] text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    return <span key={key}>{part}</span>;
  });
}

export function TutorText({ text }: { text: string }) {
  const blocks = parseBlocks(text);

  return (
    <div className="space-y-2 break-words [overflow-wrap:anywhere]">
      {blocks.map((block, index) => {
        const key = `block-${index}`;

        if (block.kind === "heading") {
          const className =
            block.level <= 2
              ? "font-display text-base font-semibold text-zinc-900 dark:text-zinc-50"
              : "mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100";

          return (
            <p key={key} className={className}>
              {renderInline(block.text, key)}
            </p>
          );
        }

        if (block.kind === "list") {
          return block.ordered ? (
            <ol
              key={key}
              className="list-decimal space-y-1 pl-5 text-[0.9375rem] leading-relaxed"
            >
              {block.items.map((item, itemIndex) => (
                <li key={`${key}-${itemIndex}`}>
                  {renderInline(item, `${key}-${itemIndex}`)}
                </li>
              ))}
            </ol>
          ) : (
            <ul key={key} className="list-disc space-y-1 pl-5 text-[0.9375rem] leading-relaxed">
              {block.items.map((item, itemIndex) => (
                <li key={`${key}-${itemIndex}`}>
                  {renderInline(item, `${key}-${itemIndex}`)}
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p
            key={key}
            className="whitespace-pre-wrap text-[0.9375rem] leading-relaxed"
          >
            {renderInline(block.lines.join("\n"), key)}
          </p>
        );
      })}
    </div>
  );
}