import { Schema, model, Document, Types } from 'mongoose';
import { tenantGuard } from './plugins/tenantGuard.js';

export interface IEntry extends Document {
  _id: Types.ObjectId;
  shopId: Types.ObjectId;
  customerId: Types.ObjectId;
  type: 'udhaar' | 'payment';
  amount: number;
  note?: string;
  groupId: string;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const entrySchema = new Schema<IEntry>(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    type: { type: String, enum: ['udhaar', 'payment'], required: true },
    amount: { type: Number, required: true, min: 1, max: 1000000 },
    note: { type: String, trim: true, maxlength: 200 },
    groupId: { type: String, required: true, index: true },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

entrySchema.index({ shopId: 1, customerId: 1, deletedAt: 1, createdAt: -1 });
entrySchema.index({ shopId: 1, groupId: 1 });
entrySchema.index({ shopId: 1, deletedAt: 1, createdAt: -1 });

entrySchema.plugin(tenantGuard);

export const Entry = model<IEntry>('Entry', entrySchema);

