import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

export interface JWTPayload {
  userId: string;
  email: string;
  role?: string;
  shareId?: string;
  permissions?: string[];
}

export interface AuthConfig {
  jwtSecret: string;
  jwtExpiresIn: string;
  refreshTokenExpiresIn: string;
  bcryptRounds: number;
}

export class AuthService {
  private config: AuthConfig;

  constructor() {
    this.config = {
      jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
      jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
      refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
      bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12'),
    };
  }

  public generateAccessToken(payload: JWTPayload): string {
    return jwt.sign(payload, this.config.jwtSecret, {
      expiresIn: this.config.jwtExpiresIn,
      issuer: 'document-sharing-service',
      audience: 'document-sharing-api',
    });
  }

  public generateRefreshToken(payload: JWTPayload): string {
    return jwt.sign(payload, this.config.jwtSecret, {
      expiresIn: this.config.refreshTokenExpiresIn,
      issuer: 'document-sharing-service',
      audience: 'document-sharing-api',
    });
  }

  public generateShareToken(shareId: string, expiresIn?: string): string {
    const payload: JWTPayload = {
      userId: 'anonymous',
      email: 'anonymous',
      shareId,
      permissions: ['view'],
    };

    return jwt.sign(payload, this.config.jwtSecret, {
      expiresIn: expiresIn || '30d',
      issuer: 'document-sharing-service',
      audience: 'document-sharing-viewer',
    });
  }

  public verifyToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, this.config.jwtSecret) as JWTPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token has expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      } else {
        throw new Error('Token verification failed');
      }
    }
  }

  public async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.config.bcryptRounds);
  }

  public async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  public generateSecureShareId(): string {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let result = '';
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  public generateAPIKey(): string {
    const prefix = 'ds_';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = prefix;
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}