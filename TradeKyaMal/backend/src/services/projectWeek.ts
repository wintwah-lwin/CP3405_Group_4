const PROJECT_START = '2026-05-25';
const SINGAPORE_TZ = 'Asia/Singapore';

function getSingaporeDateParts(): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SINGAPORE_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const lookup = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return { year: lookup('year'), month: lookup('month'), day: lookup('day') };
}

export function getProjectWeek(startDate = PROJECT_START): number {
  const { year, month, day } = getSingaporeDateParts();
  const start = new Date(`${startDate}T00:00:00`);
  const now = new Date(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00`);
  const days = Math.floor((now.getTime() - start.getTime()) / 86_400_000);
  return Math.max(1, Math.floor((days - 1) / 7) + 1);
}

export function getDefaultWeek(): number {
  const fromEnv = process.env.EVIDENCE_WEEK;
  if (fromEnv && !Number.isNaN(Number(fromEnv))) return Number(fromEnv);
  return getProjectWeek();
}
