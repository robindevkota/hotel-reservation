import mongoose, { Document, Schema } from 'mongoose';

export type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'delivering'
  | 'delivered'
  | 'cancelled';

export interface IOrderItem {
  menuItem: mongoose.Types.ObjectId;
  quantity: number;
  unitPrice: number;
  specialInstructions: string;
}

export interface IOrder extends Document {
  guest?: mongoose.Types.ObjectId;
  walkInCustomer?: mongoose.Types.ObjectId;
  room?: mongoose.Types.ObjectId;
  items: IOrderItem[];
  status: OrderStatus;
  totalAmount: number;
  placedAt: Date;
  acceptedAt?: Date;
  preparedAt?: Date;
  deliveredAt?: Date;
  cancelledAt?: Date;
  cancelReason: string;
  servedBy?: mongoose.Types.ObjectId;
  notes: string;
  addedToBill: boolean;
  isAdminOrder: boolean;
  orderPaymentMethod: 'room_bill' | 'cash';
}

const OrderSchema = new Schema<IOrder>(
  {
    guest:           { type: Schema.Types.ObjectId, ref: 'Guest' },
    walkInCustomer:  { type: Schema.Types.ObjectId, ref: 'WalkInCustomer' },
    room:            { type: Schema.Types.ObjectId, ref: 'Room' },
    items: [
      {
        menuItem: { type: Schema.Types.ObjectId, ref: 'MenuItem', required: true },
        quantity: { type: Number, required: true, min: 1 },
        unitPrice: { type: Number, required: true },
        specialInstructions: { type: String, default: '' },
      },
    ],
    status: {
      type: String,
      enum: ['pending', 'accepted', 'preparing', 'ready', 'delivering', 'delivered', 'cancelled'],
      default: 'pending',
    },
    totalAmount: { type: Number, required: true },
    placedAt: { type: Date, default: Date.now },
    acceptedAt: { type: Date },
    preparedAt: { type: Date },
    deliveredAt: { type: Date },
    cancelledAt: { type: Date },
    cancelReason: { type: String, default: '' },
    servedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String, default: '' },
    addedToBill:          { type: Boolean, default: false },
    isAdminOrder:         { type: Boolean, default: false },
    orderPaymentMethod:   { type: String, enum: ['room_bill', 'cash'], default: 'room_bill' },
  },
  { timestamps: true }
);

OrderSchema.index({ guest: 1, status: 1 });
OrderSchema.index({ walkInCustomer: 1, status: 1 });
OrderSchema.index({ status: 1, placedAt: -1 });

export default mongoose.model<IOrder>('Order', OrderSchema);
