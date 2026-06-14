import { Router, Request, Response } from 'express';
import { AgentRun } from '../models/AgentRun';

const router = Router();

const AGENT_META = [
  {
    id: 'almanac' as const,
    name: 'Almanac Agent',
    description:
      'Seasonal and calendar-based pattern analysis for trading signals.',
  },
  {
    id: 'macro' as const,
    name: 'Macro Agent',
    description:
      'Macroeconomic indicators, rates, and global market context.',
  },
  {
    id: 'technical' as const,
    name: 'Technical Agent',
    description:
      'Price action, indicators, and chart-based signal generation.',
  },
];

router.get('/', async (_req: Request, res: Response) => {
  try {
    const agents = await Promise.all(
      AGENT_META.map(async (meta) => {
        const lastRun = await AgentRun.findOne({ agentId: meta.id })
          .sort({ createdAt: -1 })
          .lean();

        return {
          ...meta,
          status: lastRun?.status ?? 'idle',
          lastRun: lastRun?.completedAt ?? lastRun?.createdAt ?? null,
        };
      })
    );

    res.json(agents);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const meta = AGENT_META.find((a) => a.id === req.params.id);
    if (!meta) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }

    const runs = await AgentRun.find({ agentId: meta.id })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    res.json({ ...meta, runs });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch agent details' });
  }
});

export default router;
