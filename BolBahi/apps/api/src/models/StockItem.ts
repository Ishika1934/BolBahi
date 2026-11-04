import { Schema, model, Document, Types } from 'mongoose';
import { tenantGuard } from './plugins/tenantGuard.js';

export interface IStockItem extends Document {
  _id: Types.ObjectId;
  shopId: Types.ObjectId;
  name: string;
  quantityHint?: string;
  status: 'low' | 'ok';
  groupId: string;
  createdAt: Date;
  updatedAt: Date;
}

const stockItemSchema = new Schema<IStockItem>(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    quantityHint: { type: String, trim: true },
    status: { type: String, enum: ['low', 'ok'], default: 'low' },
    groupId: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

stockItemSchema.index({ shopId: 1, status: 1 });

stockItemSchema.plugin(tenantGuard);

export const StockItem = model<IStockItem>('StockItem', stockItemSchema);

