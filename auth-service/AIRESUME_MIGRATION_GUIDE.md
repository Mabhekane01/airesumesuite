# Airesume Migration Guide: Using Auth-Service

This guide outlines how to migrate airesume from its current authentication system to use the centralized auth-service.

## Overview

The auth-service now includes all the fields and functionality that airesume needs:

- User authentication (login, register, logout)
- Profile management (technical skills, location, profile data)
- Two-factor authentication
- Password management (change, reset)
- Subscription management
- Organization support
- Session management

## Database Changes

### 1. Remove Airesume User Models

**Remove these files from airesume:**

- `apps/backend/src/models/User.ts`
- `apps/backend/src/models/UserSession.ts`
- `apps/backend/src/controllers/authController.ts`
- `apps/backend/src/controllers/accountController.ts`

### 2. Update Database Schema

**Remove these tables from airesume's MongoDB:**

- `users` collection
- `usersessions` collection

**Note:** The auth-service uses PostgreSQL with all the necessary fields.

## API Integration

### 1. Update Airesume Backend

**Replace authentication endpoints with calls to auth-service:**

```typescript
// Old: Direct database calls
// New: HTTP calls to auth-service

import axios from "axios";

const AUTH_SERVICE_URL =
  process.env.AUTH_SERVICE_URL || "http://localhost:3001";

// Authentication functions
export const authenticateUser = async (token: string) => {
  try {
    const response = await axios.post(
      `${AUTH_SERVICE_URL}/api/v1/services/validate-token`,
      {
        token,
      },
      {
        headers: {
          "X-Service-Key": process.env.INTERNAL_SERVICE_KEY,
        },
      }
    );

    return response.data.data;
  } catch (error) {
    throw new Error("Authentication failed");
  }
};

export const checkUserPermission = async (
  userId: string,
  resource: string,
  action: string
) => {
  try {
    const response = await axios.post(
      `${AUTH_SERVICE_URL}/api/v1/services/check-permission`,
      {
        userId,
        resource,
        action,
      },
      {
        headers: {
          "X-Service-Key": process.env.INTERNAL_SERVICE_KEY,
        },
      }
    );

    return response.data.data;
  } catch (error) {
    throw new Error("Permission check failed");
  }
};

export const trackUserUsage = async (
  userId: string,
  resource: string,
  action: string,
  quantity = 1
) => {
  try {
    await axios.post(
      `${AUTH_SERVICE_URL}/api/v1/services/track-usage`,
      {
        userId,
        resource,
        action,
        quantity,
      },
      {
        headers: {
          "X-Service-Key": process.env.INTERNAL_SERVICE_KEY,
        },
      }
    );
  } catch (error) {
    console.error("Usage tracking failed:", error);
  }
};
```

### 2. Update Middleware

**Replace airesume's auth middleware:**

```typescript
// apps/backend/src/middleware/auth.ts
import { Request, Response, NextFunction } from "express";
import { authenticateUser } from "../services/authService";

export interface AuthenticatedRequest extends Request {
  user?: any;
}

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access token required",
        code: "TOKEN_REQUIRED",
      });
    }

    const token = authHeader.substring(7);

    // Validate token with auth-service
    const userData = await authenticateUser(token);

    if (!userData) {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
        code: "INVALID_TOKEN",
      });
    }

    // Attach user to request
    req.user = userData;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Authentication failed",
      code: "AUTH_FAILED",
    });
  }
};
```

### 3. Update Frontend

**Replace airesume's auth store with auth-service calls:**

