import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  buildEvidenceBundle,
  getDefaultWeek,
} from '../services/evidenceExport';
import { importEvidenceToCollection } from '../services/evidenceImport';
import { getEvidenceConfig, syncEvidenceFiles } from '../services/githubSync';
import {
  isPythonPipelineAvailable,
  readPipelineOutput,
  runWeeklyPythonPipeline,
} from '../services/pythonPipeline';

const router = Router();

const syncSchema = z.object({
  week: z.number().int().min(1).max(53).optional(),
});

const importSchema = z.object({
  week: z.number().int().min(1).max(53),
  finviz: z
    .array(
      z.object({
        ticker: z.string(),
        label: z.string(),
        group: z.string(),
        perf_pct: z.number(),
        fetched_at: z.string().optional(),
      })
    )
    .optional(),
  sectors: z
    .array(
      z.object({
        symbol: z.string(),
        name: z.string(),
        price: z.number(),
        day_return_pct: z.number(),
        fetched_at: z.string().optional(),
      })
    )
    .optional(),
  syncToRepo: z.boolean().optional(),
});

const runSchema = z.object({
  week: z.number().int().min(1).max(53).optional(),
});

router.get('/status', (_req: Request, res: Response) => {
  const config = getEvidenceConfig();
  res.json({
    ...config,
    pythonAvailable: isPythonPipelineAvailable(),
    groupRepo: config.githubRepo,
  });
});

router.post('/sync', async (req: Request, res: Response) => {
  try {
    const parsed = syncSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const week = parsed.data.week ?? getDefaultWeek();
    const files = await buildEvidenceBundle(week);
    const sync = await syncEvidenceFiles(week, files, 'website');

    res.json({ week, fileCount: files.length, sync, files: files.map((f) => f.name) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sync failed';
    res.status(500).json({ error: message });
  }
});

router.post('/import', async (req: Request, res: Response) => {
  try {
    const parsed = importSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const { week, finviz, sectors, syncToRepo = true } = parsed.data;
    const saved = await importEvidenceToCollection({ finviz, sectors });

    let sync = null;
    if (syncToRepo && saved.length > 0) {
      const files = await buildEvidenceBundle(week);
      sync = await syncEvidenceFiles(week, files, 'python');
    }

    res.status(201).json({
      imported: saved.length,
      week,
      sync,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Import failed';
    res.status(500).json({ error: message });
  }
});

router.post('/run', async (req: Request, res: Response) => {
  try {
    const parsed = runSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const week = parsed.data.week ?? getDefaultWeek();

    if (!isPythonPipelineAvailable()) {
      res.status(503).json({
        error: 'Python scripts not found on server',
        manualCommand: `cd scripts && python3 run_weekly_fetch.py --week ${week}`,
      });
      return;
    }

    const pipeline = await runWeeklyPythonPipeline(week, {
      noPush: true,
    });

    if (!pipeline.success) {
      res.status(502).json({
        error: pipeline.message,
        stdout: pipeline.stdout,
        stderr: pipeline.stderr,
      });
      return;
    }

    const output = readPipelineOutput(week);
    let imported = 0;

    if (output.finviz || output.sectors) {
      const saved = await importEvidenceToCollection({
        finviz: output.finviz as import('../services/evidenceImport').FinvizImportRow[],
        sectors: output.sectors as import('../services/evidenceImport').SectorImportRow[],
      });
      imported = saved.length;
    }

    const files = await buildEvidenceBundle(week);
    if (
      output.macroMarkdown &&
      !files.find((f) => f.name === `macro_report_w${week}.md`)
    ) {
      files.push({
        name: `macro_report_w${week}.md`,
        content: output.macroMarkdown,
        repoPath: `evidence/Week ${week}/macro_report_w${week}.md`,
      });
    }

    const sync = await syncEvidenceFiles(week, files, 'python_pipeline');

    res.json({
      week,
      imported,
      pipeline: {
        message: pipeline.message,
        stdout: pipeline.stdout.slice(-2000),
      },
      sync,
      files: files.map((f) => f.name),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Pipeline failed';
    res.status(500).json({ error: message });
  }
});

export default router;
