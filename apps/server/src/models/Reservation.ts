import mongoose, { Document, Schema } from 'mongoose';

export type ReservationStatus = 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled';

export interface IReservation extends Document {
  guest: {
    name: string;
    email: string;
    phone: string;
    idProof: string;
  };
  room: mongoose.Types.ObjectId;
  checkInDate: Date;
  checkOutDate: Date;
  numberOfGuests: number;
  status: ReservationStatus;
  specialRequests: string;
  totalNights: number;
  roomCharges: number;
  stripePaymentIntentId: string;
  createdAt: Date;
}

const ReservationSchema = new Schema<IReservation>(
  {
    guest: {
      name: { type: String, required: true, trim: true },
      email: { type: String, required: true, lowercase: true, trim: true },
      phone: { type: String, required: true, trim: true },
      idProof: { type: String, default: '' },
    },
    room: { type: Schema.Types.ObjectId, ref: 'Room', required: true },
    checkInDate: { type: Date, required: true },
    checkOutDate: { type: Date, required: true },
    numberOfGuests: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled'],
      default: 'pending',
    },
    specialRequests: { type: String, default: '' },
    totalNights: { type: Number, default: 0 },
    roomCharges: { type: Number, default: 0 },
    stripePaymentIntentId: { type: String, default: '' },
  },
  { timestamps: true }
);

ReservationSchema.index({ 'guest.email': 1 });
ReservationSchema.index({ status: 1 });
ReservationSchema.index({ checkInDate: 1, checkOutDate: 1 });

export default mongoose.model<IReservation>('Reservation', ReservationSchema);
