'use client';

import { ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import { useState } from 'react';
import { MarkdownContent } from '@/components/MarkdownContent';
import { Panel } from '@/components/Panel';
import { parseHumanScoreMarkdown, computeHumanScoreTotal } from '@/lib/humanScoreUtils';

interface CalibrationPanelProps {
  week: number;
  calibrationLog: string | null;
  learningLog: string | null;
  llmHorserace: string | null;
  pastAccuracyLog: string | null;
  humanScoreMarkdown?: string | null;
}

function parseCalibrationScore(markdown: string | null): string | null {
  if (!markdown) return null;
  return (
    markdown.match(/\*\*Overall Score:\*\*\s*([\d.]+%)/i)?.[1]
    ?? markdown.match(/Overall Score:\s*([\d.]+%)/i)?.[1]
    ?? null
  );
}

function parseTeamForecast(markdown: string | null): { view: string | null; confidence: string | null } {
  if (!markdown) return { view: null, confidence: null };
  const view =
    markdown.match(/Overall View:\s*\n([^\n]+)/i)?.[1]?.trim()
    ?? markdown.match(/\*\*Team Forecast:\*\*\s*(.+)/i)?.[1]?.trim()
    ?? null;
  const confidence =
    markdown.match(/Confidence:\s*\n([^\n]+)/i)?.[1]?.trim()
    ?? markdown.match(/\*\*Confidence:\*\*\s*(.+)/i)?.[1]?.trim()
    ?? null;
  return { view, confidence };
}

function ReportBlock({
  title,
  markdown,
  defaultOpen = false,
}: {
  title: string;
  markdown: string | null;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  if (!markdown) {
    return (
      <div className="rounded-xl border border-dashed border-border-subtle bg-surface-raised px-5 py-4">
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-1 text-xs text-text-muted">Not available for this week.</p>
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-border-subtle bg-surface-raised/80 shadow-sm shadow-black/10">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-surface-overlay/50"
      >
        <p className="text-sm font-semibold">{title}</p>
        <ChevronDown className={clsx('h-4 w-4 shrink-0 text-text-muted transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="border-t border-border-subtle px-5 py-4">
          <MarkdownContent content={markdown} />
        </div>
      )}
    </section>
  );
}

export function CalibrationPanel({
  week,
  calibrationLog,
  learningLog,
  llmHorserace,
  pastAccuracyLog,
  humanScoreMarkdown,
}: CalibrationPanelProps) {
  const hasAny = calibrationLog || learningLog || llmHorserace || pastAccuracyLog;
  const calibrationScore = parseCalibrationScore(calibrationLog);
  const forecast = parseTeamForecast(calibrationLog);

  const humanParsed = humanScoreMarkdown
    ? parseHumanScoreMarkdown(week, humanScoreMarkdown)
    : null;
  const humanTotal = humanParsed ? computeHumanScoreTotal(humanParsed) : null;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Panel className="border-accent/30 bg-accent/5">
          <p className="text-xs text-text-muted">Calibration Score</p>
          <p className="mt-2 font-mono text-3xl font-bold tabular-nums text-accent">
            {calibrationScore ?? '—'}
          </p>
          <p className="mt-1 text-[11px] text-text-secondary">From last pipeline run</p>
        </Panel>

        {forecast.view && (
          <Panel>
            <p className="text-xs text-text-muted">Team Forecast (W{week})</p>
            <p className="mt-2 text-lg font-semibold">{forecast.view}</p>
            {forecast.confidence && (
              <p className="mt-1 text-xs text-text-secondary">{forecast.confidence} confidence</p>
            )}
          </Panel>
        )}

        {humanParsed && (
          <Panel>
            <p className="text-xs text-text-muted">Human Score (evidence)</p>
            <p className="mt-2 font-mono text-3xl font-bold tabular-nums">
              {humanTotal !== null && humanTotal >= 0 ? '+' : ''}{humanTotal}
            </p>
            <p className="mt-1 text-sm font-medium">{humanParsed.finalBias || '—'}</p>
          </Panel>
        )}
      </div>

      <p className="text-xs text-text-muted">
        Calibration scores update when the pipeline re-runs after market close. Edit scores on the Human Score tab.
      </p>

      {!hasAny && (
        <div className="rounded-xl border border-dashed border-border-subtle bg-surface-raised p-8 text-center text-sm text-text-muted">
          No calibration data for this week.
        </div>
      )}

      <ReportBlock title="Calibration Log" markdown={calibrationLog} defaultOpen />
      <ReportBlock title="Learning Log" markdown={learningLog} />
      <ReportBlock title="LLM Horse Race" markdown={llmHorserace} />
      <ReportBlock title="Past Accuracy Log" markdown={pastAccuracyLog} />
    </div>
  );
}
