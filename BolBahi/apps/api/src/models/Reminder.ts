import { Schema, model, Document, Types } from 'mongoose';
import { tenantGuard } from './plugins/tenantGuard.js';

export interface IReminder extends Document {
  _id: Types.ObjectId;
  shopId: Types.ObjectId;
  customerId: Types.ObjectId;
  message: string;
  channel: 'email' | 'whatsapp_sim';
  sendAt: Date;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  groupId: string;
  createdAt: Date;
  updatedAt: Date;
}

const reminderSchema = new Schema<IReminder>(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    message: { type: String, required: true, trim: true },
    channel: { type: String, enum: ['email', 'whatsapp_sim'], default: 'email' },
    sendAt: { type: Date, required: true },
    status: {
      type: String,
      enum: ['pending', 'sent', 'failed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    groupId: { type: String, required: true, index: true },
  },
  {
    timestamps: true,
  }
);

reminderSchema.index({ shopId: 1, status: 1, sendAt: 1 });
reminderSchema.index({ shopId: 1, groupId: 1 });

reminderSchema.plugin(tenantGuard);

export const Reminder = model<IReminder>('Reminder', reminderSchema);

