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
  | 'stocktake'
  | 'petty_cash_purchase';

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
  cashAmount?: number;        // petty_cash_purchase: NPR spent from front-desk cash
  purchasedBy?: string;       // petty_cash_purchase: staff member who made the purchase
  vendor?: string;            // petty_cash_purchase: where the item was bought
  approvedBy?: mongoose.Types.ObjectId; // petty_cash_purchase: admin who authorised
  itemName?: string;          // petty_cash_purchase: free-text item name (when no ingredientId)
  expenseCategory?: string;   // petty_cash_purchase: category for non-ingredient expenses
  createdAt: Date;
}

const StockLogSchema = new Schema<IStockLog>(
  {
    type: {
      type: String,
      enum: ['sale','restock','adjustment','import','staff_consumption','owner_consumption','wastage','complimentary','stocktake','petty_cash_purchase'],
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
    consumptionReason:  { type: String, enum: ['spillage','breakage','expired','other','unaccounted'] },
    guestId:            { type: Schema.Types.ObjectId, ref: 'Guest' },
    variance:           { type: Number },
    cashAmount:         { type: Number, min: 0 },
    purchasedBy:        { type: String },
    vendor:             { type: String },
    approvedBy:         { type: Schema.Types.ObjectId, ref: 'User' },
    itemName:           { type: String },
    expenseCategory:    { type: String },
  },
  { timestamps: true }
);

StockLogSchema.index({ type: 1, createdAt: -1 });
StockLogSchema.index({ recipe: 1 });

export default mongoose.model<IStockLog>('StockLog', StockLogSchema);
