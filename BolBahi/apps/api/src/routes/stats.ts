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
