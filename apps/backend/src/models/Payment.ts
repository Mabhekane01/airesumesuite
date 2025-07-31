import mongoose, { Schema, Document } from 'mongoose';

export interface IPayment extends Document {
  userId: string;
  paystackReference?: string;
  amount: number;
  currency: string;
  status: 'succeeded' | 'failed' | 'pending' | 'cancelled';
  provider: 'paystack';
  paymentMethod?: string;
  description?: string;
  metadata?: Record<string, any>;
  failureReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema: Schema = new Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  paystackReference: {
    type: String
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
  status: {
    type: String,
    enum: ['succeeded', 'failed', 'pending', 'cancelled'],
    default: 'pending',
    index: true
  },
  provider: {
    type: String,
    enum: ['paystack'],
    required: true
  },
  paymentMethod: {
    type: String
  },
  description: {
    type: String
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },
  failureReason: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes for better query performance
PaymentSchema.index({ userId: 1, status: 1 });
PaymentSchema.index({ paystackReference: 1 }, { sparse: true });
PaymentSchema.index({ createdAt: -1 });

export const Payment = mongoose.model<IPayment>('Payment', PaymentSchema);