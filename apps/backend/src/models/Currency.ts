import mongoose, { Document, Schema } from 'mongoose';

export interface ICurrency extends Document {
  code: string;
  name: string;
  symbol: string;
  countries: string[];
  subunit?: string;
  subunitToUnit?: number;
  symbolNative?: string;
  decimalDigits: number;
  rounding: number;
  isActive: boolean;
  isEnglishSpeakingPrimary: boolean;
  exchangeRate?: {
    toUSD: number;
    lastUpdated: Date;
  };
  metadata?: {
    type: 'fiat' | 'cryptocurrency' | 'commodity';
    isDigital: boolean;
    centralBank?: string;
    introduced?: Date;
  };
  searchTerms: string[];
  createdAt: Date;
  updatedAt: Date;
}

const CurrencySchema = new Schema<ICurrency>({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    length: 3,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  symbol: {
    type: String,
    required: true,
    trim: true
  },
  countries: [{
    type: String,
    uppercase: true,
    length: 2
  }],
  subunit: {
    type: String,
    trim: true
  },
  subunitToUnit: {
    type: Number,
    default: 100
  },
  symbolNative: {
    type: String,
    trim: true
  },
  decimalDigits: {
    type: Number,
    default: 2,
    min: 0,
    max: 4
  },
  rounding: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isEnglishSpeakingPrimary: {
    type: Boolean,
    default: false,
    index: true
  },
  exchangeRate: {
    toUSD: { type: Number, min: 0 },
    lastUpdated: Date
  },
  metadata: {
    type: { type: String, enum: ['fiat', 'cryptocurrency', 'commodity'], default: 'fiat' },
    isDigital: { type: Boolean, default: false },
    centralBank: String,
    introduced: Date
  },
  searchTerms: [{
    type: String,
    trim: true,
    lowercase: true
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
CurrencySchema.index({ code: 'text', name: 'text', searchTerms: 'text' });
CurrencySchema.index({ countries: 1 });
CurrencySchema.index({ isActive: 1, isEnglishSpeakingPrimary: 1 });

// Virtual for formatted symbol with code
CurrencySchema.virtual('displaySymbol').get(function() {
  return `${this.symbol} (${this.code})`;
});

// Static methods
CurrencySchema.statics.getEnglishSpeakingCurrencies = function() {
  return this.find({
    isActive: true,
    isEnglishSpeakingPrimary: true
  }).sort({ name: 1 });
};

CurrencySchema.statics.getCurrenciesByCountry = function(countryCode: string) {
  return this.find({
    isActive: true,
    countries: countryCode.toUpperCase()
  }).sort({ name: 1 });
};

CurrencySchema.statics.searchCurrencies = function(query: string, options: {
  englishSpeaking?: boolean;
  limit?: number;
} = {}) {
  const { englishSpeaking, limit = 20 } = options;

  const searchQuery: any = {
    isActive: true,
    $or: [
      { name: { $regex: query, $options: 'i' } },
      { code: { $regex: query, $options: 'i' } },
      { searchTerms: { $regex: query, $options: 'i' } }
    ]
  };

  if (englishSpeaking !== undefined) {
    searchQuery.isEnglishSpeakingPrimary = englishSpeaking;
  }

  return this.find(searchQuery)
    .sort({ isEnglishSpeakingPrimary: -1, name: 1 })
    .limit(limit);
};

export const Currency = mongoose.model<ICurrency>('Currency', CurrencySchema);