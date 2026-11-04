import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { Types } from 'mongoose';
import { requireAuth } from '../middleware/requireAuth.js';
import { Customer } from '../models/Customer.js';
import { ActionLog } from '../models/ActionLog.js';
import { resolveCustomer } from '../services/resolver.js';
import { GeminiProvider } from '../services/llm/gemini.js';
import {
  executeAddUdhaar,
  executeAddPayment,
  executeSetReminder,
  executeAddLowStock,
  executeUpdateCustomer,
  executeShowView,
  ActionResult,
} from '../services/executor.js';
import { executeQueryBalance, executeDailySummary } from '../services/summary.js';
import { executeUndoLast } from '../services/undo.js';
import {
  enqueueSessionTask,
  getPendingClarification,
  setPendingClarification,
  clearPendingClarification,
} from '../services/sessionQueue.js';
import { emitShopEvent } from '../lib/sse.js';

export const voiceRouter = Router();

const voiceLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30, // 30 req/min
  message: {
    ok: false,
    error: {
      code: 'LLM_RATE_LIMIT',
      message: 'Too many voice requests. Please slow down.',
      spokenMessage: 'Thoda dheere bolein, kripya intezar karein.',
    },
  },
});

const voiceCommandSchema = z.object({
  transcript: z.string().min(3, 'Transcript too short').max(500, 'Transcript too long'),
  lang: z.enum(['hi-IN', 'en-IN']).default('hi-IN'),
  sessionId: z.string().default('default_session'),
  clientCommandId: z.string().min(1, 'clientCommandId is required'),
});

const geminiProvider = new GeminiProvider();

