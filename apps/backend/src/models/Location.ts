import mongoose, { Document, Schema } from 'mongoose';

export interface ILocation extends Document {
  name: string;
  type: 'country' | 'state' | 'city';
  code?: string;
  parentId?: mongoose.Types.ObjectId;
  countryCode: string;
  stateCode?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  population?: number;
  timezone?: string;
  isEnglishSpeaking?: boolean;
  flag?: string;
  currency?: string;
  searchTerms: string[];
  metadata?: {
    capital?: boolean;
    majorCity?: boolean;
    techHub?: boolean;
    businessHub?: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const LocationSchema = new Schema<ILocation>({
  name: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  type: {
    type: String,
    enum: ['country', 'state', 'city'],
    required: true,
    index: true
  },
  code: {
    type: String,
    trim: true,
    uppercase: true,
    index: true
  },
  parentId: {
    type: Schema.Types.ObjectId,
    ref: 'Location',
    index: true
  },
  countryCode: {
    type: String,
    required: true,
    length: 2,
    uppercase: true,
    index: true
  },
  stateCode: {
    type: String,
    trim: true,
    uppercase: true,
    index: true
  },
  coordinates: {
    latitude: { type: Number, min: -90, max: 90 },
    longitude: { type: Number, min: -180, max: 180 }
  },
  population: {
    type: Number,
    min: 0
  },
  timezone: {
    type: String,
    trim: true
  },
  isEnglishSpeaking: {
    type: Boolean,
    default: false,
    index: true
  },
  flag: {
    type: String,
    trim: true
  },
  currency: {
    type: String,
    trim: true,
    uppercase: true
  },
  searchTerms: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  metadata: {
    capital: { type: Boolean, default: false },
    majorCity: { type: Boolean, default: false },
    techHub: { type: Boolean, default: false },
    businessHub: { type: Boolean, default: false }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

LocationSchema.index({ name: 'text', searchTerms: 'text' });
LocationSchema.index({ type: 1, isEnglishSpeaking: 1 });
LocationSchema.index({ countryCode: 1, stateCode: 1 });
LocationSchema.index({ 'coordinates.latitude': 1, 'coordinates.longitude': 1 });

LocationSchema.virtual('children', {
  ref: 'Location',
  localField: '_id',
  foreignField: 'parentId'
});

LocationSchema.virtual('parent', {
  ref: 'Location',
  localField: 'parentId',
  foreignField: '_id',
  justOne: true
});

LocationSchema.virtual('fullName').get(function() {
  if (this.type === 'city' && this.parent) {
    return `${this.name}, ${this.parent.name}`;
  }
  return this.name;
});

LocationSchema.methods.getHierarchy = async function() {
  const hierarchy = [this];
  let current = this;
  
  while (current.parentId) {
    current = await mongoose.model('Location').findById(current.parentId);
    if (current) hierarchy.unshift(current);
  }
  
  return hierarchy;
};

LocationSchema.statics.searchLocations = function(query: string, options: {
  type?: string[];
  englishSpeaking?: boolean;
  limit?: number;
  includeCoordinates?: boolean;
} = {}) {
  const {
    type = ['country', 'state', 'city'],
    englishSpeaking,
    limit = 10,
    includeCoordinates = false
  } = options;

  const searchQuery: any = {
    $and: [
      { type: { $in: type } },
      {
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { searchTerms: { $regex: query, $options: 'i' } },
          { code: { $regex: query, $options: 'i' } }
        ]
      }
    ]
  };

  if (englishSpeaking !== undefined) {
    searchQuery.$and.push({ isEnglishSpeaking: englishSpeaking });
  }

  const projection: any = {
    name: 1,
    type: 1,
    code: 1,
    countryCode: 1,
    stateCode: 1,
    flag: 1,
    isEnglishSpeaking: 1,
    metadata: 1
  };

  if (includeCoordinates) {
    projection.coordinates = 1;
  }

  return this.find(searchQuery, projection)
    .populate('parent', 'name type code')
    .sort({ 
      'metadata.capital': -1,
      'metadata.majorCity': -1,
      population: -1,
      name: 1 
    })
    .limit(limit);
};

LocationSchema.statics.getEnglishSpeakingCountries = function() {
  return this.find({
    type: 'country',
    isEnglishSpeaking: true
  }).sort({ name: 1 });
};

LocationSchema.statics.getStatesForCountry = function(countryCode: string) {
  return this.find({
    type: 'state',
    countryCode: countryCode.toUpperCase()
  }).sort({ name: 1 });
};

LocationSchema.statics.getCitiesForState = function(countryCode: string, stateCode?: string) {
  const query: any = {
    type: 'city',
    countryCode: countryCode.toUpperCase()
  };
  
  if (stateCode) {
    query.stateCode = stateCode.toUpperCase();
  }
  
  return this.find(query)
    .sort({ 
      'metadata.majorCity': -1,
      population: -1,
      name: 1 
    });
};

export const Location = mongoose.model<ILocation>('Location', LocationSchema);