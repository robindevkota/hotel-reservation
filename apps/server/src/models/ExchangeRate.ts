import mongoose, { Document, Schema } from 'mongoose';

export interface IExchangeRate extends Document {
  usdToNpr: number;
  updatedBy: string;
  updatedAt: Date;
}

const ExchangeRateSchema = new Schema<IExchangeRate>(
  {
    usdToNpr:  { type: Number, required: true, min: 1 },
    updatedBy: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model<IExchangeRate>('ExchangeRate', ExchangeRateSchema);
