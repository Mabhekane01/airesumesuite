import { Request, Response } from 'express';
import { currencyService } from '../services/currencyService';
import { query, validationResult } from 'express-validator';

interface AuthenticatedRequest extends Request {
  user?: { id: string };
}

export class CurrencyController {
  async getAllCurrencies(req: Request, res: Response): Promise<void> {
    try {
      const currencies = await currencyService.getAllCurrencies();

      res.status(200).json({
        success: true,
        data: currencies,
        count: currencies.length
      });
    } catch (error) {
      console.error('Get all currencies error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async getEnglishSpeakingCurrencies(req: Request, res: Response): Promise<void> {
    try {
      const currencies = await currencyService.getEnglishSpeakingCurrencies();

      res.status(200).json({
        success: true,
        data: currencies,
        count: currencies.length
      });
    } catch (error) {
      console.error('Get English-speaking currencies error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async searchCurrencies(req: Request, res: Response): Promise<void> {
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
        englishSpeaking,
        countryCode,
        limit
      } = req.query;

      const results = await currencyService.searchCurrencies({
        query: searchQuery as string,
        englishSpeaking: englishSpeaking === 'true' ? true : englishSpeaking === 'false' ? false : undefined,
        countryCode: countryCode as string,
        limit: limit ? parseInt(limit as string) : undefined
      });

      res.status(200).json({
        success: true,
        data: results,
        count: results.length
      });
    } catch (error) {
      console.error('Currency search error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during currency search'
      });
    }
  }

  async getCurrenciesByCountry(req: Request, res: Response): Promise<void> {
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
      const currencies = await currencyService.getCurrenciesByCountry(countryCode);

      res.status(200).json({
        success: true,
        data: currencies,
        count: currencies.length
      });
    } catch (error) {
      console.error('Get currencies by country error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async initializeDatabase(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Only allow admin users to initialize (you can implement admin check)
      await currencyService.initializeDatabase();

      res.status(200).json({
        success: true,
        message: 'Currency database initialized successfully'
      });
    } catch (error) {
      console.error('Currency database initialization error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during database initialization'
      });
    }
  }
}

// Validation middleware
export const currencyValidation = {
  searchCurrencies: [
    query('query')
      .optional()
      .isLength({ min: 1, max: 50 })
      .withMessage('Query must be between 1 and 50 characters'),
    query('englishSpeaking')
      .optional()
      .isBoolean()
      .withMessage('englishSpeaking must be a boolean'),
    query('countryCode')
      .optional()
      .isLength({ min: 2, max: 2 })
      .withMessage('Country code must be 2 characters')
      .isAlpha()
      .withMessage('Country code must contain only letters'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
  ],

  getCurrenciesByCountry: [
    // Note: Using params validation instead of query for route params
  ]
};

export const currencyController = new CurrencyController();