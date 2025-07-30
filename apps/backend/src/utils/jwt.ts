import * as jwt from 'jsonwebtoken';
import { IUser } from '../models/User';

const ACCESS_TOKEN_SECRET = process.env['JWT_SECRET'] || 'your-access-token-secret';
const REFRESH_TOKEN_SECRET = process.env['JWT_REFRESH_SECRET'] || 'your-refresh-token-secret';
const ACCESS_TOKEN_EXPIRY = process.env['JWT_ACCESS_EXPIRES_IN'] || '15m';
const REFRESH_TOKEN_EXPIRY = process.env['JWT_REFRESH_EXPIRES_IN'] || '7d';

export interface TokenPayload {
  id: string;
  email: string;
}

export const generateAccessToken = (user: IUser): string => {
  return jwt.sign(
    { id: user._id.toString(), email: user.email },
    ACCESS_TOKEN_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
};

export const generateRefreshToken = (user: IUser): string => {
  return jwt.sign(
    { id: user._id.toString(), email: user.email },
    REFRESH_TOKEN_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
};

export const verifyAccessToken = (token: string): TokenPayload => {
  return jwt.verify(token, ACCESS_TOKEN_SECRET) as TokenPayload;
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  return jwt.verify(token, REFRESH_TOKEN_SECRET) as TokenPayload;
};

export const generateTokenPair = (user: IUser) => {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  
  return { accessToken, refreshToken };
};