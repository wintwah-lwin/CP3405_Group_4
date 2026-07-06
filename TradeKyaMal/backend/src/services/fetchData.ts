import { DataCollection } from '../models/DataCollection';
import type { ProviderId } from './providers';

export interface FetchParams {
  provider: ProviderId;
  timeframe?: string;
  sector?: string;
  country?: string;
}

export interface FetchedEntry {
  symbol: string;
  source: string;
  label: string;
  value: string | number;
  metadata?: Record<string, unknown>;
}

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';

interface FinvizFutureRow {
  ticker: string;
  label: string;
  group: string;
  perf: number;
}

const FINVIZ_TIMEFRAME_PARAMS: Record<string, string> = {
  W: '?v=12',
  M: '?v=13',
  Q: '?v=14',
  HY: '?v=15',
  Y: '?v=16',
};

const YAHOO_SECTOR_ETFS: Record<string, { etf: string; name: string }> = {
  technology: { etf: 'XLK', name: 'Technology' },
  financial_services: { etf: 'XLF', name: 'Financial Services' },
  communication_services: { etf: 'XLC', name: 'Communication Services' },
  consumer_cyclical: { etf: 'XLY', name: 'Consumer Cyclical' },
  industrials: { etf: 'XLI', name: 'Industrials' },
  healthcare: { etf: 'XLV', name: 'Healthcare' },
  energy: { etf: 'XLE', name: 'Energy' },
  consumer_defensive: { etf: 'XLP', name: 'Consumer Defensive' },
  basic_materials: { etf: 'XLB', name: 'Basic Materials' },
  real_estate: { etf: 'XLRE', name: 'Real Estate' },
  utilities: { etf: 'XLU', name: 'Utilities' },
};

interface YahooChartMeta {
  regularMarketPrice?: number;
  chartPreviousClose?: number;
  shortName?: string;
  longName?: string;
}

interface TradingEconomicsEvent {
  CalendarId?: string;
  Date?: string;
  Country?: string;
  Category?: string;
  Event?: string;
  Actual?: string | number;
  Previous?: string | number;
  Forecast?: string | number;
  Importance?: number;
}

async function fetchFinviz(timeframe = 'D'): Promise<FetchedEntry[]> {
  const suffix = FINVIZ_TIMEFRAME_PARAMS[timeframe] ?? '';
  const url = `https://finviz.com/futures_performance.ashx${suffix}`;

  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`Finviz request failed (${res.status})`);

  const html = await res.text();
  const match = html.match(/FinvizInitFuturesPerformance\((\[[\s\S]*?\])\)/);
  if (!match) throw new Error('Could not parse Finviz futures data');

  const rows = JSON.parse(match[1]) as FinvizFutureRow[];
  if (rows.length === 0) throw new Error('No futures data returned from Finviz');

  const timeframeLabel =
    timeframe === 'D' ? 'Daily' : `${timeframe} Performance`;

  return rows.map((row) => ({
    symbol: row.ticker,
    source: 'market_price',
    label: `${row.label} — ${timeframeLabel} %`,
    value: row.perf,
    metadata: {
      provider: 'finviz',
      group: row.group,
      timeframe,
      sourceUrl: 'https://finviz.com/futures_performance',
    },
  }));
}

async function fetchYahooSectorEtf(
  sectorId: string,
  etf: string,
  name: string
): Promise<FetchedEntry> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${etf}?interval=1d&range=5d`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`Yahoo Finance request failed for ${etf}`);

  const data = (await res.json()) as {
    chart?: { result?: { meta?: YahooChartMeta }[] };
  };
  const meta = data.chart?.result?.[0]?.meta;
  if (!meta?.regularMarketPrice) {
    throw new Error(`No sector data found for ${name} (${etf})`);
  }

  const price = meta.regularMarketPrice;
  const previous = meta.chartPreviousClose ?? price;
  const dayReturn = previous ? ((price - previous) / previous) * 100 : 0;

  return {
    symbol: etf,
    source: 'market_price',
    label: `${name} — Day Return %`,
    value: Math.round(dayReturn * 100) / 100,
    metadata: {
      provider: 'yahoo_sectors',
      sector: sectorId,
      sectorName: name,
      price,
      previousClose: previous,
      sourceUrl: 'https://finance.yahoo.com/sectors/',
    },
  };
}

async function fetchYahooSectors(sector = 'all'): Promise<FetchedEntry[]> {
  if (sector === 'all') {
    const entries = await Promise.all(
      Object.entries(YAHOO_SECTOR_ETFS).map(([id, { etf, name }]) =>
        fetchYahooSectorEtf(id, etf, name)
      )
    );
    return entries;
  }

  const selected = YAHOO_SECTOR_ETFS[sector];
  if (!selected) throw new Error(`Unknown sector: ${sector}`);

  return [await fetchYahooSectorEtf(sector, selected.etf, selected.name)];
}

async function fetchTradingEconomics(country: string): Promise<FetchedEntry[]> {
  const apiKey = process.env.TRADING_ECONOMICS_API_KEY;
  if (!apiKey) throw new Error('TRADING_ECONOMICS_API_KEY not configured');

  const today = new Date().toISOString().slice(0, 10);
  const countrySlug = encodeURIComponent(country);
  const url = `https://api.tradingeconomics.com/calendar/country/${countrySlug}/${today}/${today}?c=${apiKey}&f=json`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `TradingEconomics request failed (${res.status}). Check your API key and plan includes calendar access.`
    );
  }

  const events = (await res.json()) as TradingEconomicsEvent[] | { message?: string };
  if (!Array.isArray(events)) {
    const message =
      typeof events === 'object' && events && 'message' in events
        ? String(events.message)
        : 'Unexpected response from TradingEconomics';
    throw new Error(message);
  }

  if (events.length === 0) {
    throw new Error(`No calendar events for ${country} on ${today}`);
  }

  return events.slice(0, 25).map((event, index) => {
    const value =
      event.Actual ?? event.Forecast ?? event.Previous ?? 'Pending';
    const numeric =
      typeof value === 'number'
        ? value
        : typeof value === 'string' && value !== 'Pending' && !isNaN(Number(value))
          ? Number(value)
          : value;

    return {
      symbol: (event.Country ?? country).slice(0, 12).toUpperCase(),
      source: 'economic_indicator',
      label: event.Event ?? event.Category ?? `Event ${index + 1}`,
      value: numeric,
      metadata: {
        provider: 'tradingeconomics',
        calendarId: event.CalendarId,
        date: event.Date,
        country: event.Country ?? country,
        category: event.Category,
        actual: event.Actual,
        forecast: event.Forecast,
        previous: event.Previous,
        importance: event.Importance,
        sourceUrl: 'https://tradingeconomics.com/calendar',
      },
    };
  });
}

export async function fetchFromProvider(params: FetchParams): Promise<FetchedEntry[]> {
  switch (params.provider) {
    case 'finviz':
      return fetchFinviz(params.timeframe ?? 'D');
    case 'yahoo_sectors':
      return fetchYahooSectors(params.sector ?? 'all');
    case 'tradingeconomics':
      if (!params.country) throw new Error('country is required');
      return fetchTradingEconomics(params.country);
    default:
      throw new Error('Unknown provider');
  }
}

export async function fetchAndStore(params: FetchParams) {
  const entries = await fetchFromProvider(params);
  const now = new Date();

  const saved = await Promise.all(
    entries.map((entry) =>
      DataCollection.create({
        ...entry,
        symbol: entry.symbol.toUpperCase(),
        collectedAt: now,
      })
    )
  );

  return saved;
}
