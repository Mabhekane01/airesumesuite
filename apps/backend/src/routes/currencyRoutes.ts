import { Router } from 'express';
import { currencyController, currencyValidation } from '../controllers/currencyController';
import { authenticateToken } from '../middleware/auth';
import { cacheMiddleware, staticDataCacheConfig } from '../middleware/cache';

const router = Router();

// Public routes (no authentication required)
router.get(
  '/',
  cacheMiddleware(staticDataCacheConfig),
  currencyController.getAllCurrencies
);

router.get(
  '/english-speaking',
  cacheMiddleware(staticDataCacheConfig),
  currencyController.getEnglishSpeakingCurrencies
);

router.get(
  '/search',
  cacheMiddleware(staticDataCacheConfig),
  currencyValidation.searchCurrencies,
  currencyController.searchCurrencies
);

router.get(
  '/country/:countryCode',
  cacheMiddleware(staticDataCacheConfig),
  currencyValidation.getCurrenciesByCountry,
  currencyController.getCurrenciesByCountry
);

// Protected routes (authentication required)
router.post(
  '/initialize',
  authenticateToken,
  currencyController.initializeDatabase
);

export default router;