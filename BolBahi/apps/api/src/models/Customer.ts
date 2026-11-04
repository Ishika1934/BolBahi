import { Schema, model, Document, Types } from 'mongoose';
import { tenantGuard } from './plugins/tenantGuard.js';

export interface ICustomer extends Document {
  _id: Types.ObjectId;
  shopId: Types.ObjectId;
  name: string;
  aliases: string[];
  phone?: string;
  email?: string;
  balance: number;
  archivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const customerSchema = new Schema<ICustomer>(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    aliases: [{ type: String, trim: true }],
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    balance: { type: Number, default: 0 },
    archivedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

customerSchema.index({ shopId: 1, name: 1 });
customerSchema.index({ shopId: 1, archivedAt: 1 });

customerSchema.plugin(tenantGuard);

export const Customer = model<ICustomer>('Customer', customerSchema);

