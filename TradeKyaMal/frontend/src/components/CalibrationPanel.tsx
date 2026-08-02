'use client';

import { ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import { useState } from 'react';
import { MarkdownContent } from '@/components/MarkdownContent';

interface CalibrationPanelProps {
  calibrationLog: string | null;
  learningLog: string | null;
  llmHorserace: string | null;
  pastAccuracyLog: string | null;
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
    <section className="overflow-hidden rounded-xl border border-border-subtle bg-surface-raised">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
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
  calibrationLog,
  learningLog,
  llmHorserace,
  pastAccuracyLog,
}: CalibrationPanelProps) {
  const hasAny = calibrationLog || learningLog || llmHorserace || pastAccuracyLog;

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold">Calibration &amp; Accuracy</h2>

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
