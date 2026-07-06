import type { DataCollectionEntry } from './types';

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function toExportRow(entry: DataCollectionEntry) {
  return {
    symbol: entry.symbol,
    source: entry.source,
    label: entry.label,
    value: entry.value,
    collectedAt: entry.collectedAt,
  };
}

export function exportEntriesAsJson(entries: DataCollectionEntry[], filename?: string) {
  const data = entries.map(toExportRow);
  const stamp = new Date().toISOString().slice(0, 10);
  downloadBlob(
    JSON.stringify(data, null, 2),
    filename ?? `tradekyamal-data-${stamp}.json`,
    'application/json'
  );
}

export function exportEntriesAsCsv(entries: DataCollectionEntry[], filename?: string) {
  const headers = ['symbol', 'source', 'label', 'value', 'collectedAt'];
  const escape = (val: string | number) => {
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = entries.map((entry) => {
    const row = toExportRow(entry);
    return headers.map((h) => escape(row[h as keyof typeof row] as string | number)).join(',');
  });

  const stamp = new Date().toISOString().slice(0, 10);
  downloadBlob(
    [headers.join(','), ...rows].join('\n'),
    filename ?? `tradekyamal-data-${stamp}.csv`,
    'text/csv'
  );
}
