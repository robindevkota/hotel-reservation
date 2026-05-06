import mongoose, { Schema, Document } from 'mongoose';

export type ServiceType =
  | 'laundry'
  | 'towels'
  | 'pillows'
  | 'water'
  | 'housekeeping'
  | 'maintenance'
  | 'iron'
  | 'wake_up'
  | 'turndown'
  | 'do_not_disturb';

export type ServiceStatus = 'pending' | 'acknowledged' | 'done';

export interface IServiceRequest extends Document {
  guest: mongoose.Types.ObjectId;
  room: mongoose.Types.ObjectId;
  type: ServiceType;
  notes?: string;
  status: ServiceStatus;
  acknowledgedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
}

const ServiceRequestSchema = new Schema<IServiceRequest>(
  {
    guest: { type: Schema.Types.ObjectId, ref: 'Guest', required: true },
    room:  { type: Schema.Types.ObjectId, ref: 'Room',  required: true },
    type: {
      type: String,
      enum: ['laundry', 'towels', 'pillows', 'water', 'housekeeping', 'maintenance', 'iron', 'wake_up', 'turndown', 'do_not_disturb'],
      required: true,
    },
    notes:          { type: String, trim: true, maxlength: 200 },
    status:         { type: String, enum: ['pending', 'acknowledged', 'done'], default: 'pending' },
    acknowledgedAt: Date,
    completedAt:    Date,
  },
  { timestamps: true }
);

export default mongoose.model<IServiceRequest>('ServiceRequest', ServiceRequestSchema);
