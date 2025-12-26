import express, { Router } from 'express';
import { body } from 'express-validator';
import { authMiddleware as protect } from '../middleware/auth';
import { jobFeedbackController } from '../controllers/jobFeedbackController';

const router: Router = express.Router();

// Validation for feedback submission
const feedbackValidation = [
  body('jobId').optional().isMongoId().withMessage('Invalid Job ID'),
  body('jobApplicationId').optional().isMongoId().withMessage('Invalid Application ID'),
  body('feedbackType').isIn(['response', 'interview', 'scam', 'expired', 'hired', 'ghosted', 'rejected', 'payment_required']).withMessage('Invalid feedback type'),
  body('isReal').isBoolean().withMessage('isReal must be a boolean'),
  body('comment').optional().isLength({ max: 500 }).withMessage('Comment too long')
];

// Submit feedback
router.post(
  '/',
  protect,
  feedbackValidation,
  jobFeedbackController.submitFeedback
);

// Get reviews for a job
router.get(
  '/:jobId',
  protect, // Optional: Could be public, but let's keep it protected for now or allow public read
  jobFeedbackController.getJobReviews
);

export default router;
