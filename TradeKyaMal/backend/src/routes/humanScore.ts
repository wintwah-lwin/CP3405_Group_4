import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { HumanScore } from '../models/HumanScore';
import { buildHumanScoreMarkdown } from '../services/humanScoreMarkdown';

const router = Router();

const sectionSchema = z.object({
  aiScore: z.number().min(-2).max(2),
  teamScore: z.number().min(-2).max(2),
  notes: z.string().max(4000).optional().default(''),
});

const payloadSchema = z.object({
  macro: sectionSchema,
  technical: sectionSchema,
  almanac: sectionSchema,
  llmConsensus: sectionSchema,
  finalBias: z.string().min(1).max(200),
  confidence: z.string().min(1).max(100),
});

router.get('/:week', async (req: Request, res: Response) => {
  try {
    const week = Number(req.params.week);
    if (Number.isNaN(week)) {
      res.status(400).json({ error: 'Invalid week' });
      return;
    }

    const doc = await HumanScore.findOne({ week }).lean();
    if (!doc) {
      res.json({ week, saved: false, data: null });
      return;
    }

    res.json({
      week,
      saved: true,
      data: {
        macro: doc.macro,
        technical: doc.technical,
        almanac: doc.almanac,
        llmConsensus: doc.llmConsensus,
        finalBias: doc.finalBias,
        confidence: doc.confidence,
        markdown: doc.markdown,
        updatedAt: doc.updatedAt,
      },
    });
  } catch {
    res.status(500).json({ error: 'Failed to load human score' });
  }
});

router.put('/:week', async (req: Request, res: Response) => {
  try {
    const week = Number(req.params.week);
    if (Number.isNaN(week)) {
      res.status(400).json({ error: 'Invalid week' });
      return;
    }

    const parsed = payloadSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const markdown = buildHumanScoreMarkdown({ week, ...parsed.data });

    const doc = await HumanScore.findOneAndUpdate(
      { week },
      { week, ...parsed.data, markdown },
      { upsert: true, new: true }
    );

    res.json({
      week,
      saved: true,
      markdown: doc.markdown,
      updatedAt: doc.updatedAt,
    });
  } catch {
    res.status(500).json({ error: 'Failed to save human score' });
  }
});

export default router;
