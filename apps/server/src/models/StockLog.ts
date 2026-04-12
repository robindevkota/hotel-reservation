import mongoose, { Document, Schema } from 'mongoose';

export type StockLogType =
  | 'sale'
  | 'restock'
  | 'adjustment'
  | 'import'
  | 'staff_consumption'
  | 'owner_consumption'
  | 'wastage'
  | 'complimentary'
  | 'stocktake';

export interface IStockLogLine {
  ingredient: mongoose.Types.ObjectId;
  ingredientName: string;   // snapshot at log time
  unit: string;             // snapshot at log time
  delta: number;            // positive = added, negative = deducted
}

export interface IStockLog extends Document {
  type: StockLogType;
  performedBy?: mongoose.Types.ObjectId;
  recipe?: mongoose.Types.ObjectId;
  recipeName?: string;        // snapshot
  servingsConsumed?: number;
  lines: IStockLogLine[];
  note: string;
  consumedBy?: string;        // name for staff_consumption / owner_consumption
  consumptionReason?: string; // wastage: 'spillage' | 'breakage' | 'expired' | 'other'
  guestId?: mongoose.Types.ObjectId; // complimentary — optional guest link
  variance?: number;          // stocktake: expected − actual (negative = deficit)
  createdAt: Date;
}

const StockLogSchema = new Schema<IStockLog>(
  {
    type: {
      type: String,
      enum: ['sale','restock','adjustment','import','staff_consumption','owner_consumption','wastage','complimentary','stocktake'],
      required: true,
    },
    performedBy:        { type: Schema.Types.ObjectId, ref: 'User' },
    recipe:             { type: Schema.Types.ObjectId, ref: 'Recipe' },
    recipeName:         { type: String },
    servingsConsumed:   { type: Number },
    lines: [
      {
        ingredient:     { type: Schema.Types.ObjectId, ref: 'Ingredient', required: true },
        ingredientName: { type: String, required: true },
        unit:           { type: String, required: true },
        delta:          { type: Number, required: true },
      },
    ],
    note:               { type: String, default: '' },
    consumedBy:         { type: String },
    consumptionReason:  { type: String, enum: ['spillage','breakage','expired','other'] },
    guestId:            { type: Schema.Types.ObjectId, ref: 'Guest' },
    variance:           { type: Number },
  },
  { timestamps: true }
);

StockLogSchema.index({ type: 1, createdAt: -1 });
StockLogSchema.index({ recipe: 1 });

export default mongoose.model<IStockLog>('StockLog', StockLogSchema);
