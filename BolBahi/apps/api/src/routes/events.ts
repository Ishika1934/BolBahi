import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { registerSSEClient, unregisterSSEClient } from '../lib/sse.js';

export const eventsRouter = Router();

// GET /api/events
eventsRouter.get('/', requireAuth, (req: Request, res: Response) => {
  const shopId = req.shopId!;
  const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // Set standard SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
  });

  registerSSEClient(clientId, shopId, res);

  req.on('close', () => {
    unregisterSSEClient(clientId);
  });
});

