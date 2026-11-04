import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';
import { env } from '../../lib/env.js';
import { LLMProvider, LLMInput } from './provider.js';
import { Action, ParseResult, singleActionSchema } from '../../schemas/actions.js';
import { fallbackParse } from './fallback.js';

// 60-second in-memory LRU/map cache for repeated transcripts (page 15 Quota saver)
const transcriptCache = new Map<string, { result: ParseResult; expiresAt: number }>();

const recordActionsDecl: FunctionDeclaration = {
  name: 'record_actions',
  description: 'Records one or more kirana ledger actions extracted from voice utterance.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      language: {
        type: Type.STRING,
        description: 'Language of utterance: hi, en, or hinglish',
      },
      confidence: {
        type: Type.NUMBER,
        description: 'Confidence score from 0.0 to 1.0',
      },
      actions: {
        type: Type.ARRAY,
        description: 'List of extracted actions in spoken order',
        items: {
          type: Type.OBJECT,
          properties: {
            type: {
              type: Type.STRING,
              enum: [
                'add_udhaar',
                'add_payment',
                'set_reminder',
                'add_low_stock',
                'query_balance',
                'query_customer_info',
                'daily_summary',
                'undo_last',
                'clarify',
                'update_customer',
                'show_view',
              ],
              description: 'Exact action type: add_udhaar, add_payment, set_reminder, add_low_stock, query_balance, query_customer_info, daily_summary, undo_last, clarify, update_customer, show_view',
            },
            view: {
              type: Type.STRING,
              enum: ['stock', 'reminders', 'customers', 'records', 'commands', 'hisaab', 'settings'],
              description: 'View or screen to display: stock, reminders, customers, records, commands, hisaab, settings',
            },
            customer: { type: Type.STRING, description: 'Customer name or match from known list' },
            field: {
              type: Type.STRING,
              enum: ['phone', 'email', 'all'],
              description: 'Field to query: phone, email, or all for contact details',
            },
            newName: { type: Type.STRING, description: 'New name when updating or renaming a customer' },
            phone: { type: Type.STRING, description: 'Phone number when updating customer phone' },
            email: { type: Type.STRING, description: 'Email address when updating customer email' },
            amount: { type: Type.NUMBER, description: 'Amount in INR' },
            note: { type: Type.STRING, description: 'Optional note or item details' },
            when: { type: Type.STRING, description: 'When to remind, e.g. now, kal, 2026-11-05T09:00:00+05:30' },
            message: { type: Type.STRING, description: 'Reminder message' },
            item: { type: Type.STRING, description: 'Stock item name' },
            quantityHint: { type: Type.STRING, description: 'e.g. 10 kilo' },
            question: { type: Type.STRING, description: 'Clarification question if ambiguous' },
            options: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Options if clarify' },
          },
          required: ['type'],
        },
      },
    },
    required: ['actions'],
  },
};

export class GeminiProvider implements LLMProvider {
  public name = 'gemini' as const;
  private client: GoogleGenAI | null = null;

  constructor() {
    this.initClient();
  }

  private initClient() {
    if (!this.client && env.GEMINI_API_KEY && env.GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY') {
      try {
        this.client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
        console.log(`🤖 Gemini LLM initialized with model: ${env.GEMINI_MODEL}`);
      } catch (err) {
        console.warn('Could not initialize GoogleGenAI client:', err);
      }
    }
  }

  async parse(input: LLMInput): Promise<ParseResult> {
    this.initClient();
    const cacheKey = `${input.lang}:${input.transcript.trim().toLowerCase()}`;
    const cached = transcriptCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.result;
    }

    // Check if client is configured
    if (!this.client || env.GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY') {
      console.log('⚡ Gemini API key not configured, using built-in fallback parser');
      const fallbackResult = fallbackParse(input);
      transcriptCache.set(cacheKey, { result: fallbackResult, expiresAt: Date.now() + 60000 });
      return fallbackResult;
    }

