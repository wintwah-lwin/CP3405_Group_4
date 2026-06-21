import { DataCollection } from '../models/DataCollection';

const COMMODITY_SYMBOLS = ['CL', 'GC', 'DX', 'DXY'];

function formatWeeklyChange(value: string | number): string {
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  if (isNaN(num)) return String(value);
  const sign = num > 0 ? '+' : '';
  return `${sign}${num.toFixed(2)}%`;
}

function directionFromChange(value: string | number): string {
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  if (isNaN(num) || num === 0) return 'Flat';
  return num > 0 ? 'Rising' : 'Falling';
}

export async function getMacroEvidenceFromCollection() {
  const finvizEntries = await DataCollection.find({
    'metadata.provider': 'finviz',
  })
    .sort({ collectedAt: -1 })
    .limit(200)
    .lean();

  if (finvizEntries.length === 0) {
    return { commodities: [], calendar: [], finvizCollectedAt: null, calendarCollectedAt: null };
  }

  const latestFinvizTime = finvizEntries[0].collectedAt.getTime();
  const latestFinviz = finvizEntries.filter(
    (e) => e.collectedAt.getTime() === latestFinvizTime
  );

  const commodities = latestFinviz
    .filter((e) => COMMODITY_SYMBOLS.includes(e.symbol.toUpperCase()))
    .map((e) => ({
      name: String(e.label).split(' — ')[0],
      price: 'See Finviz',
      weeklyChange: formatWeeklyChange(e.value),
      direction: directionFromChange(e.value),
      symbol: e.symbol,
      fromDataCollection: true,
    }));

  const teEntries = await DataCollection.find({
    'metadata.provider': 'tradingeconomics',
  })
    .sort({ collectedAt: -1 })
    .limit(50)
    .lean();

  let calendar: {
    date: string;
    event: string;
    expected: string;
    previous: string;
    importance: string;
    fromDataCollection: boolean;
  }[] = [];

  let calendarCollectedAt: Date | null = null;

  if (teEntries.length > 0) {
    calendarCollectedAt = teEntries[0].collectedAt;
    const latestTeTime = teEntries[0].collectedAt.getTime();
    const latestTe = teEntries.filter((e) => e.collectedAt.getTime() === latestTeTime);

    calendar = latestTe.slice(0, 10).map((e) => ({
      date: String(e.metadata?.date ?? new Date(e.collectedAt).toLocaleDateString()),
      event: e.label,
      expected: String(e.metadata?.forecast ?? 'N/A'),
      previous: String(e.metadata?.previous ?? 'N/A'),
      importance:
        Number(e.metadata?.importance) >= 3
          ? 'High'
          : Number(e.metadata?.importance) === 2
            ? 'Medium'
            : 'Low',
      fromDataCollection: true,
    }));
  }

  return {
    commodities,
    calendar,
    finvizCollectedAt: new Date(latestFinvizTime),
    calendarCollectedAt,
  };
}
