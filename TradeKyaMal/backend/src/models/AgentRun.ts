import mongoose, { Schema, Document } from 'mongoose';

export interface IAgentRun extends Document {
  agentId: 'almanac' | 'macro' | 'technical';
  status: 'idle' | 'running' | 'completed' | 'error';
  summary?: string;
  output?: Record<string, unknown>;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
}

const AgentRunSchema = new Schema<IAgentRun>(
  {
    agentId: {
      type: String,
      enum: ['almanac', 'macro', 'technical'],
      required: true,
    },
    status: {
      type: String,
      enum: ['idle', 'running', 'completed', 'error'],
      default: 'idle',
    },
    summary: { type: String },
    output: { type: Schema.Types.Mixed },
    startedAt: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

AgentRunSchema.index({ agentId: 1, createdAt: -1 });

export const AgentRun = mongoose.model<IAgentRun>('AgentRun', AgentRunSchema);
