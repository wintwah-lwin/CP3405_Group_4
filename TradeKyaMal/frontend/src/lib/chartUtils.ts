import type { CSSProperties } from 'react';
import type { DataCollectionEntry } from './types';

export type ScorecardProvider = 'finviz' | 'yahoo_sectors' | 'tradingeconomics';

export function getProvider(entry: DataCollectionEntry): ScorecardProvider | null {
  const provider = entry.metadata?.provider;
  if (
    provider === 'finviz' ||
    provider === 'yahoo_sectors' ||
    provider === 'tradingeconomics'
  ) {
    return provider;
  }
  return null;
}

/** Latest fetch batch per provider (entries share the same collectedAt on each fetch). */
export function getLatestBatchByProvider(
  entries: DataCollectionEntry[]
): Partial<Record<ScorecardProvider, DataCollectionEntry[]>> {
  const result: Partial<Record<ScorecardProvider, DataCollectionEntry[]>> = {};

  for (const provider of ['finviz', 'yahoo_sectors', 'tradingeconomics'] as const) {
    const providerEntries = entries.filter((e) => getProvider(e) === provider);
    if (providerEntries.length === 0) continue;

    const latestTime = Math.max(
      ...providerEntries.map((e) => new Date(e.collectedAt).getTime())
    );
    result[provider] = providerEntries.filter(
      (e) => new Date(e.collectedAt).getTime() === latestTime
    );
  }

  return result;
}

export function isNumericValue(value: string | number): boolean {
  return (
    typeof value === 'number' ||
    (typeof value === 'string' && value !== '' && !isNaN(Number(value)))
  );
}

export function toNumeric(value: string | number): number {
  return typeof value === 'number' ? value : Number(value);
}

/** Heatmap background like Yahoo Finance sectors (green/red intensity). */
export function performanceHeatStyle(pct: number): CSSProperties {
  const clamped = Math.max(-5, Math.min(5, pct));
  if (clamped >= 0) {
    const alpha = 0.15 + (clamped / 5) * 0.55;
    return { backgroundColor: `rgba(34, 197, 94, ${alpha})` };
  }
  const alpha = 0.15 + (Math.abs(clamped) / 5) * 0.55;
  return { backgroundColor: `rgba(239, 68, 68, ${alpha})` };
}

export function performanceTextClass(pct: number): string {
  if (pct > 0.05) return 'text-positive';
  if (pct < -0.05) return 'text-negative';
  return 'text-text-secondary';
}

export function formatPct(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}
