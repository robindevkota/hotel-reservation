import mongoose, { Document, Schema } from 'mongoose';

export type BillStatus = 'open' | 'pending_payment' | 'paid';
export type PaymentMethod = 'stripe' | 'cash' | 'card_on_site';
export type LineItemType = 'room' | 'food_order' | 'spa' | 'other';

export interface ILineItem {
  type: LineItemType;
  description: string;
  referenceId?: mongoose.Types.ObjectId;
  amount: number;
  date: Date;
}

export interface IBill extends Document {
  guest: mongoose.Types.ObjectId;
  reservation: mongoose.Types.ObjectId;
  lineItems: ILineItem[];
  roomCharges: number;
  foodCharges: number;
  spaCharges: number;
  otherCharges: number;
  totalAmount: number;
  taxAmount: number;
  grandTotal: number;
  // Non-refundable guests pre-pay the room at booking — track separately so
  // recalculate() excludes it from the in-stay grandTotal.
  prepaidAmount: number;
  prepaidAt?: Date;
  status: BillStatus;
  paidAt?: Date;
  paymentMethod?: PaymentMethod;
  stripePaymentIntentId: string;
  receiptUrl: string;
}

const BillSchema = new Schema<IBill>(
  {
    guest: { type: Schema.Types.ObjectId, ref: 'Guest', required: true },
    reservation: { type: Schema.Types.ObjectId, ref: 'Reservation', required: true },
    lineItems: [
      {
        type: { type: String, enum: ['room', 'food_order', 'spa', 'other'], required: true },
        description: { type: String, required: true },
        referenceId: { type: Schema.Types.ObjectId },
        amount: { type: Number, required: true },
        date: { type: Date, default: Date.now },
      },
    ],
    roomCharges: { type: Number, default: 0 },
    foodCharges: { type: Number, default: 0 },
    spaCharges: { type: Number, default: 0 },
    otherCharges: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    status: { type: String, enum: ['open', 'pending_payment', 'paid'], default: 'open' },
    paidAt: { type: Date },
    paymentMethod: { type: String, enum: ['stripe', 'cash', 'card_on_site'] },
    prepaidAmount: { type: Number, default: 0 },
    prepaidAt: { type: Date },
    stripePaymentIntentId: { type: String, default: '' },
    receiptUrl: { type: String, default: '' },
  },
  { timestamps: true }
);

BillSchema.methods.recalculate = function () {
  this.roomCharges = this.lineItems
    .filter((i: ILineItem) => i.type === 'room')
    .reduce((s: number, i: ILineItem) => s + i.amount, 0);
  this.foodCharges = this.lineItems
    .filter((i: ILineItem) => i.type === 'food_order')
    .reduce((s: number, i: ILineItem) => s + i.amount, 0);
  this.spaCharges = this.lineItems
    .filter((i: ILineItem) => i.type === 'spa')
    .reduce((s: number, i: ILineItem) => s + i.amount, 0);
  this.otherCharges = this.lineItems
    .filter((i: ILineItem) => i.type === 'other')
    .reduce((s: number, i: ILineItem) => s + i.amount, 0);

  // All prices are VAT-inclusive — no tax added on top.
  const chargeableRoom = Math.max(0, this.roomCharges - (this.prepaidAmount || 0));
  this.totalAmount = parseFloat((chargeableRoom + this.foodCharges + this.spaCharges + this.otherCharges).toFixed(2));
  this.taxAmount   = 0;
  this.grandTotal  = this.totalAmount;
};

export default mongoose.model<IBill>('Bill', BillSchema);
