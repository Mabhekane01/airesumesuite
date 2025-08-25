import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import { UserSession } from '../models/UserSession';

export const updateSessionActivity = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (req.user && req.user.sessionId) {
    try {
      await UserSession.findOneAndUpdate(
        { sessionId: req.user.sessionId, isActive: true },
        { lastActivity: new Date() }
      );
    } catch (error) {
      console.error('Error updating session activity:', error);
    }
  }
  next();
};