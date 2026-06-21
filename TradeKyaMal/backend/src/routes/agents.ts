import { Router, Request, Response } from 'express';
import { AgentRun } from '../models/AgentRun';
import { macroReportSchema } from '../schemas/macroReport';
import { getMacroEvidenceFromCollection } from '../services/macroEvidence';

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

        const output = lastRun?.output as { macroBias?: string; weekOf?: string } | undefined;

        return {
          ...meta,
          status: lastRun?.status ?? 'idle',
          lastRun: lastRun?.completedAt ?? lastRun?.createdAt ?? null,
          summary:
            meta.id === 'macro' && output?.macroBias
              ? `${output.macroBias} · ${output.weekOf ?? ''}`.trim()
              : lastRun?.summary ?? null,
        };
      })
    );

    res.json(agents);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
});

router.get('/macro/report', async (_req: Request, res: Response) => {
  try {
    const lastRun = await AgentRun.findOne({ agentId: 'macro', status: 'completed' })
      .sort({ createdAt: -1 })
      .lean();

    if (!lastRun?.output) {
      res.json({ report: null });
      return;
    }

    res.json({
      report: lastRun.output,
      savedAt: lastRun.completedAt ?? lastRun.createdAt,
      runId: lastRun._id,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch macro report' });
  }
});

router.post('/macro/report', async (req: Request, res: Response) => {
  try {
    const parsed = macroReportSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const report = parsed.data;
    const now = new Date();

    const run = await AgentRun.create({
      agentId: 'macro',
      status: 'completed',
      summary: `${report.macroBias} · ${report.weekOf}`,
      output: report,
      startedAt: now,
      completedAt: now,
    });

    res.status(201).json({
      report,
      savedAt: run.completedAt,
      runId: run._id,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save macro report' });
  }
});

router.get('/macro/evidence', async (_req: Request, res: Response) => {
  try {
    const evidence = await getMacroEvidenceFromCollection();
    res.json(evidence);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch macro evidence' });
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
