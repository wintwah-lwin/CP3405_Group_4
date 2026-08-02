'use client';

import clsx from 'clsx';
import type { ReactNode } from 'react';

function renderInline(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-text-primary">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

function isTableRow(line: string) {
  return line.trim().startsWith('|') && line.trim().endsWith('|');
}

function parseTableRow(line: string) {
  return line
    .trim()
    .slice(1, -1)
    .split('|')
    .map((cell) => cell.trim());
}

export function MarkdownContent({ content }: { content: string }) {
  const lines = content.split('\n');
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i += 1;
      continue;
    }

    if (line.startsWith('# ')) {
      blocks.push(
        <h1 key={key++} className="mb-4 text-xl font-bold">
          {renderInline(line.slice(2))}
        </h1>
      );
      i += 1;
      continue;
    }

    if (line.startsWith('## ')) {
      blocks.push(
        <h2 key={key++} className="mb-3 mt-6 text-lg font-semibold">
          {renderInline(line.slice(3))}
        </h2>
      );
      i += 1;
      continue;
    }

    if (line.startsWith('### ')) {
      blocks.push(
        <h3 key={key++} className="mb-2 mt-4 text-base font-semibold">
          {renderInline(line.slice(4))}
        </h3>
      );
      i += 1;
      continue;
    }

    if (line.startsWith('---')) {
      blocks.push(<hr key={key++} className="my-6 border-border-subtle" />);
      i += 1;
      continue;
    }

    if (line.startsWith('> ')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('> ')) {
        quoteLines.push(lines[i].slice(2));
        i += 1;
      }
      blocks.push(
        <blockquote
          key={key++}
          className="my-3 border-l-2 border-accent/40 pl-4 text-sm italic text-text-secondary"
        >
          {quoteLines.map((q, idx) => (
            <p key={idx}>{renderInline(q)}</p>
          ))}
        </blockquote>
      );
      continue;
    }

    if (isTableRow(line)) {
      const tableLines: string[] = [];
      while (i < lines.length && isTableRow(lines[i])) {
        tableLines.push(lines[i]);
        i += 1;
      }

      const rows = tableLines
        .filter((row) => !/^\|\s*[-:]+/.test(row))
        .map(parseTableRow);

      if (rows.length > 0) {
        const [header, ...body] = rows;
        blocks.push(
          <div key={key++} className="my-4 overflow-x-auto rounded-lg border border-border-subtle">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="bg-surface-overlay">
                <tr>
                  {header.map((cell, idx) => (
                    <th key={idx} className="px-3 py-2 text-xs font-semibold text-text-muted">
                      {renderInline(cell)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {body.map((row, rowIdx) => (
                  <tr key={rowIdx} className="border-t border-border-subtle/60">
                    {row.map((cell, cellIdx) => (
                      <td key={cellIdx} className="px-3 py-2 align-top text-text-secondary">
                        {renderInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }

    if (line.startsWith('- ')) {
      const items: string[] = [];
      while (i < lines.length && lines[i].startsWith('- ')) {
        items.push(lines[i].slice(2));
        i += 1;
      }
      blocks.push(
        <ul key={key++} className="my-3 list-disc space-y-1 pl-5 text-sm text-text-secondary">
          {items.map((item, idx) => (
            <li key={idx}>{renderInline(item)}</li>
          ))}
        </ul>
      );
      continue;
    }

    blocks.push(
      <p key={key++} className="my-2 text-sm leading-relaxed text-text-secondary">
        {renderInline(line)}
      </p>
    );
    i += 1;
  }

  return <article className={clsx('max-w-none')}>{blocks}</article>;
}
