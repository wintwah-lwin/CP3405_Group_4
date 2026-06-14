export type ProviderId = 'finviz' | 'yahoo_sectors' | 'tradingeconomics';

export interface ProviderMeta {
  id: ProviderId;
  name: string;
  description: string;
  sourceUrl: string;
  envKey: string;
  configured: boolean;
  requiresKey: boolean;
  fields: ProviderField[];
}

export interface ProviderField {
  name: string;
  label: string;
  placeholder: string;
  required: boolean;
}

export function getProviders(): ProviderMeta[] {
  return [
    {
      id: 'finviz',
      name: 'Finviz Futures',
      description: 'Weekly futures performance scorecard (ES, NQ, CL, GC, etc.)',
      sourceUrl: 'https://finviz.com/futures_performance',
      envKey: '',
      requiresKey: false,
      configured: true,
      fields: [
        {
          name: 'timeframe',
          label: 'Timeframe',
          placeholder: 'D',
          required: true,
        },
      ],
    },
    {
      id: 'yahoo_sectors',
      name: 'Yahoo Finance Sectors',
      description: 'US sector performance via sector ETFs (matches Yahoo Sectors page)',
      sourceUrl: 'https://finance.yahoo.com/sectors/',
      envKey: '',
      requiresKey: false,
      configured: true,
      fields: [
        {
          name: 'sector',
          label: 'Sector',
          placeholder: 'all',
          required: true,
        },
      ],
    },
    {
      id: 'tradingeconomics',
      name: 'TradingEconomics Calendar',
      description: 'Economic calendar events for today',
      sourceUrl: 'https://tradingeconomics.com/calendar',
      envKey: 'TRADING_ECONOMICS_API_KEY',
      requiresKey: true,
      configured: Boolean(process.env.TRADING_ECONOMICS_API_KEY),
      fields: [
        {
          name: 'country',
          label: 'Country',
          placeholder: 'united states',
          required: true,
        },
      ],
    },
  ];
}
