import mongoose, { Document, Schema } from 'mongoose';

export type IngredientUnit = 'kg' | 'g' | 'litre' | 'ml' | 'piece' | 'packet' | 'bottle';
export type IngredientCategory = 'kitchen' | 'bar' | 'general' | 'housekeeping';

export interface IIngredient extends Document {
  name: string;
  unit: IngredientUnit;
  stock: number;
  costPrice: number;      // NPR per unit
  lowStockThreshold: number;
  category: IngredientCategory;
  isActive: boolean;
}

const IngredientSchema = new Schema<IIngredient>(
  {
    name:              { type: String, required: true, trim: true },
    unit:              { type: String, enum: ['kg','g','litre','ml','piece','packet','bottle'], required: true },
    stock:             { type: Number, required: true, min: 0, default: 0 },
    costPrice:         { type: Number, required: true, min: 0 },
    lowStockThreshold: { type: Number, required: true, min: 0 },
    category:          { type: String, enum: ['kitchen','bar','general','housekeeping'], default: 'general' },
    isActive:          { type: Boolean, default: true },
  },
  { timestamps: true }
);

IngredientSchema.index({ name: 1 });
IngredientSchema.index({ category: 1 });

export default mongoose.model<IIngredient>('Ingredient', IngredientSchema);
