import { Schema, model, Document, Types } from 'mongoose';
import { tenantGuard } from './plugins/tenantGuard.js';

export interface IActionLog extends Document {
  _id: Types.ObjectId;
  shopId: Types.ObjectId;
  groupId: string;
  clientCommandId: string;
  transcript: string;
  lang: 'hi-IN' | 'en-IN';
  parsedActions: any[];
  results: any[];
  source: 'gemini' | 'fallback' | 'typed';
  latencyMs: number;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const actionLogSchema = new Schema<IActionLog>(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
    groupId: { type: String, required: true, index: true },
    clientCommandId: { type: String, required: true },
    transcript: { type: String, required: true, maxlength: 500 },
    lang: { type: String, enum: ['hi-IN', 'en-IN'], default: 'hi-IN' },
    parsedActions: { type: Schema.Types.Mixed, default: [] },
    results: { type: Schema.Types.Mixed, default: [] },
    source: { type: String, enum: ['gemini', 'fallback', 'typed'], default: 'gemini' },
    latencyMs: { type: Number, required: true },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

actionLogSchema.index({ shopId: 1, clientCommandId: 1 }, { unique: true });
actionLogSchema.index({ shopId: 1, deletedAt: 1, createdAt: -1 });

actionLogSchema.plugin(tenantGuard);

export const ActionLog = model<IActionLog>('ActionLog', actionLogSchema);

