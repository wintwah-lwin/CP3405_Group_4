'use client';

import { useEffect, useState } from 'react';
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
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { DEFAULT_MACRO_REPORT } from '@/lib/defaultMacroReport';
import type { MacroEvidence, MacroReport, MacroReportResponse, MacroSectorItem } from '@/lib/types';

function biasColor(bias: string): string {
  const lower = bias.toLowerCase();
  if (lower.includes('bull')) return 'text-positive';
  if (lower.includes('bear')) return 'text-negative';
  return 'text-warning';
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof BarChart3;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-raised p-5">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-4 w-4 text-accent" />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  );
}

export function MacroAgentReport() {
  const [report, setReport] = useState<MacroReport>(DEFAULT_MACRO_REPORT);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [sectors, setSectors] = useState<MacroSectorItem[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    apiFetch<MacroReportResponse>('/api/agents/macro/report')
      .then((data) => {
        if (data.report) {
          setReport(data.report);
          setSavedAt(data.savedAt ?? null);
        }
      })
      .catch(() => setError('Could not load saved report — using this week\'s template'))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const result = await apiFetch<{ savedAt: string }>('/api/agents/macro/report', {
        method: 'POST',
        body: JSON.stringify(report),
      });
      setSavedAt(result.savedAt);
      setEditing(false);
      setSuccess('Macro report saved');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handlePullEvidence() {
    setPulling(true);
    setError('');
    try {
      const evidence = await apiFetch<MacroEvidence>('/api/agents/macro/evidence');

      setReport((prev) => {
        const next = { ...prev };
        if (evidence.commodities.length > 0) {
          next.commodities = {
            items: evidence.commodities.map((c) => ({
              name: c.name,
              price: c.price,
              weeklyChange: c.weeklyChange,
              direction: c.direction,
            })),
            crossAssetImplication:
              '[Edit after pull — Finviz gives % change only, not spot prices]',
          };
        }
        if (evidence.calendar.length > 0) {
          next.calendar = evidence.calendar.map((c) => ({
            date: c.date,
            event: c.event,
            expected: c.expected,
            previous: c.previous,
            importance: c.importance,
          }));
        }
        return next;
      });

      if (evidence.sectors?.length > 0) {
        setSectors(evidence.sectors);
      }

      const parts: string[] = [];
      if (evidence.commodities.length) parts.push('commodities');
      if (evidence.sectors?.length) parts.push('sectors');
      if (evidence.calendar.length) parts.push('calendar');

      const tf = evidence.finvizTimeframe;
      const tfNote =
        tf && tf !== 'W'
          ? ` Warning: Finviz was fetched as ${tf} not weekly — re-fetch with Weekly on Data Collection.`
          : '';

      setSuccess(
        parts.length > 0
          ? `Updated ${parts.join(', ')} from live fetch. Fed, earnings, news, and bias are NOT auto-updated — edit those manually.${tfNote}`
          : 'No fetched data in database — go to Data Collection, fetch Finviz (Weekly) + Yahoo Sectors, then pull again'
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pull failed');
    } finally {
      setPulling(false);
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-text-muted">
            Week of {report.weekOf} · Source: {report.source}
            {savedAt && (
              <span> · Saved {new Date(savedAt).toLocaleString()}</span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handlePullEvidence}
            disabled={pulling}
            className="flex items-center gap-1.5 rounded-lg border border-border-subtle bg-surface px-3 py-1.5 text-xs text-text-secondary hover:border-accent hover:text-accent disabled:opacity-50"
          >
            {pulling ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Pull from Fetched Data
          </button>
          {editing ? (
            <>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="flex items-center gap-1.5 rounded-lg border border-border-subtle px-3 py-1.5 text-xs text-text-secondary"
              >
                <X className="h-3.5 w-3.5" /> Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Save Report
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 rounded-lg border border-border-subtle bg-surface px-3 py-1.5 text-xs text-text-secondary hover:border-accent hover:text-accent"
            >
              <Pencil className="h-3.5 w-3.5" /> Edit
            </button>
          )}
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-negative/30 bg-negative/10 px-3 py-2 text-xs text-negative">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-lg border border-positive/30 bg-positive/10 px-3 py-2 text-xs text-positive">
          {success}
        </p>
      )}

      <div className="grid gap-4 rounded-xl border border-accent/30 bg-accent/5 p-5 sm:grid-cols-2 lg:grid-cols-4">
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
            <p className="mt-1 text-sm text-text-primary">{report.primaryDriver}</p>
          )}
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-text-muted">Confidence</p>
          {editing ? (
            <textarea
              value={report.confidence}
              onChange={(e) => setReport({ ...report, confidence: e.target.value })}
              rows={2}
              className="mt-1 w-full rounded border border-border bg-surface px-2 py-1 text-sm"
            />
          ) : (
            <p className="mt-1 text-sm text-text-primary">{report.confidence}</p>
          )}
        </div>
        <div className="sm:col-span-4">
          <p className="text-[10px] uppercase tracking-wider text-text-muted">Invalidation</p>
          {editing ? (
            <textarea
              value={report.invalidation}
              onChange={(e) => setReport({ ...report, invalidation: e.target.value })}
              rows={2}
              className="mt-1 w-full rounded border border-border bg-surface px-2 py-1 text-sm"
            />
          ) : (
            <p className="mt-1 text-sm text-text-secondary">{report.invalidation}</p>
          )}
        </div>
      </div>

      <Section title="Fed & Rates (CME FedWatch + Treasury.gov)" icon={TrendingUp}>
        <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <p><span className="text-text-muted">Current rate:</span> {report.fedRates.currentRate}</p>
          <p><span className="text-text-muted">Next FOMC:</span> {report.fedRates.nextFomcDate}</p>
          <p><span className="text-text-muted">Direction vs last week:</span> {report.fedRates.directionVsLastWeek}</p>
          <p><span className="text-text-muted">Hold:</span> {report.fedRates.holdProb}</p>
          <p><span className="text-text-muted">Hike:</span> {report.fedRates.hikeProb}</p>
          <p><span className="text-text-muted">Cut:</span> {report.fedRates.cutProb}</p>
          <p><span className="text-text-muted">2Y yield:</span> {report.fedRates.yield2y}</p>
          <p><span className="text-text-muted">10Y yield:</span> {report.fedRates.yield10y}</p>
          <p><span className="text-text-muted">30Y yield:</span> {report.fedRates.yield30y}</p>
          <p><span className="text-text-muted">Yield curve:</span> {report.fedRates.yieldCurve}</p>
          <p><span className="text-text-muted">10Y direction:</span> {report.fedRates.yield10yDirection}</p>
        </div>
        <p className="mt-4 text-sm text-text-secondary">{report.fedRates.implication}</p>
      </Section>

      <Section title="Commodities & Dollar (Finviz Futures 1W)" icon={BarChart3}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-xs text-text-muted">
                <th className="py-2 pr-4">Asset</th>
                <th className="py-2 pr-4">Price</th>
                <th className="py-2 pr-4">Weekly</th>
                <th className="py-2">Direction</th>
              </tr>
            </thead>
            <tbody>
              {report.commodities.items.map((item) => (
                <tr key={item.name} className="border-b border-border-subtle last:border-0">
                  <td className="py-2 pr-4 font-medium">{item.name}</td>
                  <td className="py-2 pr-4 font-mono text-xs">{item.price}</td>
                  <td className="py-2 pr-4 font-mono text-xs">{item.weeklyChange}</td>
                  <td className="py-2 text-text-secondary">{item.direction}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm text-text-secondary">
          {report.commodities.crossAssetImplication}
        </p>
      </Section>

      {sectors.length > 0 && (
        <Section title="US Sectors (yfinance / Yahoo)" icon={Layers}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border-subtle text-xs text-text-muted">
                  <th className="py-2 pr-4">ETF</th>
                  <th className="py-2 pr-4">Sector</th>
                  <th className="py-2 pr-4">Price</th>
                  <th className="py-2 pr-4">Day</th>
                  <th className="py-2">Direction</th>
                </tr>
              </thead>
              <tbody>
                {sectors.map((s) => (
                  <tr key={s.symbol} className="border-b border-border-subtle last:border-0">
                    <td className="py-2 pr-4 font-mono text-xs">{s.symbol}</td>
                    <td className="py-2 pr-4 font-medium">{s.name}</td>
                    <td className="py-2 pr-4 font-mono text-xs">{s.price}</td>
                    <td className="py-2 pr-4 font-mono text-xs">{s.dayReturn}</td>
                    <td className="py-2 text-text-secondary">{s.direction}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      <Section title="Week-Ahead Calendar (TradingEconomics)" icon={CalendarDays}>
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
        <p className="mt-4 text-sm text-text-secondary">{report.calendarKeyInsight}</p>
      </Section>

      <Section title="Key Earnings This Week (Earnings Whispers)" icon={TrendingUp}>
        <div className="space-y-3">
          {report.earnings.map((e) => (
            <div key={e.company} className="rounded-lg border border-border-subtle px-3 py-2.5">
              <p className="text-xs font-medium">{e.company}</p>
              <p className="mt-1 text-[11px] text-text-muted">
                {e.date} · {e.sector}
              </p>
              <p className="mt-1 text-xs text-text-secondary">{e.watch}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-text-secondary">{report.earningsKeyInsight}</p>
      </Section>

      <Section title="Confirmed News Events (Reuters / AP)" icon={Newspaper}>
        <div className="space-y-3">
          {report.news.map((n, i) => (
            <div key={i} className="rounded-lg border border-border-subtle px-3 py-2.5">
              <p className="text-xs font-medium">{n.headline}</p>
              <p className="mt-1 text-[11px] text-text-muted">
                {n.source} · {n.date}
              </p>
              <p className="mt-1 text-xs text-text-secondary">{n.implication}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-text-secondary">{report.newsKeyInsight}</p>
      </Section>

      <p className="text-center text-[11px] text-text-muted">{report.sourcesAccessed}</p>

    </div>
  );
}
