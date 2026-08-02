import clsx from 'clsx';

function biasTone(bias: string | null): string {
  if (!bias) return 'text-text-muted';
  const value = bias.toLowerCase();
  if (value.includes('bear')) return 'text-negative';
  if (value.includes('bull')) return 'text-positive';
  return 'text-text-primary';
}

function biasBg(bias: string | null): string {
  if (!bias) return 'from-surface-overlay to-surface-raised';
  const value = bias.toLowerCase();
  if (value.includes('bear')) return 'from-negative/10 to-surface-raised';
  if (value.includes('bull')) return 'from-positive/10 to-surface-raised';
  return 'from-accent/10 to-surface-raised';
}

interface FinalPredictionHeroProps {
  week: number;
  bias: string | null;
  confidence: string | null;
  modelScore: string | null;
}

export function FinalPredictionHero({
  week,
  bias,
  confidence,
  modelScore,
}: FinalPredictionHeroProps) {
  if (!bias) return null;

  return (
    <section
      className={clsx(
        'rounded-2xl border border-border-subtle bg-gradient-to-br p-8',
        biasBg(bias)
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
        Week {week} Outlook
      </p>
      <p className={clsx('mt-3 text-4xl font-bold tracking-tight sm:text-5xl', biasTone(bias))}>
        {bias}
      </p>
      <div className="mt-6 flex flex-wrap gap-6 border-t border-border-subtle/60 pt-6">
        {confidence && (
          <div>
            <p className="text-xs text-text-muted">Confidence</p>
            <p className="mt-1 text-lg font-semibold">{confidence}</p>
          </div>
        )}
        {modelScore && (
          <div>
            <p className="text-xs text-text-muted">Model Score</p>
            <p className="mt-1 font-mono text-lg font-semibold">{modelScore}</p>
          </div>
        )}
      </div>
    </section>
  );
}
