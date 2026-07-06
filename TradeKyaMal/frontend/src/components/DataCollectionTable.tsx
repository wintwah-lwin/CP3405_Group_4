'use client';

import { Trash2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import type { DataCollectionEntry } from '@/lib/types';

const sourceLabels: Record<string, string> = {
  market_price: 'Market Price',
  economic_indicator: 'Economic',
  news_sentiment: 'Sentiment',
  technical_indicator: 'Technical',
  custom: 'Custom',
};

interface DataCollectionTableProps {
  entries: DataCollectionEntry[];
  onEntryDeleted: (id: string) => void;
}

export function DataCollectionTable({
  entries,
  onEntryDeleted,
}: DataCollectionTableProps) {
  async function handleDelete(id: string) {
    try {
      await apiFetch(`/api/data-collection/${id}`, { method: 'DELETE' });
      onEntryDeleted(id);
    } catch {
      // silent — user can retry
    }
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-border-subtle bg-surface-raised p-12 text-center">
        <p className="text-sm text-text-secondary">No data collected yet</p>
        <p className="mt-1 text-xs text-text-muted">
          Use the fetch panel above to pull data from an API.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border-subtle bg-surface-raised">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border-subtle text-xs uppercase tracking-wider text-text-muted">
              <th className="px-4 py-3 font-medium">Symbol</th>
              <th className="px-4 py-3 font-medium">Source</th>
              <th className="px-4 py-3 font-medium">Label</th>
              <th className="px-4 py-3 font-medium">Value</th>
              <th className="px-4 py-3 font-medium">Collected</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr
                key={entry._id}
                className="border-b border-border-subtle last:border-0 hover:bg-surface-overlay/50"
              >
                <td className="px-4 py-3 font-medium">{entry.symbol}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-surface-overlay px-2 py-0.5 text-xs text-text-secondary">
                    {sourceLabels[entry.source] ?? entry.source}
                  </span>
                </td>
                <td className="px-4 py-3 text-text-secondary">{entry.label}</td>
                <td className="px-4 py-3 font-mono text-xs">{entry.value}</td>
                <td className="px-4 py-3 text-xs text-text-muted">
                  {new Date(entry.collectedAt).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleDelete(entry._id)}
                    className="text-text-muted transition-colors hover:text-negative"
                    aria-label="Delete entry"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
