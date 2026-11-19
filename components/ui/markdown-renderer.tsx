"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import "katex/dist/katex.min.css";

const LANGUAGE_ALIASES: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  py: "python",
  rb: "ruby",
  sh: "bash",
  yml: "yaml",
  md: "markdown",
  html: "xml",
  css: "css",
  scss: "scss",
  json: "json",
  graphql: "graphql",
  sql: "sql",
  rs: "rust",
  go: "go",
  java: "java",
  kt: "kotlin",
  swift: "swift",
  cpp: "cpp",
  c: "c",
  cs: "csharp",
  php: "php",
  r: "r",
  m: "matlab",
  pl: "perl",
  lua: "lua",
  vim: "vim",
  dockerfile: "dockerfile",
  toml: "toml",
  ini: "ini",
  proto: "protobuf",
  dart: "dart",
  ex: "elixir",
  exs: "elixir",
  erl: "erlang",
  hrl: "erlang",
  fs: "fsharp",
  fsx: "fsharp",
  clj: "clojure",
  cljs: "clojure",
  edn: "clojure",
  hs: "haskell",
  lhs: "haskell",
  ml: "ocaml",
  mli: "ocaml",
  vb: "vbnet",
  ps1: "powershell",
  bat: "batch",
  cmd: "batch",
  tf: "terraform",
  hcl: "hcl",
};

function normalizeLanguage(lang: string): string {
  const lower = lang.toLowerCase().trim();
  return LANGUAGE_ALIASES[lower] || lower;
}

function CodeBlock({
  node,
  ...props
}: {
  node: { children?: React.ReactNode; value?: string; properties?: Record<string, unknown> };
  [key: string]: unknown;
}) {
  const language = node.properties?.className
    ? Array.isArray(node.properties.className)
      ? node.properties.className[0]?.replace("language-", "")
      : String(node.properties.className).replace("language-", "")
    : undefined;

  const normalizedLang = language ? normalizeLanguage(language) : "plaintext";
  const code = String(node.value ?? node.children ?? "");

  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API failed silently
    }
  };

  return (
    <div className="relative group my-4 rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-zinc-200 bg-zinc-100 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900">
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          {normalizedLang}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium text-zinc-500 transition hover:bg-zinc-200 hover:text-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/30 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          aria-label={copied ? "Copied" : "Copy code"}
        >
          {copied ? (
            <>
              <svg className="h-3.5 w-3.5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              Copied
            </>
          ) : (
            <>
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                <path d="M8 4V2a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              Copy
            </>
          )}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto"><code className={`language-${normalizedLang} text-sm`}>{code}</code></pre>
    </div>
  );
}

function InlineCode({ children, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <code
      {...props}
      className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[0.85em] text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
    >
      {children}
    </code>
  );
}

function Table({ children, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="my-4 overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
      <table {...props} className="w-full border-collapse text-sm">
        {children}
      </table>
    </div>
  );
}

function Thead({ children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead {...props} className="bg-zinc-100 dark:bg-zinc-900">{children}</thead>;
}

function Tbody({ children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody {...props}>{children}</tbody>;
}

function Tr({ children, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr {...props} className="border-b border-zinc-200 last:border-0 dark:border-zinc-800">{children}</tr>;
}

function Th({ children, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th {...props} className="px-3 py-2 font-semibold text-left text-zinc-900 dark:text-zinc-100 border-r border-zinc-200 last:border-0 dark:border-zinc-800">
      {children}
    </th>
  );
}

function Td({ children, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td {...props} className="px-3 py-2 text-zinc-700 dark:text-zinc-300 border-r border-zinc-200 last:border-0 dark:border-zinc-800">
      {children}
    </td>
  );
}

function Blockquote({ children, ...props }: React.QuoteHTMLAttributes<HTMLQuoteElement>) {
  return (
    <blockquote
      {...props}
      className="my-4 border-l-4 border-accent-500 pl-4 italic text-zinc-600 dark:text-zinc-400"
    >
      {children}
    </blockquote>
  );
}

function Hr({ ...props }: React.HTMLAttributes<HTMLHRElement>) {
  return <hr {...props} className="my-6 border-zinc-200 dark:border-zinc-800" />;
}

const components = {
  code: InlineCode,
  pre: ({ children, ...props }: React.HTMLAttributes<HTMLPreElement>) => {
    const codeElement = React.Children.only(children) as React.ReactElement<{ children?: React.ReactNode; value?: string; properties?: Record<string, unknown> }>;
    return <CodeBlock node={codeElement.props} {...props} />;
  },
  table: Table,
  thead: Thead,
  tbody: Tbody,
  tr: Tr,
  th: Th,
  td: Td,
  blockquote: Blockquote,
  hr: Hr,
};

interface MarkdownRendererProps {
  children: string;
  className?: string;
}

export function MarkdownRenderer({ children, className = "" }: MarkdownRendererProps) {
  return (
    <div className={`prose prose-zinc max-w-none dark:prose-invert ${className}`}>
      <ReactMarkdown
        components={components}
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeHighlight, rehypeRaw]}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}