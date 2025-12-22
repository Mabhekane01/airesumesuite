import { Request, Response } from 'express';
import { locationService } from '../services/locationService';
import { body, query, validationResult } from 'express-validator';

interface AuthenticatedRequest extends Request {
  user?: { id: string };
}

export class LocationController {
  async autocomplete(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
        return;
      }

      const {
        query: searchQuery,
        type,
        englishSpeaking,
        limit,
        includeCoordinates,
        countryCode,
        stateCode
      } = req.query;

      const results = await locationService.autocomplete({
        query: searchQuery as string,
        type: type ? (type as string).split(',') as ('country' | 'state' | 'city')[] : undefined,
        englishSpeaking: englishSpeaking === 'true' ? true : englishSpeaking === 'false' ? false : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        includeCoordinates: includeCoordinates === 'true',
        countryCode: countryCode as string,
        stateCode: stateCode as string
      });

      res.status(200).json({
        success: true,
        data: results,
        count: results.length
      });
    } catch (error) {
      console.error('Location autocomplete error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during location search'
      });
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
        return;
      }

      const { id } = req.params;
      const location = await locationService.getLocationById(id);

      if (!location) {
        res.status(404).json({
          success: false,
          message: 'Location not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: location
      });
    } catch (error) {
      console.error('Get location by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async getEnglishSpeakingCountries(req: Request, res: Response): Promise<void> {
    try {
      const countries = await locationService.getEnglishSpeakingCountries();

      res.status(200).json({
        success: true,
        data: countries,
        count: countries.length
      });
    } catch (error) {
      console.error('Get English-speaking countries error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async getStatesForCountry(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
        return;
      }

      const { countryCode } = req.params;
      const states = await locationService.getStatesForCountry(countryCode);

      res.status(200).json({
        success: true,
        data: states,
        count: states.length
      });
    } catch (error) {
      console.error('Get states for country error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async getCitiesForState(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
        return;
      }

      const { countryCode, stateCode } = req.params;
      const cities = await locationService.getCitiesForState(countryCode, stateCode);

      res.status(200).json({
        success: true,
        data: cities,
        count: cities.length
      });
    } catch (error) {
      console.error('Get cities for state error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async getCitiesForCountry(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
        return;
      }

      const { countryCode } = req.params;
      const cities = await locationService.getCitiesForState(countryCode);

      res.status(200).json({
        success: true,
        data: cities,
        count: cities.length
      });
    } catch (error) {
      console.error('Get cities for country error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async initializeDatabase(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Only allow admin users to initialize (you can implement admin check)
      await locationService.initializeDatabase();

      res.status(200).json({
        success: true,
        message: 'Location database initialized successfully'
      });
    } catch (error) {
      console.error('Database initialization error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during database initialization'
      });
    }
  }
}

// Validation middleware
export const locationValidation = {
  autocomplete: [
    query('query')
      .notEmpty()
      .withMessage('Search query is required')
      .isLength({ min: 1, max: 100 })
      .withMessage('Query must be between 1 and 100 characters'),
    query('type')
      .optional()
      .custom((value) => {
        if (value) {
          const types = value.split(',');
          const validTypes = ['country', 'state', 'city'];
          return types.every((type: string) => validTypes.includes(type.trim()));
        }
        return true;
      })
      .withMessage('Type must be one or more of: country, state, city'),
    query('englishSpeaking')
      .optional()
      .isBoolean()
      .withMessage('englishSpeaking must be a boolean'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('includeCoordinates')
      .optional()
      .isBoolean()
      .withMessage('includeCoordinates must be a boolean'),
    query('countryCode')
      .optional()
      .isLength({ min: 2, max: 2 })
      .withMessage('Country code must be 2 characters'),
    query('stateCode')
      .optional()
      .isLength({ min: 1, max: 10 })
      .withMessage('State code must be between 1 and 10 characters')
  ],

  getById: [
    query('id')
      .notEmpty()
      .withMessage('Location ID is required')
      .isMongoId()
      .withMessage('Invalid location ID format')
  ],

  getStatesForCountry: [
    query('countryCode')
      .notEmpty()
      .withMessage('Country code is required')
      .isLength({ min: 2, max: 2 })
      .withMessage('Country code must be 2 characters')
      .isAlpha()
      .withMessage('Country code must contain only letters')
  ],

  getCitiesForState: [
    query('countryCode')
      .notEmpty()
      .withMessage('Country code is required')
      .isLength({ min: 2, max: 2 })
      .withMessage('Country code must be 2 characters')
      .isAlpha()
      .withMessage('Country code must contain only letters'),
    query('stateCode')
      .notEmpty()
      .withMessage('State code is required')
      .isLength({ min: 1, max: 10 })
      .withMessage('State code must be between 1 and 10 characters')
  ],

  getCitiesForCountry: [
    query('countryCode')
      .notEmpty()
      .withMessage('Country code is required')
      .isLength({ min: 2, max: 2 })
      .withMessage('Country code must be 2 characters')
      .isAlpha()
      .withMessage('Country code must contain only letters')
  ]
};

export const locationController = new LocationController();