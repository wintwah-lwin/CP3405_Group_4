import clsx from 'clsx';

function biasTone(bias: string | null): string {
  if (!bias) return 'text-text-muted';
  const value = bias.toLowerCase();
  if (value.includes('bear')) return 'text-negative';
  if (value.includes('bull')) return 'text-positive';
  return 'text-text-primary';
}

function biasRing(bias: string | null): string {
  if (!bias) return 'ring-border-subtle';
  const value = bias.toLowerCase();
  if (value.includes('bear')) return 'ring-negative/30';
  if (value.includes('bull')) return 'ring-positive/30';
  return 'ring-accent/30';
}

function biasGradient(bias: string | null): string {
  if (!bias) return 'from-surface-overlay to-surface-raised';
  const value = bias.toLowerCase();
  if (value.includes('bear')) return 'from-negative/15 via-surface-raised to-surface-raised';
  if (value.includes('bull')) return 'from-positive/15 via-surface-raised to-surface-raised';
  return 'from-accent/15 via-surface-raised to-surface-raised';
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
        'relative overflow-hidden rounded-2xl border bg-gradient-to-br p-8 ring-1',
        biasGradient(bias),
        biasRing(bias)
      )}
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/5 blur-2xl" />
      <p className="text-xs font-medium uppercase tracking-widest text-text-muted">
        Week {week}
      </p>
      <p className={clsx('mt-3 text-4xl font-bold tracking-tight sm:text-5xl', biasTone(bias))}>
        {bias}
      </p>
      <div className="mt-8 grid gap-6 border-t border-border-subtle/60 pt-6 sm:grid-cols-2 lg:grid-cols-3">
        {confidence && (
          <div>
            <p className="text-[11px] uppercase tracking-wider text-text-muted">Confidence</p>
            <p className="mt-1.5 text-xl font-semibold">{confidence}</p>
          </div>
        )}
        {modelScore && (
          <div>
            <p className="text-[11px] uppercase tracking-wider text-text-muted">Model Score</p>
            <p className="mt-1.5 font-mono text-xl font-semibold tabular-nums">{modelScore}</p>
          </div>
        )}
      </div>
    </section>
  );
}