// POST /api/voice/command
voiceRouter.post(
  '/command',
  requireAuth,
  voiceLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    try {
      const validated = voiceCommandSchema.parse(req.body);
      const shopId = req.shopId!;
      const sId = new Types.ObjectId(shopId);

      // 1. Idempotency check: if clientCommandId already processed, return stored result
      const existingLog = await ActionLog.findOne({
        shopId: sId,
        clientCommandId: validated.clientCommandId,
      });

      if (existingLog) {
        const payload = {
          groupId: existingLog.groupId,
          actions: existingLog.parsedActions,
          results: existingLog.results,
          reply: (existingLog.results?.[0]?.data?.replyScreen) || 'Ho gaya.',
          replySpeech: (existingLog.results?.[0]?.data?.replySpeech) || 'हो गया।',
          lang: existingLog.lang,
          needsClarification: false,
          latencyMs: existingLog.latencyMs,
          idempotent: true,
        };
        return res.json({
          ok: true,
          data: payload,
          ...payload,
        });
      }

      // 2. Per-session serialization using promise queue
      const result = await enqueueSessionTask(shopId, validated.sessionId, async () => {
        const pending = getPendingClarification(shopId, validated.sessionId);

        // Fetch top 30 customer first names only (Free-tier Privacy rule)
        const customers = await Customer.find({ shopId: sId, archivedAt: null })
          .limit(30)
          .select('name');
        const customerNames = customers.map((c) => c.name.split(' ')[0]);

        // Recent 3 transcripts for conversational context
        const recentLogs = await ActionLog.find({ shopId: sId })
          .sort({ createdAt: -1 })
          .limit(3)
          .select('transcript');
        const history = recentLogs.map((l) => l.transcript).reverse();

        // 3. LLM Parsing
        const nowIso = new Date().toISOString();
        let parseResult;

        if (pending && pending.originalAction) {
          let chosenCustomerName: string | null = null;

          // Check if transcript matches any of the pending clarification options
          if (pending.options && pending.options.length > 0) {
            const cleanT = validated.transcript.toLowerCase().trim();
            for (let i = 0; i < pending.options.length; i++) {
              const opt = pending.options[i];
              const optClean = opt.toLowerCase();
              if (
                cleanT.includes(optClean) ||
                cleanT === optClean ||
                optClean.split(' ').some((part) => part.length > 2 && cleanT.includes(part.toLowerCase()))
              ) {
                chosenCustomerName = opt;
                break;
              }
              // Numeric or ordinal answer matching (1/first/pehla, 2/second/doosra)
              if (
                (i === 0 && (cleanT.includes('1') || cleanT.includes('first') || cleanT.includes('pehla') || cleanT.includes('one'))) ||
                (i === 1 && (cleanT.includes('2') || cleanT.includes('second') || cleanT.includes('doosra') || cleanT.includes('two')))
              ) {
                chosenCustomerName = opt;
                break;
              }
            }
          }

          // Check confirmation phrases like "yes, please do", "haan kar do"
          const cleanT = validated.transcript.toLowerCase().trim();
          const isConfirmation =
            cleanT.includes('yes') ||
            cleanT.includes('haan') ||
            cleanT === 'ha' ||
            cleanT.includes('please do') ||
            cleanT.includes('kar do') ||
            cleanT.includes('theek hai') ||
            cleanT.includes('ok');

          if (isConfirmation && pending.originalAction && pending.originalAction.type !== 'clarify') {
            parseResult = {
              language: 'hinglish' as const,
              actions: [pending.originalAction],
              confidence: 0.98,
              source: 'fallback' as const,
            };
          }

          // Try standard customer resolution
          if (!parseResult && !chosenCustomerName) {
            const resolvedAns = await resolveCustomer(shopId, validated.transcript);
            if (resolvedAns.customer) {
              chosenCustomerName = resolvedAns.customer.name;
            }
          }

          if (chosenCustomerName) {
            const completedAction = { ...pending.originalAction, customer: chosenCustomerName };
            parseResult = {
              language: 'hinglish' as const,
              actions: [completedAction],
              confidence: 0.98,
              source: 'fallback' as const,
            };
          }
        }

        if (!parseResult) {
          parseResult = await geminiProvider.parse({
            transcript: validated.transcript,
            lang: validated.lang,
            nowIso,
            customers: customerNames,
            history,
            pendingQuestion: pending?.question,
            pendingAction: pending?.originalAction,
          });
        }

        const groupId = `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const actionResults: ActionResult[] = [];
        let needsClarification = false;
        let clarificationQuestion = '';
        let clarificationOptions: string[] | undefined;

        // 4. Sequential execution of actions
        for (const action of parseResult.actions) {
          let resAction: ActionResult | null = null;

          if (action.type === 'add_udhaar') {
            resAction = await executeAddUdhaar(shopId, groupId, action, validated.lang);
          } else if (action.type === 'add_payment') {
            resAction = await executeAddPayment(shopId, groupId, action, validated.lang);
          } else if (action.type === 'set_reminder') {
            resAction = await executeSetReminder(shopId, groupId, action, validated.lang);
          } else if (action.type === 'add_low_stock') {
            resAction = await executeAddLowStock(shopId, groupId, action, validated.lang);
          } else if (action.type === 'query_balance') {
            resAction = await executeQueryBalance(shopId, action.customer, validated.lang);
          } else if (action.type === 'daily_summary') {
            resAction = await executeDailySummary(shopId, validated.lang);
          } else if (action.type === 'undo_last') {
            resAction = await executeUndoLast(shopId, validated.lang);
          } else if (action.type === 'update_customer') {
            resAction = await executeUpdateCustomer(shopId, groupId, action as any, validated.lang);
          } else if (action.type === 'show_view') {
            resAction = await executeShowView(shopId, action as any, validated.lang);
          } else if (action.type === 'clarify') {
            resAction = {
              ok: false,
              type: 'clarify',
              summary: action.question,
              needsClarification: true,
              clarificationQuestion: action.question,
              clarificationOptions: action.options,
            };
          }

          if (resAction) {
            actionResults.push(resAction);
            if (resAction.needsClarification) {
              needsClarification = true;
              clarificationQuestion = resAction.clarificationQuestion || 'Kaunsa grahak?';
              clarificationOptions = resAction.clarificationOptions;
              setPendingClarification(
                shopId,
                validated.sessionId,
                clarificationQuestion,
                validated.transcript,
                clarificationOptions,
                action
              );
              break; // Stop batch on clarification turn
            }
          }
        }

        if (!needsClarification && pending) {
          clearPendingClarification(shopId, validated.sessionId);
        }

        // 5. Compose multi-intent combined replies
        let finalReplyScreen = '';
        let finalReplySpeech = '';

        if (needsClarification) {
          finalReplyScreen = clarificationQuestion;
          finalReplySpeech = clarificationQuestion;
        } else if (actionResults.length === 1 && actionResults[0].data?.replyScreen) {
          finalReplyScreen = actionResults[0].data.replyScreen;
          finalReplySpeech = actionResults[0].data.replySpeech;
        } else if (actionResults.length > 1) {
          // Multi-intent synthesis
          if (validated.lang === 'en-IN') {
            const screenParts: string[] = [];
            for (const ar of actionResults) {
              if (ar.type === 'add_udhaar' && ar.data) {
                screenParts.push(`₹${ar.data.amount} credit for ${ar.data.customerName}`);
              } else if (ar.type === 'add_payment' && ar.data) {
                screenParts.push(`₹${ar.data.amount} payment from ${ar.data.customerName}`);
              } else if (ar.type === 'add_low_stock' && ar.data) {
                screenParts.push(`${ar.data.item} added to low stock`);
              } else if (ar.type === 'set_reminder' && ar.data) {
                screenParts.push(`reminder set for ${ar.data.customerName}`);
              }
            }
            finalReplyScreen = `Done. ${screenParts.join(', ')}.`;
            finalReplySpeech = `Done. ${screenParts.join(', ')}.`;
          } else {
            const screenParts: string[] = [];
            const speechParts: string[] = [];

            for (const ar of actionResults) {
              if (ar.type === 'add_udhaar' && ar.data) {
                screenParts.push(`${ar.data.customerName} का ₹${ar.data.amount} उधार दर्ज`);
                speechParts.push(`${ar.data.customerName} का ${ar.data.amount} रुपये उधार दर्ज`);
              } else if (ar.type === 'add_payment' && ar.data) {
                screenParts.push(`${ar.data.customerName} का ₹${ar.data.amount} जमा`);
                speechParts.push(`${ar.data.customerName} का ${ar.data.amount} रुपये जमा`);
              } else if (ar.type === 'add_low_stock' && ar.data) {
                screenParts.push(`${ar.data.item} कम स्टॉक में`);
                speechParts.push(`${ar.data.item} कम स्टॉक में दर्ज`);
              } else if (ar.type === 'set_reminder' && ar.data) {
                screenParts.push(`${ar.data.customerName} को रिमाइंडर`);
                speechParts.push(`${ar.data.customerName} को रिमाइंडर सेट`);
              }
            }

            finalReplyScreen = `हो गया। ${screenParts.join(', ')}।`;
            finalReplySpeech = `हो गया। ${speechParts.join(', ')}।`;
          }
        } else {
          finalReplyScreen = validated.lang === 'en-IN' ? 'Done.' : 'हो गया।';
          finalReplySpeech = validated.lang === 'en-IN' ? 'Done.' : 'हो गया।';
        }

        const latencyMs = Date.now() - startTime;

        // 6. Store ActionLog
        await ActionLog.create({
          shopId: sId,
          groupId,
          clientCommandId: validated.clientCommandId,
          transcript: validated.transcript,
          lang: validated.lang,
          parsedActions: parseResult.actions,
          results: actionResults,
          source: parseResult.source || 'gemini',
          latencyMs,
        });

        // 7. Push SSE event
        emitShopEvent(shopId, 'ledger.updated', {
          groupId,
          actionTypes: parseResult.actions.map((a) => a.type),
        });

        const openView = actionResults.find((r) => r.type === 'show_view' || r.data?.openView)?.data?.openView;

        const payload = {
          groupId,
          actions: parseResult.actions,
          results: actionResults,
          openView,
          reply: finalReplyScreen,
          replySpeech: finalReplySpeech,
          lang: validated.lang,
          needsClarification,
          latencyMs,
        };

        return {
          ok: true,
          data: payload,
          ...payload,
        };
      });

      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);
