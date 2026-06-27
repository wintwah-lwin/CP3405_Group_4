import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db';
import dataCollectionRoutes from './routes/dataCollection';
import fetchRoutes from './routes/fetch';
import agentsRoutes from './routes/agents';
import marketRoutes from './routes/market';
import evidenceRoutes from './routes/evidence';

const app = express();
const PORT = Number(process.env.PORT) || 4000;
const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://localhost:27017/tradekyamal';

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
  })
);
app.use(express.json());

app.get('/', (_req, res) => {
  res.json({
    service: 'tradekyamal-backend',
    message: 'API is running. Open the dashboard at http://localhost:3000',
    endpoints: [
      'GET  /api/health',
      'GET  /api/fetch/providers',
      'POST /api/fetch',
      'GET  /api/evidence/status',
      'POST /api/evidence/sync',
      'POST /api/evidence/run',
      'GET  /api/data-collection',
      'GET  /api/agents',
    ],
  });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'tradekyamal-backend' });
});

app.use('/api/data-collection', dataCollectionRoutes);
app.use('/api/fetch', fetchRoutes);
app.use('/api/agents', agentsRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/evidence', evidenceRoutes);

async function start() {
  await connectDB(MONGODB_URI);
  app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
  });
}

start();
