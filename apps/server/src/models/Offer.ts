import mongoose, { Document, Schema } from 'mongoose';

export interface IOffer extends Document {
  title: string;
  description: string;
  roomDiscount: number;    // percentage 0–100, 0 = no discount
  foodDiscount: number;    // percentage 0–100
  spaDiscount: number;     // percentage 0–100
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
}

const OfferSchema = new Schema<IOffer>(
  {
    title:        { type: String, required: true, trim: true },
    description:  { type: String, default: '' },
    roomDiscount: { type: Number, required: true, min: 0, max: 100, default: 0 },
    foodDiscount: { type: Number, required: true, min: 0, max: 100, default: 0 },
    spaDiscount:  { type: Number, required: true, min: 0, max: 100, default: 0 },
    startDate:    { type: Date, required: true },
    endDate:      { type: Date, required: true },
    isActive:     { type: Boolean, default: true },
    createdBy:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// Only one offer can be active at a time is enforced in the controller, not the model.
// Index for fast "active right now" queries.
OfferSchema.index({ isActive: 1, startDate: 1, endDate: 1 });

export default mongoose.model<IOffer>('Offer', OfferSchema);
