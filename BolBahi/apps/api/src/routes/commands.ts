import { Router, Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { requireAuth } from '../middleware/requireAuth.js';
import { ActionLog } from '../models/ActionLog.js';
import { Entry } from '../models/Entry.js';
import { Reminder } from '../models/Reminder.js';
import { StockItem } from '../models/StockItem.js';
import { undoCommandByGroupId } from '../services/undo.js';
import { notFoundError } from '../lib/errors.js';

export const commandsRouter = Router();

// GET /api/commands
commandsRouter.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sId = new Types.ObjectId(req.shopId!);
    const logs = await ActionLog.find({ shopId: sId, deletedAt: null })
      .sort({ createdAt: -1 })
      .limit(50);

    const commandsWithEffects = await Promise.all(
      logs.map(async (l) => {
        const [entriesCount, remindersCount, stockCount] = await Promise.all([
          Entry.countDocuments({ shopId: sId, groupId: l.groupId, deletedAt: null }),
          Reminder.countDocuments({ shopId: sId, groupId: l.groupId }),
          StockItem.countDocuments({ shopId: sId, groupId: l.groupId }),
        ]);

        return {
          id: l._id.toString(),
          groupId: l.groupId,
          transcript: l.transcript,
          lang: l.lang,
          actions: l.parsedActions,
          results: l.results,
          source: l.source,
          latencyMs: l.latencyMs,
          createdAt: l.createdAt,
          effects: {
            entriesCount,
            remindersCount,
            stockCount,
          },
        };
      })
    );

    res.json({
      ok: true,
      data: commandsWithEffects,
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/commands/:groupId
commandsRouter.delete('/:groupId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shopId = req.shopId!;
    const groupId = req.params.groupId;

    // Check if command exists for this shop
    const log = await ActionLog.findOne({
      shopId: new Types.ObjectId(shopId),
      groupId,
    });

    if (!log) {
      throw notFoundError('Command');
    }

    const undoResult = await undoCommandByGroupId(shopId, groupId, (log.lang as any) || 'hi-IN');

    res.json({
      ok: true,
      data: undoResult,
    });
  } catch (err) {
    next(err);
  }
});

