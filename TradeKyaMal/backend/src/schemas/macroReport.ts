import { z } from 'zod';

const commodityItem = z.object({
  name: z.string(),
  price: z.string(),
  weeklyChange: z.string(),
  direction: z.string(),
});

const calendarItem = z.object({
  date: z.string(),
  event: z.string(),
  expected: z.string(),
  previous: z.string(),
  importance: z.string(),
});

const earningsItem = z.object({
  company: z.string(),
  date: z.string(),
  sector: z.string(),
  watch: z.string(),
});

const newsItem = z.object({
  headline: z.string(),
  source: z.string(),
  date: z.string(),
  implication: z.string(),
});

export const macroReportSchema = z.object({
  weekOf: z.string(),
  source: z.string().default('R4'),
  fedRates: z.object({
    currentRate: z.string(),
    nextFomcDate: z.string(),
    holdProb: z.string(),
    hikeProb: z.string(),
    cutProb: z.string(),
    directionVsLastWeek: z.string(),
    yield2y: z.string(),
    yield10y: z.string(),
    yield30y: z.string(),
    yieldCurve: z.string(),
    yield10yDirection: z.string(),
    implication: z.string(),
  }),
  commodities: z.object({
    items: z.array(commodityItem),
    crossAssetImplication: z.string(),
  }),
  calendar: z.array(calendarItem),
  calendarKeyInsight: z.string(),
  earnings: z.array(earningsItem),
  earningsKeyInsight: z.string(),
  news: z.array(newsItem),
  newsKeyInsight: z.string(),
  macroBias: z.string(),
  primaryDriver: z.string(),
  confidence: z.string(),
  invalidation: z.string(),
  sourcesAccessed: z.string(),
});

export type MacroReport = z.infer<typeof macroReportSchema>;
