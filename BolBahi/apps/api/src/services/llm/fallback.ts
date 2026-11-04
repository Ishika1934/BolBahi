import { Action, ParseResult } from '../../schemas/actions.js';
import { LLMInput } from './provider.js';

export function parseHindiNumberWords(text: string): number | null {
  const clean = text.toLowerCase();
  if (clean.includes('dedh hazaar') || clean.includes('1500')) return 1500;
  if (clean.includes('dhai hazaar') || clean.includes('2500')) return 2500;
  if (clean.includes('do hazaar paanch sau')) return 2500;
  if (clean.includes('ek hazaar') || clean.includes('1 hazaar')) return 1000;
  if (clean.includes('do hazaar') || clean.includes('2 hazaar')) return 2000;
  if (clean.includes('teen hazaar') || clean.includes('3 hazaar')) return 3000;
  if (clean.includes('paanch sau') || clean.includes('5 sau')) return 500;
  if (clean.includes('do sau') || clean.includes('2 sau')) return 200;
  if (clean.includes('teen sau') || clean.includes('3 sau')) return 300;
  if (clean.includes('chaar sau') || clean.includes('4 sau')) return 400;
  if (clean.includes('ek sau') || clean.includes('1 sau')) return 100;

  // Direct digits
  const numMatch = text.match(/\b(\d+)\b/);
  if (numMatch) {
    return parseInt(numMatch[1], 10);
  }

  return null;
}

