import mongoose, { Document, Schema } from 'mongoose';

export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded';

export interface IPayment extends Document {
  bill: mongoose.Types.ObjectId;
  guest: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  method: 'stripe' | 'cash';
  stripePaymentIntentId: string;
  stripeChargeId: string;
  status: PaymentStatus;
  createdAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    bill: { type: Schema.Types.ObjectId, ref: 'Bill', required: true },
    guest: { type: Schema.Types.ObjectId, ref: 'Guest', required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'usd' },
    method: { type: String, enum: ['stripe', 'cash'], required: true },
    stripePaymentIntentId: { type: String, default: '' },
    stripeChargeId: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'succeeded', 'failed', 'refunded'], default: 'pending' },
  },
  { timestamps: true }
);

export default mongoose.model<IPayment>('Payment', PaymentSchema);
