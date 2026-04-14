import mongoose from 'mongoose';

const aiAnalysisJobSchema = new mongoose.Schema(
  {
    jobId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'done', 'failed'],
      default: 'pending',
      index: true,
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    message: {
      type: String,
      default: '',
    },
    metadata: {
      fileName: String,
      fileType: String,
      textLength: Number,
      analyzedAt: Date,
    },
    sourceText: {
      type: String,
      default: null,
    },
    result: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    error: {
      type: String,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

aiAnalysisJobSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const AIAnalysisJob = mongoose.model('AIAnalysisJob', aiAnalysisJobSchema);

export default AIAnalysisJob;
