import mongoose, { Document, Schema } from 'mongoose';

export interface IReview extends Document {
  guest: mongoose.Types.ObjectId;
  reservation: mongoose.Types.ObjectId;
  // Per-department ratings — only present if guest used that service
  roomRating?: number;
  roomFeedback?: string;
  foodRating?: number;
  foodFeedback?: string;
  spaRating?: number;
  spaFeedback?: string;
  // Computed average of whichever departments were rated
  overallRating: number;
  // Admin visibility control
  isHidden: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    guest:        { type: Schema.Types.ObjectId, ref: 'Guest', required: true },
    reservation:  { type: Schema.Types.ObjectId, ref: 'Reservation', required: true },
    roomRating:   { type: Number, min: 1, max: 5 },
    roomFeedback: { type: String, trim: true, maxlength: 1000 },
    foodRating:   { type: Number, min: 1, max: 5 },
    foodFeedback: { type: String, trim: true, maxlength: 1000 },
    spaRating:    { type: Number, min: 1, max: 5 },
    spaFeedback:  { type: String, trim: true, maxlength: 1000 },
    overallRating: { type: Number, required: true, min: 1, max: 5 },
    isHidden:     { type: Boolean, default: false },
  },
  { timestamps: true }
);

// One review per reservation
ReviewSchema.index({ reservation: 1 }, { unique: true });
ReviewSchema.index({ guest: 1 });
ReviewSchema.index({ isHidden: 1, createdAt: -1 });

export default mongoose.model<IReview>('Review', ReviewSchema);
