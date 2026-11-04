import { Types } from 'mongoose';
import { Customer } from '../models/Customer.js';
import { Entry } from '../models/Entry.js';
import { Reminder } from '../models/Reminder.js';
import { StockItem } from '../models/StockItem.js';
import { Shop } from '../models/Shop.js';
import { resolveCustomer } from './resolver.js';
import { recomputeCustomerBalance } from './ledger.js';
import {
  buildUdhaarReply,
  buildPaymentReply,
  buildReminderReply,
  buildStockReply,
} from './replies.js';
import { parseReminderWhen } from './reminders.js';
import { sendReminderEmail } from './mailer.js';
import { emitShopEvent } from '../lib/sse.js';

export interface ActionResult {
  ok: boolean;
  type: string;
  summary: string;
  spokenPart?: string;
  data?: any;
  error?: string;
  needsClarification?: boolean;
  clarificationQuestion?: string;
  clarificationOptions?: string[];
}

// 1. ADD UDHAAR
export async function executeAddUdhaar(
  shopId: string,
  groupId: string,
  action: { customer: string; amount: number; note?: string },
  lang: 'hi-IN' | 'en-IN' = 'hi-IN'
): Promise<ActionResult> {
  const sId = new Types.ObjectId(shopId);
  const resolved = await resolveCustomer(shopId, action.customer);

  if (resolved.matchType === 'ambiguous') {
    const candidateNames = resolved.candidates?.map((c) => c.name) || [];
    const question = `Kaunsa ${resolved.cleanedName}? ${candidateNames.join(' ya ')}?`;
    return {
      ok: false,
      type: 'add_udhaar',
      summary: `Ambiguous customer: ${resolved.cleanedName}`,
      needsClarification: true,
      clarificationQuestion: question,
      clarificationOptions: candidateNames,
      error: 'AMBIGUOUS',
    };
  }

  let customer = resolved.customer;
  let isNewCustomer = false;

  // Unknown customer on add_udhaar auto-creates
  if (!customer) {
    customer = await Customer.create({
      shopId: sId,
      name: action.customer.trim(),
      aliases: [resolved.cleanedName],
      balance: 0,
    });
    isNewCustomer = true;
  }

  const entry = await Entry.create({
    shopId: sId,
    customerId: customer._id,
    type: 'udhaar',
    amount: action.amount,
    note: action.note,
    groupId,
  });

  const updatedBalance = await recomputeCustomerBalance(shopId, customer._id);
  const reply = buildUdhaarReply(customer.name, action.amount, updatedBalance, isNewCustomer, lang);

  return {
    ok: true,
    type: 'add_udhaar',
    summary: `${customer.name}: +₹${action.amount.toLocaleString('en-IN')} udhaar`,
    spokenPart: reply.speech,
    data: {
      customerId: customer._id.toString(),
      customerName: customer.name,
      amount: action.amount,
      balance: updatedBalance,
      isNewCustomer,
      entryId: entry._id.toString(),
      replyScreen: reply.screen,
      replySpeech: reply.speech,
    },
  };
}

// 2. ADD PAYMENT
export async function executeAddPayment(
  shopId: string,
  groupId: string,
  action: { customer: string; amount: number; note?: string },
  lang: 'hi-IN' | 'en-IN' = 'hi-IN'
): Promise<ActionResult> {
  const sId = new Types.ObjectId(shopId);
  const resolved = await resolveCustomer(shopId, action.customer);

  if (resolved.matchType === 'ambiguous') {
    const candidateNames = resolved.candidates?.map((c) => c.name) || [];
    const question = `Kaunsa ${resolved.cleanedName}? ${candidateNames.join(' ya ')}?`;
    return {
      ok: false,
      type: 'add_payment',
      summary: `Ambiguous customer: ${resolved.cleanedName}`,
      needsClarification: true,
      clarificationQuestion: question,
      clarificationOptions: candidateNames,
      error: 'AMBIGUOUS',
    };
  }

  const customer = resolved.customer;
  if (!customer) {
    return {
      ok: false,
      type: 'add_payment',
      summary: `Customer not found: ${action.customer}`,
      needsClarification: true,
      clarificationQuestion: `Kaun sa customer? ${action.customer} naam ka koi customer nahi mila.`,
      error: 'NOT_FOUND',
    };
  }

  const entry = await Entry.create({
    shopId: sId,
    customerId: customer._id,
    type: 'payment',
    amount: action.amount,
    note: action.note,
    groupId,
  });

  const updatedBalance = await recomputeCustomerBalance(shopId, customer._id);
  const reply = buildPaymentReply(customer.name, action.amount, updatedBalance, lang);

  return {
    ok: true,
    type: 'add_payment',
    summary: `${customer.name}: -₹${action.amount.toLocaleString('en-IN')} jama`,
    spokenPart: reply.speech,
    data: {
      customerId: customer._id.toString(),
      customerName: customer.name,
      amount: action.amount,
      balance: updatedBalance,
      entryId: entry._id.toString(),
      replyScreen: reply.screen,
      replySpeech: reply.speech,
    },
  };
}

