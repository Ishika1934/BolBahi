import { Types } from 'mongoose';
import { Customer } from '../models/Customer.js';
import { Entry } from '../models/Entry.js';

/**
 * Recompute customer balance from active (non-deleted) entries:
 * balance = sum(udhaar) - sum(payment)
 * Never rely on incremental math to keep undo safe.
 */
export async function recomputeCustomerBalance(
  shopId: string,
  customerId: string | Types.ObjectId
): Promise<number> {
  const cId = typeof customerId === 'string' ? new Types.ObjectId(customerId) : customerId;
  const sId = typeof shopId === 'string' ? new Types.ObjectId(shopId) : shopId;

  const entries = await Entry.find({
    shopId: sId,
    customerId: cId,
    deletedAt: null,
  });

  let balance = 0;
  for (const entry of entries) {
    if (entry.type === 'udhaar') {
      balance += entry.amount;
    } else if (entry.type === 'payment') {
      balance -= entry.amount;
    }
  }

  await Customer.updateOne(
    { _id: cId, shopId: sId },
    { $set: { balance } }
  );

  return balance;
}

