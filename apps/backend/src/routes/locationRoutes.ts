import { Router } from 'express';
import { locationController, locationValidation } from '../controllers/locationController';
import { authenticateToken } from '../middleware/auth';
import { cacheMiddleware, locationCacheConfig, staticDataCacheConfig } from '../middleware/cache';

const router = Router();

// Public routes (no authentication required)
router.get(
  '/autocomplete',
  cacheMiddleware(locationCacheConfig),
  locationValidation.autocomplete,
  locationController.autocomplete
);

router.get(
  '/countries/english-speaking',
  cacheMiddleware(staticDataCacheConfig),
  locationController.getEnglishSpeakingCountries
);

router.get(
  '/countries/:countryCode/states',
  cacheMiddleware(staticDataCacheConfig),
  locationValidation.getStatesForCountry,
  locationController.getStatesForCountry
);

router.get(
  '/countries/:countryCode/cities',
  cacheMiddleware(locationCacheConfig),
  locationValidation.getCitiesForCountry,
  locationController.getCitiesForCountry
);

router.get(
  '/countries/:countryCode/states/:stateCode/cities',
  cacheMiddleware(locationCacheConfig),
  locationValidation.getCitiesForState,
  locationController.getCitiesForState
);

router.get(
  '/:id',
  cacheMiddleware(staticDataCacheConfig),
  locationValidation.getById,
  locationController.getById
);

// Protected routes (authentication required)
router.post(
  '/initialize',
  authenticateToken,
  locationController.initializeDatabase
);

export default router;