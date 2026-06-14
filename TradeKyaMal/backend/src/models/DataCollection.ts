import mongoose, { Schema, Document } from 'mongoose';

export interface IDataCollection extends Document {
  symbol: string;
  source: string;
  label: string;
  value: string | number;
  metadata?: Record<string, unknown>;
  collectedAt: Date;
  createdAt: Date;
}

const DataCollectionSchema = new Schema<IDataCollection>(
  {
    symbol: { type: String, required: true, uppercase: true, trim: true },
    source: { type: String, required: true },
    label: { type: String, required: true, trim: true },
    value: { type: Schema.Types.Mixed, required: true },
    metadata: { type: Schema.Types.Mixed },
    collectedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true }
);

DataCollectionSchema.index({ symbol: 1, collectedAt: -1 });
DataCollectionSchema.index({ source: 1 });

export const DataCollection = mongoose.model<IDataCollection>(
  'DataCollection',
  DataCollectionSchema
);
