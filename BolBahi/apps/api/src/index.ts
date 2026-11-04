import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './lib/env.js';
import { connectDB } from './lib/db.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authRouter } from './routes/auth.js';
import { demoRouter } from './routes/demo.js';
import { customersRouter } from './routes/customers.js';
import { voiceRouter } from './routes/voice.js';
import { eventsRouter } from './routes/events.js';
import { commandsRouter } from './routes/commands.js';
import { statsRouter } from './routes/stats.js';
import { entriesRouter } from './routes/entries.js';
import { stockRouter } from './routes/stock.js';
import { remindersRouter } from './routes/reminders.js';
import { startReminderScheduler } from './services/reminders.js';

const app = express();

// Security & Parsing middlewares
app.use(
  cors({
    origin: [env.WEB_ORIGIN, 'http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: '10kb' }));

// Structured request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const latencyMs = Date.now() - start;
    if (req.path !== '/api/health') {
      console.log(
        JSON.stringify({
          time: new Date().toISOString(),
          method: req.method,
          path: req.path,
          status: res.statusCode,
          latencyMs,
          shopId: req.shopId || 'unauthenticated',
        })
      );
    }
  });
  next();
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    data: {
      status: 'healthy',
      app: 'BolBahi API',
      timestamp: new Date().toISOString(),
      provider: env.LLM_PROVIDER,
      model: env.GEMINI_MODEL,
    },
  });
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/demo', demoRouter);
app.use('/api/customers', customersRouter);
app.use('/api/voice', voiceRouter);
app.use('/api/events', eventsRouter);
app.use('/api/commands', commandsRouter);
app.use('/api/stats', statsRouter);
app.use('/api/entries', entriesRouter);
app.use('/api/records', entriesRouter);
app.use('/api/stock', stockRouter);
app.use('/api/reminders', remindersRouter);

// Central error handler
app.use(errorHandler);

// Start server
async function start() {
  await connectDB();
  startReminderScheduler();
  const host = '0.0.0.0';
  app.listen(env.PORT, host, () => {
    console.log(`🚀 BolBahi API server listening on http://${host}:${env.PORT}`);
  });
}

start().catch((err) => {
  console.error('Fatal server boot error:', err);
  process.exit(1);
});

export { app };

