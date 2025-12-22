import { Router, Request, Response } from 'express';
import { locationController, locationValidation } from '../controllers/locationController';
import { authenticateToken } from '../middleware/auth';
import { cacheMiddleware, locationCacheConfig, staticDataCacheConfig } from '../middleware/cache';
import axios from 'axios';

const router: Router = Router();

// Public routes (no authentication required)

// Reverse geocoding proxy for OpenStreetMap Nominatim (CORS fix)
router.get('/reverse-geocode', async (req: Request, res: Response) => {
  try {
    const { lat, lon, zoom = '10' } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: lat and lon'
      });
    }

    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lon as string);
    
    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid coordinates: lat and lon must be numbers'
      });
    }

    const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
      params: {
        format: 'json',
        lat: latitude.toString(),
        lon: longitude.toString(),
        zoom: zoom.toString(),
        addressdetails: '1'
      },
      headers: {
        'User-Agent': 'AI Job Suite Location Service/1.0'
      },
      timeout: 10000
    });

    const data = response.data;
    const address = data.address || {};

    res.json({
      success: true,
      data: {
        city: address.city || address.town || address.village || null,
        country: address.country || null,
        region: address.state || address.region || null,
        display_name: data.display_name || null,
        address: data.address
      }
    });

  } catch (error) {
    console.error('Reverse geocoding error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve location information'
    });
  }
});

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