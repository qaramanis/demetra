"use client";

import Markdown, { type Components } from "react-markdown";

/** The markdown elements with the look of the interface. Links open in a new tab. */
const COMPONENTS: Components = {
  p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0">{children}</p>,
  h1: ({ children }) => <h3 className="mt-3 mb-1.5 font-semibold first:mt-0">{children}</h3>,
  h2: ({ children }) => <h3 className="mt-3 mb-1.5 font-semibold first:mt-0">{children}</h3>,
  h3: ({ children }) => <h4 className="mt-3 mb-1 font-semibold first:mt-0">{children}</h4>,
  h4: ({ children }) => <h4 className="mt-3 mb-1 font-semibold first:mt-0">{children}</h4>,
  ul: ({ children }) => (
    <ul className="my-2 ml-4 list-disc space-y-1 marker:text-muted-foreground">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-2 ml-4 list-decimal space-y-1 marker:text-muted-foreground">{children}</ol>
  ),
  li: ({ children }) => <li className="pl-0.5">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-primary-ink underline underline-offset-2 hover:decoration-2"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 pl-3 text-muted-foreground">{children}</blockquote>
  ),
  code: ({ children }) => (
    <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">{children}</code>
  ),
  pre: ({ children }) => (
    <pre className="my-2 overflow-x-auto rounded-md bg-muted p-2 text-xs [&_code]:bg-transparent [&_code]:p-0">
      {children}
    </pre>
  ),
  hr: () => <hr className="my-3" />,
  // An answer does not load images from other sites.
  img: ({ alt }) => (alt ? <span>{alt}</span> : null),
};

/** The text of an answer, as markdown. Raw HTML in the text is not rendered. */
export function ChatMarkdown({ text }: { text: string }) {
  return (
    <div className="text-sm leading-relaxed break-words">
      <Markdown components={COMPONENTS} skipHtml>
        {text}
      </Markdown>
    </div>
  );
}
