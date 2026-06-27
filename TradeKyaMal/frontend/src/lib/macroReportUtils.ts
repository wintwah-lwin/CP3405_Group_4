import type { MacroEvidence, MacroReport, MacroSectorItem } from './types';

const MANUAL = '— add manually';

export function createEmptyMacroReport(): MacroReport {
  const weekOf = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return {
    weekOf,
    source: 'R4',
    fedRates: {
      currentRate: MANUAL,
      nextFomcDate: MANUAL,
      holdProb: MANUAL,
      hikeProb: MANUAL,
      cutProb: MANUAL,
      directionVsLastWeek: MANUAL,
      yield2y: MANUAL,
      yield10y: MANUAL,
      yield30y: MANUAL,
      yieldCurve: MANUAL,
      yield10yDirection: MANUAL,
      implication: MANUAL,
    },
    commodities: {
      items: [],
      crossAssetImplication: MANUAL,
    },
    calendar: [],
    calendarKeyInsight: MANUAL,
    earnings: [],
    earningsKeyInsight: MANUAL,
    news: [],
    newsKeyInsight: MANUAL,
    macroBias: MANUAL,
    primaryDriver: MANUAL,
    confidence: MANUAL,
    invalidation: MANUAL,
    sourcesAccessed: `${weekOf} — live data from Finviz + Yahoo Finance`,
  };
}

export function applyEvidenceToReport(
  base: MacroReport,
  evidence: MacroEvidence
): { report: MacroReport; sectors: MacroSectorItem[] } {
  const report = { ...base };

  if (evidence.commodities.length > 0) {
    report.commodities = {
      items: evidence.commodities.map((c) => ({
        name: c.name,
        price: c.price,
        weeklyChange: c.weeklyChange,
        direction: c.direction,
      })),
      crossAssetImplication: MANUAL,
    };
  }

  if (evidence.calendar.length > 0) {
    report.calendar = evidence.calendar.map((c) => ({
      date: c.date,
      event: c.event,
      expected: c.expected,
      previous: c.previous,
      importance: c.importance,
    }));
  }

  const sources: string[] = [];
  if (evidence.finvizCollectedAt) {
    sources.push(
      `Finviz 1W (${new Date(evidence.finvizCollectedAt).toLocaleString()})`
    );
  }
  if (evidence.sectorsCollectedAt) {
    sources.push(
      `Yahoo Sectors (${new Date(evidence.sectorsCollectedAt).toLocaleString()})`
    );
  }
  if (evidence.calendarCollectedAt) {
    sources.push(
      `TradingEconomics (${new Date(evidence.calendarCollectedAt).toLocaleString()})`
    );
  }
  if (sources.length > 0) {
    report.sourcesAccessed = sources.join(' · ');
  }

  return {
    report,
    sectors: evidence.sectors ?? [],
  };
}

export function hasLiveData(evidence: MacroEvidence): boolean {
  return (
    evidence.commodities.length > 0 ||
    (evidence.sectors?.length ?? 0) > 0 ||
    (evidence.futures?.length ?? 0) > 0 ||
    evidence.calendar.length > 0
  );
}