export function fallbackParse(input: LLMInput): ParseResult {
  const t = input.transcript.trim();
  const lower = t.toLowerCase();
  const actions: Action[] = [];

  // Helper to extract known customer from list
  const findCustomer = (subtext: string): string | null => {
    for (const c of input.customers) {
      const firstName = c.split(' ')[0].toLowerCase();
      if (subtext.toLowerCase().includes(firstName)) {
        return c.split(' ')[0]; // return matched first name
      }
    }
    // Fallback: check word before "ne" or "ko"
    const m = subtext.match(/([a-zA-Z\u0900-\u097F]+)\s+(?:ne|ko|ka|ki)\b/i);
    if (m && !['aaj', 'kal', 'parson', 'last', 'atta', 'chini'].includes(m[1].toLowerCase())) {
      return m[1];
    }
    return null;
  };

  // Check if answering a pending clarification question
  if (input.pendingQuestion) {
    for (const c of input.customers) {
      if (lower.includes(c.toLowerCase()) || c.toLowerCase().includes(lower)) {
        // Matched customer answer
        return {
          language: 'hinglish',
          actions: [{ type: 'add_udhaar', customer: c, amount: parseHindiNumberWords(input.pendingQuestion) || 300 }],
          confidence: 0.9,
          source: 'fallback',
        };
      }
    }
  }

  // Check update customer phone: e.g. "Ramesh ka phone number 9876543210 kar do" or "update Ramesh phone to 9876543210"
  const phoneMatch = t.match(/([a-zA-Z\u0900-\u097F\s]+?)\s*(?:ka|ki)?\s*(?:phone|mobile|phone number|number)\s*(?:badal kar|badlo|to|kar do|likh do)?\s*([6-9]\d{9})/i)
    || t.match(/(?:update|change)\s+(?:phone|mobile)\s+(?:of\s+)?([a-zA-Z\u0900-\u097F\s]+?)\s+(?:to\s+)?([6-9]\d{9})/i);
  if (phoneMatch) {
    const cust = findCustomer(phoneMatch[1]) || phoneMatch[1].trim();
    return {
      language: 'hinglish',
      actions: [{
        type: 'update_customer',
        customer: cust,
        phone: phoneMatch[2].trim(),
      }],
      confidence: 0.95,
      source: 'fallback',
    };
  }

  // Check update customer email: e.g. "Ramesh ka email ramesh@gmail.com kar do"
  const emailMatch = t.match(/([a-zA-Z\u0900-\u097F\s]+?)\s*(?:ka|ki)?\s*email\s*(?:badal kar|badlo|to|kar do|likh do)?\s*([^\s@]+@[^\s@]+\.[^\s@]+)/i);
  if (emailMatch) {
    const cust = findCustomer(emailMatch[1]) || emailMatch[1].trim();
    return {
      language: 'hinglish',
      actions: [{
        type: 'update_customer',
        customer: cust,
        email: emailMatch[2].trim(),
      }],
      confidence: 0.95,
      source: 'fallback',
    };
  }

  // Check update_customer (correcting misheard name)
  const renameMatch = t.match(/(?:change|update)\s+name\s+(?:of\s+)?([a-zA-Z\u0900-\u097F\s]+?)\s+(?:to|kar do)\s+([a-zA-Z\u0900-\u097F\s]+)/i)
    || t.match(/([a-zA-Z\u0900-\u097F\s]+?)\s+ka\s+naam\s+badal\s+kar\s+([a-zA-Z\u0900-\u097F\s]+)\s+kar\s+do/i)
    || t.match(/(?:naam\s+badal\s+kar|naam\s+badlo)\s+([a-zA-Z\u0900-\u097F\s]+?)\s+(?:to|kar do)?\s*([a-zA-Z\u0900-\u097F\s]+)/i);
  if (renameMatch) {
    return {
      language: 'hinglish',
      actions: [{
        type: 'update_customer',
        customer: renameMatch[1].trim(),
        newName: renameMatch[2].trim(),
      }],
      confidence: 0.95,
      source: 'fallback',
    };
  }

  // Check query customer phone: e.g. "Ramesh ka phone number kya hai" or "what is Ramesh's phone"
  const phoneQueryMatch = t.match(/([a-zA-Z\u0900-\u097F\s]+?)\s*(?:ka|ki)?\s*(?:phone|mobile|phone number|number|mobile number)\s*(?:kya hai|batao|do|sunao|bol do|\?)/i)
    || t.match(/(?:what is|tell me|get|show)\s+(?:the\s+)?(?:phone|mobile|phone number)\s+(?:of|for)?\s*([a-zA-Z\u0900-\u097F\s]+)/i);
  if (phoneQueryMatch) {
    const cust = findCustomer(phoneQueryMatch[1]) || phoneQueryMatch[1].trim();
    return {
      language: 'hinglish',
      actions: [{
        type: 'query_customer_info',
        customer: cust,
        field: 'phone',
      }],
      confidence: 0.95,
      source: 'fallback',
    };
  }

  // Check query customer email: e.g. "Ramesh ka email kya hai" or "what is Ramesh's email"
  const emailQueryMatch = t.match(/([a-zA-Z\u0900-\u097F\s]+?)\s*(?:ka|ki)?\s*email\s*(?:id)?\s*(?:kya hai|batao|do|sunao|\?)/i)
    || t.match(/(?:what is|tell me|get|show)\s+(?:the\s+)?email\s+(?:of|for)?\s*([a-zA-Z\u0900-\u097F\s]+)/i);
  if (emailQueryMatch) {
    const cust = findCustomer(emailQueryMatch[1]) || emailQueryMatch[1].trim();
    return {
      language: 'hinglish',
      actions: [{
        type: 'query_customer_info',
        customer: cust,
        field: 'email',
      }],
      confidence: 0.95,
      source: 'fallback',
    };
  }

  // Check query customer contact details: e.g. "Ramesh ke contact details do" or "Ramesh ka contact batao"
  const contactQueryMatch = t.match(/([a-zA-Z\u0900-\u097F\s]+?)\s*(?:ka|ke|ki)?\s*(?:contact|details|sampark|contact details)\s*(?:batao|kya hai|do|\?)/i);
  if (contactQueryMatch) {
    const cust = findCustomer(contactQueryMatch[1]) || contactQueryMatch[1].trim();
    return {
      language: 'hinglish',
      actions: [{
        type: 'query_customer_info',
        customer: cust,
        field: 'all',
      }],
      confidence: 0.95,
      source: 'fallback',
    };
  }

  // Check stating customer balance: e.g. "Ramesh ka balance 500 hai" or "Ramesh balance 500" or "Ramesh ka hisaab 500 hai"
  const balanceStatementMatch = t.match(/([a-zA-Z\u0900-\u097F\s]+?)\s*(?:ka|ki)?\s*(?:balance|hisaab)\s*(?:hai)?\s*([0-9]+)/i)
    || t.match(/([a-zA-Z\u0900-\u097F\s]+?)\s*(?:ka|ki)?\s*(?:balance|hisaab)\s*([0-9]+)\s*(?:rupaye|rs|hai)?/i)
    || t.match(/([a-zA-Z\u0900-\u097F\s]+?)\s+par\s+([0-9]+)\s*(?:baaki|udhaar)/i);
  if (balanceStatementMatch && !lower.includes('kitna') && !lower.includes('kya')) {
    const cust = findCustomer(balanceStatementMatch[1]) || balanceStatementMatch[1].trim();
    const amount = parseInt(balanceStatementMatch[2], 10);
    return {
      language: 'hinglish',
      actions: [{
        type: 'add_udhaar',
        customer: cust,
        amount,
        note: 'Balance entry',
      }],
      confidence: 0.95,
      source: 'fallback',
    };
  }

  // Check direct stock quantity utterance: e.g. "10 kg cheeni" or "20 kg cheeni" or "5 packet biscuit"
  const directStockMatch = t.match(/^(\d+(?:\.\d+)?)\s*(kilo|kg|packet|pkt|bori|bag|litre|liter|l|gram|gm|g)?\s+([a-zA-Z\u0900-\u097F\s]+)$/i)
    || t.match(/^([a-zA-Z\u0900-\u097F\s]+?)\s+(\d+(?:\.\d+)?)\s*(kilo|kg|packet|pkt|bori|bag|litre|liter|l|gram|gm|g)?\s*(?:kam hai|khatam|mangwana|stock)?$/i);
  if (directStockMatch) {
    const isQtyFirst = !isNaN(parseFloat(directStockMatch[1]));
    const item = isQtyFirst ? directStockMatch[3].trim() : directStockMatch[1].trim();
    const qtyNum = isQtyFirst ? directStockMatch[1] : directStockMatch[2];
    const qtyUnit = (isQtyFirst ? directStockMatch[2] : directStockMatch[3]) || 'kg';
    if (!['aaj', 'kal', 'parson', 'last', 'undo'].includes(item.toLowerCase())) {
      return {
        language: 'hinglish',
        actions: [{
          type: 'add_low_stock',
          item,
          quantityHint: `${qtyNum} ${qtyUnit}`.trim(),
        }],
        confidence: 0.95,
        source: 'fallback',
      };
    }
  }

  // 1. Undo
  if (lower.includes('hata do') || lower.includes('undo') || lower.includes('galat ho gaya') || lower.includes('last wala')) {
    return {
      language: 'hinglish',
      actions: [{ type: 'undo_last' }],
      confidence: 0.95,
      source: 'fallback',
    };
  }

  // 2. Daily summary
  if (lower.includes('aaj ka hisaab') || lower.includes('aaj kitna udhaar') || lower.includes('daily summary') || lower.includes('aaj ka total')) {
    return {
      language: 'hinglish',
      actions: [{ type: 'daily_summary' }],
      confidence: 0.95,
      source: 'fallback',
    };
  }

  // 3. Show View / Tab Navigation commands
  if (
    lower.includes('show stock') ||
    lower.includes('stock alert') ||
    lower.includes('stock dikhao') ||
    lower.includes('low stock') ||
    lower.includes('kam stock') ||
    lower.includes('stock kholo')
  ) {
    return {
      language: 'hinglish',
      actions: [{ type: 'show_view', view: 'stock' }],
      confidence: 0.95,
      source: 'fallback',
    };
  }

  if (
    lower.includes('show reminder') ||
    lower.includes('reminder dikhao') ||
    lower.includes('tagada dikhao') ||
    lower.includes('reminders kholo')
  ) {
    return {
      language: 'hinglish',
      actions: [{ type: 'show_view', view: 'reminders' }],
      confidence: 0.95,
      source: 'fallback',
    };
  }

  if (
    lower.includes('show customer') ||
    lower.includes('customer ledger') ||
    lower.includes('customer dikhao') ||
    lower.includes('customers dikhao') ||
    lower.includes('grahak khata') ||
    lower.includes('grahak dikhao') ||
    lower.includes('customers kholo')
  ) {
    return {
      language: 'hinglish',
      actions: [{ type: 'show_view', view: 'customers' }],
      confidence: 0.95,
      source: 'fallback',
    };
  }

  if (
    lower.includes('show record') ||
    lower.includes('records dikhao') ||
    lower.includes('entries dikhao') ||
    lower.includes('len den dikhao') ||
    lower.includes('pravistiyan') ||
    lower.includes('records kholo')
  ) {
    return {
      language: 'hinglish',
      actions: [{ type: 'show_view', view: 'records' }],
      confidence: 0.95,
      source: 'fallback',
    };
  }

  if (
    lower.includes('show history') ||
    lower.includes('history dikhao') ||
    lower.includes('commands dikhao') ||
    lower.includes('aawaz itihas')
  ) {
    return {
      language: 'hinglish',
      actions: [{ type: 'show_view', view: 'commands' }],
      confidence: 0.95,
      source: 'fallback',
    };
  }

  if (
    lower.includes('hisaab dikhao') ||
    lower.includes('show hisaab') ||
    lower.includes('daily hisaab dikhao') ||
    lower.includes('hisaab kholo')
  ) {
    return {
      language: 'hinglish',
      actions: [{ type: 'show_view', view: 'hisaab' }],
      confidence: 0.95,
      source: 'fallback',
    };
  }

  if (
    lower.includes('show setting') ||
    lower.includes('settings dikhao') ||
    lower.includes('dukan settings') ||
    lower.includes('settings kholo')
  ) {
    return {
      language: 'hinglish',
      actions: [{ type: 'show_view', view: 'settings' }],
      confidence: 0.95,
      source: 'fallback',
    };
  }

  // 3. Multi-intent demo sentence special split (comma, 'aur', 'and')
  const clauses = t.split(/[,;\n]|(?:\baur\b)/i).map((c) => c.trim()).filter(Boolean);

  for (const clause of clauses) {
    const clLower = clause.toLowerCase();

    // Check query_balance
    if (clLower.includes('kitna baaki') || clLower.includes('ka hisaab') || clLower.includes('how much balance')) {
      const cust = findCustomer(clause);
      if (cust) {
        actions.push({ type: 'query_balance', customer: cust });
        continue;
      }
    }

    // Check add_low_stock
    if (clLower.includes('kam hai') || clLower.includes('khatam ho') || clLower.includes('low stock') || clLower.includes('stock kam')) {
      let item = 'atta';
      if (clLower.includes('chini')) item = 'chini';
      else if (clLower.includes('atta')) item = 'atta';
      else if (clLower.includes('tel')) item = 'tel';
      else if (clLower.includes('chawal')) item = 'chawal';

      const qtyMatch = clause.match(/(\d+\s*(?:kilo|kg|packet|litre|liter|gm|g)?)/i);
      actions.push({
        type: 'add_low_stock',
        item,
        quantityHint: qtyMatch ? qtyMatch[1] : undefined,
      });
      continue;
    }

    // Check set_reminder
    if (
      clLower.includes('yaad dila') ||
      clLower.includes('reminder') ||
      clLower.includes('bhej do') ||
      clLower.includes('tagada')
    ) {
      const cust = findCustomer(clause);
      let when = 'now';
      if (clLower.includes('kal')) when = 'kal';
      else if (clLower.includes('parson')) when = 'parson';
      else if (clLower.includes('friday')) when = 'Friday';

      actions.push({
        type: 'set_reminder',
        customer: cust || undefined,
        when,
        message: cust ? `${cust} ko payment ka reminder` : 'Payment reminder',
      });
      continue;
    }

    // Check add_payment
    if (
      clLower.includes('wapas') ||
      clLower.includes('jama') ||
      clLower.includes('paid') ||
      clLower.includes('de diye') ||
      clLower.includes('diye')
    ) {
      const cust = findCustomer(clause);
      const amount = parseHindiNumberWords(clause);
      if (cust && amount) {
        actions.push({
          type: 'add_payment',
          customer: cust,
          amount,
        });
        continue;
      }
    }

    // Check add_udhaar
    if (
      clLower.includes('udhaar') ||
      clLower.includes('likh') ||
      clLower.includes('baaki') ||
      clLower.includes('liya') ||
      clLower.includes('maal diya') ||
      clLower.includes('credit')
    ) {
      const cust = findCustomer(clause);
      const amount = parseHindiNumberWords(clause);
      if (cust && amount) {
        actions.push({
          type: 'add_udhaar',
          customer: cust,
          amount,
        });
        continue;
      }
    }
  }

  // If no clauses matched but sentence has customer + amount + udhaar word
  if (actions.length === 0) {
    const cust = findCustomer(t);
    const amount = parseHindiNumberWords(t);
    if (cust && amount) {
      if (lower.includes('jama') || lower.includes('wapas') || lower.includes('paid')) {
        actions.push({ type: 'add_payment', customer: cust, amount });
      } else {
        actions.push({ type: 'add_udhaar', customer: cust, amount });
      }
    }
  }

  return {
    language: 'hinglish',
    actions,
    confidence: actions.length > 0 ? 0.8 : 0.2,
    source: 'fallback',
  };
}
