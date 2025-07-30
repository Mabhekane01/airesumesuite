import { Request, Response } from 'express';
import { companyService } from '../services/companyService';
import { body, query, validationResult } from 'express-validator';

interface AuthenticatedRequest extends Request {
  user?: { id: string };
}

export class CompanyController {
  async searchCompanies(req: AuthenticatedRequest, res: Response): Promise<void> {
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

      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const {
        query: searchQuery,
        industry,
        size,
        countryCode,
        stateCode,
        city,
        englishSpeaking,
        remoteFriendly,
        techStack,
        fundingStage,
        limit,
        offset,
        sortBy,
        sortOrder
      } = req.query;

      const results = await companyService.searchCompanies(req.user.id, {
        query: searchQuery as string,
        industry: industry ? (industry as string).split(',') : undefined,
        size: size ? (size as string).split(',') : undefined,
        countryCode: countryCode as string,
        stateCode: stateCode as string,
        city: city as string,
        englishSpeaking: englishSpeaking === 'true' ? true : englishSpeaking === 'false' ? false : undefined,
        remoteFriendly: remoteFriendly === 'true' ? true : remoteFriendly === 'false' ? false : undefined,
        techStack: techStack ? (techStack as string).split(',') : undefined,
        fundingStage: fundingStage ? (fundingStage as string).split(',') : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
        sortBy: sortBy as 'name' | 'size' | 'rating' | 'relevance',
        sortOrder: sortOrder as 'asc' | 'desc'
      });

      res.status(200).json({
        success: true,
        data: results.companies,
        pagination: {
          total: results.total,
          limit: limit ? parseInt(limit as string) : 20,
          offset: offset ? parseInt(offset as string) : 0,
          hasMore: (offset ? parseInt(offset as string) : 0) + (limit ? parseInt(limit as string) : 20) < results.total
        }
      });
    } catch (error) {
      console.error('Company search error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during company search'
      });
    }
  }

  async createCompany(req: AuthenticatedRequest, res: Response): Promise<void> {
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

      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const companyData = req.body;
      const company = await companyService.createCompany(req.user.id, companyData);

      res.status(201).json({
        success: true,
        data: company,
        message: 'Company created successfully'
      });
    } catch (error) {
      console.error('Create company error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during company creation'
      });
    }
  }

  async getCompanyById(req: AuthenticatedRequest, res: Response): Promise<void> {
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

      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const { id } = req.params;
      const company = await companyService.getCompanyById(req.user.id, id);

      if (!company) {
        res.status(404).json({
          success: false,
          message: 'Company not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: company
      });
    } catch (error) {
      console.error('Get company by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async getIndustries(req: Request, res: Response): Promise<void> {
    try {
      const industries = await companyService.getIndustries();

      res.status(200).json({
        success: true,
        data: industries,
        count: industries.length
      });
    } catch (error) {
      console.error('Get industries error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async getTechStacks(req: Request, res: Response): Promise<void> {
    try {
      const techStacks = await companyService.getTechStacks();

      res.status(200).json({
        success: true,
        data: techStacks
      });
    } catch (error) {
      console.error('Get tech stacks error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async initializeDatabase(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Only allow admin users to initialize (you can implement admin check)
      await companyService.initializeDatabase();

      res.status(200).json({
        success: true,
        message: 'Company database initialized successfully'
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
export const companyValidation = {
  searchCompanies: [
    query('query')
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage('Query must be between 1 and 100 characters'),
    query('industry')
      .optional()
      .custom((value) => {
        if (value) {
          const industries = value.split(',');
          return industries.every((industry: string) => industry.trim().length > 0);
        }
        return true;
      })
      .withMessage('Invalid industry format'),
    query('size')
      .optional()
      .custom((value) => {
        if (value) {
          const sizes = value.split(',');
          const validSizes = ['startup', 'small', 'medium', 'large', 'enterprise'];
          return sizes.every((size: string) => validSizes.includes(size.trim()));
        }
        return true;
      })
      .withMessage('Size must be one or more of: startup, small, medium, large, enterprise'),
    query('countryCode')
      .optional()
      .isLength({ min: 2, max: 2 })
      .withMessage('Country code must be 2 characters'),
    query('stateCode')
      .optional()
      .isLength({ min: 1, max: 10 })
      .withMessage('State code must be between 1 and 10 characters'),
    query('city')
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage('City must be between 1 and 100 characters'),
    query('englishSpeaking')
      .optional()
      .isBoolean()
      .withMessage('englishSpeaking must be a boolean'),
    query('remoteFriendly')
      .optional()
      .isBoolean()
      .withMessage('remoteFriendly must be a boolean'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('offset')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Offset must be a non-negative integer'),
    query('sortBy')
      .optional()
      .isIn(['name', 'size', 'rating', 'relevance'])
      .withMessage('sortBy must be one of: name, size, rating, relevance'),
    query('sortOrder')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('sortOrder must be either asc or desc')
  ],

  createCompany: [
    body('name')
      .notEmpty()
      .withMessage('Company name is required')
      .isLength({ min: 1, max: 200 })
      .withMessage('Company name must be between 1 and 200 characters'),
    body('industry')
      .notEmpty()
      .withMessage('Industry is required')
      .isLength({ min: 1, max: 100 })
      .withMessage('Industry must be between 1 and 100 characters'),
    body('size')
      .notEmpty()
      .withMessage('Company size is required')
      .isIn(['startup', 'small', 'medium', 'large', 'enterprise'])
      .withMessage('Size must be one of: startup, small, medium, large, enterprise'),
    body('website')
      .optional()
      .isURL()
      .withMessage('Website must be a valid URL'),
    body('description')
      .optional()
      .isLength({ max: 2000 })
      .withMessage('Description must be less than 2000 characters'),
    body('headquarters.city')
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage('City must be between 1 and 100 characters'),
    body('headquarters.state')
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage('State must be between 1 and 100 characters'),
    body('headquarters.country')
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage('Country must be between 1 and 100 characters'),
    body('headquarters.address')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Address must be less than 500 characters'),
    body('headquarters.postalCode')
      .optional()
      .isLength({ min: 3, max: 20 })
      .withMessage('Postal code must be between 3 and 20 characters'),
    body('techStack.languages')
      .optional()
      .isArray()
      .withMessage('Languages must be an array'),
    body('techStack.languages.*')
      .optional()
      .isLength({ min: 1, max: 50 })
      .withMessage('Each language must be between 1 and 50 characters'),
    body('techStack.frameworks')
      .optional()
      .isArray()
      .withMessage('Frameworks must be an array'),
    body('techStack.frameworks.*')
      .optional()
      .isLength({ min: 1, max: 50 })
      .withMessage('Each framework must be between 1 and 50 characters'),
    body('techStack.databases')
      .optional()
      .isArray()
      .withMessage('Databases must be an array'),
    body('techStack.databases.*')
      .optional()
      .isLength({ min: 1, max: 50 })
      .withMessage('Each database must be between 1 and 50 characters'),
    body('techStack.cloud')
      .optional()
      .isArray()
      .withMessage('Cloud must be an array'),
    body('techStack.cloud.*')
      .optional()
      .isLength({ min: 1, max: 50 })
      .withMessage('Each cloud service must be between 1 and 50 characters'),
    body('techStack.tools')
      .optional()
      .isArray()
      .withMessage('Tools must be an array'),
    body('techStack.tools.*')
      .optional()
      .isLength({ min: 1, max: 50 })
      .withMessage('Each tool must be between 1 and 50 characters'),
    body('culture.remoteFriendly')
      .optional()
      .isBoolean()
      .withMessage('remoteFriendly must be a boolean'),
    body('culture.hybridOptions')
      .optional()
      .isBoolean()
      .withMessage('hybridOptions must be a boolean'),
    body('culture.values')
      .optional()
      .isArray()
      .withMessage('Values must be an array'),
    body('culture.values.*')
      .optional()
      .isLength({ min: 1, max: 200 })
      .withMessage('Each value must be between 1 and 200 characters'),
    body('culture.benefits')
      .optional()
      .isArray()
      .withMessage('Benefits must be an array'),
    body('culture.benefits.*')
      .optional()
      .isLength({ min: 1, max: 200 })
      .withMessage('Each benefit must be between 1 and 200 characters')
  ],

  getCompanyById: [
    query('id')
      .notEmpty()
      .withMessage('Company ID is required')
      .isMongoId()
      .withMessage('Invalid company ID format')
  ]
};

export const companyController = new CompanyController();