// 3. SET REMINDER
export async function executeSetReminder(
  shopId: string,
  groupId: string,
  action: { customer?: string; when: string; message?: string },
  lang: 'hi-IN' | 'en-IN' = 'hi-IN'
): Promise<ActionResult> {
  const sId = new Types.ObjectId(shopId);

  let targetCustomerName = action.customer?.trim();

  // If customer name was not specified in the reminder action, infer from most recent customer entry
  if (!targetCustomerName) {
    const recentEntry = await Entry.findOne({ shopId: sId }).sort({ createdAt: -1 });
    if (recentEntry) {
      const recentCust = await Customer.findOne({ _id: recentEntry.customerId, shopId: sId });
      if (recentCust) {
        targetCustomerName = recentCust.name;
      }
    }
  }

  if (!targetCustomerName) {
    return {
      ok: false,
      type: 'set_reminder',
      summary: 'Customer not specified for reminder',
      needsClarification: true,
      clarificationQuestion:
        lang === 'hi-IN'
          ? 'किस ग्राहक को तगादा भेजना है? नाम बताएं।'
          : 'Which customer should the reminder be sent to? Please say the name.',
      error: 'CUSTOMER_REQUIRED',
    };
  }

  const resolved = await resolveCustomer(shopId, targetCustomerName);

  if (resolved.matchType === 'ambiguous') {
    const candidateNames = resolved.candidates?.map((c) => c.name) || [];
    const question = `Kaunsa ${resolved.cleanedName}? ${candidateNames.join(' ya ')}?`;
    return {
      ok: false,
      type: 'set_reminder',
      summary: `Ambiguous customer: ${resolved.cleanedName}`,
      needsClarification: true,
      clarificationQuestion: question,
      clarificationOptions: candidateNames,
      error: 'AMBIGUOUS',
    };
  }

  const customer = resolved.customer;
  if (!customer) {
    return {
      ok: false,
      type: 'set_reminder',
      summary: `Customer not found: ${targetCustomerName}`,
      needsClarification: true,
      clarificationQuestion:
        lang === 'hi-IN'
          ? `ग्राहक "${targetCustomerName}" नहीं मिला। कृपया सही नाम बताएं।`
          : `Customer "${targetCustomerName}" not found. Please clarify the name.`,
      error: 'NOT_FOUND',
    };
  }

  const sendAt = parseReminderWhen(action.when);
  const isImmediate = sendAt.getTime() - Date.now() <= 60000; // <= 1 minute
  let status: 'pending' | 'sent' | 'failed' = 'pending';
  let emailDispatched = false;
  let emailTo = customer.email || 'demo inbox';

  if (isImmediate) {
    const shop = await Shop.findById(sId);
    const emailRes = await sendReminderEmail({
      toEmail: customer.email,
      customerName: customer.name,
      shopName: shop?.name || 'Kirana Store',
      amount: customer.balance,
      message: action.message,
    });
    status = emailRes.ok ? 'sent' : 'failed';
    emailDispatched = emailRes.ok;
    emailTo = emailRes.to;
  }

  const reminder = await Reminder.create({
    shopId: sId,
    customerId: customer._id,
    message: action.message || `${customer.name} ko payment reminder`,
    channel: 'email',
    sendAt,
    status,
    groupId,
  });

  emitShopEvent(shopId, {
    type: 'reminder.dispatched',
    shopId,
    data: { reminderId: reminder._id.toString(), customerId: customer._id.toString() },
  });

  const whenLabel = isImmediate ? 'abhi' : action.when;
  const reply = buildReminderReply(customer.name, whenLabel, 'email', lang);

  return {
    ok: true,
    type: 'set_reminder',
    summary: `${customer.name}: Reminder (${status === 'sent' ? 'Sent' : 'Scheduled'})`,
    spokenPart: reply.speech,
    data: {
      reminderId: reminder._id.toString(),
      customerId: customer._id.toString(),
      customerName: customer.name,
      when: sendAt.toISOString(),
      status,
      emailSent: emailDispatched,
      emailTo,
      replyScreen: reply.screen,
      replySpeech: reply.speech,
    },
  };
}

