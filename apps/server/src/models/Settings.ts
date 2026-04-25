import mongoose, { Document, Schema } from 'mongoose';

export interface ISettings extends Document {
  discountEnabled: boolean;
  discountAppliesTo: {
    room: boolean;
    food: boolean;
    spa: boolean;
  };
  maxDiscountPercentage: number;
  maxDiscountCash: number;
  updatedBy: string;
}

const SettingsSchema = new Schema<ISettings>(
  {
    discountEnabled: { type: Boolean, default: false },
    discountAppliesTo: {
      room: { type: Boolean, default: true },
      food: { type: Boolean, default: true },
      spa:  { type: Boolean, default: true },
    },
    maxDiscountPercentage: { type: Number, default: 100 },
    maxDiscountCash: { type: Number, default: 0 },
    updatedBy: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model<ISettings>('Settings', SettingsSchema);
