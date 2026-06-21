import type { MacroReport } from './types';

export const DEFAULT_MACRO_REPORT: MacroReport = {
  weekOf: '20 Jun 2026',
  source: 'R4',
  fedRates: {
    currentRate: '3.50%–3.75%',
    nextFomcDate: '29 Jul 2026',
    holdProb: '61.5%',
    hikeProb: '38.5%',
    cutProb: '0.0%',
    directionVsLastWeek: 'More Hawkish',
    yield2y: '4.19%',
    yield10y: '4.46%',
    yield30y: '4.90%',
    yieldCurve: 'Normal',
    yield10yDirection: 'Falling',
    implication:
      'Falling Treasury yields provide modest support for equities, but increased expectations of a future Fed rate hike may create headwinds for growth and technology stocks.',
  },
  commodities: {
    items: [
      {
        name: 'WTI Crude Oil',
        price: '76.54',
        weeklyChange: '-8.99%',
        direction: 'Falling',
      },
      {
        name: 'Gold',
        price: '4172.90',
        weeklyChange: '-1.55%',
        direction: 'Falling',
      },
      {
        name: 'DXY (Dollar)',
        price: '100.52',
        weeklyChange: '+1.13%',
        direction: 'Strengthening',
      },
    ],
    crossAssetImplication:
      'Oil prices fell sharply this week, suggesting easing inflation pressures. Gold also declined as the stronger U.S. dollar reduced demand for precious metals.',
  },
  calendar: [
    {
      date: 'Mon, 22 Jun 2026',
      event: 'Fed Waller Speech',
      expected: 'N/A',
      previous: 'N/A',
      importance: 'Medium',
    },
    {
      date: 'Tue, 23 Jun 2026',
      event: 'S&P Global Manufacturing PMI Flash (Jun)',
      expected: '54.7',
      previous: '54.5',
      importance: 'High',
    },
    {
      date: 'Wed, 24 Jun 2026',
      event: 'New Home Sales (May)',
      expected: '0.64M',
      previous: '0.64M',
      importance: 'Medium',
    },
    {
      date: 'Thu, 25 Jun 2026',
      event: 'Core PCE Price Index YoY (May)',
      expected: '3.3%',
      previous: '3.3%',
      importance: 'High',
    },
    {
      date: 'Fri, 26 Jun 2026',
      event: 'Michigan Consumer Sentiment Final (Jun)',
      expected: '48.9',
      previous: '48.9',
      importance: 'High',
    },
  ],
  calendarKeyInsight:
    'The most important event of the week is Core PCE Price Index YoY (May) because the Fed closely watches Core PCE inflation.',
  earnings: [
    {
      company: 'Micron Technology (MU)',
      date: 'Wednesday, Jun 24',
      sector: 'XLK / SOXX',
      watch: 'AI-driven memory chip demand, data center spending, and semiconductor industry guidance.',
    },
    {
      company: 'FedEx (FDX)',
      date: 'Tuesday, Jun 23',
      sector: 'XLI',
      watch: 'Global shipping volumes, logistics demand, and economic activity outlook.',
    },
    {
      company: 'Carnival Corporation (CCL)',
      date: 'Tuesday, Jun 24',
      sector: 'XLY',
      watch: 'Consumer travel demand, booking trends, and leisure spending trends.',
    },
  ],
  earningsKeyInsight:
    'Micron (MU) is the most important earnings release this week because its results can significantly impact semiconductor stocks, AI-related companies, and the broader technology sector (XLK).',
  news: [
    {
      headline:
        'Israeli strikes kill 10 in Lebanon after truce, with prospect of U.S.-Iran talks unclear',
      source: 'Reuters',
      date: '20 Jun 2026',
      implication:
        'Renewed Middle East tensions could increase geopolitical risk, potentially supporting oil prices and safe-haven assets.',
    },
    {
      headline:
        'Fighting persists in Lebanon despite a ceasefire as the U.S.-Iran deal is under threat',
      source: 'AP',
      date: '20 Jun 2026',
      implication:
        'Continued regional instability may increase market volatility and reduce investor risk appetite.',
    },
  ],
  newsKeyInsight:
    'The primary market theme remains developments in the Middle East. Markets will watch whether U.S.-Iran negotiations progress or fighting escalates.',
  macroBias: 'Neutral-Bullish',
  primaryDriver:
    'Core PCE Price Index YoY (May) on 25 Jun 2026 — the Fed\'s preferred inflation measure.',
  confidence:
    'Medium — yields declined, oil fell sharply, but FedWatch shows 38.5% hike probability and Middle East tensions persist.',
  invalidation:
    'Higher-than-expected Core PCE, hawkish Fed communication, disappointing Micron earnings, or Middle East escalation causing oil to surge.',
  sourcesAccessed: '20 Jun 2026. All data from the seven approved tools only.',
};
