import mongoose, { Document, Schema } from 'mongoose';

export interface IGuest extends Document {
  reservation: mongoose.Types.ObjectId;
  room: mongoose.Types.ObjectId;
  name: string;
  email: string;
  phone: string;
  checkInTime: Date;
  checkOutTime?: Date;
  qrSessionToken: string;
  qrSessionExpiry: Date;
  isActive: boolean;
  bill: mongoose.Types.ObjectId;
}

const GuestSchema = new Schema<IGuest>(
  {
    reservation: { type: Schema.Types.ObjectId, ref: 'Reservation', required: true },
    room: { type: Schema.Types.ObjectId, ref: 'Room', required: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true },
    checkInTime: { type: Date, default: Date.now },
    checkOutTime: { type: Date },
    qrSessionToken: { type: String, required: true },
    qrSessionExpiry: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
    bill: { type: Schema.Types.ObjectId, ref: 'Bill' },
  },
  { timestamps: true }
);

GuestSchema.index({ qrSessionToken: 1 });
GuestSchema.index({ isActive: 1 });

export default mongoose.model<IGuest>('Guest', GuestSchema);
