import mongoose, { Document, Schema } from 'mongoose';

export interface ISpaTherapist extends Document {
  name: string;
  specializations: mongoose.Types.ObjectId[]; // SpaService IDs
  breakDuration: number;  // minutes rest after each session
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SpaTherapistSchema = new Schema<ISpaTherapist>(
  {
    name:            { type: String, required: true, trim: true },
    specializations: [{ type: Schema.Types.ObjectId, ref: 'SpaService' }],
    breakDuration:   { type: Number, default: 15, min: 0 },
    isActive:        { type: Boolean, default: true },
  },
  { timestamps: true }
);

SpaTherapistSchema.index({ isActive: 1 });

export default mongoose.model<ISpaTherapist>('SpaTherapist', SpaTherapistSchema);
