'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Copy, Loader2, Save } from 'lucide-react';
import clsx from 'clsx';
import { MarkdownContent } from '@/components/MarkdownContent';
import { Panel } from '@/components/Panel';
import { apiFetch } from '@/lib/api';
import {
  applyAgentBiases,
  buildHumanScoreMarkdown,
  computeHumanScoreTotal,
  emptyHumanScore,
  formatScoreBreakdown,
  loadHumanScoreLocal,
  parseHumanScoreMarkdown,
  saveHumanScoreLocal,
} from '@/lib/humanScoreUtils';
import type { HumanScoreData, HumanScoreSection } from '@/lib/types';

interface HumanScorePanelProps {
  week: number;
  githubMarkdown: string | null;
  agentBiases?: Record<string, string | null | undefined>;
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
        className="rounded-lg border border-border bg-surface px-2 py-1.5 font-mono text-sm focus:border-accent/50 focus:outline-none"
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
    <div className="rounded-xl border border-border-subtle bg-surface p-4">
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
          className="rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-text-secondary focus:border-accent/50 focus:outline-none"
          placeholder="Team notes"
        />
      </label>
    </div>
  );
}

export function HumanScorePanel({ week, githubMarkdown, agentBiases = {} }: HumanScorePanelProps) {
  const [form, setForm] = useState<HumanScoreData>(() => emptyHumanScore(week));
  const [previewMarkdown, setPreviewMarkdown] = useState<string | null>(null);
  const [source, setSource] = useState<'saved' | 'github' | 'local' | 'empty'>('empty');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const agentBiasesRef = useRef(agentBiases);
  agentBiasesRef.current = agentBiases;

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
        setPreviewMarkdown(response.data.markdown ?? buildHumanScoreMarkdown({ ...emptyHumanScore(week), ...response.data, week }));
        setSource('saved');
        setLoading(false);
        return;
      }
    } catch {
      // fall through to github / local
    }

    if (githubMarkdown) {
      const parsed = parseHumanScoreMarkdown(week, githubMarkdown);
      setForm(parsed);
      setPreviewMarkdown(githubMarkdown);
      setSource('github');
      setLoading(false);
      return;
    }

    const local = loadHumanScoreLocal(week);
    if (local) {
      setForm(local);
      setPreviewMarkdown(buildHumanScoreMarkdown(local));
      setSource('local');
      setLoading(false);
      return;
    }

    const seeded = applyAgentBiases(emptyHumanScore(week), agentBiasesRef.current);
    setForm(seeded);
    setPreviewMarkdown(null);
    setSource('empty');
    setLoading(false);
  }, [week, githubMarkdown]);

  useEffect(() => {
    loadScores();
  }, [loadScores]);

  async function handleSave() {
    setSaving(true);
    setMessage('');

    const payload = {
      macro: form.macro,
      technical: form.technical,
      almanac: form.almanac,
      llmConsensus: form.llmConsensus,
      wildcard: form.wildcard,
      finalBias: form.finalBias.trim() || 'Pending',
      confidence: form.confidence,
      recommendation: form.recommendation,
    };

    const markdown = buildHumanScoreMarkdown({ ...form, ...payload, week });
    saveHumanScoreLocal({ ...form, ...payload, week, markdown });
    setPreviewMarkdown(markdown);

    try {
      const response = await apiFetch<{ markdown: string; updatedAt: string }>(
        `/api/human-score/${week}`,
        { method: 'PUT', body: JSON.stringify(payload) }
      );
      setPreviewMarkdown(response.markdown);
      setSource('saved');
      setMessage(`Saved to database for W${week}.`);
    } catch {
      setSource('local');
      setMessage('Saved locally — backend offline. Copy markdown to commit to evidence.');
    } finally {
      setSaving(false);
    }
  }

  async function handleCopyMarkdown() {
    const markdown = previewMarkdown ?? buildHumanScoreMarkdown(form);
    try {
      await navigator.clipboard.writeText(markdown);
      setMessage('Markdown copied to clipboard.');
    } catch {
      setMessage('Could not copy — use Preview markdown instead.');
    }
  }

  const humanScoreTotal = computeHumanScoreTotal(form);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-border-subtle bg-surface-raised/80 p-10 text-sm text-text-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">W{week} Scorecard</h2>
          <p className="mt-1 text-[11px] text-text-muted">
            {source === 'saved' && 'Saved in database'}
            {source === 'github' && 'Loaded from evidence'}
            {source === 'local' && 'Saved in browser'}
            {source === 'empty' && 'New entry — AI scores pre-filled from agents'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowPreview((value) => !value)}
            className="rounded-lg border border-border-subtle px-3 py-2 text-xs text-text-secondary hover:border-accent/30"
          >
            {showPreview ? 'Hide preview' : 'Preview'}
          </button>
          <button
            type="button"
            onClick={handleCopyMarkdown}
            className="flex items-center gap-1.5 rounded-lg border border-border-subtle px-3 py-2 text-xs text-text-secondary hover:border-accent/30"
          >
            <Copy className="h-3.5 w-3.5" />
            Copy markdown
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={clsx(
              'flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-accent/20',
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

      <Panel className="border-accent/30 bg-accent/5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs text-text-muted">Live Human Score</p>
            <p className="mt-1 font-mono text-3xl font-bold tabular-nums text-accent">
              {humanScoreTotal >= 0 ? '+' : ''}{humanScoreTotal}
            </p>
            <p className="mt-1 text-[11px] text-text-secondary">{formatScoreBreakdown(form)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-text-muted">Verdict</p>
            <p className="mt-1 text-lg font-semibold">{form.finalBias || '—'}</p>
            <p className="mt-1 text-xs text-text-secondary">{form.confidence}</p>
          </div>
        </div>
      </Panel>

      {!githubMarkdown && source === 'empty' && (
        <p className="rounded-lg border border-dashed border-border-subtle px-4 py-3 text-xs text-text-muted">
          No score file in evidence for W{week}. Enter scores below, then Save or Copy markdown.
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

      <SectionEditor
        title="Wild Card / Human Observation"
        section={form.wildcard}
        onChange={(wildcard) => setForm((current) => ({ ...current, wildcard }))}
      />

      <Panel>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs sm:col-span-2">
            <span className="text-text-muted">Verdict</span>
            <input
              type="text"
              value={form.finalBias}
              onChange={(e) => setForm((current) => ({ ...current, finalBias: e.target.value }))}
              placeholder="e.g. Neutral-Bearish"
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-accent/50 focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-text-muted">Confidence</span>
            <select
              value={form.confidence}
              onChange={(e) => setForm((current) => ({ ...current, confidence: e.target.value }))}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-accent/50 focus:outline-none"
            >
              {['Low', 'Medium', 'High', 'Very High'].map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs sm:col-span-2">
            <span className="text-text-muted">Recommendation</span>
            <textarea
              value={form.recommendation}
              onChange={(e) => setForm((current) => ({ ...current, recommendation: e.target.value }))}
              rows={3}
              placeholder="Investment stance..."
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-secondary focus:border-accent/50 focus:outline-none"
            />
          </label>
        </div>
      </Panel>

      <Panel className="border-accent/30 bg-accent/5">
        <h3 className="text-sm font-semibold text-accent">Final Decision</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-text-muted">Human Score</p>
            <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">
              {humanScoreTotal >= 0 ? '+' : ''}{humanScoreTotal}
            </p>
            <p className="mt-1 text-[11px] text-text-secondary">{formatScoreBreakdown(form)}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted">Verdict</p>
            <p className="mt-1 text-sm font-semibold">{form.finalBias || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted">Confidence</p>
            <p className="mt-1 text-sm font-semibold">{form.confidence}</p>
          </div>
        </div>
        {form.recommendation.trim() && (
          <p className="mt-4 text-sm leading-relaxed text-text-secondary">{form.recommendation}</p>
        )}
      </Panel>

      {showPreview && (
        <Panel>
          <h3 className="mb-3 text-sm font-semibold">Markdown</h3>
          <MarkdownContent content={previewMarkdown ?? buildHumanScoreMarkdown(form)} />
        </Panel>
      )}
    </div>
  );
}
