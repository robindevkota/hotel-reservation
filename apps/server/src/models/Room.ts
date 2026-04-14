import mongoose, { Document, Schema } from 'mongoose';

export interface IRoom extends Document {
  name: string;
  slug: string;
  type: string;
  categorySlug: string;
  pricePerNight: number;
  capacity: number;
  areaSqm: number;
  amenities: string[];
  images: string[];
  description: string;
  isAvailable: boolean;
  floorNumber: number;
  roomNumber: string;
  qrToken: string;
  qrCodeUrl: string;
  createdAt: Date;
  updatedAt: Date;
}

const RoomSchema = new Schema<IRoom>(
  {
    name:          { type: String, required: true, trim: true },
    slug:          { type: String, required: true, unique: true, lowercase: true },
    type:          { type: String, required: true },
    categorySlug:  { type: String, default: '' },
    pricePerNight: { type: Number, required: true, min: 0 },
    capacity:      { type: Number, required: true, min: 1 },
    areaSqm:       { type: Number, default: 0, min: 0 },
    amenities:     [{ type: String }],
    images:        [{ type: String }],
    description:   { type: String, required: true },
    isAvailable:   { type: Boolean, default: true },
    floorNumber:   { type: Number, required: true },
    roomNumber:    { type: String, required: true, unique: true },
    qrToken:       { type: String, default: '' },
    qrCodeUrl:     { type: String, default: '' },
  },
  { timestamps: true }
);

RoomSchema.index({ slug: 1 });
RoomSchema.index({ isAvailable: 1, type: 1 });

export default mongoose.model<IRoom>('Room', RoomSchema);
