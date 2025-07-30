import { Router } from 'express';
import { companyController, companyValidation } from '../controllers/companyController';
import { authenticateToken } from '../middleware/auth';
import { cacheMiddleware, companyCacheConfig, staticDataCacheConfig } from '../middleware/cache';

const router = Router();

// Public routes for reference data
router.get(
  '/industries',
  cacheMiddleware(staticDataCacheConfig),
  companyController.getIndustries
);

router.get(
  '/tech-stacks',
  cacheMiddleware(staticDataCacheConfig),
  companyController.getTechStacks
);

// Protected routes (authentication required)
router.get(
  '/search',
  authenticateToken,
  cacheMiddleware(companyCacheConfig),
  companyValidation.searchCompanies,
  companyController.searchCompanies
);

router.post(
  '/',
  authenticateToken,
  companyValidation.createCompany,
  companyController.createCompany
);

router.get(
  '/:id',
  authenticateToken,
  cacheMiddleware(staticDataCacheConfig),
  companyValidation.getCompanyById,
  companyController.getCompanyById
);

router.post(
  '/initialize',
  authenticateToken,
  companyController.initializeDatabase
);

export default router;