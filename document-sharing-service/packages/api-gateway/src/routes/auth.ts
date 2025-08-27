import { Router } from "express";
import { UserModel } from "@document-sharing/core/models/User";
import { logger } from "@document-sharing/core/utils/logger";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const router = Router();

// JWT secret from environment
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || "your-refresh-secret-key";

/**
 * @route POST /api/v1/auth/register
 * @desc Register a new user
 * @access Public
 */
router.post("/register", async (req, res) => {
  try {
    const { email, password, firstName, lastName, organizationId } = req.body;

    // Validate input
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        error: "Missing required fields",
        code: "MISSING_FIELDS",
        required: ["email", "password", "firstName", "lastName"],
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: "Password must be at least 8 characters long",
        code: "PASSWORD_TOO_SHORT",
      });
    }

    // Check if user already exists
    const existingUser = await UserModel.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        error: "User with this email already exists",
        code: "USER_ALREADY_EXISTS",
      });
    }

    // Create user
    const user = await UserModel.create({
      email,
      password,
      firstName,
      lastName,
      organizationId,
      role: "member",
      subscriptionTier: "free",
    });

    // Generate tokens
    const accessToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        organizationId: user.organizationId,
        role: user.role,
        permissions: user.permissions,
        subscriptionTier: user.subscriptionTier,
      },
      JWT_SECRET,
      { expiresIn: "15m" }
    );

    const refreshToken = jwt.sign({ userId: user.id }, JWT_REFRESH_SECRET, {
      expiresIn: "7d",
    });

    // Remove sensitive data from response
    const { passwordHash, ...userResponse } = user;

    logger.info("User registered successfully", {
      userId: user.id,
      email: user.email,
    });

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        user: userResponse,
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    logger.error("Registration error:", error);
    res.status(500).json({
      error: "Registration failed",
      code: "REGISTRATION_ERROR",
    });
  }
});

/**
 * @route POST /api/v1/auth/login
 * @desc Login user
 * @access Public
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required",
        code: "MISSING_CREDENTIALS",
      });
    }

    // Find user
    const user = await UserModel.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        error: "Invalid credentials",
        code: "INVALID_CREDENTIALS",
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({
        error: "Invalid credentials",
        code: "INVALID_CREDENTIALS",
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        error: "Account is deactivated",
        code: "ACCOUNT_DEACTIVATED",
      });
    }

    // Update last login
    await UserModel.updateLastLogin(user.id);

    // Generate tokens
    const accessToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        organizationId: user.organizationId,
        role: user.role,
        permissions: user.permissions,
        subscriptionTier: user.subscriptionTier,
      },
      JWT_SECRET,
      { expiresIn: "15m" }
    );

    const refreshToken = jwt.sign({ userId: user.id }, JWT_REFRESH_SECRET, {
      expiresIn: "7d",
    });

    // Remove sensitive data from response
    const { passwordHash, ...userResponse } = user;

    logger.info("User logged in successfully", {
      userId: user.id,
      email: user.email,
    });

    res.json({
      success: true,
      message: "Login successful",
      data: {
        user: userResponse,
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    logger.error("Login error:", error);
    res.status(500).json({
      error: "Login failed",
      code: "LOGIN_ERROR",
    });
  }
});

/**
 * @route POST /api/v1/auth/refresh
 * @desc Refresh access token
 * @access Public
 */
router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: "Refresh token is required",
        code: "MISSING_REFRESH_TOKEN",
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as {
      userId: string;
    };

    // Get user
    const user = await UserModel.findById(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({
        error: "Invalid refresh token",
        code: "INVALID_REFRESH_TOKEN",
      });
    }

    // Generate new access token
    const newAccessToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        organizationId: user.organizationId,
        role: user.role,
        permissions: user.permissions,
        subscriptionTier: user.subscriptionTier,
      },
      JWT_SECRET,
      { expiresIn: "15m" }
    );

    logger.info("Token refreshed successfully", { userId: user.id });

    res.json({
      success: true,
      message: "Token refreshed successfully",
      data: {
        accessToken: newAccessToken,
      },
    });
  } catch (error) {
    logger.error("Token refresh error:", error);
    res.status(401).json({
      error: "Invalid refresh token",
      code: "INVALID_REFRESH_TOKEN",
    });
  }
});

/**
 * @route POST /api/v1/auth/logout
 * @desc Logout user
 * @access Public
 */
router.post("/logout", async (req, res) => {
  try {
    // In a real application, you might want to blacklist the refresh token
    // For now, we'll just return a success response
    logger.info("User logged out");

    res.json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    logger.error("Logout error:", error);
    res.status(500).json({
      error: "Logout failed",
      code: "LOGOUT_ERROR",
    });
  }
});

/**
 * @route GET /api/v1/auth/me
 * @desc Get current user profile
 * @access Private
 */
router.get("/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Authorization header required",
        code: "AUTHORIZATION_HEADER_MISSING",
      });
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;

      // Get user with organization details
      const user = await UserModel.findByIdWithOrganization(decoded.userId);
      if (!user) {
        return res.status(404).json({
          error: "User not found",
          code: "USER_NOT_FOUND",
        });
      }

      // Remove sensitive data
      const { passwordHash, ...userResponse } = user;

      res.json({
        success: true,
        data: {
          user: userResponse,
        },
      });
    } catch (jwtError) {
      return res.status(401).json({
        error: "Invalid or expired token",
        code: "INVALID_TOKEN",
      });
    }
  } catch (error) {
    logger.error("Get profile error:", error);
    res.status(500).json({
      error: "Failed to get profile",
      code: "PROFILE_ERROR",
    });
  }
});

/**
 * @route POST /api/v1/auth/change-password
 * @desc Change user password
 * @access Private
 */
router.post("/change-password", async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Authorization header required",
        code: "AUTHORIZATION_HEADER_MISSING",
      });
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;

      // Validate input
      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          error: "Current password and new password are required",
          code: "MISSING_PASSWORDS",
        });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({
          error: "New password must be at least 8 characters long",
          code: "PASSWORD_TOO_SHORT",
        });
      }

      // Verify current password
      const isValidPassword = await UserModel.verifyPassword(
        decoded.userId,
        currentPassword
      );
      if (!isValidPassword) {
        return res.status(401).json({
          error: "Current password is incorrect",
          code: "INCORRECT_CURRENT_PASSWORD",
        });
      }

      // Change password
      const success = await UserModel.changePassword(
        decoded.userId,
        newPassword
      );
      if (!success) {
        return res.status(500).json({
          error: "Failed to change password",
          code: "PASSWORD_CHANGE_FAILED",
        });
      }

      logger.info("Password changed successfully", { userId: decoded.userId });

      res.json({
        success: true,
        message: "Password changed successfully",
      });
    } catch (jwtError) {
      return res.status(401).json({
        error: "Invalid or expired token",
        code: "INVALID_TOKEN",
      });
    }
  } catch (error) {
    logger.error("Change password error:", error);
    res.status(500).json({
      error: "Failed to change password",
      code: "PASSWORD_CHANGE_ERROR",
    });
  }
});

export default router;
