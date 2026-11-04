import { Schema, model, Document, Types } from 'mongoose';

export interface IShop extends Document {
  _id: Types.ObjectId;
  name: string;
  ownerName: string;
  language: 'hi-IN' | 'en-IN';
  createdAt: Date;
  updatedAt: Date;
}

const shopSchema = new Schema<IShop>(
  {
    name: { type: String, required: true, trim: true },
    ownerName: { type: String, required: true, trim: true },
    language: { type: String, enum: ['hi-IN', 'en-IN'], default: 'hi-IN' },
  },
  {
    timestamps: true,
  }
);

export const Shop = model<IShop>('Shop', shopSchema);

