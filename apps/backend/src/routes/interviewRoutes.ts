import { Router } from 'express';
import { interviewController, interviewValidation } from '../controllers/interviewController';
import { authenticateToken, requireSubscription } from '../middleware/auth';
import { cacheMiddleware, staticDataCacheConfig } from '../middleware/cache';

const router: Router = Router();

// All routes require authentication
router.use(authenticateToken);
router.use(requireSubscription('premium'));

// Interview CRUD operations
router.post(
  '/',
  interviewValidation.createInterview,
  interviewController.createInterview
);

router.get(
  '/',
  interviewValidation.getInterviews,
  interviewController.getInterviews
);

router.get(
  '/upcoming',
  interviewController.getUpcomingInterviews
);

router.get(
  '/:interviewId',
  interviewController.getInterviewById
);

router.put(
  '/:interviewId',
  interviewValidation.updateInterview,
  interviewController.updateInterview
);

router.delete(
  '/:interviewId',
  interviewController.deleteInterview
);

// Calendar integration
router.get(
  '/:interviewId/calendar/download',
  interviewController.downloadCalendar
);

router.get(
  '/:interviewId/calendar/urls',
  interviewController.getCalendarUrls
);

// Timezone utilities
router.get(
  '/utils/timezones',
  cacheMiddleware(staticDataCacheConfig),
  interviewController.getTimezones
);

// Notification management
router.post(
  '/:interviewId/test-reminder',
  interviewController.sendTestReminder
);

// Enhanced Scheduling Features
router.post(
  '/:interviewId/reschedule',
  interviewValidation.rescheduleInterview,
  interviewController.rescheduleInterview
);

router.post(
  '/:interviewId/confirm',
  interviewController.confirmInterview
);

router.get(
  '/:interviewId/availability-suggestions',
  interviewController.getAvailabilitySuggestions
);

// Communication Features
router.post(
  '/:interviewId/messages',
  interviewValidation.sendMessage,
  interviewController.sendMessage
);

router.get(
  '/:interviewId/messages',
  interviewController.getMessages
);

router.post(
  '/:interviewId/send-email',
  interviewValidation.sendEmail,
  interviewController.sendInterviewEmail
);

router.post(
  '/:interviewId/invite-interviewer',
  interviewValidation.inviteInterviewer,
  interviewController.inviteInterviewer
);

// Task Management Features
router.post(
  '/:interviewId/tasks',
  interviewValidation.createTask,
  interviewController.createInterviewTask
);

router.get(
  '/:interviewId/tasks',
  interviewController.getInterviewTasks
);

router.put(
  '/:interviewId/tasks/:taskId',
  interviewValidation.updateTask,
  interviewController.updateInterviewTask
);

router.delete(
  '/:interviewId/tasks/:taskId',
  interviewController.deleteInterviewTask
);

router.post(
  '/:interviewId/tasks/:taskId/complete',
  interviewController.completeInterviewTask
);

// Preparation & Follow-up
router.post(
  '/:interviewId/preparation',
  interviewValidation.updatePreparation,
  interviewController.updatePreparation
);

router.post(
  '/:interviewId/feedback',
  interviewValidation.submitFeedback,
  interviewController.submitFeedback
);

router.post(
  '/:interviewId/follow-up',
  interviewValidation.sendFollowUp,
  interviewController.sendFollowUp
);

// Admin routes (for monitoring)
router.get(
  '/admin/notification-status',
  interviewController.getNotificationStatus
);

export default router;