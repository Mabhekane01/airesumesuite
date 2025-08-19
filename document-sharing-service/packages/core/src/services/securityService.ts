import { logger, logSecurity } from '../utils/logger';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

export class SecurityService {
  private jwtSecret: string;
  private encryptionKey: string;
  private saltRounds: number;
  
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
    this.encryptionKey = process.env.ENCRYPTION_KEY || 'your-encryption-key-change-in-production';
    this.saltRounds = parseInt(process.env.SALT_ROUNDS || '12');
  }
  
  // Calculate file checksum
  async calculateChecksum(buffer: Buffer): Promise<string> {
    try {
      return crypto.createHash('sha256').update(buffer).digest('hex');
    } catch (error) {
      logger.error('Failed to calculate checksum:', error);
      throw new Error('Failed to calculate checksum');
    }
  }
  
  // Hash password
  async hashPassword(password: string): Promise<string> {
    try {
      return await bcrypt.hash(password, this.saltRounds);
    } catch (error) {
      logger.error('Failed to hash password:', error);
      throw new Error('Failed to hash password');
    }
  }
  
  // Compare password with hash
  async comparePassword(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      logger.error('Failed to compare password:', error);
      return false;
    }
  }
  
  // Generate JWT token
  generateJWT(payload: any, expiresIn: string = '24h'): string {
    try {
      return jwt.sign(payload, this.jwtSecret, { expiresIn });
    } catch (error) {
      logger.error('Failed to generate JWT:', error);
      throw new Error('Failed to generate JWT');
    }
  }
  
  // Verify JWT token
  verifyJWT(token: string): any {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      logger.warn('JWT verification failed:', error);
      return null;
    }
  }
  
  // Generate secure random string
  generateSecureString(length: number = 32): string {
    try {
      return crypto.randomBytes(length).toString('hex');
    } catch (error) {
      logger.error('Failed to generate secure string:', error);
      throw new Error('Failed to generate secure string');
    }
  }
  
  // Encrypt sensitive data
  encryptData(data: string): string {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
      
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
      logger.error('Failed to encrypt data:', error);
      throw new Error('Failed to encrypt data');
    }
  }
  
  // Decrypt sensitive data
  decryptData(encryptedData: string): string {
    try {
      const parts = encryptedData.split(':');
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      
      const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      logger.error('Failed to decrypt data:', error);
      throw new Error('Failed to decrypt data');
    }
  }
  
  // Generate secure file access token
  generateFileAccessToken(filePath: string, userId: string, expiresIn: number = 3600): string {
    try {
      const payload = {
        filePath,
        userId,
        expiresAt: Date.now() + (expiresIn * 1000),
        nonce: uuidv4(),
        type: 'file-access'
      };
      
      return this.encryptData(JSON.stringify(payload));
    } catch (error) {
      logger.error('Failed to generate file access token:', error);
      throw new Error('Failed to generate file access token');
    }
  }
  
  // Validate file access token
  validateFileAccessToken(token: string, filePath: string, userId: string): boolean {
    try {
      const decrypted = this.decryptData(token);
      const payload = JSON.parse(decrypted);
      
      if (payload.type !== 'file-access') {
        return false;
      }
      
      if (payload.filePath !== filePath) {
        return false;
      }
      
      if (payload.userId !== userId) {
        return false;
      }
      
      if (payload.expiresAt < Date.now()) {
        return false;
      }
      
      return true;
    } catch (error) {
      logger.warn('File access token validation failed:', error);
      return false;
    }
  }
  
  // Sanitize filename for security
  sanitizeFilename(filename: string): string {
    try {
      // Remove or replace potentially dangerous characters
      return filename
        .replace(/[<>:"/\\|?*]/g, '_')
        .replace(/\.\./g, '_')
        .replace(/^\./, '_')
        .replace(/\.$/, '_')
        .substring(0, 255); // Limit length
    } catch (error) {
      logger.error('Failed to sanitize filename:', error);
      return `file_${Date.now()}`;
    }
  }
  
  // Validate file type by content
  validateFileTypeByContent(buffer: Buffer, expectedMimeType: string): boolean {
    try {
      // Check file signature (magic bytes)
      const signatures: Record<string, number[][]> = {
        'application/pdf': [[0x25, 0x50, 0x44, 0x46]],
        'image/jpeg': [[0xFF, 0xD8, 0xFF]],
        'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
        'image/gif': [[0x47, 0x49, 0x46, 0x38]],
        'application/msword': [[0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]],
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
          [0x50, 0x4B, 0x03, 0x04],
          [0x50, 0x4B, 0x05, 0x06],
          [0x50, 0x4B, 0x07, 0x08]
        ]
      };
      
      const expectedSignatures = signatures[expectedMimeType];
      if (!expectedSignatures) {
        return true; // No signature defined for this type
      }
      
      return expectedSignatures.some(signature => {
        if (buffer.length < signature.length) return false;
        return signature.every((byte, index) => buffer[index] === byte);
      });
    } catch (error) {
      logger.error('Failed to validate file type by content:', error);
      return false;
    }
  }
  
  // Rate limiting check
  async checkRateLimit(key: string, limit: number, windowMs: number): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
  }> {
    try {
      // This would integrate with Redis for distributed rate limiting
      // For now, return a simple implementation
      const now = Date.now();
      const windowStart = Math.floor(now / windowMs) * windowMs;
      
      // In production, this would check Redis for actual rate limit data
      return {
        allowed: true,
        remaining: limit,
        resetTime: windowStart + windowMs
      };
    } catch (error) {
      logger.error('Rate limit check failed:', error);
      // Fail open - allow request if rate limiting fails
      return {
        allowed: true,
        remaining: 1,
        resetTime: Date.now() + 60000
      };
    }
  }
  
  // Log security event
  logSecurityEvent(event: string, details: any, severity: 'low' | 'medium' | 'high' = 'medium'): void {
    try {
      logSecurity(event, {
        ...details,
        severity,
        timestamp: new Date().toISOString(),
        requestId: uuidv4()
      });
      
      // In production, this could trigger alerts for high-severity events
      if (severity === 'high') {
        // Send alert to security team
        logger.error('HIGH SECURITY ALERT:', { event, details });
      }
    } catch (error) {
      logger.error('Failed to log security event:', error);
    }
  }
  
  // Validate API key
  validateApiKey(apiKey: string, allowedKeys: string[]): boolean {
    try {
      if (!apiKey || !allowedKeys.includes(apiKey)) {
        this.logSecurityEvent('invalid_api_key', { apiKey: apiKey?.substring(0, 8) + '...' }, 'medium');
        return false;
      }
      
      return true;
    } catch (error) {
      logger.error('API key validation failed:', error);
      return false;
    }
  }
  
  // Generate secure download URL
  generateSecureDownloadUrl(filePath: string, userId: string, expiresIn: number = 3600): string {
    try {
      const token = this.generateFileAccessToken(filePath, userId, expiresIn);
      const baseUrl = process.env.BASE_URL || 'http://localhost:4000';
      
      return `${baseUrl}/secure-download?token=${encodeURIComponent(token)}`;
    } catch (error) {
      logger.error('Failed to generate secure download URL:', error);
      throw new Error('Failed to generate secure download URL');
    }
  }
  
  // Validate IP address
  validateIPAddress(ip: string): boolean {
    try {
      // Basic IP validation
      const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
      return ipRegex.test(ip);
    } catch (error) {
      logger.error('IP validation failed:', error);
      return false;
    }
  }
  
  // Check if IP is in whitelist
  isIPWhitelisted(ip: string, whitelist: string[]): boolean {
    try {
      return whitelist.some(allowedIP => {
        if (allowedIP.includes('/')) {
          // CIDR notation
          return this.isIPInCIDR(ip, allowedIP);
        } else {
          // Exact IP match
          return ip === allowedIP;
        }
      });
    } catch (error) {
      logger.error('IP whitelist check failed:', error);
      return false;
    }
  }
  
  // Check if IP is in CIDR range
  private isIPInCIDR(ip: string, cidr: string): boolean {
    try {
      const [network, bits] = cidr.split('/');
      const mask = parseInt(bits);
      
      const ipNum = this.ipToNumber(ip);
      const networkNum = this.ipToNumber(network);
      const maskNum = Math.pow(2, 32 - mask) - 1;
      
      return (ipNum & ~maskNum) === (networkNum & ~maskNum);
    } catch (error) {
      return false;
    }
  }
  
  // Convert IP to number
  private ipToNumber(ip: string): number {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
  }
}





