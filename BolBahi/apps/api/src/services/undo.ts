import { Types } from 'mongoose';
import { ActionLog, IActionLog } from '../models/ActionLog.js';
import { Entry } from '../models/Entry.js';
import { Reminder } from '../models/Reminder.js';
import { StockItem } from '../models/StockItem.js';
import { Customer } from '../models/Customer.js';
import { recomputeCustomerBalance } from './ledger.js';
import { emitShopEvent } from '../lib/sse.js';
import { buildUndoReply } from './replies.js';
import { ActionResult } from './executor.js';

export interface UndoResult {
  groupId: string;
  entriesRemoved: number;
  remindersCancelled: number;
  remindersAlreadySent: number;
  stockReverted: number;
  customersArchived: number;
  replyScreen: string;
  replySpeech: string;
}

export async function undoCommandByGroupId(
  shopId: string,
  groupId: string,
  lang: 'hi-IN' | 'en-IN' = 'hi-IN'
): Promise<UndoResult> {
  const sId = new Types.ObjectId(shopId);

  // 1. Find ActionLog for this groupId
  const actionLog = await ActionLog.findOne({ shopId: sId, groupId });
  if (!actionLog) {
    throw new Error('Command not found');
  }

  // Idempotency: if already deleted, return zeros
  if (actionLog.deletedAt) {
    const reply = buildUndoReply(0, 0, 0, lang);
    return {
      groupId,
      entriesRemoved: 0,
      remindersCancelled: 0,
      remindersAlreadySent: 0,
      stockReverted: 0,
      customersArchived: 0,
      replyScreen: reply.screen,
      replySpeech: reply.speech,
    };
  }

  const now = new Date();

  // 2. Soft-delete entries with that groupId
  const entriesToSoftDelete = await Entry.find({ shopId: sId, groupId, deletedAt: null });
  const affectedCustomerIds = new Set<string>();

  for (const entry of entriesToSoftDelete) {
    affectedCustomerIds.add(entry.customerId.toString());
  }

  await Entry.updateMany(
    { shopId: sId, groupId, deletedAt: null },
    { $set: { deletedAt: now } }
  );

  // Recompute balances for all affected customers
  for (const custId of affectedCustomerIds) {
    await recomputeCustomerBalance(shopId, custId);
  }

  // 3. Reminders handling
  const reminders = await Reminder.find({ shopId: sId, groupId });
  let remindersCancelled = 0;
  let remindersAlreadySent = 0;

  for (const rem of reminders) {
    if (rem.status === 'pending') {
      rem.status = 'cancelled';
      await rem.save();
      remindersCancelled++;
    } else if (rem.status === 'sent') {
      remindersAlreadySent++;
    }
  }

  // 4. Stock items created by that command
  const stockResult = await StockItem.deleteMany({ shopId: sId, groupId });
  const stockReverted = stockResult.deletedCount || 0;

  // 5. Customers created by command that have no remaining entries
  let customersArchived = 0;
  for (const custId of affectedCustomerIds) {
    const remainingEntriesCount = await Entry.countDocuments({
      shopId: sId,
      customerId: new Types.ObjectId(custId),
      deletedAt: null,
    });
    if (remainingEntriesCount === 0) {
      await Customer.updateOne(
        { _id: new Types.ObjectId(custId), shopId: sId },
        { $set: { archivedAt: now } }
      );
      customersArchived++;
    }
  }

  // 6. Set deletedAt on ActionLog
  actionLog.deletedAt = now;
  await actionLog.save();

  // Emit SSE event
  emitShopEvent(shopId, 'ledger.updated', { groupId, undone: true });

  const reply = buildUndoReply(entriesToSoftDelete.length, remindersCancelled, remindersAlreadySent, lang);

  return {
    groupId,
    entriesRemoved: entriesToSoftDelete.length,
    remindersCancelled,
    remindersAlreadySent,
    stockReverted,
    customersArchived,
    replyScreen: reply.screen,
    replySpeech: reply.speech,
  };
}

export async function executeUndoLast(
  shopId: string,
  lang: 'hi-IN' | 'en-IN' = 'hi-IN'
): Promise<ActionResult> {
  const sId = new Types.ObjectId(shopId);

  // Find newest non-deleted ActionLog
  const lastCommand = await ActionLog.findOne({ shopId: sId, deletedAt: null }).sort({ createdAt: -1 });
  if (!lastCommand) {
    const text = 'Hataane ke liye koi pichla command nahi mila.';
    return {
      ok: false,
      type: 'undo_last',
      summary: text,
      spokenPart: text,
    };
  }

  const undoRes = await undoCommandByGroupId(shopId, lastCommand.groupId, lang);

  return {
    ok: true,
    type: 'undo_last',
    summary: `Pichla command hata diya (${undoRes.entriesRemoved} entries, ${undoRes.remindersCancelled} reminders)`,
    spokenPart: undoRes.replySpeech,
    data: undoRes,
  };
}

