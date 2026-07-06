'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, RefreshCw, ExternalLink, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import type { MacroEvidence, MacroFetchLiveResponse, MacroSectorItem } from '@/lib/types';

const FINVIZ_URL = 'https://finviz.com/futures_performance';

function pctColor(value: number): string {
  if (value > 0) return 'text-positive';
  if (value < 0) return 'text-negative';
  return 'text-text-muted';
}

function DirectionIcon({ value }: { value: number }) {
  if (value > 0) return <TrendingUp className="h-3.5 w-3.5 text-positive" />;
  if (value < 0) return <TrendingDown className="h-3.5 w-3.5 text-negative" />;
  return <Minus className="h-3.5 w-3.5 text-text-muted" />;
}

function SectorBar({ name, symbol, pct }: { name: string; symbol: string; pct: number }) {
  const width = Math.min(Math.abs(pct) * 8, 100);
  const color = pct >= 0 ? 'bg-positive' : 'bg-negative';

  return (
    <div className="flex items-center gap-3">
      <div className="w-28 shrink-0">
        <p className="text-xs font-medium">{name}</p>
        <p className="font-mono text-[10px] text-text-muted">{symbol}</p>
      </div>
      <div className="relative h-6 flex-1 overflow-hidden rounded bg-surface">
        <div
          className={`absolute left-0 top-0 h-full ${color} opacity-80`}
          style={{ width: `${width}%` }}
        />
      </div>
      <span className={`w-14 text-right font-mono text-xs ${pctColor(pct)}`}>
        {pct >= 0 ? '+' : ''}
        {pct.toFixed(2)}%
      </span>
    </div>
  );
}

export function MacroAgentReport() {
  const [evidence, setEvidence] = useState<MacroEvidence | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState('');

  const loadLive = useCallback(async (showSpinner = true) => {
    if (showSpinner) setRefreshing(true);
    setError('');
    try {
      const data = await apiFetch<MacroFetchLiveResponse>('/api/agents/macro/fetch-live', {
        method: 'POST',
      });
      setEvidence(data.evidence);
      if (data.fetch.errors.length > 0) {
        setError(data.fetch.errors.join(' · '));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not fetch from Finviz');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadLive(false);
  }, [loadLive]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-border-subtle bg-surface-raised p-16 text-sm text-text-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        Fetching live data from Finviz...
      </div>
    );
  }

  const commodities = evidence?.commodities ?? [];
  const sectors = evidence?.sectors ?? [];
  const futures = evidence?.futures ?? [];
  const fetchedAt = evidence?.finvizCollectedAt
    ? new Date(evidence.finvizCollectedAt).toLocaleString()
    : 'Not yet fetched';

  const sectorPcts: MacroSectorItem[] = sectors;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-subtle bg-surface-raised px-5 py-4">
        <div>
          <p className="text-sm font-medium">Live Macro Snapshot</p>
          <p className="mt-1 text-xs text-text-muted">
            Source:{' '}
            <a href={FINVIZ_URL} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
              finviz.com/futures_performance
            </a>
            {' · '}Updated {fetchedAt}
          </p>
        </div>
        <button
          type="button"
          onClick={() => loadLive(true)}
          disabled={refreshing}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {refreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Refresh
        </button>
      </div>

      {error && (
        <p className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-xs text-warning">
          {error}
        </p>
      )}

      {/* Key commodities — summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {commodities.length === 0 ? (
          <div className="col-span-3 rounded-xl border border-border-subtle bg-surface-raised p-8 text-center text-sm text-text-muted">
            No commodity data — click Refresh to fetch from Finviz
          </div>
        ) : (
          commodities.map((c) => {
            const pct = parseFloat(c.weeklyChange);
            return (
              <div
                key={c.name}
                className="rounded-xl border border-border-subtle bg-surface-raised p-5"
              >
                <div className="flex items-start justify-between">
                  <p className="text-xs text-text-muted">{c.name}</p>
                  <DirectionIcon value={isNaN(pct) ? 0 : pct} />
                </div>
                <p className={`mt-2 text-2xl font-bold ${pctColor(isNaN(pct) ? 0 : pct)}`}>
                  {c.weeklyChange}
                </p>
                <p className="mt-1 font-mono text-sm text-text-secondary">{c.price}</p>
                <p className="mt-1 text-[11px] text-text-muted">1W · Finviz</p>
              </div>
            );
          })
        )}
      </div>

      {/* Finviz futures table */}
      <div className="rounded-xl border border-border-subtle bg-surface-raised p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Finviz Futures — Weekly Performance</h3>
            <p className="text-[11px] text-text-muted">All futures from finviz.com · 1W</p>
          </div>
          <a
            href={FINVIZ_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-accent hover:underline"
          >
            Open Finviz <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <div className="max-h-80 overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-surface-raised">
              <tr className="border-b border-border-subtle text-xs text-text-muted">
                <th className="py-2 pr-3">Ticker</th>
                <th className="py-2 pr-3">Name</th>
                <th className="py-2 pr-3">Group</th>
                <th className="py-2 pr-3 text-right">1W %</th>
                <th className="py-2">Trend</th>
              </tr>
            </thead>
            <tbody>
              {futures.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs text-text-muted">
                    No futures data
                  </td>
                </tr>
              ) : (
                futures.map((f) => (
                  <tr key={f.ticker} className="border-b border-border-subtle/50 last:border-0">
                    <td className="py-1.5 pr-3 font-mono text-xs font-medium">{f.ticker}</td>
                    <td className="py-1.5 pr-3 text-xs">{f.label}</td>
                    <td className="py-1.5 pr-3 text-[11px] text-text-muted">{f.group}</td>
                    <td className={`py-1.5 pr-3 text-right font-mono text-xs ${pctColor(f.value)}`}>
                      {f.weeklyChange}
                    </td>
                    <td className="py-1.5 text-xs text-text-secondary">{f.direction}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sectors bar chart */}
      {sectorPcts.length > 0 && (
        <div className="rounded-xl border border-border-subtle bg-surface-raised p-5">
          <h3 className="text-sm font-semibold">US Sectors — Day Return</h3>
          <p className="mb-4 text-[11px] text-text-muted">Yahoo Finance sector ETFs</p>
          <div className="space-y-3">
            {[...sectorPcts]
              .sort((a, b) => parseFloat(b.dayReturn) - parseFloat(a.dayReturn))
              .map((s) => (
                <SectorBar
                  key={s.symbol}
                  name={s.name}
                  symbol={s.symbol}
                  pct={parseFloat(s.dayReturn)}
                />
              ))}
          </div>
        </div>
      )}

      {/* Simple notes — not the old template */}
      <div className="rounded-xl border border-border-subtle bg-surface-raised p-5">
        <h3 className="text-sm font-semibold">Macro Notes</h3>
        <p className="mb-3 text-[11px] text-text-muted">
          Your bias and observations — not auto-fetched
        </p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="e.g. Oil falling supports disinflation narrative. Dollar rising = headwind for EM. Bias: Neutral..."
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </div>
    </div>
  );
}
