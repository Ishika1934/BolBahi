import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { getShopStats } from '../services/summary.js';
import { seedDemoDataForShop } from '../services/seed.js';

export const statsRouter = Router();

// GET /api/stats
statsRouter.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await getShopStats(req.shopId!);
    res.json({
      ok: true,
      data: stats,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/stats/daily-summary
statsRouter.get('/daily-summary', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await getShopStats(req.shopId!);
    res.json({
      ok: true,
      data: {
        todayIn: stats.todayIn,
        todayOut: stats.todayOut,
        net: stats.netToday,
        entryCount: stats.todayIn > 0 || stats.todayOut > 0 ? 1 : 0,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
});
