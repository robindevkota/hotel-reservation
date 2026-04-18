import mongoose, { Document, Schema } from 'mongoose';

export type SpaBookingStatus =
  | 'pending'
  | 'confirmed'
  | 'arrived'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type SpaPaymentMethod = 'room_bill' | 'cash';

export type SpaWindow = 'morning' | 'afternoon' | 'evening' | 'any';

export interface ISpaBooking extends Document {
  guest?: mongoose.Types.ObjectId;
  walkInCustomer?: mongoose.Types.ObjectId;
  service: mongoose.Types.ObjectId;
  therapist: mongoose.Types.ObjectId | null;
  date: Date;
  scheduledStart: string;
  scheduledEnd: string;
  actualStart: string;
  actualEnd: string;
  durationSnapshot: number;
  window: SpaWindow;
  status: SpaBookingStatus;
  price: number;
  therapistNote: string;
  addedToBill: boolean;
  isWalkIn: boolean;
  spaPaymentMethod: SpaPaymentMethod;
}

const SpaBookingSchema = new Schema<ISpaBooking>(
  {
    guest:            { type: Schema.Types.ObjectId, ref: 'Guest' },
    walkInCustomer:   { type: Schema.Types.ObjectId, ref: 'WalkInCustomer' },
    service:          { type: Schema.Types.ObjectId, ref: 'SpaService', required: true },
    therapist:        { type: Schema.Types.ObjectId, ref: 'SpaTherapist', default: null },
    date:             { type: Date, required: true },
    scheduledStart:   { type: String, required: true },
    scheduledEnd:     { type: String, required: true },
    actualStart:      { type: String, default: '' },
    actualEnd:        { type: String, default: '' },
    durationSnapshot: { type: Number, required: true },
    window:           { type: String, enum: ['morning','afternoon','evening','any'], default: 'any' },
    status: {
      type: String,
      enum: ['pending','confirmed','arrived','in_progress','completed','cancelled'],
      default: 'pending',
    },
    price:             { type: Number, required: true },
    therapistNote:     { type: String, default: '' },
    addedToBill:       { type: Boolean, default: false },
    isWalkIn:          { type: Boolean, default: false },
    spaPaymentMethod:  { type: String, enum: ['room_bill', 'cash'], default: 'room_bill' },
  },
  { timestamps: true }
);

SpaBookingSchema.index({ guest: 1, status: 1 });
SpaBookingSchema.index({ walkInCustomer: 1, status: 1 });
SpaBookingSchema.index({ therapist: 1, date: 1, status: 1 });
SpaBookingSchema.index({ service: 1, date: 1, scheduledStart: 1 });

SpaBookingSchema.index(
  { therapist: 1, date: 1, scheduledStart: 1 },
  {
    unique: true,
    partialFilterExpression: {
      therapist: { $exists: true, $type: 'objectId' },
      status: { $in: ['pending', 'confirmed', 'arrived', 'in_progress'] },
    },
    name: 'therapist_slot_unique_active',
  }
);

export default mongoose.model<ISpaBooking>('SpaBooking', SpaBookingSchema);
