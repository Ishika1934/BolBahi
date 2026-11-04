import { Response } from 'express';

interface SSEClient {
  id: string;
  shopId: string;
  res: Response;
}

const clients = new Map<string, SSEClient>();

export function registerSSEClient(id: string, shopId: string, res: Response): void {
  clients.set(id, { id, shopId, res });

  // Send initial connected event
  res.write(`event: connected\ndata: ${JSON.stringify({ shopId })}\n\n`);
}

export function unregisterSSEClient(id: string): void {
  clients.delete(id);
}

export function emitShopEvent(shopId: string, eventType: string, payload: any = {}): void {
  for (const client of clients.values()) {
    if (client.shopId === shopId) {
      try {
        client.res.write(`event: ${eventType}\ndata: ${JSON.stringify(payload)}\n\n`);
      } catch (err) {
        console.error('Failed to send SSE to client:', client.id, err);
      }
    }
  }
}

// Heartbeat interval every 20s
setInterval(() => {
  for (const client of clients.values()) {
    try {
      client.res.write(': heartbeat\n\n');
    } catch {
      clients.delete(client.id);
    }
  }
}, 20000);

