import { Router, Request, Response } from 'express';

const router = Router();

interface YahooChartMeta {
  regularMarketPrice?: number;
  chartPreviousClose?: number;
  t?: number;
}

router.get('/quote/:symbol', async (req: Request, res: Response) => {
  const rawSymbol = req.params.symbol;
  const symbol = (Array.isArray(rawSymbol) ? rawSymbol[0] : rawSymbol).toUpperCase();

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=5d`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TradeKyaMal/1.0)' },
    });
    const data = (await response.json()) as {
      chart?: { result?: { meta?: YahooChartMeta }[] };
    };

    const meta = data.chart?.result?.[0]?.meta;
    if (!meta?.regularMarketPrice) {
      res.status(404).json({ error: `No quote found for ${symbol}` });
      return;
    }

    const price = meta.regularMarketPrice;
    const previous = meta.chartPreviousClose ?? price;
    const change = price - previous;
    const changePercent = previous ? (change / previous) * 100 : 0;

    res.json({
      symbol,
      price,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      timestamp: meta.t
        ? new Date(meta.t * 1000).toISOString()
        : new Date().toISOString(),
    });
  } catch {
    res.status(502).json({ error: 'Failed to fetch market quote' });
  }
});

export default router;
