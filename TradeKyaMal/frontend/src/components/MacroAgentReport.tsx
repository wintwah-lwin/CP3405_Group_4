'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Save,
  Loader2,
  RefreshCw,
  Pencil,
  X,
  BarChart3,
  CalendarDays,
  Newspaper,
  TrendingUp,
  Layers,
  Globe,
  Database,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import {
  applyEvidenceToReport,
  createEmptyMacroReport,
  hasLiveData,
} from '@/lib/macroReportUtils';
import type {
  MacroEvidence,
  MacroFetchLiveResponse,
  MacroReport,
  MacroReportResponse,
  MacroSectorItem,
} from '@/lib/types';

const SOURCE_LINKS = {
  finviz: 'https://finviz.com/futures_performance',
  yahoo: 'https://finance.yahoo.com/sectors/',
  te: 'https://tradingeconomics.com/calendar',
};

function biasColor(bias: string): string {
  if (bias.includes('—')) return 'text-text-muted';
  const lower = bias.toLowerCase();
  if (lower.includes('bull')) return 'text-positive';
  if (lower.includes('bear')) return 'text-negative';
  return 'text-warning';
}

function EmptyRow({ cols, message }: { cols: number; message: string }) {
  return (
    <tr>
      <td colSpan={cols} className="py-6 text-center text-xs text-text-muted">
        {message}
      </td>
    </tr>
  );
}

