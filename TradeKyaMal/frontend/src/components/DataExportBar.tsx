'use client';

import { FileJson, FileSpreadsheet } from 'lucide-react';
import { exportEntriesAsCsv, exportEntriesAsJson } from '@/lib/exportData';
import type { DataCollectionEntry } from '@/lib/types';

interface DataExportBarProps {
  entries: DataCollectionEntry[];
}

export function DataExportBar({ entries }: DataExportBarProps) {
  const disabled = entries.length === 0;

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        disabled={disabled}
        onClick={() => exportEntriesAsJson(entries)}
        className="flex items-center gap-1.5 rounded-lg border border-border-subtle bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
      >
        <FileJson className="h-3.5 w-3.5" />
        Export JSON
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => exportEntriesAsCsv(entries)}
        className="flex items-center gap-1.5 rounded-lg border border-border-subtle bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
      >
        <FileSpreadsheet className="h-3.5 w-3.5" />
        Export CSV
      </button>
    </div>
  );
}
