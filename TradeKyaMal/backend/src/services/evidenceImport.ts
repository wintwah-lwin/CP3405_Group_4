import { DataCollection } from '../models/DataCollection';

export interface FinvizImportRow {
  ticker: string;
  label: string;
  group: string;
  perf_pct: number;
  fetched_at?: string;
}

export interface SectorImportRow {
  symbol: string;
  name: string;
  price: number;
  day_return_pct: number;
  fetched_at?: string;
}

export interface ImportPayload {
  finviz?: FinvizImportRow[];
  sectors?: SectorImportRow[];
  tradingeconomics?: Record<string, unknown>[];
}

export async function importEvidenceToCollection(payload: ImportPayload) {
  const now = new Date();
  const saved = [];

  if (payload.finviz?.length) {
    const collectedAt = payload.finviz[0].fetched_at
      ? new Date(payload.finviz[0].fetched_at)
      : now;

    for (const row of payload.finviz) {
      const doc = await DataCollection.create({
        symbol: row.ticker.toUpperCase(),
        source: 'market_price',
        label: `${row.label} — W Performance %`,
        value: row.perf_pct,
        metadata: {
          provider: 'finviz',
          group: row.group,
          timeframe: 'W',
          sourceUrl: 'https://finviz.com/futures_performance',
          importedFrom: 'python_pipeline',
        },
        collectedAt,
      });
      saved.push(doc);
    }
  }

  if (payload.sectors?.length) {
    const collectedAt = payload.sectors[0].fetched_at
      ? new Date(payload.sectors[0].fetched_at)
      : now;

    for (const row of payload.sectors) {
      const doc = await DataCollection.create({
        symbol: row.symbol.toUpperCase(),
        source: 'market_price',
        label: `${row.name} — Day Return %`,
        value: row.day_return_pct,
        metadata: {
          provider: 'yahoo_sectors',
          sectorName: row.name,
          price: row.price,
          sourceUrl: 'https://finance.yahoo.com/sectors/',
          importedFrom: 'python_pipeline',
        },
        collectedAt,
      });
      saved.push(doc);
    }
  }

  return saved;
}
