import { Types } from 'mongoose';
import { Entry } from '../models/Entry.js';
import { Customer } from '../models/Customer.js';
import { StockItem } from '../models/StockItem.js';
import { Reminder } from '../models/Reminder.js';
import { resolveCustomer } from './resolver.js';
import { buildQueryBalanceReply, buildDailySummaryReply } from './replies.js';
import { ActionResult } from './executor.js';

export async function executeQueryBalance(
  shopId: string,
  customerName: string,
  lang: 'hi-IN' | 'en-IN' = 'hi-IN'
): Promise<ActionResult> {
  const resolved = await resolveCustomer(shopId, customerName);

  if (resolved.matchType === 'ambiguous') {
    const candidateNames = resolved.candidates?.map((c) => c.name) || [];
    const question = `Kaunsa ${resolved.cleanedName}? ${candidateNames.join(' ya ')}?`;
    return {
      ok: false,
      type: 'query_balance',
      summary: `Ambiguous: ${resolved.cleanedName}`,
      needsClarification: true,
      clarificationQuestion: question,
      clarificationOptions: candidateNames,
    };
  }

  const customer = resolved.customer;
  if (!customer) {
    return {
      ok: false,
      type: 'query_balance',
      summary: `Customer not found: ${customerName}`,
      needsClarification: false,
      error: 'NOT_FOUND',
      spokenPart: `${customerName} naam ka koi customer nahi mila.`,
    };
  }

  const reply = buildQueryBalanceReply(customer.name, customer.balance, lang);

  return {
    ok: true,
    type: 'query_balance',
    summary: `${customer.name}: Kul baaki ₹${customer.balance.toLocaleString('en-IN')}`,
    spokenPart: reply.speech,
    data: {
      customerId: customer._id.toString(),
      customerName: customer.name,
      balance: customer.balance,
      replyScreen: reply.screen,
      replySpeech: reply.speech,
    },
  };
}

export async function executeDailySummary(
  shopId: string,
  lang: 'hi-IN' | 'en-IN' = 'hi-IN'
): Promise<ActionResult> {
  const sId = new Types.ObjectId(shopId);

  // Today start in local time
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const todayEntries = await Entry.find({
    shopId: sId,
    deletedAt: null,
    createdAt: { $gte: startOfDay },
  });

  let udhaarTotal = 0;
  let paymentTotal = 0;

  for (const e of todayEntries) {
    if (e.type === 'udhaar') udhaarTotal += e.amount;
    else if (e.type === 'payment') paymentTotal += e.amount;
  }

  const reply = buildDailySummaryReply(udhaarTotal, paymentTotal, lang);

  return {
    ok: true,
    type: 'daily_summary',
    summary: `Aaj ka hisaab: Udhaar ₹${udhaarTotal.toLocaleString('en-IN')}, Jama ₹${paymentTotal.toLocaleString('en-IN')}`,
    spokenPart: reply.speech,
    data: {
      udhaarTotal,
      paymentTotal,
      net: paymentTotal - udhaarTotal,
      replyScreen: reply.screen,
      replySpeech: reply.speech,
    },
  };
}

export async function getShopStats(shopId: string) {
  const sId = new Types.ObjectId(shopId);

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [customers, todayEntries, lowStockCount, pendingRemindersCount] = await Promise.all([
    Customer.find({ shopId: sId, archivedAt: null }).sort({ balance: -1 }),
    Entry.find({ shopId: sId, deletedAt: null, createdAt: { $gte: startOfDay } }),
    StockItem.countDocuments({ shopId: sId, status: 'low' }),
    Reminder.countDocuments({ shopId: sId, status: 'pending' }),
  ]);

  let totalOutstanding = 0;
  for (const c of customers) {
    if (c.balance > 0) totalOutstanding += c.balance;
  }

  let todayUdhaar = 0;
  let todayPayment = 0;
  for (const e of todayEntries) {
    if (e.type === 'udhaar') todayUdhaar += e.amount;
    else if (e.type === 'payment') todayPayment += e.amount;
  }

  const topDebtors = customers
    .filter((c) => c.balance > 0)
    .slice(0, 5)
    .map((c) => ({
      id: c._id.toString(),
      name: c.name,
      balance: c.balance,
      phone: c.phone,
    }));

  return {
    totalOutstanding,
    todayIn: todayPayment,
    todayOut: todayUdhaar,
    netToday: todayPayment - todayUdhaar,
    customerCount: customers.length,
    lowStockCount,
    pendingRemindersCount,
    topDebtors,
  };
}