function Section({
  title,
  subtitle,
  icon: Icon,
  badge,
  children,
}: {
  title: string;
  subtitle?: React.ReactNode;
  icon: typeof BarChart3;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-raised p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <Icon className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          <div>
            <h3 className="text-sm font-semibold">{title}</h3>
            {subtitle && (
              <p className="mt-0.5 text-[11px] text-text-muted">{subtitle}</p>
            )}
          </div>
        </div>
        {badge && (
          <span className="rounded-full bg-surface-overlay px-2 py-0.5 text-[10px] uppercase tracking-wider text-text-muted">
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

export function MacroAgentReport() {
  const [report, setReport] = useState<MacroReport>(createEmptyMacroReport());
  const [sectors, setSectors] = useState<MacroSectorItem[]>([]);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fetchingLive, setFetchingLive] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [hasData, setHasData] = useState(false);

  const applyEvidence = useCallback((evidence: MacroEvidence) => {
    setReport((prev) => {
      const { report: next, sectors: nextSectors } = applyEvidenceToReport(prev, evidence);
      setSectors(nextSectors);
      setHasData(hasLiveData(evidence));
      return next;
    });
  }, []);

  useEffect(() => {
    Promise.all([
      apiFetch<MacroReportResponse>('/api/agents/macro/report'),
      apiFetch<MacroEvidence>('/api/agents/macro/evidence'),
    ])
      .then(([saved, evidence]) => {
        if (saved.report) {
          setReport(saved.report);
          setSavedAt(saved.savedAt ?? null);
        }
        if (hasLiveData(evidence)) {
          applyEvidence(evidence);
        }
      })
      .catch(() => {
        setError('Start with Fetch Live Data — no saved report found');
      })
      .finally(() => setLoading(false));
  }, [applyEvidence]);

  async function handleFetchLive() {
    setFetchingLive(true);
    setError('');
    setSuccess('');
    try {
      const data = await apiFetch<MacroFetchLiveResponse>('/api/agents/macro/fetch-live', {
        method: 'POST',
      });
      applyEvidence(data.evidence);

      const { finviz, sectors: sectorCount, calendar, errors } = data.fetch;
      const summary = `Live fetch: Finviz ${finviz} rows · Yahoo ${sectorCount} sectors · Calendar ${calendar} events`;
      setSuccess(errors.length ? `${summary}. Warnings: ${errors.join('; ')}` : summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Live fetch failed');
    } finally {
      setFetchingLive(false);
    }
  }

  async function handlePullFromCollection() {
    setPulling(true);
    setError('');
    setSuccess('');
    try {
      const evidence = await apiFetch<MacroEvidence>('/api/agents/macro/evidence');
      if (!hasLiveData(evidence)) {
        setError('No data in collection — click Fetch Live Data first');
        return;
      }
      applyEvidence(evidence);
      setSuccess('Loaded latest data from Data Collection');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pull failed');
    } finally {
      setPulling(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const result = await apiFetch<{ savedAt: string }>('/api/agents/macro/report', {
        method: 'POST',
        body: JSON.stringify(report),
      });
      setSavedAt(result.savedAt);
      setEditing(false);
      setSuccess('Report saved');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-border-subtle bg-surface-raised p-12 text-center text-sm text-text-muted">
        Loading macro report...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Action bar */}
      <div className="rounded-xl border border-border-subtle bg-surface-raised p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Macro data sources</p>
            <p className="mt-1 text-xs text-text-muted">
              Week of {report.weekOf} · {report.sourcesAccessed}
              {savedAt && <span> · Saved {new Date(savedAt).toLocaleString()}</span>}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleFetchLive}
              disabled={fetchingLive}
              className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
            >
              {fetchingLive ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Globe className="h-3.5 w-3.5" />
              )}
              Fetch Live Data
            </button>
            <button
              type="button"
              onClick={handlePullFromCollection}
              disabled={pulling}
              className="flex items-center gap-1.5 rounded-lg border border-border-subtle bg-surface px-3 py-2 text-xs text-text-secondary hover:border-accent disabled:opacity-50"
            >
              {pulling ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Database className="h-3.5 w-3.5" />
              )}
              Pull from Collection
            </button>
            {editing ? (
              <>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="flex items-center gap-1.5 rounded-lg border border-border-subtle px-3 py-2 text-xs"
                >
                  <X className="h-3.5 w-3.5" /> Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1.5 rounded-lg bg-positive px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Save
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 rounded-lg border border-border-subtle px-3 py-2 text-xs text-text-secondary hover:border-accent"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit manual sections
              </button>
            )}
          </div>
        </div>

        {!hasData && (
          <p className="mt-3 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
            No live data yet. Click <strong>Fetch Live Data</strong> to pull from Finviz + Yahoo
            (same sources as Data Collection).
          </p>
        )}

        {error && (
          <p className="mt-3 rounded-lg border border-negative/30 bg-negative/10 px-3 py-2 text-xs text-negative">
            {error}
          </p>
        )}
        {success && (
          <p className="mt-3 rounded-lg border border-positive/30 bg-positive/10 px-3 py-2 text-xs text-positive">
            {success}
          </p>
        )}
      </div>

      {/* Live data — commodities */}
      <Section
        title="Commodities & Dollar"
        subtitle={
          <a
            href={SOURCE_LINKS.finviz}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            finviz.com/futures_performance · 1W
          </a>
        }
        icon={BarChart3}
        badge="Live fetch"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-xs text-text-muted">
                <th className="py-2 pr-4">Asset</th>
                <th className="py-2 pr-4">Price (Yahoo)</th>
                <th className="py-2 pr-4">Weekly % (Finviz)</th>
                <th className="py-2">Direction</th>
              </tr>
            </thead>
            <tbody>
              {report.commodities.items.length === 0 ? (
                <EmptyRow cols={4} message="Fetch live data to populate commodities" />
              ) : (
                report.commodities.items.map((item) => (
                  <tr key={item.name} className="border-b border-border-subtle last:border-0">
                    <td className="py-2 pr-4 font-medium">{item.name}</td>
                    <td className="py-2 pr-4 font-mono text-xs">{item.price}</td>
                    <td className="py-2 pr-4 font-mono text-xs">{item.weeklyChange}</td>
                    <td className="py-2 text-text-secondary">{item.direction}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {editing ? (
          <textarea
            value={report.commodities.crossAssetImplication}
            onChange={(e) =>
              setReport({
                ...report,
                commodities: { ...report.commodities, crossAssetImplication: e.target.value },
              })
            }
            rows={2}
            className="mt-4 w-full rounded border border-border bg-surface px-2 py-1 text-sm"
            placeholder="Cross-asset implication (manual)"
          />
        ) : (
          <p className="mt-4 text-sm text-text-secondary">
            {report.commodities.crossAssetImplication}
          </p>
        )}
      </Section>

      {/* Live data — sectors */}
      <Section
        title="US Sector ETFs"
        subtitle="finance.yahoo.com/sectors via yfinance"
        icon={Layers}
        badge="Live fetch"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-xs text-text-muted">
                <th className="py-2 pr-4">ETF</th>
                <th className="py-2 pr-4">Sector</th>
                <th className="py-2 pr-4">Price</th>
                <th className="py-2 pr-4">Day %</th>
                <th className="py-2">Direction</th>
              </tr>
            </thead>
            <tbody>
              {sectors.length === 0 ? (
                <EmptyRow cols={5} message="Fetch live data to populate sectors" />
              ) : (
                sectors.map((s) => (
                  <tr key={s.symbol} className="border-b border-border-subtle last:border-0">
                    <td className="py-2 pr-4 font-mono text-xs">{s.symbol}</td>
                    <td className="py-2 pr-4 font-medium">{s.name}</td>
                    <td className="py-2 pr-4 font-mono text-xs">{s.price}</td>
                    <td className="py-2 pr-4 font-mono text-xs">{s.dayReturn}</td>
                    <td className="py-2 text-text-secondary">{s.direction}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Live data — calendar */}
      <Section
        title="Economic Calendar"
        subtitle="tradingeconomics.com/calendar (requires API key on backend)"
        icon={CalendarDays}
        badge="Live fetch"
      >
        {report.calendar.length === 0 ? (
          <p className="text-xs text-text-muted">
            No calendar events — add TRADING_ECONOMICS_API_KEY to backend/.env and fetch live.
          </p>
        ) : (
          <div className="space-y-2">
            {report.calendar.map((item, i) => (
              <div
                key={`${item.date}-${i}`}
                className="rounded-lg border border-border-subtle border-l-4 border-l-accent bg-surface px-3 py-2.5"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-xs font-medium">{item.event}</p>
                  <span className="rounded-full bg-surface-overlay px-2 py-0.5 text-[10px] text-text-muted">
                    {item.importance}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-text-muted">{item.date}</p>
                <p className="mt-1 text-[11px]">
                  Expected: {item.expected} · Previous: {item.previous}
                </p>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Manual sections */}
      <Section title="Fed & Rates" subtitle="CME FedWatch + Treasury.gov" icon={TrendingUp} badge="Manual">
        <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {(
            [
              ['Current rate', report.fedRates.currentRate],
              ['Next FOMC', report.fedRates.nextFomcDate],
              ['Hold prob', report.fedRates.holdProb],
              ['Hike prob', report.fedRates.hikeProb],
              ['Cut prob', report.fedRates.cutProb],
              ['2Y yield', report.fedRates.yield2y],
              ['10Y yield', report.fedRates.yield10y],
              ['30Y yield', report.fedRates.yield30y],
            ] as const
          ).map(([label, value]) => (
            <p key={label}>
              <span className="text-text-muted">{label}:</span>{' '}
              {editing ? (
                <input
                  value={value}
                  onChange={(e) =>
                    setReport({
                      ...report,
                      fedRates: {
                        ...report.fedRates,
                        [label === 'Current rate'
                          ? 'currentRate'
                          : label === 'Next FOMC'
                            ? 'nextFomcDate'
                            : label === 'Hold prob'
                              ? 'holdProb'
                              : label === 'Hike prob'
                                ? 'hikeProb'
                                : label === 'Cut prob'
                                  ? 'cutProb'
                                  : label === '2Y yield'
                                    ? 'yield2y'
                                    : label === '10Y yield'
                                      ? 'yield10y'
                                      : 'yield30y']: e.target.value,
                      },
                    })
                  }
                  className="mt-0.5 w-full rounded border border-border bg-surface px-2 py-0.5 text-xs"
                />
              ) : (
                value
              )}
            </p>
          ))}
        </div>
      </Section>

      <div className="grid gap-4 rounded-xl border border-border-subtle bg-surface-raised p-5 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-text-muted">Macro Bias</p>
          {editing ? (
            <input
              value={report.macroBias}
              onChange={(e) => setReport({ ...report, macroBias: e.target.value })}
              className="mt-1 w-full rounded border border-border bg-surface px-2 py-1 text-sm"
            />
          ) : (
            <p className={`mt-1 text-lg font-semibold ${biasColor(report.macroBias)}`}>
              {report.macroBias}
            </p>
          )}
        </div>
        <div className="sm:col-span-2">
          <p className="text-[10px] uppercase tracking-wider text-text-muted">Primary Driver</p>
          {editing ? (
            <textarea
              value={report.primaryDriver}
              onChange={(e) => setReport({ ...report, primaryDriver: e.target.value })}
              rows={2}
              className="mt-1 w-full rounded border border-border bg-surface px-2 py-1 text-sm"
            />
          ) : (
            <p className="mt-1 text-sm">{report.primaryDriver}</p>
          )}
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-text-muted">Confidence</p>
          {editing ? (
            <input
              value={report.confidence}
              onChange={(e) => setReport({ ...report, confidence: e.target.value })}
              className="mt-1 w-full rounded border border-border bg-surface px-2 py-1 text-sm"
            />
          ) : (
            <p className="mt-1 text-sm">{report.confidence}</p>
          )}
        </div>
      </div>

      <Section title="Earnings" subtitle="Earnings Whispers" icon={TrendingUp} badge="Manual">
        {report.earnings.length === 0 ? (
          <p className="text-xs text-text-muted">Add earnings manually in Edit mode</p>
        ) : (
          report.earnings.map((e) => (
            <div key={e.company} className="mb-2 rounded-lg border border-border-subtle px-3 py-2">
              <p className="text-xs font-medium">{e.company}</p>
            </div>
          ))
        )}
      </Section>

      <Section title="News" subtitle="Reuters / AP" icon={Newspaper} badge="Manual">
        {report.news.length === 0 ? (
          <p className="text-xs text-text-muted">Add news manually in Edit mode</p>
        ) : (
          report.news.map((n, i) => (
            <div key={i} className="mb-2 rounded-lg border border-border-subtle px-3 py-2">
              <p className="text-xs font-medium">{n.headline}</p>
            </div>
          ))
        )}
      </Section>
    </div>
  );
}
