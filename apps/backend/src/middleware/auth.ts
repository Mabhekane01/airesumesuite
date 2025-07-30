import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { User } from '../models/User';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

export const authMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Access token required' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);
    
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = {
      id: (user as any)._id.toString(),
      email: user.email
    };
    
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid access token' });
  }
};

// Permission middleware for enterprise features
export const requirePermissions = (...permissions: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // For now, just check if user is authenticated
    // In a real implementation, you would check actual permissions
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // TODO: Implement actual permission checking logic here
    // For now, allow all authenticated users
    return next();
  };
};

export { authMiddleware as authenticateToken };