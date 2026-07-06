'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { ApiFetchPanel } from '@/components/ApiFetchPanel';
import { DataCollectionTable } from '@/components/DataCollectionTable';
import { ScorecardVisualizations } from '@/components/ScorecardVisualizations';
import { DataCollectionChart } from '@/components/DataCollectionChart';
import { DataExportBar } from '@/components/DataExportBar';
import { apiFetch } from '@/lib/api';
import type { DataCollectionEntry } from '@/lib/types';

interface Provider {
  id: string;
  name: string;
  configured: boolean;
}

const SOURCE_INFO = [
  {
    name: 'Finviz Futures',
    type: 'Futures performance scorecard',
    provider: 'finviz',
  },
  {
    name: 'Yahoo Sectors',
    type: 'US sector day returns',
    provider: 'yahoo_sectors',
  },
  {
    name: 'TradingEconomics',
    type: 'Economic calendar events',
    provider: 'tradingeconomics',
  },
];

export default function DataCollectionPage() {
  const [entries, setEntries] = useState<DataCollectionEntry[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      apiFetch<DataCollectionEntry[]>('/api/data-collection'),
      apiFetch<Provider[]>('/api/fetch/providers').catch(() => []),
    ])
      .then(([data, provs]) => {
        setEntries(data);
        setProviders(provs);
      })
      .catch(() => setError('Could not load data. Is the backend running?'))
      .finally(() => setLoading(false));
  }, []);

  function addEntries(newEntries: DataCollectionEntry[]) {
    setEntries((prev) => [...newEntries, ...prev]);
  }

  return (
    <div>
      <PageHeader
        title="Data Collection"
        description="Fetch weekly scorecard data from Finviz, Yahoo Sectors, and TradingEconomics — visualize trends and export your dataset."
      />

      {error && (
        <div className="mb-6 rounded-lg border border-negative/30 bg-negative/10 px-4 py-3 text-sm text-negative">
          {error}
        </div>
      )}

      <div className="mb-6 rounded-xl border border-border-subtle bg-surface-raised p-5">
        <h3 className="text-sm font-semibold">Data Sources</h3>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {SOURCE_INFO.map((source) => {
            const prov = providers.find((p) => p.id === source.provider);
            const status =
              source.provider === 'tradingeconomics' && prov && !prov.configured
                ? 'Optional'
                : prov?.configured
                  ? 'Active'
                  : 'Key needed';

            return (
              <div
                key={source.name}
                className="flex items-center justify-between rounded-lg border border-border-subtle bg-surface px-3 py-2.5"
              >
                <div>
                  <p className="text-xs font-medium">{source.name}</p>
                  <p className="text-[11px] text-text-muted">{source.type}</p>
                </div>
                <span
                  className={`text-[10px] font-medium uppercase tracking-wider ${
                    status === 'Active'
                      ? 'text-positive'
                      : status === 'Optional'
                        ? 'text-text-muted'
                        : 'text-warning'
                  }`}
                >
                  {status}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <ApiFetchPanel onEntriesFetched={addEntries} />

      <div className="mt-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold">
            Collected Data
            {!loading && (
              <span className="ml-2 text-xs font-normal text-text-muted">
                ({entries.length} entries)
              </span>
            )}
          </h3>
          {!loading && <DataExportBar entries={entries} />}
        </div>

        {loading ? (
          <div className="rounded-xl border border-border-subtle bg-surface-raised p-12 text-center text-sm text-text-muted">
            Loading...
          </div>
        ) : (
          <>
            <ScorecardVisualizations entries={entries} />
            <DataCollectionChart entries={entries} />
            <DataCollectionTable
              entries={entries}
              onEntryDeleted={(id) =>
                setEntries((prev) => prev.filter((e) => e._id !== id))
              }
            />
          </>
        )}
      </div>
    </div>
  );
}
