import mongoose, { Document, Schema } from 'mongoose';

export interface ISpaTherapistBlock extends Document {
  therapist: mongoose.Types.ObjectId;
  date: Date;
  blockStart: string;  // "HH:MM"
  blockEnd:   string;  // "HH:MM"
  type: 'break' | 'unavailable';
  reason?: string;
  createdBy: mongoose.Types.ObjectId;
}

const SpaTherapistBlockSchema = new Schema<ISpaTherapistBlock>(
  {
    therapist:  { type: Schema.Types.ObjectId, ref: 'SpaTherapist', required: true },
    date:       { type: Date, required: true },
    blockStart: { type: String, required: true, match: /^\d{2}:\d{2}$/ },
    blockEnd:   { type: String, required: true, match: /^\d{2}:\d{2}$/ },
    type:       { type: String, enum: ['break', 'unavailable'], required: true },
    reason:     { type: String, trim: true },
    createdBy:  { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

SpaTherapistBlockSchema.index({ therapist: 1, date: 1 });

export default mongoose.model<ISpaTherapistBlock>('SpaTherapistBlock', SpaTherapistBlockSchema);