```typescript
// apps/frontend/src/stores/authStore.ts
import { create } from "zustand";
import axios from "axios";

const AUTH_SERVICE_URL =
  process.env.REACT_APP_AUTH_SERVICE_URL || "http://localhost:3001";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  provider: "local" | "google";
  isEmailVerified: boolean;
  tier: "free" | "pro" | "enterprise";
  subscriptionStatus?: "active" | "cancelled" | "expired" | "past_due";
  subscriptionEndDate?: string;
  cancelAtPeriodEnd?: boolean;
  subscriptionPlanType?: "monthly" | "yearly";
  profile?: any;
  technicalSkills?: Array<{ name: string; level?: string; years?: number }>;
  lastKnownLocation?: any;
  twoFactorEnabled?: boolean;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  updateProfile: (profileData: any) => Promise<void>;
  updateLocation: (locationData: any) => Promise<void>;
  enable2FA: (secret: string, backupCodes: string[]) => Promise<void>;
  disable2FA: () => Promise<void>;
  changePassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
}

export const useAuthStore = create<AuthState & AuthActions>((set, get) => ({
  user: null,
  accessToken: localStorage.getItem("accessToken"),
  refreshToken: localStorage.getItem("refreshToken"),
  isLoading: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });

    try {
      const response = await axios.post(
        `${AUTH_SERVICE_URL}/api/v1/auth/login`,
        {
          email,
          password,
        }
      );

      const { user, tokens } = response.data.data;

      localStorage.setItem("accessToken", tokens.accessToken);
      localStorage.setItem("refreshToken", tokens.refreshToken);

      set({
        user,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || "Login failed",
        isLoading: false,
      });
      throw error;
    }
  },

  register: async (userData: any) => {
    set({ isLoading: true, error: null });

    try {
      const response = await axios.post(
        `${AUTH_SERVICE_URL}/api/v1/auth/register`,
        userData
      );

      const { user, tokens } = response.data.data;

      localStorage.setItem("accessToken", tokens.accessToken);
      localStorage.setItem("refreshToken", tokens.refreshToken);

      set({
        user,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || "Registration failed",
        isLoading: false,
      });
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    set({ user: null, accessToken: null, refreshToken: null });
  },

  refreshToken: async () => {
    const { refreshToken } = get();

    if (!refreshToken) {
      get().logout();
      return;
    }

    try {
      const response = await axios.post(
        `${AUTH_SERVICE_URL}/api/v1/auth/refresh`,
        {
          refreshToken,
        }
      );

      const { accessToken } = response.data.data;
      localStorage.setItem("accessToken", accessToken);

      set({ accessToken });
    } catch (error) {
      get().logout();
    }
  },

  updateProfile: async (profileData: any) => {
    const { accessToken } = get();

    try {
      const response = await axios.put(
        `${AUTH_SERVICE_URL}/api/v1/auth/profile`,
        profileData,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      const { user } = response.data.data;
      set({ user });
    } catch (error: any) {
      set({ error: error.response?.data?.message || "Profile update failed" });
      throw error;
    }
  },

  updateLocation: async (locationData: any) => {
    const { accessToken } = get();

    try {
      await axios.put(
        `${AUTH_SERVICE_URL}/api/v1/auth/location`,
        locationData,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
    } catch (error: any) {
      set({ error: error.response?.data?.message || "Location update failed" });
      throw error;
    }
  },

  enable2FA: async (secret: string, backupCodes: string[]) => {
    const { accessToken } = get();

    try {
      await axios.post(
        `${AUTH_SERVICE_URL}/api/v1/auth/2fa/enable`,
        {
          secret,
          backupCodes,
        },
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
    } catch (error: any) {
      set({ error: error.response?.data?.message || "2FA enable failed" });
      throw error;
    }
  },

  disable2FA: async () => {
    const { accessToken } = get();

    try {
      await axios.post(
        `${AUTH_SERVICE_URL}/api/v1/auth/2fa/disable`,
        {},
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
    } catch (error: any) {
      set({ error: error.response?.data?.message || "2FA disable failed" });
      throw error;
    }
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    const { accessToken } = get();

    try {
      await axios.put(
        `${AUTH_SERVICE_URL}/api/v1/auth/password`,
        {
          currentPassword,
          newPassword,
        },
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
    } catch (error: any) {
      set({ error: error.response?.data?.message || "Password change failed" });
      throw error;
    }
  },

  requestPasswordReset: async (email: string) => {
    try {
      await axios.post(
        `${AUTH_SERVICE_URL}/api/v1/auth/password/reset-request`,
        {
          email,
        }
      );
    } catch (error: any) {
      set({
        error: error.response?.data?.message || "Password reset request failed",
      });
      throw error;
    }
  },

  resetPassword: async (token: string, newPassword: string) => {
    try {
      await axios.post(`${AUTH_SERVICE_URL}/api/v1/auth/password/reset`, {
        token,
        newPassword,
      });
    } catch (error: any) {
      set({ error: error.response?.data?.message || "Password reset failed" });
      throw error;
    }
  },
}));
```

## Environment Variables

**Add to airesume's environment files:**

```bash
# .env
AUTH_SERVICE_URL=http://localhost:3001
INTERNAL_SERVICE_KEY=your-internal-service-key

# .env.production
AUTH_SERVICE_URL=https://auth.yourdomain.com
INTERNAL_SERVICE_KEY=your-production-internal-service-key
```

## Migration Steps

### Phase 1: Setup

1. Start the auth-service with PostgreSQL
2. Run database migrations
3. Update airesume environment variables

### Phase 2: Backend Migration

1. Remove old auth models and controllers
2. Implement new auth service integration
3. Update middleware
4. Test authentication endpoints

### Phase 3: Frontend Migration

1. Update auth store
2. Update components to use new auth store
3. Test all authentication flows

### Phase 4: Data Migration

1. Export existing user data from airesume
2. Transform data to match auth-service schema
3. Import users into auth-service
4. Verify all users can authenticate

### Phase 5: Testing & Cleanup

1. Test all authentication scenarios
2. Test subscription and permission checks
3. Remove old auth code
4. Update documentation

## Benefits of Migration

1. **Centralized Authentication**: Single source of truth for user data
2. **Consistent Security**: Unified security policies and practices
3. **Scalability**: Better performance and easier scaling
4. **Maintenance**: Single codebase to maintain
5. **Features**: Access to advanced features like 2FA, organizations
6. **Compliance**: Better audit trails and compliance features

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure auth-service allows airesume's domain
2. **Service Key Errors**: Verify INTERNAL_SERVICE_KEY is correct
3. **Database Connection**: Check PostgreSQL connection in auth-service
4. **Token Validation**: Ensure JWT_SECRET is consistent

### Debug Steps

1. Check auth-service logs
2. Verify network connectivity
3. Test auth-service endpoints directly
4. Check environment variables
5. Verify database schema matches

## Support

For issues during migration:

1. Check auth-service logs
2. Verify database connectivity
3. Test individual endpoints
4. Review this migration guide
5. Check auth-service documentation
