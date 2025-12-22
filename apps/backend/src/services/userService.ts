import { User } from '../models/User';
import { logger } from '../utils/logger';

class UserService {
  async getUserById(userId: string) {
    try {
      const user = await User.findById(userId);
      return user;
    } catch (error) {
      logger.error('Failed to get user by ID', { userId, error });
      return null;
    }
  }

  async getUserByEmail(email: string) {
    try {
      const user = await User.findOne({ email: email.toLowerCase() });
      return user;
    } catch (error) {
      logger.error('Failed to get user by email', { email, error });
      return null;
    }
  }

  async updateUser(userId: string, updates: any) {
    try {
      const user = await User.findByIdAndUpdate(userId, updates, { new: true });
      return user;
    } catch (error) {
      logger.error('Failed to update user', { userId, error });
      return null;
    }
  }
}

export const userService = new UserService();