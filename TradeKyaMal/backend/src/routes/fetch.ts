import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getProviders } from '../services/providers';
import { fetchAndStore } from '../services/fetchData';
import { buildEvidenceBundle, getDefaultWeek } from '../services/evidenceExport';
import { getEvidenceConfig, syncEvidenceFiles } from '../services/githubSync';

const router = Router();

const fetchSchema = z.object({
  provider: z.enum(['finviz', 'yahoo_sectors', 'tradingeconomics']),
  timeframe: z.string().optional(),
  sector: z.string().optional(),
  country: z.string().optional(),
});

router.get('/providers', (_req: Request, res: Response) => {
  res.json(getProviders());
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const parsed = fetchSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const provider = getProviders().find((p) => p.id === parsed.data.provider);
    if (!provider) {
      res.status(400).json({ error: 'Unknown provider' });
      return;
    }

    if (provider.requiresKey && !provider.configured) {
      res.status(400).json({
        error: `${provider.name} API key not configured. Add ${provider.envKey} to backend/.env`,
      });
      return;
    }

    const entries = await fetchAndStore(parsed.data);

    let evidenceSync = null;
    const config = getEvidenceConfig();
    if (config.autoSync) {
      try {
        const week = getDefaultWeek();
        const files = await buildEvidenceBundle(week);
        evidenceSync = await syncEvidenceFiles(week, files, 'website_fetch');
      } catch (syncErr) {
        evidenceSync = {
          method: 'skipped' as const,
          week: getDefaultWeek(),
          files: [],
          message:
            syncErr instanceof Error
              ? syncErr.message
              : 'Evidence sync failed after fetch',
        };
      }
    }

    res.status(201).json({ count: entries.length, entries, evidenceSync });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Fetch failed';
    res.status(502).json({ error: message });
  }
});

export default router;
