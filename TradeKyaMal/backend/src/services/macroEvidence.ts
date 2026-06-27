import { DataCollection } from '../models/DataCollection';

/** Finviz tickers → display name (USD/DX/DXY are the same dollar index) */
const MACRO_COMMODITY_MAP: Record<string, string> = {
  CL: 'WTI Crude Oil',
  GC: 'Gold',
  DX: 'DXY (Dollar)',
  DXY: 'DXY (Dollar)',
  USD: 'DXY (Dollar)',
};

const MACRO_COMMODITY_ORDER = ['CL', 'GC', 'DX', 'DXY', 'USD'];

/** Yahoo Finance symbols for spot/futures prices (Finviz only gives % change) */
const YAHOO_PRICE_SYMBOL: Record<string, string> = {
  CL: 'CL=F',
  GC: 'GC=F',
  DX: 'DX-Y.NYB',
  DXY: 'DX-Y.NYB',
  USD: 'DX-Y.NYB',
};

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';

async function fetchYahooPrice(yahooSymbol: string): Promise<number | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=1d`;
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      chart?: { result?: { meta?: { regularMarketPrice?: number } }[] };
    };
    return data.chart?.result?.[0]?.meta?.regularMarketPrice ?? null;
  } catch {
    return null;
  }
}

function formatPrice(value: number, symbol: string): string {
  if (symbol === 'GC' || symbol === 'GC=F') return value.toFixed(2);
  return value.toFixed(2);
}

async function enrichCommodityPrices(
  commodities: {
    name: string;
    price: string;
    weeklyChange: string;
    direction: string;
    symbol: string;
    fromDataCollection: boolean;
  }[]
) {
  await Promise.all(
    commodities.map(async (item) => {
      const yahoo = YAHOO_PRICE_SYMBOL[item.symbol.toUpperCase()];
      if (!yahoo) return;
      const price = await fetchYahooPrice(yahoo);
      if (price != null) {
        item.price = formatPrice(price, item.symbol);
      }
    })
  );
}

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

function formatDayReturn(value: string | number): string {
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  if (isNaN(num)) return String(value);
  const sign = num > 0 ? '+' : '';
  return `${sign}${num.toFixed(2)}%`;
}

export async function getMacroEvidenceFromCollection() {
  const finvizEntries = await DataCollection.find({
    'metadata.provider': 'finviz',
  })
    .sort({ collectedAt: -1 })
    .limit(200)
    .lean();

  const sectorEntries = await DataCollection.find({
    'metadata.provider': 'yahoo_sectors',
  })
    .sort({ collectedAt: -1 })
    .limit(50)
    .lean();

  let commodities: {
    name: string;
    price: string;
    weeklyChange: string;
    direction: string;
    symbol: string;
    fromDataCollection: boolean;
  }[] = [];

  let finvizCollectedAt: Date | null = null;
  let finvizTimeframe: string | null = null;

  if (finvizEntries.length > 0) {
    const latestFinvizTime = finvizEntries[0].collectedAt.getTime();
    finvizCollectedAt = new Date(latestFinvizTime);
    finvizTimeframe = String(finvizEntries[0].metadata?.timeframe ?? 'W');
    const latestFinviz = finvizEntries.filter(
      (e) => e.collectedAt.getTime() === latestFinvizTime
    );

    const bySymbol = new Map<string, (typeof latestFinviz)[0]>();
    for (const e of latestFinviz) {
      const sym = e.symbol.toUpperCase();
      if (MACRO_COMMODITY_MAP[sym]) {
        bySymbol.set(sym, e);
      }
    }

    const seenNames = new Set<string>();
    for (const ticker of MACRO_COMMODITY_ORDER) {
      const entry = bySymbol.get(ticker);
      if (!entry) continue;

      const name = MACRO_COMMODITY_MAP[ticker];
      if (seenNames.has(name)) continue;
      seenNames.add(name);

      commodities.push({
        name,
        price: '—',
        weeklyChange: formatWeeklyChange(entry.value),
        direction: directionFromChange(entry.value),
        symbol: entry.symbol,
        fromDataCollection: true,
      });
    }
  }

  if (commodities.length > 0) {
    await enrichCommodityPrices(commodities);
  }

  let sectors: {
    symbol: string;
    name: string;
    price: string;
    dayReturn: string;
    direction: string;
    fromDataCollection: boolean;
  }[] = [];

  let sectorsCollectedAt: Date | null = null;

  if (sectorEntries.length > 0) {
    sectorsCollectedAt = sectorEntries[0].collectedAt;
    const latestSectorTime = sectorEntries[0].collectedAt.getTime();
    const latestSectors = sectorEntries.filter(
      (e) => e.collectedAt.getTime() === latestSectorTime
    );

    sectors = latestSectors.map((e) => ({
      symbol: e.symbol,
      name: String(e.metadata?.sectorName ?? e.label).split(' — ')[0],
      price: String(e.metadata?.price ?? '—'),
      dayReturn: formatDayReturn(e.value),
      direction: directionFromChange(e.value),
      fromDataCollection: true,
    }));
  }

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
    sectors,
    finvizCollectedAt,
    finvizTimeframe,
    calendarCollectedAt,
    sectorsCollectedAt,
  };
}
