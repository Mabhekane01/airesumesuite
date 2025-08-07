import { Router } from 'express';
import { body } from 'express-validator';
import passport from 'passport';
import { login, refreshToken, logout, logoutAll, googleAuth, googleCallback, getProfile, checkEmailExists, sendRegistrationOTP, verifyRegistrationOTP, resendRegistrationOTP } from '../controllers/authController';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { handleValidationErrors } from '../middleware/validation';
import { Response, NextFunction } from 'express';

const router: Router = Router();

// Validation middleware
const registerValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/),
  body('firstName').trim().isLength({ min: 1 }),
  body('lastName').trim().isLength({ min: 1 }),
  body('recaptchaToken').optional().isString()
];

const verificationValidation = [
  body('token').isString().isLength({ min: 1 })
];

const resendVerificationValidation = [
  body('email').isEmail().normalizeEmail()
];

const checkEmailValidation = [
  body('email').isEmail().normalizeEmail()
];

const otpVerificationValidation = [
  body('email').isEmail().normalizeEmail(),
  body('otp').isString().isLength({ min: 6, max: 6 }).matches(/^\d{6}$/)
];

const resendOTPValidation = [
  body('email').isEmail().normalizeEmail()
];

const registrationOTPValidation = [
  body('email').isEmail().normalizeEmail(),
  body('otp').isString().isLength({ min: 6, max: 6 }).matches(/^\d{6}$/)
];

const resendRegistrationOTPValidation = [
  body('email').isEmail().normalizeEmail()
];

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 1 })
];


// Modern enterprise OTP registration flow
router.post('/send-registration-otp', registerValidation, handleValidationErrors, sendRegistrationOTP);
router.post('/verify-registration-otp', registrationOTPValidation, handleValidationErrors, verifyRegistrationOTP);
router.post('/resend-registration-otp', resendRegistrationOTPValidation, handleValidationErrors, resendRegistrationOTP);

// Legacy registration route removed - use OTP registration flow only

// Login
router.post('/login', loginValidation, handleValidationErrors, login);
router.post('/check-email', checkEmailValidation, handleValidationErrors, checkEmailExists);

// Legacy email verification routes removed - OTP verification handles email validation

// OTP login verification disabled (login is now direct)
// router.post('/verify-otp', otpVerificationValidation, handleValidationErrors, verifyOTP);
// router.post('/resend-otp', resendOTPValidation, handleValidationErrors, resendOTP);

router.post('/refresh', refreshToken);
router.post('/logout', authMiddleware, (req: AuthenticatedRequest, res: Response) => logout(req, res));
router.post('/logout-all', authMiddleware, (req: AuthenticatedRequest, res: Response) => logoutAll(req, res));
router.get('/profile', authMiddleware, (req: AuthenticatedRequest, res: Response) => getProfile(req, res));

// Google OAuth routes
router.get('/google', (req, res, next) => {
  // Store redirect URL in session for later use
  if (req.query.redirect) {
    req.session.redirectAfterLogin = req.query.redirect as string;
  }
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});
router.get('/google/callback', 
  passport.authenticate('google', { session: false }), 
  googleCallback
);

export default router;