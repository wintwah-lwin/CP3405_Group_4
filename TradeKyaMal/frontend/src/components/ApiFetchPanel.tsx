'use client';

import { useEffect, useState } from 'react';
import { Download, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import {
  SELECT_CLASS,
  getDefaultFieldValue,
  getFieldOptions,
} from '@/lib/symbols';
import type { DataCollectionEntry } from '@/lib/types';

interface ProviderField {
  name: string;
  label: string;
  placeholder: string;
  required: boolean;
}

interface Provider {
  id: string;
  name: string;
  description: string;
  sourceUrl?: string;
  envKey: string;
  configured: boolean;
  requiresKey?: boolean;
  fields: ProviderField[];
}

interface ApiFetchPanelProps {
  onEntriesFetched: (entries: DataCollectionEntry[]) => void;
}

function buildDefaultFields(provider: Provider): Record<string, string> {
  const defaults: Record<string, string> = {};
  for (const field of provider.fields) {
    defaults[field.name] = getDefaultFieldValue(field.name, provider.id);
  }
  return defaults;
}

export function ApiFetchPanel({ onEntriesFetched }: ApiFetchPanelProps) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selected, setSelected] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    apiFetch<Provider[]>('/api/fetch/providers')
      .then((data) => {
        setProviders(data);
        if (data.length > 0) {
          setSelected(data[0].id);
          setFields(buildDefaultFields(data[0]));
        }
      })
      .catch(() => setProviders([]));
  }, []);

  const active = providers.find((p) => p.id === selected);

  function handleProviderChange(id: string) {
    const provider = providers.find((p) => p.id === id);
    setSelected(id);
    setFields(provider ? buildDefaultFields(provider) : {});
    setError('');
    setSuccess('');
  }

  async function handleFetch(e: React.FormEvent) {
    e.preventDefault();
    if (!active) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const body: Record<string, string> = { provider: active.id };
      for (const field of active.fields) {
        const value = fields[field.name] ?? getDefaultFieldValue(field.name, active.id);
        if (value) body[field.name] = value;
      }

      const result = await apiFetch<{
        count: number;
        entries: DataCollectionEntry[];
      }>('/api/fetch', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      onEntriesFetched(result.entries);
      setSuccess(
        `Fetched and saved ${result.count} data point${result.count !== 1 ? 's' : ''} from ${active.name}`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fetch failed');
    } finally {
      setLoading(false);
    }
  }

  function renderField(field: ProviderField) {
    if (field.name === 'indicator') {
      return (
        <select
          value={fields[field.name] || 'quote'}
          onChange={(e) =>
            setFields((prev) => ({ ...prev, [field.name]: e.target.value }))
          }
          className={SELECT_CLASS}
        >
          <option value="quote">Stock Quote</option>
          <option value="rsi">RSI (14-day)</option>
        </select>
      );
    }

    const options = active ? getFieldOptions(field.name, active.id) : null;
    if (options) {
      return (
        <select
          value={fields[field.name] || options[0]?.value || ''}
          onChange={(e) =>
            setFields((prev) => ({ ...prev, [field.name]: e.target.value }))
          }
          required={field.required}
          className={SELECT_CLASS}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    }

    return (
      <input
        type="text"
        value={fields[field.name] || ''}
        onChange={(e) =>
          setFields((prev) => ({ ...prev, [field.name]: e.target.value }))
        }
        placeholder={field.placeholder}
        required={field.required}
        className={SELECT_CLASS}
      />
    );
  }

  if (providers.length === 0) {
    return (
      <div className="rounded-xl border border-border-subtle bg-surface-raised p-5">
        <h3 className="text-sm font-semibold">Fetch from External APIs</h3>
        <p className="mt-2 text-xs text-text-muted">
          Start the backend and add API keys to backend/.env to enable auto-fetch.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleFetch}
      className="rounded-xl border border-border-subtle bg-surface-raised p-5"
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold">Fetch from External APIs</h3>
          <p className="mt-1 text-xs text-text-muted">
            Pull scorecard data from your three weekly bookmarks — futures, sectors, and calendar events.
          </p>
        </div>
        <Download className="h-4 w-4 text-text-muted" />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-text-secondary">Provider</label>
          <select
            value={selected}
            onChange={(e) => handleProviderChange(e.target.value)}
            className={SELECT_CLASS}
          >
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.configured ? '' : '(key missing)'}
              </option>
            ))}
          </select>
        </div>

        {active?.fields.map((field) => (
          <div key={field.name}>
            <label className="mb-1 block text-xs text-text-secondary">
              {field.label}
            </label>
            {renderField(field)}
          </div>
        ))}
      </div>

      {active && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          {active.configured ? (
            active.requiresKey === false || !active.envKey ? (
              <span className="flex items-center gap-1 text-positive">
                <CheckCircle2 className="h-3.5 w-3.5" /> No API key required
              </span>
            ) : (
              <span className="flex items-center gap-1 text-positive">
                <CheckCircle2 className="h-3.5 w-3.5" /> API key configured
              </span>
            )
          ) : (
            <span className="flex items-center gap-1 text-warning">
              <XCircle className="h-3.5 w-3.5" /> Add {active.envKey} to backend/.env
            </span>
          )}
          {active.sourceUrl && (
            <a
              href={active.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              View source site
            </a>
          )}
          <span className="text-text-muted">· {active.description}</span>
        </div>
      )}

      {error && <p className="mt-3 text-xs text-negative">{error}</p>}
      {success && <p className="mt-3 text-xs text-positive">{success}</p>}

      <button
        type="submit"
        disabled={loading || !active?.configured}
        className="mt-4 flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        Fetch & Save Data
      </button>
    </form>
  );
}
