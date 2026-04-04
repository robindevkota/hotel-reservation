import mongoose, { Document, Schema } from 'mongoose';

export type SpaCategory = 'massage' | 'facial' | 'body_wrap' | 'hydrotherapy' | 'couples';

export interface ISpaSlot {
  startTime: string;
  endTime: string;
}

export interface ISpaService extends Document {
  name: string;
  description: string;
  duration: number;
  price: number;
  image: string;
  category: SpaCategory;
  isAvailable: boolean;
  slots: ISpaSlot[];
}

const SpaServiceSchema = new Schema<ISpaService>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    duration: { type: Number, required: true },
    price: { type: Number, required: true, min: 0 },
    image: { type: String, default: '' },
    category: {
      type: String,
      enum: ['massage', 'facial', 'body_wrap', 'hydrotherapy', 'couples'],
      required: true,
    },
    isAvailable: { type: Boolean, default: true },
    slots: [
      {
        startTime: { type: String, required: true },
        endTime: { type: String, required: true },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model<ISpaService>('SpaService', SpaServiceSchema);
