import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { User } from '../models/User';

import mongoose from 'mongoose';

export interface SecurityEvent {
  id: string;
  userId: string;
  type: 'login' | 'logout' | 'password_change' | 'profile_update' | 'suspicious_activity' | 'failed_login';
  details: {
    ip: string;
    userAgent: string;
    location?: string;
    success: boolean;
    reason?: string;
  };
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface SecuritySettings {
  twoFactorEnabled: boolean;
  passwordExpiry: Date;
  trustedDevices: {
    deviceId: string;
    name: string;
    lastUsed: Date;
    trusted: boolean;
  }[];
  loginNotifications: boolean;
  suspiciousActivityAlerts: boolean;
  dataExportRequests: {
    id: string;
    requestedAt: Date;
    status: 'pending' | 'processing' | 'completed' | 'expired';
    expiresAt: Date;
  }[];
}

class SecurityService {
  private securityEvents: Map<string, SecurityEvent[]> = new Map();
  private failedLoginAttempts: Map<string, { count: number; lastAttempt: Date }> = new Map();
  private suspiciousIPs: Set<string> = new Set();

  async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  async generateSecureToken(length: number = 32): Promise<string> {
    return crypto.randomBytes(length).toString('hex');
  }

  async generateTwoFactorSecret(userEmail: string): Promise<{
    secret: string;
    qrCodeUrl: string;
    backupCodes: string[];
  }> {
    const secret = speakeasy.generateSecret({
      name: userEmail,
      issuer: 'AI Job Suite',
      length: 32
    });

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

    // Generate backup codes
    const backupCodes = [];
    for (let i = 0; i < 10; i++) {
      backupCodes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }

    return {
      secret: secret.base32!,
      qrCodeUrl,
      backupCodes
    };
  }