// 4. ADD LOW STOCK
export async function executeAddLowStock(
  shopId: string,
  groupId: string,
  action: { item: string; quantityHint?: string },
  lang: 'hi-IN' | 'en-IN' = 'hi-IN'
): Promise<ActionResult> {
  const sId = new Types.ObjectId(shopId);
  const cleanItem = action.item.trim();

  // Upsert or create stock item
  let stockItem = await StockItem.findOne({
    shopId: sId,
    name: { $regex: new RegExp(`^${cleanItem}$`, 'i') },
  });

  if (stockItem) {
    stockItem.status = 'low';
    if (action.quantityHint) stockItem.quantityHint = action.quantityHint;
    stockItem.groupId = groupId;
    await stockItem.save();
  } else {
    stockItem = await StockItem.create({
      shopId: sId,
      name: cleanItem,
      quantityHint: action.quantityHint,
      status: 'low',
      groupId,
    });
  }

  const reply = buildStockReply(cleanItem, action.quantityHint, lang);

  return {
    ok: true,
    type: 'add_low_stock',
    summary: `${stockItem.name}: Low stock alert (${stockItem.quantityHint || 'Kam hai'})`,
    spokenPart: reply.speech,
    data: {
      stockId: stockItem._id.toString(),
      item: stockItem.name,
      quantityHint: stockItem.quantityHint,
      replyScreen: reply.screen,
      replySpeech: reply.speech,
    },
  };
}

// 5. UPDATE / RENAME CUSTOMER
export async function executeUpdateCustomer(
  shopId: string,
  groupId: string,
  action: { customer: string; newName: string; phone?: string; email?: string },
  lang: 'hi-IN' | 'en-IN' = 'hi-IN'
): Promise<ActionResult> {
  const resolved = await resolveCustomer(shopId, action.customer);

  if (resolved.matchType === 'ambiguous') {
    const candidateNames = resolved.candidates?.map((c) => c.name) || [];
    const question = `Kaunsa ${resolved.cleanedName}? ${candidateNames.join(' ya ')}?`;
    return {
      ok: false,
      type: 'update_customer',
      summary: `Ambiguous customer: ${resolved.cleanedName}`,
      needsClarification: true,
      clarificationQuestion: question,
      clarificationOptions: candidateNames,
      error: 'AMBIGUOUS',
    };
  }

  const customer = resolved.customer;
  if (!customer) {
    return {
      ok: false,
      type: 'update_customer',
      summary: `Customer not found: ${action.customer}`,
      needsClarification: true,
      clarificationQuestion:
        lang === 'hi-IN'
          ? `ग्राहक "${action.customer}" नहीं मिला। किसका नाम बदलना है?`
          : `Customer "${action.customer}" not found. Whose name should be updated?`,
      error: 'NOT_FOUND',
    };
  }

  const oldName = customer.name;
  const newName = action.newName.trim();

  // Keep old name in aliases so historical lookups and notes remain intact
  if (!customer.aliases.includes(oldName)) {
    customer.aliases.push(oldName);
  }
  customer.name = newName;
  if (action.phone) customer.phone = action.phone.trim();
  if (action.email) customer.email = action.email.trim();
  await customer.save();

  emitShopEvent(shopId, {
    type: 'ledger.updated',
    shopId,
    data: { customerId: customer._id.toString() },
  });

  const replyScreen =
    lang === 'hi-IN'
      ? `हो गया। ${oldName} का नाम बदलकर ${newName} कर दिया गया।`
      : `Updated customer name to ${newName}.`;
  const replySpeech =
    lang === 'hi-IN'
      ? `हो गया। नाम बदलकर ${newName} कर दिया गया।`
      : `Updated customer name to ${newName}.`;

  return {
    ok: true,
    type: 'update_customer',
    summary: `${oldName} → ${newName}`,
    spokenPart: replySpeech,
    data: {
      customerId: customer._id.toString(),
      oldName,
      newName,
      phone: customer.phone,
      replyScreen,
      replySpeech,
    },
  };
}

