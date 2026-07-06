'use client';

import { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
  ReferenceLine,
} from 'recharts';
import { BarChart3, LayoutGrid, CalendarDays } from 'lucide-react';
import type { DataCollectionEntry } from '@/lib/types';
import {
  getLatestBatchByProvider,
  isNumericValue,
  toNumeric,
  performanceHeatStyle,
  performanceTextClass,
  formatPct,
} from '@/lib/chartUtils';

interface ScorecardVisualizationsProps {
  entries: DataCollectionEntry[];
}

function FinvizFuturesChart({ entries }: { entries: DataCollectionEntry[] }) {
  const [groupFilter, setGroupFilter] = useState('all');

  const groups = useMemo(
    () =>
      [...new Set(entries.map((e) => String(e.metadata?.group ?? 'Other')))].sort(),
    [entries]
  );

  const chartData = useMemo(() => {
    const filtered =
      groupFilter === 'all'
        ? entries
        : entries.filter((e) => e.metadata?.group === groupFilter);

    return filtered
      .filter((e) => isNumericValue(e.value))
      .map((e) => ({
        name: e.symbol,
        label: String(e.label).split(' — ')[0],
        group: String(e.metadata?.group ?? ''),
        perf: toNumeric(e.value),
      }))
      .sort((a, b) => b.perf - a.perf);
  }, [entries, groupFilter]);

  const height = Math.max(320, chartData.length * 22);

  return (
    <div className="rounded-xl border border-border-subtle bg-surface-raised p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <BarChart3 className="mt-0.5 h-4 w-4 text-accent" />
          <div>
            <h3 className="text-sm font-semibold">Finviz Futures Performance</h3>
            <p className="mt-0.5 text-xs text-text-muted">
              Horizontal scorecard — green gains, red losses (like finviz.com/futures_performance)
            </p>
          </div>
        </div>
        <select
          value={groupFilter}
          onChange={(e) => setGroupFilter(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs outline-none focus:border-accent"
        >
          <option value="all">All groups</option>
          {groups.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 overflow-x-auto">
        <div style={{ height, minWidth: 480 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
            >
              <CartesianGrid stroke="#2a3344" strokeDasharray="3 3" horizontal={false} />
              <XAxis
                type="number"
                unit="%"
                tick={{ fill: '#5c6b82', fontSize: 11 }}
                tickLine={{ stroke: '#2a3344' }}
                axisLine={{ stroke: '#2a3344' }}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={44}
                tick={{ fill: '#8b9cb3', fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: '#2a3344' }}
              />
              <ReferenceLine x={0} stroke="#5c6b82" />
              <Tooltip
                contentStyle={{
                  background: '#161b22',
                  border: '1px solid #2a3344',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value) =>
                  [formatPct(Number(value ?? 0)), 'Performance'] as [string, string]
                }
                labelFormatter={(_, payload) => {
                  const row = payload?.[0]?.payload;
                  return row ? `${row.label} (${row.group})` : '';
                }}
              />
              <Bar dataKey="perf" radius={[0, 4, 4, 0]} maxBarSize={14}>
                {chartData.map((row) => (
                  <Cell
                    key={row.name}
                    fill={row.perf >= 0 ? '#22c55e' : '#ef4444'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function YahooSectorsHeatmap({ entries }: { entries: DataCollectionEntry[] }) {
  const cells = useMemo(
    () =>
      entries
        .filter((e) => isNumericValue(e.value))
        .map((e) => ({
          symbol: e.symbol,
          name: String(e.metadata?.sectorName ?? e.label),
          perf: toNumeric(e.value),
        }))
        .sort((a, b) => b.perf - a.perf),
    [entries]
  );

  return (
    <div className="rounded-xl border border-border-subtle bg-surface-raised p-5">
      <div className="flex items-start gap-2">
        <LayoutGrid className="mt-0.5 h-4 w-4 text-accent" />
        <div>
          <h3 className="text-sm font-semibold">Yahoo Finance Sectors</h3>
          <p className="mt-0.5 text-xs text-text-muted">
            Sector heatmap by day return % (like finance.yahoo.com/sectors)
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {cells.map((cell) => (
          <div
            key={cell.symbol}
            className="rounded-lg border border-border-subtle p-3 transition-transform hover:scale-[1.02]"
            style={performanceHeatStyle(cell.perf)}
          >
            <p className="text-[11px] font-medium text-text-primary">{cell.name}</p>
            <p className="text-[10px] text-text-muted">{cell.symbol}</p>
            <p className={`mt-2 text-lg font-semibold ${performanceTextClass(cell.perf)}`}>
              {formatPct(cell.perf)}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-[10px] text-text-muted">
        <span>Day return scale:</span>
        {['<= -3', '-2', '-1', '0', '1', '2', '>= 3'].map((label, i) => {
          const pct = [-4, -2, -1, 0, 1, 2, 4][i];
          return (
            <span
              key={label}
              className="rounded px-2 py-0.5"
              style={performanceHeatStyle(pct)}
            >
              {label}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function TradingEconomicsCalendar({ entries }: { entries: DataCollectionEntry[] }) {
  const events = useMemo(
    () =>
      [...entries].sort((a, b) => {
        const impA = Number(a.metadata?.importance ?? 0);
        const impB = Number(b.metadata?.importance ?? 0);
        return impB - impA;
      }),
    [entries]
  );

  function importanceClass(importance: unknown): string {
    const level = Number(importance);
    if (level >= 3) return 'border-l-negative bg-negative/10';
    if (level === 2) return 'border-l-warning bg-warning/10';
    return 'border-l-accent bg-accent/5';
  }

  return (
    <div className="rounded-xl border border-border-subtle bg-surface-raised p-5">
      <div className="flex items-start gap-2">
        <CalendarDays className="mt-0.5 h-4 w-4 text-accent" />
        <div>
          <h3 className="text-sm font-semibold">TradingEconomics Calendar</h3>
          <p className="mt-0.5 text-xs text-text-muted">
            Today&apos;s events by importance (like tradingeconomics.com/calendar)
          </p>
        </div>
      </div>

      <div className="mt-4 max-h-80 space-y-2 overflow-y-auto">
        {events.map((event) => (
          <div
            key={event._id}
            className={`rounded-lg border border-border-subtle border-l-4 px-3 py-2.5 ${importanceClass(event.metadata?.importance)}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="text-xs font-medium text-text-primary">{event.label}</p>
              <span className="rounded-full bg-surface-overlay px-2 py-0.5 text-[10px] text-text-muted">
                {String(event.metadata?.country ?? event.symbol)}
              </span>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-3 text-[11px]">
              <span>
                <span className="text-text-muted">Actual: </span>
                <span className="font-mono text-text-primary">{String(event.value)}</span>
              </span>
              {event.metadata?.forecast != null && (
                <span>
                  <span className="text-text-muted">Forecast: </span>
                  <span className="font-mono">{String(event.metadata.forecast)}</span>
                </span>
              )}
              {event.metadata?.previous != null && (
                <span>
                  <span className="text-text-muted">Previous: </span>
                  <span className="font-mono">{String(event.metadata.previous)}</span>
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ScorecardVisualizations({ entries }: ScorecardVisualizationsProps) {
  const batches = useMemo(() => getLatestBatchByProvider(entries), [entries]);
  const hasAny =
    batches.finviz?.length ||
    batches.yahoo_sectors?.length ||
    batches.tradingeconomics?.length;

  if (!hasAny) {
    return (
      <div className="rounded-xl border border-border-subtle bg-surface-raised p-8 text-center">
        <BarChart3 className="mx-auto h-8 w-8 text-text-muted" />
        <p className="mt-3 text-sm text-text-secondary">No scorecard charts yet</p>
        <p className="mt-1 text-xs text-text-muted">
          Fetch from Finviz, Yahoo Sectors, or TradingEconomics to see website-style graphs.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {batches.finviz && batches.finviz.length > 0 && (
        <FinvizFuturesChart entries={batches.finviz} />
      )}
      {batches.yahoo_sectors && batches.yahoo_sectors.length > 0 && (
        <YahooSectorsHeatmap entries={batches.yahoo_sectors} />
      )}
      {batches.tradingeconomics && batches.tradingeconomics.length > 0 && (
        <TradingEconomicsCalendar entries={batches.tradingeconomics} />
      )}
    </div>
  );
}
