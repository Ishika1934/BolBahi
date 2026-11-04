import { Router, Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { requireAuth } from '../middleware/requireAuth.js';
import { StockItem } from '../models/StockItem.js';
import { notFoundError } from '../lib/errors.js';
import { emitShopEvent } from '../lib/sse.js';

export const stockRouter = Router();

// GET /api/stock
stockRouter.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sId = new Types.ObjectId(req.shopId!);
    const items = await StockItem.find({ shopId: sId }).sort({ createdAt: -1 });

    res.json({
      ok: true,
      data: items.map((i) => ({
        id: i._id.toString(),
        name: i.name,
        quantityHint: i.quantityHint,
        status: i.status,
        groupId: i.groupId,
        createdAt: i.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/stock/:id
stockRouter.patch('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sId = new Types.ObjectId(req.shopId!);
    const id = req.params.id;
    const { status } = req.body;

    const item = await StockItem.findOne({ _id: new Types.ObjectId(id), shopId: sId });
    if (!item) {
      throw notFoundError('StockItem');
    }

    item.status = status === 'ok' ? 'ok' : 'low';
    await item.save();

    emitShopEvent(req.shopId!, 'stock.updated', { id: item._id.toString(), status: item.status });

    res.json({
      ok: true,
      data: {
        id: item._id.toString(),
        name: item.name,
        status: item.status,
      },
    });
  } catch (err) {
    next(err);
  }
});

