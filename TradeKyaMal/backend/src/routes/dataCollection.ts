import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { DataCollection } from '../models/DataCollection';

const router = Router();

const createEntrySchema = z.object({
  symbol: z.string().min(1).max(20),
  source: z.enum([
    'market_price',
    'economic_indicator',
    'news_sentiment',
    'technical_indicator',
    'custom',
  ]),
  label: z.string().min(1).max(100),
  value: z.union([z.string(), z.number()]),
  metadata: z.record(z.unknown()).optional(),
  collectedAt: z.string().datetime().optional(),
});

router.get('/', async (_req: Request, res: Response) => {
  try {
    const entries = await DataCollection.find()
      .sort({ collectedAt: -1 })
      .limit(100)
      .lean();
    res.json(entries);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch data collection entries' });
  }
});

router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const [totalDataPoints, symbols, lastEntry] = await Promise.all([
      DataCollection.countDocuments(),
      DataCollection.distinct('symbol'),
      DataCollection.findOne().sort({ collectedAt: -1 }).lean(),
    ]);

    res.json({
      totalDataPoints,
      activeSymbols: symbols.length,
      lastCollection: lastEntry?.collectedAt ?? null,
      agentCount: 3,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const parsed = createEntrySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const entry = await DataCollection.create({
      ...parsed.data,
      symbol: parsed.data.symbol.toUpperCase(),
      collectedAt: parsed.data.collectedAt
        ? new Date(parsed.data.collectedAt)
        : new Date(),
    });

    res.status(201).json(entry);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create data collection entry' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await DataCollection.findByIdAndDelete(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Entry not found' });
      return;
    }
    res.json({ message: 'Entry deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete entry' });
  }
});

export default router;
