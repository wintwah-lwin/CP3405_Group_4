'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import clsx from 'clsx';
import { MarkdownContent } from '@/components/MarkdownContent';
import { apiFetch } from '@/lib/api';
import { emptyHumanScore, parseHumanScoreMarkdown } from '@/lib/humanScoreUtils';
import type { HumanScoreData, HumanScoreSection } from '@/lib/types';

interface HumanScorePanelProps {
  week: number;
  githubMarkdown: string | null;
}

const SECTIONS: Array<{ key: keyof Pick<HumanScoreData, 'macro' | 'technical' | 'almanac' | 'llmConsensus'>; label: string }> = [
  { key: 'macro', label: 'Macro / News Weight' },
  { key: 'technical', label: 'Technical Structure' },
  { key: 'almanac', label: 'Almanac / Seasonality' },
  { key: 'llmConsensus', label: 'AI Consensus' },
];

function ScoreField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="text-text-muted">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="rounded-md border border-border bg-surface px-2 py-1.5 font-mono text-sm"
      >
        {[-2, -1, 0, 1, 2].map((score) => (
          <option key={score} value={score}>
            {score >= 0 ? `+${score}` : score}
          </option>
        ))}
      </select>
    </label>
  );
}

function SectionEditor({
  title,
  section,
  onChange,
}: {
  title: string;
  section: HumanScoreSection;
  onChange: (section: HumanScoreSection) => void;
}) {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface p-4">
      <p className="mb-3 text-sm font-medium">{title}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <ScoreField
          label="AI Score"
          value={section.aiScore}
          onChange={(aiScore) => onChange({ ...section, aiScore })}
        />
        <ScoreField
          label="Team Score"
          value={section.teamScore}
          onChange={(teamScore) => onChange({ ...section, teamScore })}
        />
      </div>
      <label className="mt-3 flex flex-col gap-1 text-xs">
        <span className="text-text-muted">Notes</span>
        <textarea
          value={section.notes}
          onChange={(e) => onChange({ ...section, notes: e.target.value })}
          rows={3}
          className="rounded-md border border-border bg-surface-raised px-3 py-2 text-sm text-text-secondary"
          placeholder="Why does the team agree or disagree with the AI?"
        />
      </label>
    </div>
  );
}

export function HumanScorePanel({ week, githubMarkdown }: HumanScorePanelProps) {
  const [form, setForm] = useState<HumanScoreData>(() => emptyHumanScore(week));
  const [previewMarkdown, setPreviewMarkdown] = useState<string | null>(null);
  const [source, setSource] = useState<'saved' | 'github' | 'empty'>('empty');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const loadScores = useCallback(async () => {
    setLoading(true);
    setMessage('');
    try {
      const response = await apiFetch<{
        saved: boolean;
        data: HumanScoreData | null;
      }>(`/api/human-score/${week}`);

      if (response.saved && response.data) {
        setForm({ ...emptyHumanScore(week), ...response.data, week });
        setPreviewMarkdown(response.data.markdown ?? null);
        setSource('saved');
        return;
      }

      if (githubMarkdown) {
        const parsed = parseHumanScoreMarkdown(week, githubMarkdown);
        setForm(parsed);
        setPreviewMarkdown(githubMarkdown);
        setSource('github');
        return;
      }

      setForm(emptyHumanScore(week));
      setPreviewMarkdown(null);
      setSource('empty');
    } catch {
      if (githubMarkdown) {
        const parsed = parseHumanScoreMarkdown(week, githubMarkdown);
        setForm(parsed);
        setPreviewMarkdown(githubMarkdown);
        setSource('github');
      } else {
        setForm(emptyHumanScore(week));
        setSource('empty');
      }
      setMessage('Backend unavailable — scores will not persist until the API is online.');
    } finally {
      setLoading(false);
    }
  }, [week, githubMarkdown]);

  useEffect(() => {
    loadScores();
  }, [loadScores]);

  async function handleSave() {
    setSaving(true);
    setMessage('');
    try {
      const payload = {
        macro: form.macro,
        technical: form.technical,
        almanac: form.almanac,
        llmConsensus: form.llmConsensus,
        finalBias: form.finalBias,
        confidence: form.confidence,
      };
      const response = await apiFetch<{ markdown: string; updatedAt: string }>(
        `/api/human-score/${week}`,
        { method: 'PUT', body: JSON.stringify(payload) }
      );
      setPreviewMarkdown(response.markdown);
      setSource('saved');
      setMessage(`Saved for W${week}. This feeds the final prediction agent (1.5× weight).`);
    } catch {
      setMessage('Could not save — check that the backend and MongoDB are running.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-border-subtle bg-surface-raised p-10 text-sm text-text-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading human scores...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted">
            Human Score Entry
          </h2>
          <p className="mt-1 text-xs text-text-secondary">
            Compare AI vs team scores for each agent layer, then set the overall bias for W{week}.
          </p>
          {source !== 'empty' && (
            <p className="mt-1 text-[11px] text-text-muted">
              Source: {source === 'saved' ? 'Saved in database' : 'Loaded from GitHub evidence'}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowPreview((value) => !value)}
            className="rounded-lg border border-border-subtle px-3 py-2 text-xs text-text-secondary hover:bg-surface-overlay"
          >
            {showPreview ? 'Hide preview' : 'Preview markdown'}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={clsx(
              'flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-xs font-medium text-white',
              saving && 'opacity-60'
            )}
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save W{week}
          </button>
        </div>
      </div>

      {message && (
        <p className="rounded-lg border border-border-subtle bg-surface px-4 py-3 text-xs text-text-secondary">
          {message}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {SECTIONS.map(({ key, label }) => (
          <SectionEditor
            key={key}
            title={label}
            section={form[key]}
            onChange={(section) => setForm((current) => ({ ...current, [key]: section }))}
          />
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-text-muted">Human Final Bias</span>
          <input
            type="text"
            value={form.finalBias}
            onChange={(e) => setForm((current) => ({ ...current, finalBias: e.target.value }))}
            placeholder="e.g. Neutral-to-Cautious"
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-text-muted">Confidence</span>
          <select
            value={form.confidence}
            onChange={(e) => setForm((current) => ({ ...current, confidence: e.target.value }))}
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm"
          >
            {['Low', 'Medium', 'High', 'Very High'].map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </label>
      </div>

      {showPreview && previewMarkdown && (
        <section className="rounded-xl border border-border-subtle bg-surface-raised px-5 py-4">
          <h3 className="mb-3 text-sm font-semibold">Markdown preview</h3>
          <MarkdownContent content={previewMarkdown} />
        </section>
      )}
    </div>
  );
}
