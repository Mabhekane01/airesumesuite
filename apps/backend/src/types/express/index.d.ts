// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { RateLimit } from 'express-rate-limit';

declare global {
  namespace Express {
    export interface Request {
      user?: {
        id: string;
        email: string;
        tier?: string;
      };
      rateLimit?: RateLimit;
      requestId?: string;
      apiKey?: {
        key: string;
        type: string;
      };
      session?: {
        csrfToken?: string;
        [key: string]: any;
      };
    }
  }
}