  async verifyTwoFactorToken(secret: string, token: string): Promise<boolean> {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 1 // Allow 1 step tolerance
    });
  }

  async enableTwoFactor(userId: string, token: string): Promise<{
    success: boolean;
    backupCodes?: string[];
    message: string;
  }> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return { success: false, message: 'User not found' };
      }

      if (!user.twoFactorSecret) {
        return { success: false, message: 'Two-factor secret not found. Please generate a new secret.' };
      }

      const isValid = await this.verifyTwoFactorToken(user.twoFactorSecret, token);
      if (!isValid) {
        return { success: false, message: 'Invalid verification code' };
      }

      // Enable 2FA and generate backup codes
      const backupCodes = [];
      for (let i = 0; i < 10; i++) {
        backupCodes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
      }

      user.twoFactorEnabled = true;
      user.twoFactorBackupCodes = backupCodes.map(code => bcrypt.hashSync(code, 10));
      await user.save();

      await this.logSecurityEvent(userId, 'profile_update', {
        ip: '',
        userAgent: '',
        success: true,
        reason: 'Two-factor authentication enabled'
      }, 'medium');

      return {
        success: true,
        backupCodes,
        message: 'Two-factor authentication enabled successfully'
      };
    } catch (error) {
      return { success: false, message: 'Failed to enable two-factor authentication' };
    }
  }

  async disableTwoFactor(userId: string, password: string, token?: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return { success: false, message: 'User not found' };
      }

      // Verify password
      const isPasswordValid = await this.verifyPassword(password, user.password);
      if (!isPasswordValid) {
        return { success: false, message: 'Invalid password' };
      }

      // If 2FA is enabled, require token verification
      if (user.twoFactorEnabled) {
        if (!token) {
          return { success: false, message: 'Two-factor authentication code required' };
        }

        const isValidToken = await this.verifyTwoFactorToken(user.twoFactorSecret!, token);
        const isValidBackupCode = await this.verifyBackupCode(user, token);

        if (!isValidToken && !isValidBackupCode) {
          return { success: false, message: 'Invalid verification code' };
        }
      }

      // Disable 2FA
      user.twoFactorEnabled = false;
      user.twoFactorSecret = undefined;
      user.twoFactorBackupCodes = [];
      await user.save();

      await this.logSecurityEvent(userId, 'profile_update', {
        ip: '',
        userAgent: '',
        success: true,
        reason: 'Two-factor authentication disabled'
      }, 'medium');

      return {
        success: true,
        message: 'Two-factor authentication disabled successfully'
      };
    } catch (error) {
      return { success: false, message: 'Failed to disable two-factor authentication' };
    }
  }

  async verifyBackupCode(user: any, code: string): Promise<boolean> {
    for (const hashedCode of user.twoFactorBackupCodes || []) {
      if (bcrypt.compareSync(code, hashedCode)) {
        // Remove used backup code
        user.twoFactorBackupCodes = user.twoFactorBackupCodes.filter(
          (c: string) => c !== hashedCode
        );
        await user.save();
        return true;
      }
    }
    return false;
  }

  async logSecurityEvent(
    userId: string,
    type: SecurityEvent['type'],
    details: SecurityEvent['details'],
    severity: SecurityEvent['severity'] = 'low'
  ): Promise<void> {
    const event: SecurityEvent = {
      id: crypto.randomUUID(),
      userId,
      type,
      details,
      timestamp: new Date(),
      severity
    };

    const userEvents = this.securityEvents.get(userId) || [];
    userEvents.push(event);
    
    // Keep only last 100 events per user
    if (userEvents.length > 100) {
      userEvents.shift();
    }
    
    this.securityEvents.set(userId, userEvents);

    // Log to console or external service
    console.log('Security Event:', event);

    // Trigger alerts for high severity events
    if (severity === 'high' || severity === 'critical') {
      await this.triggerSecurityAlert(userId, event);
    }
  }

  async getSecurityEvents(
    userId: string,
    limit: number = 50
  ): Promise<SecurityEvent[]> {
    const events = this.securityEvents.get(userId) || [];
    return events.slice(-limit).reverse(); // Most recent first
  }

  async detectSuspiciousActivity(
    userId: string,
    ip: string,
    userAgent: string
  ): Promise<{
    isSuspicious: boolean;
    reason?: string;
    severity: SecurityEvent['severity'];
  }> {
    const user = await User.findById(userId);
    if (!user) {
      return { isSuspicious: false, severity: 'low' };
    }

    const recentEvents = this.securityEvents.get(userId) || [];
    const lastHour = new Date(Date.now() - 60 * 60 * 1000);
    const recentActivity = recentEvents.filter(event => event.timestamp > lastHour);

    // Check for multiple failed login attempts
    const failedLogins = recentActivity.filter(
      event => event.type === 'failed_login'
    );
    if (failedLogins.length >= 5) {
      return {
        isSuspicious: true,
        reason: 'Multiple failed login attempts',
        severity: 'high'
      };
    }

    // Check for login from suspicious IP
    if (this.suspiciousIPs.has(ip)) {
      return {
        isSuspicious: true,
        reason: 'Login from known suspicious IP',
        severity: 'high'
      };
    }

    // Check for unusual login patterns
    const loginEvents = recentEvents.filter(
      event => event.type === 'login' && event.details.success
    );
    
    const uniqueIPs = new Set(loginEvents.map(event => event.details.ip));
    if (uniqueIPs.size > 3) {
      return {
        isSuspicious: true,
        reason: 'Multiple IP addresses used recently',
        severity: 'medium'
      };
    }

    // Check for unusual user agent patterns
    const userAgents = loginEvents.map(event => event.details.userAgent);
    const uniqueUserAgents = new Set(userAgents);
    if (uniqueUserAgents.size > 2 && loginEvents.length > 2) {
      return {
        isSuspicious: true,
        reason: 'Multiple devices/browsers used recently',
        severity: 'medium'
      };
    }

    return { isSuspicious: false, severity: 'low' };
  }

  async trackFailedLogin(identifier: string): Promise<boolean> {
    const attempts = this.failedLoginAttempts.get(identifier) || { count: 0, lastAttempt: new Date() };
    const now = new Date();
    
    // Reset counter if last attempt was more than 15 minutes ago
    if (now.getTime() - attempts.lastAttempt.getTime() > 15 * 60 * 1000) {
      attempts.count = 0;
    }

    attempts.count++;
    attempts.lastAttempt = now;
    this.failedLoginAttempts.set(identifier, attempts);

    // Lock account after 5 failed attempts
    return attempts.count >= 5;
  }

  async isAccountLocked(identifier: string): Promise<boolean> {
    const attempts = this.failedLoginAttempts.get(identifier);
    if (!attempts) return false;

    const lockDuration = 15 * 60 * 1000; // 15 minutes
    const timeSinceLastAttempt = Date.now() - attempts.lastAttempt.getTime();

    return attempts.count >= 5 && timeSinceLastAttempt < lockDuration;
  }

  async resetFailedLoginAttempts(identifier: string): Promise<void> {
    this.failedLoginAttempts.delete(identifier);
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return { success: false, message: 'User not found' };
      }

      // Verify current password
      const isCurrentPasswordValid = await this.verifyPassword(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return { success: false, message: 'Current password is incorrect' };
      }

      // Check if new password is different from current
      const isSamePassword = await this.verifyPassword(newPassword, user.password);
      if (isSamePassword) {
        return { success: false, message: 'New password must be different from current password' };
      }

      // Hash and save new password
      user.password = await this.hashPassword(newPassword);
      user.passwordChangedAt = new Date();
      await user.save();

      await this.logSecurityEvent(userId, 'password_change', {
        ip: '',
        userAgent: '',
        success: true
      }, 'medium');

      return { success: true, message: 'Password changed successfully' };
    } catch (error) {
      return { success: false, message: 'Failed to change password' };
    }
  }

  async generatePasswordResetToken(email: string): Promise<{
    success: boolean;
    message: string;
    token?: string;
  }> {
    try {
      const user = await User.findOne({ email });
      if (!user) {
        // Don't reveal if email exists
        return { success: true, message: 'If the email exists, a reset link will be sent' };
      }

      const token = await this.generateSecureToken(32);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      user.passwordResetToken = token;
      user.passwordResetExpires = expiresAt;
      await user.save();

      return {
        success: true,
        message: 'Password reset token generated',
        token
      };
    } catch (error) {
      return { success: false, message: 'Failed to generate password reset token' };
    }
  }

  async resetPassword(
    token: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const user = await User.findOne({
        passwordResetToken: token,
        passwordResetExpires: { $gt: new Date() }
      });

      if (!user) {
        return { success: false, message: 'Invalid or expired reset token' };
      }

      // Hash and save new password
      user.password = await this.hashPassword(newPassword);
      user.passwordChangedAt = new Date();
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();

      await this.logSecurityEvent(user._id.toString(), 'password_change', {
        ip: '',
        userAgent: '',
        success: true,
        reason: 'Password reset'
      }, 'medium');

      return { success: true, message: 'Password reset successfully' };
    } catch (error) {
      return { success: false, message: 'Failed to reset password' };
    }
  }

  async requestDataExport(userId: string): Promise<{
    success: boolean;
    message: string;
    requestId?: string;
  }> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return { success: false, message: 'User not found' };
      }

      const requestId = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      // In production, store this in database
      // For now, just log the request
      await this.logSecurityEvent(userId, 'profile_update', {
        ip: '',
        userAgent: '',
        success: true,
        reason: `Data export requested - ID: ${requestId}`
      }, 'low');

      return {
        success: true,
        message: 'Data export request submitted. You will receive an email when ready.',
        requestId
      };
    } catch (error) {
      return { success: false, message: 'Failed to request data export' };
    }
  }

  async deleteAccount(
    userId: string,
    password: string,
    confirmationText: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      if (confirmationText !== 'DELETE MY ACCOUNT') {
        return { success: false, message: 'Confirmation text does not match' };
      }

      const user = await User.findById(userId);
      if (!user) {
        return { success: false, message: 'User not found' };
      }

      // Verify password
      const isPasswordValid = await this.verifyPassword(password, user.password);
      if (!isPasswordValid) {
        return { success: false, message: 'Invalid password' };
      }

      // Log the deletion
      await this.logSecurityEvent(userId, 'profile_update', {
        ip: '',
        userAgent: '',
        success: true,
        reason: 'Account deletion requested'
      }, 'high');

      // In production, you might want to soft delete or anonymize data
      await UserProfile.deleteOne({ userId: new mongoose.Types.ObjectId(userId) });
      await User.findByIdAndDelete(userId);

      return { success: true, message: 'Account deleted successfully' };
    } catch (error) {
      return { success: false, message: 'Failed to delete account' };
    }
  }

  private async triggerSecurityAlert(userId: string, event: SecurityEvent): Promise<void> {
    // In production, this would send notifications via email, SMS, or push notifications
    console.log(`SECURITY ALERT for user ${userId}:`, event);
    
    // Example: Send email notification
    // await emailService.sendSecurityAlert(userId, event);
    
    // Example: Send to security monitoring system
    // await securityMonitoring.alert(event);
  }

  async getSecuritySettings(userId: string): Promise<SecuritySettings | null> {
    try {
      const user = await User.findById(userId).select('twoFactorEnabled passwordChangedAt');
      if (!user) return null;

      // In production, these would be stored in database
      return {
        twoFactorEnabled: user.twoFactorEnabled || false,
        passwordExpiry: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
        trustedDevices: [],
        loginNotifications: true,
        suspiciousActivityAlerts: true,
        dataExportRequests: []
      };
    } catch (error) {
      return null;
    }
  }

  async updateSecuritySettings(
    userId: string,
    settings: Partial<SecuritySettings>
  ): Promise<{ success: boolean; message: string }> {
    try {
      // In production, save settings to database
      console.log(`Updating security settings for user ${userId}:`, settings);

      await this.logSecurityEvent(userId, 'profile_update', {
        ip: '',
        userAgent: '',
        success: true,
        reason: 'Security settings updated'
      }, 'low');

      return { success: true, message: 'Security settings updated successfully' };
    } catch (error) {
      return { success: false, message: 'Failed to update security settings' };
    }
  }

  // Payment fraud detection
  async detectPaymentFraud(data: {
    userId: string;
    amount: number;
    currency: string;
    planType: string;
    location?: any;
    ip: string;
    userAgent: string;
  }): Promise<{ shouldBlock: boolean; riskScore: number; reasons: string[] }> {
    const reasons: string[] = [];
    let riskScore = 0;

    // Check for suspicious amounts
    if (data.amount > 1000) {
      riskScore += 30;
      reasons.push('High payment amount');
    }

    // Check for suspicious locations
    if (data.location && !data.location.isAfricanCountry && data.amount < 50) {
      riskScore += 20;
      reasons.push('Unusual location/price combination');
    }

    // Check for multiple attempts (placeholder)
    // In production, check database for recent payment attempts
    
    return {
      shouldBlock: riskScore > 70,
      riskScore,
      reasons
    };
  }
}

export const securityService = new SecurityService();