// 7. SHOW VIEW (Voice navigation & Spoken summary for any screen/tab)
export async function executeShowView(
  shopId: string,
  action: { view: 'stock' | 'reminders' | 'customers' | 'records' | 'commands' | 'hisaab' | 'settings' },
  lang: 'hi-IN' | 'en-IN' = 'hi-IN'
): Promise<ActionResult> {
  const sId = new Types.ObjectId(shopId);
  const isEn = lang === 'en-IN';

  let replyScreen = '';
  let replySpeech = '';
  let summary = '';
  let viewData: any = {};

  switch (action.view) {
    case 'stock': {
      const lowItems = await StockItem.find({ shopId: sId, status: 'low' }).sort({ createdAt: -1 });
      const count = lowItems.length;
      if (count > 0) {
        const itemNames = lowItems
          .slice(0, 4)
          .map((i) => i.name + (i.quantityHint ? ` (${i.quantityHint})` : ''))
          .join(', ');
        replyScreen = isEn
          ? `Opening Stock Alerts. ${count} item(s) running low: ${itemNames}.`
          : `स्टॉक अलर्ट खोल रहे हैं। दुकान में ${count} सामान कम है: ${itemNames}।`;
        replySpeech = isEn
          ? `Opening Stock Alerts. ${count} item(s) are running low: ${itemNames}.`
          : `स्टॉक अलर्ट खोल दिया गया है। दुकान में ${count} सामान कम स्टॉक में हैं: ${itemNames}।`;
      } else {
        replyScreen = isEn
          ? 'Opening Stock Alerts. All items are in healthy stock!'
          : 'स्टॉक अलर्ट खोल रहे हैं। दुकान में सभी सामान पर्याप्त स्टॉक में हैं!';
        replySpeech = isEn
          ? 'Opening Stock Alerts. All items are currently in healthy stock.'
          : 'स्टॉक अलर्ट खोल दिया गया है। दुकान में सभी सामान पर्याप्त हैं, कोई आइटम कम नहीं है।';
      }
      summary = isEn ? `Stock Alerts: ${count} low` : `स्टॉक अलर्ट: ${count} कम`;
      viewData = { count, lowItems: lowItems.map((i) => ({ name: i.name, quantityHint: i.quantityHint })) };
      break;
    }
    case 'reminders': {
      const pendingReminders = await Reminder.find({ shopId: sId, status: 'pending' }).sort({ sendAt: 1 });
      const count = pendingReminders.length;
      if (count > 0) {
        const names = pendingReminders.slice(0, 3).map((r) => r.customerName).join(', ');
        replyScreen = isEn
          ? `Opening Reminders. You have ${count} pending reminder(s) for ${names}.`
          : `तगादा रिमाइंडर खोल रहे हैं। ${count} तगादे बाकी हैं: ${names} के लिए।`;
        replySpeech = isEn
          ? `Opening Reminders. You have ${count} pending payment reminder(s) for ${names}.`
          : `तगादा रिमाइंडर खोल दिया गया है। ${count} ग्राहकों के लिए तगादा बाकी है: ${names}।`;
      } else {
        replyScreen = isEn
          ? 'Opening Reminders. No reminders currently scheduled.'
          : 'तगादा रिमाइंडर खोल रहे हैं। अभी कोई रिमाइंडर निर्धारित नहीं है।';
        replySpeech = isEn
          ? 'Opening Reminders. You have no pending payment reminders.'
          : 'तगादा रिमाइंडर खोल दिया गया है। कोई भी रिमाइंडर बाकी नहीं है।';
      }
      summary = isEn ? `Reminders: ${count} pending` : `तगादा: ${count} बाकी`;
      viewData = { count };
      break;
    }
    case 'customers': {
      const customers = await Customer.find({ shopId: sId, archivedAt: null }).sort({ balance: -1 });
      let totalOutstanding = 0;
      for (const c of customers) {
        if (c.balance > 0) totalOutstanding += c.balance;
      }
      replyScreen = isEn
        ? `Opening Customers. ${customers.length} customer(s), total outstanding: ₹${totalOutstanding.toLocaleString('en-IN')}.`
        : `ग्राहक खाते खोल रहे हैं। कुल ${customers.length} ग्राहक हैं और ₹${totalOutstanding.toLocaleString('en-IN')} की उधारी बाकी है।`;
      replySpeech = isEn
        ? `Opening customer accounts. You have ${customers.length} customers with total ₹${totalOutstanding.toLocaleString('en-IN')} outstanding.`
        : `ग्राहक खाते खोल दिए गए हैं। दुकान में कुल ${customers.length} ग्राहक हैं और कुल ${totalOutstanding.toLocaleString('en-IN')} रुपये की उधारी बाकी है।`;
      summary = isEn ? `Customers (${customers.length})` : `ग्राहक खाते (${customers.length})`;
      viewData = { count: customers.length, totalOutstanding };
      break;
    }
    case 'hisaab': {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const todayEntries = await Entry.find({ shopId: sId, deletedAt: null, createdAt: { $gte: startOfDay } });
      let todayUdhaar = 0;
      let todayPayment = 0;
      for (const e of todayEntries) {
        if (e.type === 'udhaar') todayUdhaar += e.amount;
        else if (e.type === 'payment') todayPayment += e.amount;
      }
      replyScreen = isEn
        ? `Opening Daily Hisaab. Today received ₹${todayPayment.toLocaleString('en-IN')}, credit given ₹${todayUdhaar.toLocaleString('en-IN')}.`
        : `दैनिक हिसाब खोल रहे हैं। आज ₹${todayPayment.toLocaleString('en-IN')} नकद जमा हुआ और ₹${todayUdhaar.toLocaleString('en-IN')} उधार दिया।`;
      replySpeech = isEn
        ? `Opening Daily Hisaab. Today, ₹${todayPayment.toLocaleString('en-IN')} cash received, and ₹${todayUdhaar.toLocaleString('en-IN')} credit given.`
        : `दैनिक हिसाब खोल दिया गया है। आज ${todayPayment.toLocaleString('en-IN')} रुपये नकद जमा हुए और ${todayUdhaar.toLocaleString('en-IN')} रुपये की उधारी दी गई।`;
      summary = isEn ? 'Daily Hisaab' : 'दैनिक हिसाब';
      viewData = { todayIn: todayPayment, todayOut: todayUdhaar };
      break;
    }
    case 'records': {
      const count = await Entry.countDocuments({ shopId: sId, deletedAt: null });
      replyScreen = isEn
        ? `Opening Ledger Records. Total ${count} transaction entries recorded.`
        : `खाता प्रविष्टियां खोल रहे हैं। कुल ${count} लेन-देन प्रविष्टियां दर्ज हैं।`;
      replySpeech = isEn
        ? `Opening Ledger Records. You have ${count} recorded entries.`
        : `खाता प्रविष्टियां खोल दी गई हैं। खाते में कुल ${count} लेन-देन दर्ज हैं।`;
      summary = isEn ? `Ledger Records (${count})` : `खाता प्रविष्टियां (${count})`;
      viewData = { count };
      break;
    }
    case 'commands': {
      replyScreen = isEn ? 'Opening Voice Command History.' : 'आवाज इतिहास खोल रहे हैं।';
      replySpeech = isEn ? 'Opening Voice Command History.' : 'आवाज इतिहास खोल दिया गया है।';
      summary = isEn ? 'Voice History' : 'आवाज इतिहास';
      break;
    }
    case 'settings': {
      replyScreen = isEn ? 'Opening Shop Settings.' : 'दुकान सेटिंग्स खोल रहे हैं।';
      replySpeech = isEn ? 'Opening Shop Settings.' : 'दुकान सेटिंग्स खोल दी गई हैं।';
      summary = isEn ? 'Shop Settings' : 'दुकान सेटिंग्स';
      break;
    }
  }

  return {
    ok: true,
    type: 'show_view',
    summary,
    spokenPart: replySpeech,
    data: {
      openView: action.view,
      replyScreen,
      replySpeech,
      ...viewData,
    },
  };
}