    const systemPrompt = `You are the voice parser for BolBahi, an Indian kirana credit ledger.
Input is a spoken transcript in Hindi, English or Hinglish.
Extract EVERY separate action in the utterance in spoken order and call record_actions.

Rules:
- 'udhaar liya / diya / likh do / khate me' => add_udhaar (customer, amount).
- Stating customer balance: e.g. '[customer] ka balance [amount] hai' or '[customer] par [amount] baaki' => add_udhaar (customer, amount). If [customer] is not in KNOWN_CUSTOMERS, BolBahi creates them automatically with this balance.
- 'wapas diye / jama / payment / de diye' => add_payment (customer, amount).
- 'kam hai / mangwana hai / stock' or direct quantity + item (e.g. "10 kg cheeni", "20 kg cheeni", "5 packet biscuit") => add_low_stock (item, quantityHint). The system automatically adds and merges quantities for the same or similar goods (e.g. 10 kg + 20 kg = 30 kg).
- 'yaad dila dena / reminder / tagada' => set_reminder (customer, when, message).
- 'kitna baaki hai / balance / hisaab kya hai' => query_balance (customer). If [customer] is not in KNOWN_CUSTOMERS, BolBahi creates that customer with ₹0 balance.
- 'phone number kya hai / mobile number batao / contact details / email kya hai / number do' => query_customer_info (customer, field: 'phone' | 'email' | 'all').
  * e.g. "Ramesh ka phone number kya hai?" => query_customer_info(customer: "Ramesh", field: "phone")
  * e.g. "Suresh ka email batao" => query_customer_info(customer: "Suresh", field: "email")
  * e.g. "Sharma ji ke contact details do" => query_customer_info(customer: "Sharma ji", field: "all")
- 'aaj ka hisaab / din bhar ka' => daily_summary.
- 'hata do / undo / galat ho gaya' => undo_last.
- 'naam badal kar / phone number badal kar / phone number likho / update customer / change phone / change name' => update_customer (customer, newName?, phone?, email?).
  * e.g. "Ramesh ka phone number 9876543210 kar do" => update_customer(customer: "Ramesh", phone: "9876543210")
  * e.g. "Suresh ka email suresh@kirana.com likh do" => update_customer(customer: "Suresh", email: "suresh@kirana.com")
  * e.g. "Ramesh ka naam badal kar Ramesh Kumar kar do" => update_customer(customer: "Ramesh", newName: "Ramesh Kumar")
- If user asks to show, open, display or view any screen or tab:
  * 'stock / stock alerts / kam stock dikhao / show stock / show low stock' => show_view (view: 'stock').
  * 'reminders / tagada / pending reminders dikhao / show reminders' => show_view (view: 'reminders').
  * 'customers / customer ledger / grahak khata / sabhi grahak dikhao / show customers' => show_view (view: 'customers').
  * 'records / entries / transactions / len den dikhao / show records' => show_view (view: 'records').
  * 'history / commands / aawaz itihas dikhao / show history' => show_view (view: 'commands').
  * 'daily hisaab dikhao / hisaab dikhao / hisaab kholo / show hisaab' => show_view (view: 'hisaab').
  * 'settings / shop settings / dukan settings dikhao / show settings' => show_view (view: 'settings').
- Match customer to KNOWN_CUSTOMERS. If ambiguous, emit clarify.
- If customer is omitted in 'set_reminder', use the customer from the last transaction in RECENT_TRANSCRIPTS.
- If PENDING_ACTION is provided, the current TRANSCRIPT is answering a clarification for that pending action. Fill in the resolved detail (customer, amount, etc.) into the PENDING_ACTION and emit that completed action!
- If the utterance is just a customer name (e.g. "Suresh Gupta" or "Gupta ji") and PENDING_ACTION exists, emit the PENDING_ACTION with customer set to that name.
- Resolve relative time against NOW=${input.nowIso}.
- Multi-action example:
  "Ramesh ne 500 udhaar liya, Sharma ji ne 200 wapas diye, aur atta 10 kilo kam hai, kal Ramesh ko yaad dila dena."
  Produces 4 separate actions:
  [
    {"type":"add_udhaar","customer":"Ramesh","amount":500},
    {"type":"add_payment","customer":"Sharma ji","amount":200},
    {"type":"add_low_stock","item":"atta","quantityHint":"10 kilo"},
    {"type":"set_reminder","customer":"Ramesh","when":"kal"}
  ]`;

    const userPrompt = `NOW=${input.nowIso}
KNOWN_CUSTOMERS=${JSON.stringify(input.customers)}
RECENT_TRANSCRIPTS=${JSON.stringify(input.history || [])}
${input.pendingQuestion ? `PENDING_QUESTION=${input.pendingQuestion}` : ''}
${input.pendingAction ? `PENDING_ACTION=${JSON.stringify(input.pendingAction)}` : ''}
TRANSCRIPT: "${input.transcript}"`;

    const modelsToTry = [env.GEMINI_MODEL, env.GEMINI_FALLBACK_MODEL];

    for (const modelName of modelsToTry) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('LLM_TIMEOUT')), 8000)
          );

          const genPromise = this.client.models.generateContent({
            model: modelName,
            contents: userPrompt,
            config: {
              systemInstruction: systemPrompt,
              temperature: 0.1,
              tools: [{ functionDeclarations: [recordActionsDecl] }],
              toolConfig: {
                functionCallingConfig: {
                  mode: 'ANY' as any,
                  allowedFunctionNames: ['record_actions'],
                },
              },
            },
          });

          const res: any = await Promise.race([genPromise, timeoutPromise]);
          const fnCall = res.functionCalls?.[0];
          const args = fnCall?.args as any;
          console.log(`🤖 Gemini parsed actions for "${input.transcript}":`, JSON.stringify(args?.actions));

          if (args && Array.isArray(args.actions)) {
            const validActions: Action[] = [];
            for (const item of args.actions) {
              const parsed = singleActionSchema.safeParse(item);
              if (parsed.success) {
                validActions.push(parsed.data);
              }
            }

            if (validActions.length > 0) {
              const parseResult: ParseResult = {
                language: (args.language as any) || (input.lang.startsWith('hi') ? 'hi' : 'en'),
                confidence: typeof args.confidence === 'number' ? args.confidence : 0.9,
                actions: validActions.slice(0, 8),
                source: 'gemini',
              };

              transcriptCache.set(cacheKey, { result: parseResult, expiresAt: Date.now() + 60000 });
              return parseResult;
            }
          }
        } catch (err: any) {
          console.warn(`Gemini attempt ${attempt + 1} with ${modelName} error:`, err.message);
          if (attempt === 0) {
            await new Promise((r) => setTimeout(r, 400));
          } else {
            await new Promise((r) => setTimeout(r, 1200));
          }
        }
      }
    }

    // If Gemini fails after all retries, fall back to rule-based fallback parser
    console.log('⚡ Gemini call failed or timed out, using fallback parser');
    const fallbackRes = fallbackParse(input);
    transcriptCache.set(cacheKey, { result: fallbackRes, expiresAt: Date.now() + 60000 });
    return fallbackRes;
  }
}

