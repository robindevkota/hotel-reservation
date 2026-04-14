import mongoose, { Document, Schema } from 'mongoose';

export type ReservationStatus = 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'no_show';
export type CancellationPolicy = 'flexible' | 'non_refundable';

export interface IReservation extends Document {
  bookingRef: string;
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
  cancellationPolicy: CancellationPolicy;
  specialRequests: string;
  totalNights: number;
  roomCharges: number;
  // flexible: charged at checkout | non_refundable: charged at booking (10% discount applied)
  paidUpfront: boolean;
  stripePaymentIntentId: string;
  // set when cancelled after deadline or no-show to record what was charged
  penaltyCharged: number;
  cancelledAt: Date;
  createdAt: Date;
}

const ReservationSchema = new Schema<IReservation>(
  {
    bookingRef: { type: String, unique: true, sparse: true },
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
      enum: ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show'],
      default: 'pending',
    },
    cancellationPolicy: {
      type: String,
      enum: ['flexible', 'non_refundable'],
      default: 'flexible',
    },
    specialRequests: { type: String, default: '' },
    totalNights: { type: Number, default: 0 },
    roomCharges: { type: Number, default: 0 },
    paidUpfront: { type: Boolean, default: false },
    stripePaymentIntentId: { type: String, default: '' },
    penaltyCharged: { type: Number, default: 0 },
    cancelledAt: { type: Date },
  },
  { timestamps: true }
);

ReservationSchema.index({ 'guest.email': 1 });
ReservationSchema.index({ status: 1 });
ReservationSchema.index({ checkInDate: 1, checkOutDate: 1 });
ReservationSchema.index({ bookingRef: 1 });

export default mongoose.model<IReservation>('Reservation', ReservationSchema);
