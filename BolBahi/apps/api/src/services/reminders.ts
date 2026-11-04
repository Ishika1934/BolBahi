import cron from 'node-cron';
import { Types } from 'mongoose';
import { Reminder, IReminder } from '../models/Reminder.js';
import { Customer } from '../models/Customer.js';
import { Shop } from '../models/Shop.js';
import { sendReminderEmail } from './mailer.js';
import { emitShopEvent } from '../lib/sse.js';

export function parseReminderWhen(whenStr: string = 'now'): Date {
  const clean = whenStr.toLowerCase().trim();
  const now = new Date();

  if (clean === 'now' || clean.includes('abhi')) {
    return now;
  }

  if (clean.includes('kal') || clean.includes('tomorrow')) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0); // 9:00 AM
    return tomorrow;
  }

  if (clean.includes('parson')) {
    const dayAfter = new Date(now);
    dayAfter.setDate(dayAfter.getDate() + 2);
    dayAfter.setHours(9, 0, 0, 0);
    return dayAfter;
  }

  // Check if valid ISO string
  const parsed = new Date(whenStr);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  // Fallback: 1 day later
  const fallback = new Date(now);
  fallback.setDate(fallback.getDate() + 1);
  fallback.setHours(9, 0, 0, 0);
  return fallback;
}

export async function processDueReminders() {
  const now = new Date();
  // Find all pending reminders where sendAt <= now
  const dueReminders = await Reminder.find({
    status: 'pending',
    sendAt: { $lte: now },
  }).setOptions({ skipTenantGuard: true });

  for (const rem of dueReminders) {
    try {
      const [customer, shop] = await Promise.all([
        Customer.findOne({ _id: rem.customerId, shopId: rem.shopId }),
        Shop.findById(rem.shopId),
      ]);

      if (!customer || !shop) {
        rem.status = 'failed';
        await rem.save();
        continue;
      }

      const emailResult = await sendReminderEmail({
        toEmail: customer.email,
        customerName: customer.name,
        shopName: shop.name,
        amount: customer.balance,
        message: rem.message,
      });

      rem.status = emailResult.ok ? 'sent' : 'failed';
      await rem.save();

      emitShopEvent(rem.shopId.toString(), 'reminder.dispatched', {
        reminderId: rem._id.toString(),
        status: rem.status,
      });
    } catch (err) {
      console.error('[ReminderCron] dispatch error for reminder:', rem._id, err);
      rem.status = 'failed';
      await rem.save();
    }
  }
}

// Start cron job: every 30 seconds
let isCronStarted = false;
export function startReminderScheduler() {
  if (isCronStarted) return;
  isCronStarted = true;
  cron.schedule('*/30 * * * * *', async () => {
    try {
      await processDueReminders();
    } catch (err) {
      console.error('[ReminderScheduler] run error:', err);
    }
  });
  console.log('⏰ Reminder cron scheduler started (checks every 30s)');
}
