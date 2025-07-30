import { Router } from 'express';
import { authMiddleware as authenticateToken } from '../middleware/auth';
import {
  getUserAccount,
  updatePersonalInfo,
  updateEmail,
  changePassword,
  deleteAccount,
  getActiveSessions,
  terminateSession,
  updatePersonalInfoValidation,
  updateEmailValidation,
  changePasswordValidation,
  deleteAccountValidation
} from '../controllers/accountController';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Get account information
router.get('/', getUserAccount);

// Update personal information (name)
router.put('/personal-info', updatePersonalInfoValidation, updatePersonalInfo);

// Update email
router.put('/email', updateEmailValidation, updateEmail);

// Change password
router.put('/password', changePasswordValidation, changePassword);

// Delete account
router.delete('/', deleteAccountValidation, deleteAccount);

// Session management
router.get('/sessions', getActiveSessions);
router.delete('/sessions/:sessionId', terminateSession);

export default router;