import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { createError, asyncHandler } from "../middleware/errorHandler";
import { logger } from "../utils/logger";
import { generateToken } from "../utils/jwt";
import { CreateUserData } from "../types";

/**
 * User registration
 */
export const register = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, firstName, lastName, organizationName } = req.body;

  try {
    // Check if user already exists
    // For now, return a placeholder response since userService doesn't exist
    const existingUser = null; // await userService.getUserByEmail(email);
    if (existingUser) {
      throw createError("User already exists", 400, "USER_ALREADY_EXISTS");
    }

    // Create user
    const userData: CreateUserData = {
      email,
      password,
      name: `${firstName || ""} ${lastName || ""}`.trim() || email,
      firstName,
      lastName,
      organizationName,
      subscriptionTier: "free",
      isActive: true,
    };

    // For now, create a mock user since userService doesn't exist
    const user = {
      id: "mock-user-id",
      email: userData.email,
      password: await bcrypt.hash(userData.password, 12),
      name: userData.name,
      firstName: userData.firstName,
      lastName: userData.lastName,
      organizationName: userData.organizationName,
      subscriptionTier: userData.subscriptionTier,
      isActive: userData.isActive,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
    });

    // Set cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        user: userWithoutPassword,
        token,
      },
    });
  } catch (error) {
    logger.error("Registration error:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
});

/**
 * User login
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    // Find user by email
    // For now, return a placeholder response since userService doesn't exist
    const user = {
      id: "mock-user-id",
      email: "user@example.com",
      password: await bcrypt.hash("password", 12), // Mock hashed password
      name: "Mock User",
      firstName: "Mock",
      lastName: "User",
      organizationName: null,
      subscriptionTier: "free" as const,
      isActive: true,
      lastLoginAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (!user) {
      throw createError("Invalid credentials", 401, "INVALID_CREDENTIALS");
    }

    // Check if user is active
    if (user.isActive === false) {
      throw createError("Account is deactivated", 401, "ACCOUNT_DEACTIVATED");
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password || "");
    if (!isValidPassword) {
      throw createError("Invalid credentials", 401, "INVALID_CREDENTIALS");
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
    });

    // Set cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    // Update last login
    // await userService.updateUser(user.id, { lastLoginAt: new Date() });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      message: "Login successful",
      data: {
        user: userWithoutPassword,
        token,
      },
    });
  } catch (error) {
    logger.error("Login error:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
});

/**
 * User logout
 */
export const logout = asyncHandler(async (req: Request, res: Response) => {
  try {
    // Clear cookie
    res.clearCookie("token");

    res.json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    logger.error("Logout error:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
});

/**
 * Refresh token
 */
export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  try {
    // This would validate the refresh token and generate a new access token
    // For now, return a placeholder response
    res.json({
      success: true,
      message: "Token refreshed successfully",
      data: {
        token: "new-refreshed-token",
      },
    });
  } catch (error) {
    logger.error("Token refresh error:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
});

/**
 * Forgot password
 */
export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;

  try {
    // This would send a password reset email
    // For now, return a placeholder response
    res.json({
      success: true,
      message: "Password reset email sent successfully",
      data: {
        email,
        resetToken: "mock-reset-token",
      },
    });
  } catch (error) {
    logger.error("Forgot password error:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
});

/**
 * Reset password
 */
export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { token, newPassword } = req.body;

  try {
    // This would validate the reset token and update the password
    // For now, return a placeholder response
    res.json({
      success: true,
      message: "Password reset successfully",
      data: {
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error("Reset password error:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
});



