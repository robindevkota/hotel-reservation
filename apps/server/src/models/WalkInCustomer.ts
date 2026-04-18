import mongoose, { Document, Schema } from 'mongoose';

export type WalkInType = 'dine_in' | 'spa';

export interface IWalkInCustomer extends Document {
  name: string;
  phone?: string;
  type: WalkInType;
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const WalkInCustomerSchema = new Schema<IWalkInCustomer>(
  {
    name:      { type: String, required: true, trim: true },
    phone:     { type: String, trim: true },
    type:      { type: String, enum: ['dine_in', 'spa'], required: true },
    notes:     { type: String, default: '' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

WalkInCustomerSchema.index({ type: 1, createdAt: -1 });

export default mongoose.model<IWalkInCustomer>('WalkInCustomer', WalkInCustomerSchema);
