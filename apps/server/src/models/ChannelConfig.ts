import mongoose, { Document, Schema } from 'mongoose';

export interface IChannelConfig extends Document {
  source: 'booking_com' | 'agoda' | 'other';
  label: string;
  icalUrl: string;
  isActive: boolean;
  lastSyncedAt: Date | null;
  lastSyncError: string;
  createdAt: Date;
  updatedAt: Date;
}

const ChannelConfigSchema = new Schema<IChannelConfig>(
  {
    source:        { type: String, enum: ['booking_com', 'agoda', 'other'], required: true, unique: true },
    label:         { type: String, required: true, trim: true },
    icalUrl:       { type: String, required: true, trim: true },
    isActive:      { type: Boolean, default: true },
    lastSyncedAt:  { type: Date, default: null },
    lastSyncError: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model<IChannelConfig>('ChannelConfig', ChannelConfigSchema);
