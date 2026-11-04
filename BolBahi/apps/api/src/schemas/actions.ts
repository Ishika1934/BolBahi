import { z } from 'zod';

export const addUdhaarSchema = z.object({
  type: z.literal('add_udhaar'),
  customer: z.string().min(1).max(60),
  amount: z.coerce.number().min(1).max(1000000),
  note: z.string().max(200).optional(),
});

export const addPaymentSchema = z.object({
  type: z.literal('add_payment'),
  customer: z.string().min(1).max(60),
  amount: z.coerce.number().min(1).max(1000000),
  note: z.string().max(200).optional(),
});

export const setReminderSchema = z.object({
  type: z.literal('set_reminder'),
  customer: z.string().max(60).optional(),
  when: z.string().default('now'), // 'now' or ISO or relative string
  message: z.string().max(300).optional(),
});

export const addLowStockSchema = z.object({
  type: z.literal('add_low_stock'),
  item: z.string().min(1).max(60),
  quantityHint: z.string().max(60).optional(),
});

export const queryBalanceSchema = z.object({
  type: z.literal('query_balance'),
  customer: z.string().min(1).max(60),
});

export const queryCustomerInfoSchema = z.object({
  type: z.literal('query_customer_info'),
  customer: z.string().min(1).max(60),
  field: z.enum(['phone', 'email', 'all']).default('all'),
});

export const dailySummarySchema = z.object({
  type: z.literal('daily_summary'),
});

export const undoLastSchema = z.object({
  type: z.literal('undo_last'),
});

export const clarifySchema = z.object({
  type: z.literal('clarify'),
  question: z.string(),
  options: z.array(z.string()).optional(),
});

export const updateCustomerSchema = z.object({
  type: z.literal('update_customer'),
  customer: z.string().min(1).max(60), // old / current name
  newName: z.string().max(60).optional(), // new name if renaming
  phone: z.string().max(20).optional(),
  email: z.string().max(100).optional(),
});

export const showViewSchema = z.object({
  type: z.literal('show_view'),
  view: z.enum(['stock', 'reminders', 'customers', 'records', 'commands', 'hisaab', 'settings']),
});

export const singleActionSchema = z.discriminatedUnion('type', [
  addUdhaarSchema,
  addPaymentSchema,
  setReminderSchema,
  addLowStockSchema,
  queryBalanceSchema,
  queryCustomerInfoSchema,
  dailySummarySchema,
  undoLastSchema,
  clarifySchema,
  updateCustomerSchema,
  showViewSchema,
]);

export type Action = z.infer<typeof singleActionSchema>;

export const rawActionInputSchema = z.object({
  type: z.enum([
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
  ]),
  view: z.enum(['stock', 'reminders', 'customers', 'records', 'commands', 'hisaab', 'settings']).optional(),
  customer: z.string().optional(),
  newName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  field: z.enum(['phone', 'email', 'all']).optional(),
  amount: z.coerce.number().optional(),
  note: z.string().optional(),
  when: z.string().optional(),
  message: z.string().optional(),
  item: z.string().optional(),
  quantityHint: z.string().optional(),
  question: z.string().optional(),
  options: z.array(z.string()).optional(),
});

export const actionsListSchema = z.array(singleActionSchema).max(8);

export interface ParseResult {
  language: 'hi' | 'en' | 'hinglish';
  actions: Action[];
  confidence: number;
  source?: 'gemini' | 'fallback' | 'typed';
}

