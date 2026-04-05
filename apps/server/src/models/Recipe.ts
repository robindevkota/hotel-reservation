import mongoose, { Document, Schema } from 'mongoose';

export interface IRecipeIngredient {
  ingredient: mongoose.Types.ObjectId;
  qtyPerServing: number;
}

export interface IRecipe extends Document {
  name: string;             // standalone name (e.g. "Chicken Momo", "Whiskey Peg")
  servingLabel: string;     // e.g. "plate of 10", "60 ml peg"
  sellingPrice: number;     // NPR
  section: 'kitchen' | 'bar';
  ingredients: IRecipeIngredient[];
  isActive: boolean;
}

const RecipeSchema = new Schema<IRecipe>(
  {
    name:         { type: String, required: true, trim: true },
    servingLabel: { type: String, required: true, trim: true },
    sellingPrice: { type: Number, required: true, min: 0 },
    section:      { type: String, enum: ['kitchen','bar'], required: true },
    ingredients:  [
      {
        ingredient:    { type: Schema.Types.ObjectId, ref: 'Ingredient', required: true },
        qtyPerServing: { type: Number, required: true, min: 0 },
      },
    ],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

RecipeSchema.index({ name: 1 });
RecipeSchema.index({ section: 1 });

export default mongoose.model<IRecipe>('Recipe', RecipeSchema);
