import Redis from 'ioredis';
import crypto from 'crypto';

interface OTPData {
  otp: string;
  email: string;
  purpose: 'registration' | 'login' | 'password_reset';
  attempts: number;
  maxAttempts: number;
  ipAddress?: string;
  userAgent?: string;
  userData?: any; // Store user data temporarily for registration
}

class OTPService {
  private redis: Redis;
  private readonly OTP_EXPIRY = 10 * 60; // 10 minutes in seconds
  private readonly MAX_ATTEMPTS = 3;
  private readonly RESEND_COOLDOWN = 2 * 60; // 2 minutes in seconds

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    });

    this.redis.on('connect', () => {
      console.log('✅ Redis connected for OTP service');
    });

    this.redis.on('error', (error) => {
      console.error('❌ Redis connection error:', error);
    });
  }

  /**
   * Generate a secure 6-digit OTP
   */
  private generateOTP(): string {
    return crypto.randomInt(100000, 999999).toString();
  }

  /**
   * Get Redis key for OTP data
   */
  private getOTPKey(email: string, purpose: string): string {
    return `otp:${purpose}:${email.toLowerCase()}`;
  }

  /**
   * Get Redis key for resend cooldown
   */
  private getCooldownKey(email: string, purpose: string): string {
    return `otp_cooldown:${purpose}:${email.toLowerCase()}`;
  }

  /**
   * Create and store OTP for email verification
   */
  async createOTP(
    email: string,
    purpose: 'registration' | 'login' | 'password_reset',
    ipAddress?: string,
    userAgent?: string,
    userData?: any
  ): Promise<{ otp: string; expiresIn: number }> {
    const normalizedEmail = email.toLowerCase().trim();
    const otpKey = this.getOTPKey(normalizedEmail, purpose);
    const cooldownKey = this.getCooldownKey(normalizedEmail, purpose);

    // Check for resend cooldown
    const inCooldown = await this.redis.exists(cooldownKey);
    if (inCooldown) {
      const ttl = await this.redis.ttl(cooldownKey);
      throw new Error(`Please wait ${Math.ceil(ttl / 60)} minutes before requesting another code`);
    }

    // Generate new OTP
    const otp = this.generateOTP();
    
    // Store OTP data
    const otpData: OTPData = {
      otp,
      email: normalizedEmail,
      purpose,
      attempts: 0,
      maxAttempts: this.MAX_ATTEMPTS,
      ipAddress,
      userAgent,
      userData // Store user registration data temporarily
    };

    // Store in Redis with expiry
    await this.redis.setex(otpKey, this.OTP_EXPIRY, JSON.stringify(otpData));
    
    // Set resend cooldown
    await this.redis.setex(cooldownKey, this.RESEND_COOLDOWN, '1');

    console.log(`📧 OTP created for ${normalizedEmail}:`, {
      purpose,
      otp, // Remove in production
      expiresIn: this.OTP_EXPIRY
    });

    return {
      otp,
      expiresIn: this.OTP_EXPIRY
    };
  }

  /**
   * Verify OTP code
   */
  async verifyOTP(
    email: string,
    otp: string,
    purpose: 'registration' | 'login' | 'password_reset'
  ): Promise<{ success: boolean; userData?: any; attemptsLeft?: number }> {
    const normalizedEmail = email.toLowerCase().trim();
    const otpKey = this.getOTPKey(normalizedEmail, purpose);

    // Get OTP data
    const otpDataStr = await this.redis.get(otpKey);
    if (!otpDataStr) {
      throw new Error('Invalid or expired verification code');
    }

    const otpData: OTPData = JSON.parse(otpDataStr);

    // Check if max attempts exceeded
    if (otpData.attempts >= otpData.maxAttempts) {
      await this.redis.del(otpKey); // Clean up
      throw new Error('Maximum verification attempts exceeded. Please request a new code.');
    }

    // Increment attempts
    otpData.attempts += 1;
    await this.redis.setex(otpKey, await this.redis.ttl(otpKey), JSON.stringify(otpData));

    // Verify OTP
    if (otpData.otp !== otp) {
      const attemptsLeft = otpData.maxAttempts - otpData.attempts;
      
      if (attemptsLeft <= 0) {
        await this.redis.del(otpKey); // Clean up after final failed attempt
        throw new Error('Maximum verification attempts exceeded. Please request a new code.');
      }
      
      return {
        success: false,
        attemptsLeft
      };
    }

    // OTP is correct - clean up and return success
    await this.redis.del(otpKey);
    
    console.log(`✅ OTP verified successfully for ${normalizedEmail}`);
    
    return {
      success: true,
      userData: otpData.userData
    };
  }

  /**
   * Check if email has pending OTP
   */
  async hasPendingOTP(email: string, purpose: string): Promise<boolean> {
    const normalizedEmail = email.toLowerCase().trim();
    const otpKey = this.getOTPKey(normalizedEmail, purpose);
    return await this.redis.exists(otpKey) === 1;
  }

  /**
   * Get remaining time for resend cooldown
   */
  async getResendCooldown(email: string, purpose: string): Promise<number> {
    const normalizedEmail = email.toLowerCase().trim();
    const cooldownKey = this.getCooldownKey(normalizedEmail, purpose);
    const ttl = await this.redis.ttl(cooldownKey);
    return Math.max(0, ttl);
  }

  /**
   * Clean up expired OTPs (called by cron job)
   */
  async cleanup(): Promise<void> {
    // Redis TTL handles this automatically, but we can add manual cleanup if needed
    console.log('🧹 OTP cleanup completed (Redis TTL handles expiry)');
  }
}

export const otpService = new OTPService();