// In-memory promise chains per shopId:sessionId
const sessionChains = new Map<string, Promise<any>>();

// In-memory clarification state with 60-second TTL
export interface PendingClarification {
  question: string;
  originalTranscript: string;
  originalAction?: any;
  options?: string[];
  expiresAt: number;
}

const pendingClarifications = new Map<string, PendingClarification>();

export function enqueueSessionTask<T>(
  shopId: string,
  sessionId: string,
  task: () => Promise<T>
): Promise<T> {
  const key = `${shopId}:${sessionId}`;
  const previousChain = sessionChains.get(key) || Promise.resolve();

  const nextChain = previousChain.then(async () => {
    try {
      return await task();
    } finally {
      if (sessionChains.get(key) === nextChain) {
        sessionChains.delete(key);
      }
    }
  });

  sessionChains.set(key, nextChain);
  return nextChain;
}

export function setPendingClarification(
  shopId: string,
  sessionId: string,
  question: string,
  originalTranscript: string,
  options?: string[],
  originalAction?: any
): void {
  const key = `${shopId}:${sessionId}`;
  pendingClarifications.set(key, {
    question,
    originalTranscript,
    originalAction,
    options,
    expiresAt: Date.now() + 60000, // 60s TTL
  });
}

export function getPendingClarification(
  shopId: string,
  sessionId: string
): PendingClarification | null {
  const key = `${shopId}:${sessionId}`;
  const pending = pendingClarifications.get(key);
  if (!pending) return null;

  if (Date.now() > pending.expiresAt) {
    pendingClarifications.delete(key);
    return null;
  }

  return pending;
}

export function clearPendingClarification(shopId: string, sessionId: string): void {
  const key = `${shopId}:${sessionId}`;
  pendingClarifications.delete(key);
}
