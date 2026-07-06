import { fetchAndStore } from './fetchData';
import { getMacroEvidenceFromCollection } from './macroEvidence';
import { getProviders } from './providers';

export interface MacroFetchResult {
  finviz: number;
  sectors: number;
  calendar: number;
  errors: string[];
}

export async function fetchLiveMacroData(): Promise<{
  fetch: MacroFetchResult;
  evidence: Awaited<ReturnType<typeof getMacroEvidenceFromCollection>>;
}> {
  const result: MacroFetchResult = {
    finviz: 0,
    sectors: 0,
    calendar: 0,
    errors: [],
  };

  try {
    const finviz = await fetchAndStore({ provider: 'finviz', timeframe: 'W' });
    result.finviz = finviz.length;
  } catch (error) {
    result.errors.push(
      `Finviz: ${error instanceof Error ? error.message : 'fetch failed'}`
    );
  }

  try {
    const sectors = await fetchAndStore({ provider: 'yahoo_sectors', sector: 'all' });
    result.sectors = sectors.length;
  } catch (error) {
    result.errors.push(
      `Yahoo Sectors: ${error instanceof Error ? error.message : 'fetch failed'}`
    );
  }

  const te = getProviders().find((p) => p.id === 'tradingeconomics');
  if (te?.configured) {
    try {
      const calendar = await fetchAndStore({
        provider: 'tradingeconomics',
        country: 'united states',
      });
      result.calendar = calendar.length;
    } catch (error) {
      result.errors.push(
        `TradingEconomics: ${error instanceof Error ? error.message : 'fetch failed'}`
      );
    }
  }

  const evidence = await getMacroEvidenceFromCollection();
  return { fetch: result, evidence };
}
