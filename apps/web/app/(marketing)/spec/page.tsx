import fs from "node:fs/promises";
import path from "node:path";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";

type Block =
  | { type: "h1" | "h2" | "h3"; text: string }
  | { type: "p"; text: string }
  | { type: "list"; items: string[] };

const specPathCandidates = [
  path.resolve(process.cwd(), "spec.md"),
  path.resolve(process.cwd(), "..", "spec.md"),
  path.resolve(process.cwd(), "..", "..", "spec.md"),
];

const normalizeInline = (text: string) =>
  text.replaceAll(/`([^`]+)`/g, "$1").trim();

const parseMarkdown = (markdown: string): Block[] => {
  const lines = markdown.split(/\r?\n/);
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let listItems: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) {
      return;
    }
    blocks.push({ type: "p", text: normalizeInline(paragraph.join(" ")) });
    paragraph = [];
  };

  const flushList = () => {
    if (listItems.length === 0) {
      return;
    }
    blocks.push({
      type: "list",
      items: listItems.map((item) => normalizeInline(item)),
    });
    listItems = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line.length === 0) {
      flushParagraph();
      flushList();
      continue;
    }

    if (line.startsWith("# ")) {
      flushParagraph();
      flushList();
      blocks.push({ type: "h1", text: normalizeInline(line.slice(2)) });
      continue;
    }

    if (line.startsWith("## ")) {
      flushParagraph();
      flushList();
      blocks.push({ type: "h2", text: normalizeInline(line.slice(3)) });
      continue;
    }

    if (line.startsWith("### ")) {
      flushParagraph();
      flushList();
      blocks.push({ type: "h3", text: normalizeInline(line.slice(4)) });
      continue;
    }

    if (line.startsWith("- ")) {
      flushParagraph();
      listItems.push(line.slice(2));
      continue;
    }

    paragraph.push(line);
  }

  flushParagraph();
  flushList();

  return blocks;
};

const readSpec = async () => {
  for (const candidate of specPathCandidates) {
    try {
      return await fs.readFile(candidate, "utf8");
    } catch {
      continue;
    }
  }

  throw new Error("spec.md not found");
};

export const metadata = {
  title: "Platon Spec",
  description: "Product specification for Platon's MCP-first remote memory platform.",
};

export default async function SpecPage() {
  const markdown = await readSpec();
  const blocks = parseMarkdown(markdown);

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <div
        className="border-b border-border-default/70"
        style={{
          background:
            "radial-gradient(circle at top left, rgba(139,92,246,0.18), transparent 40%), radial-gradient(circle at top right, rgba(14,165,233,0.10), transparent 30%)",
        }}
      >
        <div className="max-w-5xl mx-auto px-6 md:px-10 py-8 md:py-12">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>

          <div className="mt-8 flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-accent-violet/15 border border-accent-violet/30 flex items-center justify-center shrink-0">
              <FileText className="w-6 h-6 text-accent-violet" />
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-text-muted">
                Product Spec
              </p>
              <h1 className="mt-3 text-4xl md:text-6xl font-light tracking-tight">
                MCP-first, x402-paid, namespace-safe memory.
              </h1>
              <p className="mt-4 max-w-2xl text-base md:text-lg text-text-secondary leading-relaxed">
                This page publishes the current product specification for making
                Platon easy for third-party agents to connect to over MCP.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 md:px-10 py-10 md:py-14">
        <article className="rounded-[28px] border border-border-default/70 bg-bg-secondary/70 p-6 md:p-10 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
          <div className="space-y-6">
            {blocks.map((block, index) => {
              if (block.type === "h1") {
                return (
                  <h2
                    key={`${block.type}-${index}`}
                    className="text-3xl md:text-4xl font-light tracking-tight"
                  >
                    {block.text}
                  </h2>
                );
              }

              if (block.type === "h2") {
                return (
                  <h3
                    key={`${block.type}-${index}`}
                    className="pt-4 text-2xl md:text-3xl font-light tracking-tight border-t border-border-default/60"
                  >
                    {block.text}
                  </h3>
                );
              }

              if (block.type === "h3") {
                return (
                  <h4
                    key={`${block.type}-${index}`}
                    className="text-lg md:text-xl font-semibold text-text-primary"
                  >
                    {block.text}
                  </h4>
                );
              }

              if (block.type === "list") {
                return (
                  <ul
                    key={`${block.type}-${index}`}
                    className="space-y-3 pl-5 text-text-secondary"
                  >
                    {block.items.map((item, itemIndex) => (
                      <li key={`${index}-${itemIndex}`} className="list-disc leading-7">
                        {item}
                      </li>
                    ))}
                  </ul>
                );
              }

              return (
                <p
                  key={`${block.type}-${index}`}
                  className="text-base md:text-lg text-text-secondary leading-8"
                >
                  {block.text}
                </p>
              );
            })}
          </div>
        </article>
      </div>
    </div>
  );
}
