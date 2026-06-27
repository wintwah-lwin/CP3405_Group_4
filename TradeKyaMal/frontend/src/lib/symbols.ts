export interface SymbolOption {
  value: string;
  label: string;
}

export const FUTURES_TIMEFRAMES: SymbolOption[] = [
  { value: 'D', label: 'Daily' },
  { value: 'W', label: 'Weekly' },
  { value: 'M', label: 'Monthly' },
  { value: 'Q', label: 'Quarterly' },
  { value: 'HY', label: 'Half Year' },
  { value: 'Y', label: 'Yearly' },
];

export const YAHOO_SECTORS: SymbolOption[] = [
  { value: 'all', label: 'All Sectors' },
  { value: 'technology', label: 'Technology (XLK)' },
  { value: 'financial_services', label: 'Financial Services (XLF)' },
  { value: 'communication_services', label: 'Communication Services (XLC)' },
  { value: 'consumer_cyclical', label: 'Consumer Cyclical (XLY)' },
  { value: 'industrials', label: 'Industrials (XLI)' },
  { value: 'healthcare', label: 'Healthcare (XLV)' },
  { value: 'energy', label: 'Energy (XLE)' },
  { value: 'consumer_defensive', label: 'Consumer Defensive (XLP)' },
  { value: 'basic_materials', label: 'Basic Materials (XLB)' },
  { value: 'real_estate', label: 'Real Estate (XLRE)' },
  { value: 'utilities', label: 'Utilities (XLU)' },
];

export const TE_COUNTRIES: SymbolOption[] = [
  { value: 'united states', label: 'United States' },
  { value: 'united kingdom', label: 'United Kingdom' },
  { value: 'euro area', label: 'Euro Area' },
  { value: 'germany', label: 'Germany' },
  { value: 'japan', label: 'Japan' },
  { value: 'china', label: 'China' },
  { value: 'canada', label: 'Canada' },
  { value: 'australia', label: 'Australia' },
  { value: 'india', label: 'India' },
  { value: 'brazil', label: 'Brazil' },
];

const SELECT_CLASS =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent';

export { SELECT_CLASS };

export function getDefaultFieldValue(fieldName: string, _providerId: string): string {
  if (fieldName === 'timeframe') return 'W';
  if (fieldName === 'sector') return YAHOO_SECTORS[0]?.value ?? 'all';
  if (fieldName === 'country') return TE_COUNTRIES[0]?.value ?? 'united states';
  return '';
}

export function getFieldOptions(
  fieldName: string,
  _providerId: string
): SymbolOption[] | null {
  if (fieldName === 'timeframe') return FUTURES_TIMEFRAMES;
  if (fieldName === 'sector') return YAHOO_SECTORS;
  if (fieldName === 'country') return TE_COUNTRIES;
  return null;
}
