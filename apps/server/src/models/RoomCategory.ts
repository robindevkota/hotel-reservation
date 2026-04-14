import mongoose, { Document, Schema } from 'mongoose';

export interface IRoomCategory extends Document {
  name: string;
  slug: string;
  description: string;
  icon: string;
  basePrice: number;
  createdAt: Date;
  updatedAt: Date;
}

const RoomCategorySchema = new Schema<IRoomCategory>(
  {
    name:        { type: String, required: true, trim: true },
    slug:        { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, default: '' },
    icon:        { type: String, default: 'Bed' },
    basePrice:   { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

export default mongoose.model<IRoomCategory>('RoomCategory', RoomCategorySchema);
