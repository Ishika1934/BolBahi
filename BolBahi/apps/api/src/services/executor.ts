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
    const question =
      lang === 'hi-IN'
        ? `दुकान में '${resolved.cleanedName}' नाम के कई ग्राहक हैं: ${candidateNames.join(' और ')}। कृपया पूरा नाम या फोन नंबर जैसे और विवरण बताएं।`
        : `There are multiple customers named "${resolved.cleanedName}": ${candidateNames.join(' and ')}. Please tell me more details like full name or phone number.`;
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
    const question =
      lang === 'hi-IN'
        ? `दुकान में '${resolved.cleanedName}' नाम के कई ग्राहक हैं: ${candidateNames.join(' और ')}। कृपया पूरा नाम या फोन नंबर जैसे और विवरण बताएं।`
        : `There are multiple customers named "${resolved.cleanedName}": ${candidateNames.join(' and ')}. Please tell me more details like full name or phone number.`;
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
    const question =
      lang === 'hi-IN'
        ? `दुकान में '${resolved.cleanedName}' नाम के कई ग्राहक हैं: ${candidateNames.join(' और ')}। कृपया पूरा नाम या फोन नंबर जैसे और विवरण बताएं।`
        : `There are multiple customers named "${resolved.cleanedName}": ${candidateNames.join(' and ')}. Please tell me more details like full name or phone number.`;
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

  emitShopEvent(shopId, 'reminder.dispatched', {
    reminderId: reminder._id.toString(),
    customerId: customer._id.toString(),
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

// 4. ADD LOW STOCK & INTELLIGENT QUANTITY MERGING
const KIRANA_SYNONYMS: Record<string, string[]> = {
  cheeni: ['cheeni', 'chini', 'shakkar', 'sugar', 'चीनी', 'शक्कर', 'साकर'],
  atta: ['atta', 'aata', 'gehu atta', 'flour', 'wheat flour', 'आटा', 'गेहूं आटा'],
  tel: ['tel', 'tail', 'sarson tel', 'sarso tel', 'oil', 'mustard oil', 'refined tel', 'refined oil', 'तेल', 'सरसों तेल'],
  chawal: ['chawal', 'rice', 'basmati', 'चावल'],
  dal: ['dal', 'daal', 'toor dal', 'arhar dal', 'moong dal', 'chana dal', 'masoor dal', 'दाल'],
  doodh: ['doodh', 'dudh', 'milk', 'दूध'],
  namak: ['namak', 'salt', 'tata namak', 'नमक'],
  chai: ['chai', 'chai patti', 'tea', 'chay', 'चाय', 'चाय पत्ती'],
  biscuit: ['biscuit', 'biscuits', 'parle g', 'बिस्कुट', 'बिस्किट'],
  sabun: ['sabun', 'soap', 'surf', 'detergent', 'साबुन'],
  masala: ['masala', 'haldi', 'mirch', 'dhaniya', 'मसाला'],
};

function normalizeUnit(unitStr: string): string {
  const u = unitStr.toLowerCase().trim();
  if (['kg', 'kgs', 'kilo', 'kilos', 'किग्रा', 'किलो'].includes(u)) return 'kg';
  if (['g', 'gm', 'gms', 'gram', 'grams', 'ग्राम'].includes(u)) return 'g';
  if (['l', 'ltr', 'ltrs', 'litre', 'litres', 'liter', 'liters', 'लीटर'].includes(u)) return 'liter';
  if (['ml', 'मिली'].includes(u)) return 'ml';
  if (['packet', 'pkt', 'packets', 'पैकेट'].includes(u)) return 'packet';
  if (['bori', 'bag', 'bags', 'बोरी'].includes(u)) return 'bori';
  if (['piece', 'pc', 'pcs', 'नग'].includes(u)) return 'piece';
  if (['box', 'peti', 'पेटी', 'डिब्बा'].includes(u)) return 'box';
  return u;
}

function parseQuantityAndUnit(text?: string): { num: number; unit: string } | null {
  if (!text) return null;
  const clean = text.trim().toLowerCase();

  let numVal: number | null = null;
  if (clean.includes('aadha') || clean.includes('आधा')) numVal = 0.5;
  else if (clean.includes('dedh') || clean.includes('डेढ़')) numVal = 1.5;
  else if (clean.includes('dhai') || clean.includes('ढाई')) numVal = 2.5;

  const match = clean.match(/(\d+(?:\.\d+)?)\s*([a-zA-Z\u0900-\u097F]*)/);
  if (match) {
    numVal = parseFloat(match[1]);
    const unitPart = match[2].trim();
    return { num: numVal, unit: normalizeUnit(unitPart) };
  } else if (numVal !== null) {
    const unitPart = clean.replace(/(?:aadha|dedh|dhai|आधा|डेढ़|ढाई)/gi, '').trim();
    return { num: numVal, unit: normalizeUnit(unitPart) };
  }

  return null;
}

export function mergeStockQuantities(existingHint?: string, incomingHint?: string): string {
  if (!existingHint) return incomingHint || '';
  if (!incomingHint) return existingHint;

  const p1 = parseQuantityAndUnit(existingHint);
  const p2 = parseQuantityAndUnit(incomingHint);

  if (p1 && p2) {
    if (p1.unit === p2.unit) {
      const sum = Math.round((p1.num + p2.num) * 100) / 100;
      return p1.unit ? `${sum} ${p1.unit}` : `${sum}`;
    }
    if (p1.unit === 'kg' && p2.unit === 'g') {
      const sum = Math.round((p1.num + p2.num / 1000) * 100) / 100;
      return `${sum} kg`;
    }
    if (p1.unit === 'g' && p2.unit === 'kg') {
      const sum = Math.round((p1.num + p2.num * 1000) * 100) / 100;
      return `${sum} g`;
    }
    if (p1.unit === 'liter' && p2.unit === 'ml') {
      const sum = Math.round((p1.num + p2.num / 1000) * 100) / 100;
      return `${sum} liter`;
    }
    if (p1.unit === 'ml' && p2.unit === 'liter') {
      const sum = Math.round((p1.num + p2.num * 1000) * 100) / 100;
      return `${sum} ml`;
    }
    if (!p1.unit && p2.unit) {
      return `${p1.num + p2.num} ${p2.unit}`;
    }
    if (p1.unit && !p2.unit) {
      return `${p1.num + p2.num} ${p1.unit}`;
    }
    return `${existingHint} + ${incomingHint}`;
  }

  return incomingHint || existingHint;
}

async function findMatchingStockItem(shopId: Types.ObjectId, cleanItem: string) {
  const allItems = await StockItem.find({ shopId });
  if (allItems.length === 0) return null;

  const itemLower = cleanItem.toLowerCase();

  // 1. Direct name match
  const exact = allItems.find((i) => i.name.toLowerCase() === itemLower);
  if (exact) return exact;

  // 2. Synonyms match (e.g. cheeni, chini, sugar)
  for (const [key, synList] of Object.entries(KIRANA_SYNONYMS)) {
    const incomingMatches = synList.some(
      (syn) => syn === itemLower || itemLower.includes(syn) || syn.includes(itemLower)
    );
    if (incomingMatches) {
      const existingMatch = allItems.find((i) => {
        const iLower = i.name.toLowerCase();
        return synList.some((syn) => syn === iLower || iLower.includes(syn) || syn.includes(iLower));
      });
      if (existingMatch) return existingMatch;
    }
  }

  // 3. Substring match
  const substringMatch = allItems.find((i) => {
    const iLower = i.name.toLowerCase();
    return iLower.includes(itemLower) || itemLower.includes(iLower);
  });
  if (substringMatch) return substringMatch;

  return null;
}

export async function executeAddLowStock(
  shopId: string,
  groupId: string,
  action: { item: string; quantityHint?: string },
  lang: 'hi-IN' | 'en-IN' = 'hi-IN'
): Promise<ActionResult> {
  const sId = new Types.ObjectId(shopId);
  const cleanItem = action.item.trim();

  // Find matching existing or similar item
  let stockItem = await findMatchingStockItem(sId, cleanItem);
  let isMerged = false;

  if (stockItem) {
    isMerged = true;
    stockItem.status = 'low';
    stockItem.quantityHint = mergeStockQuantities(stockItem.quantityHint, action.quantityHint);
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

  emitShopEvent(shopId, 'stock.updated', { id: stockItem._id.toString() });

  const isEn = lang === 'en-IN';
  let replyScreen = '';
  let replySpeech = '';

  if (isMerged && action.quantityHint) {
    replyScreen = isEn
      ? `${stockItem.name}: Added ${action.quantityHint} (Total: ${stockItem.quantityHint}).`
      : `${stockItem.name}: ${action.quantityHint} और जोड़ा गया। कुल अब: ${stockItem.quantityHint}।`;
    replySpeech = isEn
      ? `Added ${action.quantityHint} to ${stockItem.name}. Total is now ${stockItem.quantityHint} in low stock.`
      : `हो गया। ${stockItem.name} में ${action.quantityHint} और जोड़ दिया गया, अब कुल ${stockItem.quantityHint} स्टॉक कम है।`;
  } else {
    const baseReply = buildStockReply(stockItem.name, stockItem.quantityHint, lang);
    replyScreen = baseReply.screen;
    replySpeech = baseReply.speech;
  }

  return {
    ok: true,
    type: 'add_low_stock',
    summary: `${stockItem.name}: Low stock (${stockItem.quantityHint || 'Kam hai'})`,
    spokenPart: replySpeech,
    data: {
      stockId: stockItem._id.toString(),
      item: stockItem.name,
      quantityHint: stockItem.quantityHint,
      isMerged,
      replyScreen,
      replySpeech,
    },
  };
}

// 5. UPDATE / RENAME CUSTOMER
export async function executeUpdateCustomer(
  shopId: string,
  groupId: string,
  action: { customer: string; newName?: string; phone?: string; email?: string },
  lang: 'hi-IN' | 'en-IN' = 'hi-IN'
): Promise<ActionResult> {
  const resolved = await resolveCustomer(shopId, action.customer);

  if (resolved.matchType === 'ambiguous') {
    const candidateNames = resolved.candidates?.map((c) => c.name) || [];
    const question =
      lang === 'hi-IN'
        ? `दुकान में '${resolved.cleanedName}' नाम के कई ग्राहक हैं: ${candidateNames.join(' और ')}। कृपया पूरा नाम या फोन नंबर जैसे और विवरण बताएं।`
        : `There are multiple customers named "${resolved.cleanedName}": ${candidateNames.join(' and ')}. Please tell me more details like full name or phone number.`;
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
          ? `ग्राहक "${action.customer}" नहीं मिला। किस ग्राहक की जानकारी बदलनी है?`
          : `Customer "${action.customer}" not found. Whose details should be updated?`,
      error: 'NOT_FOUND',
    };
  }

  const oldName = customer.name;
  let newName = oldName;
  const updatesMade: string[] = [];

  if (action.newName && action.newName.trim() && action.newName.trim() !== oldName) {
    newName = action.newName.trim();
    if (!customer.aliases.includes(oldName)) {
      customer.aliases.push(oldName);
    }
    customer.name = newName;
    updatesMade.push(lang === 'hi-IN' ? `नाम बदलकर ${newName}` : `name to ${newName}`);
  }

  if (action.phone !== undefined && action.phone.trim()) {
    customer.phone = action.phone.trim();
    updatesMade.push(lang === 'hi-IN' ? `फोन नंबर ${customer.phone}` : `phone to ${customer.phone}`);
  }

  if (action.email !== undefined && action.email.trim()) {
    customer.email = action.email.trim();
    updatesMade.push(lang === 'hi-IN' ? `ईमेल ${customer.email}` : `email to ${customer.email}`);
  }

  await customer.save();

  emitShopEvent(shopId, 'ledger.updated', {
    customerId: customer._id.toString(),
  });

  const replyScreen =
    lang === 'hi-IN'
      ? `हो गया। ${customer.name} का विवरण (${updatesMade.join(', ') || 'सहेजा गया'}) अपडेट कर दिया गया।`
      : `Updated ${customer.name}'s details (${updatesMade.join(', ') || 'saved'}).`;
  const replySpeech =
    lang === 'hi-IN'
      ? `हो गया। ${customer.name} की जानकारी दर्ज कर दी गई।`
      : `Updated ${customer.name}'s details.`;

  return {
    ok: true,
    type: 'update_customer',
    summary: `${oldName} ${updatesMade.length > 0 ? `(${updatesMade.join(', ')})` : ''}`,
    spokenPart: replySpeech,
    data: {
      customerId: customer._id.toString(),
      oldName,
      newName,
      phone: customer.phone,
      email: customer.email,
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
      const pendingReminders = await Reminder.find({ shopId: sId, status: 'pending' })
        .populate<{ customerId: { name: string } }>('customerId')
        .sort({ sendAt: 1 });
      const count = pendingReminders.length;
      if (count > 0) {
        const names = pendingReminders
          .slice(0, 3)
          .map((r) => (r.customerId as any)?.name || 'Customer')
          .join(', ');
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
