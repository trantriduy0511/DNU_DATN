import mongoose from 'mongoose';

const aiChatMessageSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['user', 'ai'],
      required: true
    },
    content: {
      type: String,
      required: true,
      trim: true
    },
    ragSources: [
      {
        id: String,
        sourceType: String,
        title: String,
        snippet: String
      }
    ],
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const aiChatHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },
    messages: {
      type: [aiChatMessageSchema],
      default: []
    }
  },
  {
    timestamps: true
  }
);

const AIChatHistory = mongoose.model('AIChatHistory', aiChatHistorySchema);

export default AIChatHistory;

