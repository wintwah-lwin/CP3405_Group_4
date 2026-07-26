import mongoose, { Schema, Document } from 'mongoose';

export interface HumanScoreSection {
  aiScore: number;
  teamScore: number;
  notes: string;
}

export interface IHumanScore extends Document {
  week: number;
  macro: HumanScoreSection;
  technical: HumanScoreSection;
  almanac: HumanScoreSection;
  llmConsensus: HumanScoreSection;
  finalBias: string;
  confidence: string;
  markdown: string;
  updatedAt: Date;
}

const sectionSchema = new Schema<HumanScoreSection>(
  {
    aiScore: { type: Number, default: 0 },
    teamScore: { type: Number, default: 0 },
    notes: { type: String, default: '' },
  },
  { _id: false }
);

const humanScoreSchema = new Schema<IHumanScore>(
  {
    week: { type: Number, required: true, unique: true },
    macro: { type: sectionSchema, default: () => ({}) },
    technical: { type: sectionSchema, default: () => ({}) },
    almanac: { type: sectionSchema, default: () => ({}) },
    llmConsensus: { type: sectionSchema, default: () => ({}) },
    finalBias: { type: String, default: '' },
    confidence: { type: String, default: 'Medium' },
    markdown: { type: String, default: '' },
  },
  { timestamps: true }
);

export const HumanScore = mongoose.model<IHumanScore>('HumanScore', humanScoreSchema);
