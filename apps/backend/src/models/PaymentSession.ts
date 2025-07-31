import mongoose, { Schema, Document } from 'mongoose';

export interface IPaymentSession extends Document {
  sessionId: string;
  userId: string;
  planType: 'monthly' | 'yearly';
  amount: number;
  currency: string;
  provider: 'stripe' | 'paystack';
  status: 'pending' | 'completed' | 'failed' | 'expired';
  expiresAt: Date;
  completedAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSessionSchema: Schema = new Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  planType: {
    type: String,
    enum: ['monthly', 'yearly'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    required: true,
    length: 3
  },
  provider: {
    type: String,
    enum: ['stripe', 'paystack'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'expired'],
    default: 'pending',
    index: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  completedAt: {
    type: Date
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes for better query performance
PaymentSessionSchema.index({ userId: 1, status: 1 });
PaymentSessionSchema.index({ sessionId: 1, userId: 1 });
PaymentSessionSchema.index({ createdAt: -1 });

export const PaymentSession = mongoose.model<IPaymentSession>('PaymentSession', PaymentSessionSchema);