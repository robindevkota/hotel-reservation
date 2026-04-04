import mongoose, { Document, Schema } from 'mongoose';

export type MenuCategory = 'breakfast' | 'lunch' | 'dinner' | 'snacks' | 'beverages' | 'desserts';

export interface IMenuItem extends Document {
  name: string;
  description: string;
  category: MenuCategory;
  price: number;
  image: string;
  isAvailable: boolean;
  preparationTime: number;
  isVeg: boolean;
  tags: string[];
}

const MenuItemSchema = new Schema<IMenuItem>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    category: {
      type: String,
      enum: ['breakfast', 'lunch', 'dinner', 'snacks', 'beverages', 'desserts'],
      required: true,
    },
    price: { type: Number, required: true, min: 0 },
    image: { type: String, default: '' },
    isAvailable: { type: Boolean, default: true },
    preparationTime: { type: Number, default: 20 }, // minutes
    isVeg: { type: Boolean, default: false },
    tags: [{ type: String }],
  },
  { timestamps: true }
);

MenuItemSchema.index({ category: 1, isAvailable: 1 });

export default mongoose.model<IMenuItem>('MenuItem', MenuItemSchema);
