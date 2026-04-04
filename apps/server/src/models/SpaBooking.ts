import mongoose, { Document, Schema } from 'mongoose';

export type SpaBookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export interface ISpaBooking extends Document {
  guest: mongoose.Types.ObjectId;
  service: mongoose.Types.ObjectId;
  date: Date;
  startTime: string;
  endTime: string;
  status: SpaBookingStatus;
  price: number;
  therapistNote: string;
  addedToBill: boolean;
}

const SpaBookingSchema = new Schema<ISpaBooking>(
  {
    guest: { type: Schema.Types.ObjectId, ref: 'Guest', required: true },
    service: { type: Schema.Types.ObjectId, ref: 'SpaService', required: true },
    date: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'completed', 'cancelled'],
      default: 'pending',
    },
    price: { type: Number, required: true },
    therapistNote: { type: String, default: '' },
    addedToBill: { type: Boolean, default: false },
  },
  { timestamps: true }
);

SpaBookingSchema.index({ guest: 1, status: 1 });
SpaBookingSchema.index({ service: 1, date: 1, startTime: 1 });

export default mongoose.model<ISpaBooking>('SpaBooking', SpaBookingSchema);
