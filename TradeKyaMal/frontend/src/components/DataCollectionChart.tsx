'use client';

import { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import { LineChart as LineChartIcon } from 'lucide-react';
import type { DataCollectionEntry } from '@/lib/types';
import { SELECT_CLASS } from '@/lib/symbols';

const CHART_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#ef4444', '#06b6d4'];

interface DataCollectionChartProps {
  entries: DataCollectionEntry[];
}

function isNumericValue(value: string | number): value is number {
  return typeof value === 'number' || (typeof value === 'string' && value !== '' && !isNaN(Number(value)));
}

function toNumeric(value: string | number): number {
  return typeof value === 'number' ? value : Number(value);
}

export function DataCollectionChart({ entries }: DataCollectionChartProps) {
  const numericEntries = useMemo(
    () =>
      entries
        .filter((e) => isNumericValue(e.value))
        .sort(
          (a, b) =>
            new Date(a.collectedAt).getTime() - new Date(b.collectedAt).getTime()
        ),
    [entries]
  );

  const symbols = useMemo(
    () => [...new Set(numericEntries.map((e) => e.symbol))].sort(),
    [numericEntries]
  );

  const [filterSymbol, setFilterSymbol] = useState('all');

  const filtered = useMemo(
    () =>
      filterSymbol === 'all'
        ? numericEntries
        : numericEntries.filter((e) => e.symbol === filterSymbol),
    [numericEntries, filterSymbol]
  );

  const { chartData, seriesKeys } = useMemo(() => {
    const keys = new Set<string>();
    const byTime = new Map<string, Record<string, string | number>>();

    for (const entry of filtered) {
      const time = new Date(entry.collectedAt).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      const seriesKey = `${entry.symbol} · ${entry.label}`;
      keys.add(seriesKey);

      const row = byTime.get(time) ?? { time };
      row[seriesKey] = toNumeric(entry.value);
      byTime.set(time, row);
    }

    return {
      chartData: Array.from(byTime.values()),
      seriesKeys: Array.from(keys),
    };
  }, [filtered]);

  if (numericEntries.length === 0) {
    return (
      <div className="rounded-xl border border-border-subtle bg-surface-raised p-8 text-center">
        <LineChartIcon className="mx-auto h-8 w-8 text-text-muted" />
        <p className="mt-3 text-sm text-text-secondary">No chartable data yet</p>
        <p className="mt-1 text-xs text-text-muted">
          Fetch or add numeric values to see trends over time.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border-subtle bg-surface-raised p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Collection History</h3>
          <p className="mt-0.5 text-xs text-text-muted">
            Track how values change across repeated fetches over time
          </p>
        </div>
        <div className="w-full sm:w-48">
          <select
            value={filterSymbol}
            onChange={(e) => setFilterSymbol(e.target.value)}
            className={SELECT_CLASS}
          >
            <option value="all">All symbols</option>
            {symbols.map((sym) => (
              <option key={sym} value={sym}>
                {sym}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#2a3344" strokeDasharray="3 3" />
            <XAxis
              dataKey="time"
              tick={{ fill: '#5c6b82', fontSize: 11 }}
              tickLine={{ stroke: '#2a3344' }}
              axisLine={{ stroke: '#2a3344' }}
            />
            <YAxis
              tick={{ fill: '#5c6b82', fontSize: 11 }}
              tickLine={{ stroke: '#2a3344' }}
              axisLine={{ stroke: '#2a3344' }}
              width={56}
            />
            <Tooltip
              contentStyle={{
                background: '#161b22',
                border: '1px solid #2a3344',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              labelStyle={{ color: '#8b9cb3' }}
            />
            {seriesKeys.length > 1 && <Legend wrapperStyle={{ fontSize: '11px' }} />}
            {seriesKeys.map((key, i) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={CHART_COLORS[i % CHART_COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
