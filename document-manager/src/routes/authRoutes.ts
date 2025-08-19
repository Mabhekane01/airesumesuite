import { Router } from 'express';
import { AuthController } from '../controllers/authController';

const router = Router();
const authController = new AuthController();

// User registration
router.post('/register', authController.register.bind(authController));

// User login
router.post('/login', authController.login.bind(authController));

// Refresh JWT token
router.post('/refresh', authController.refreshToken.bind(authController));

// Get current user profile
router.get('/profile', authController.getProfile.bind(authController));

// Update user profile
router.put('/profile', authController.updateProfile.bind(authController));

// Change password
router.put('/password', authController.changePassword.bind(authController));

// Logout
router.post('/logout', authController.logout.bind(authController));

export default router;