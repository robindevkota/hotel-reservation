import mongoose, { Document, Schema } from 'mongoose';

export type SpaCategory = 'massage' | 'facial' | 'body_wrap' | 'hydrotherapy' | 'couples';

export interface ISpaService extends Document {
  name: string;
  description: string;
  duration: number;       // minutes
  price: number;
  image: string;
  category: SpaCategory;
  isAvailable: boolean;
  gracePeriod: number;    // minutes a guest can arrive late before admin must decide
  operatingStart: string; // "09:00" — earliest session start
  operatingEnd: string;   // "21:00" — latest session must END by this time
}

const SpaServiceSchema = new Schema<ISpaService>(
  {
    name:           { type: String, required: true, trim: true },
    description:    { type: String, required: true },
    duration:       { type: Number, required: true },
    price:          { type: Number, required: true, min: 0 },
    image:          { type: String, default: '' },
    category: {
      type: String,
      enum: ['massage', 'facial', 'body_wrap', 'hydrotherapy', 'couples'],
      required: true,
    },
    isAvailable:    { type: Boolean, default: true },
    gracePeriod:    { type: Number, default: 15 },
    operatingStart: { type: String, default: '09:00' },
    operatingEnd:   { type: String, default: '21:00' },
  },
  { timestamps: true }
);

export default mongoose.model<ISpaService>('SpaService', SpaServiceSchema);
