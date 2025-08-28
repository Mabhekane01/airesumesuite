import { Router } from "express";
import { body } from "express-validator";
import passport from "passport";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

import { query } from "../config/database";
import { logger } from "../utils/logger";
import { authMiddleware } from "../middleware/auth";

const router: Router = Router();

// =============================================================================
// VALIDATION MIDDLEWARE
// =============================================================================

const registerValidation = [
  body("email").isEmail().normalizeEmail(),
  body("password")
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/),
  body("firstName").trim().isLength({ min: 1 }),
  body("lastName").trim().isLength({ min: 1 }),
  body("serviceType")
    .optional()
    .isIn(["ai-resume", "document-service", "both"]),
  body("organizationId").optional().isUUID(),
  body("organizationDomain").optional().isString(),
];

const loginValidation = [
  body("email").isEmail().normalizeEmail(),
  body("password").isLength({ min: 1 }),
];

// =============================================================================
// AUTHENTICATION ROUTES
// =============================================================================

// User registration
router.post("/register", registerValidation, async (req: any, res: any) => {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      serviceType = "ai-resume",
      organizationId,
      organizationDomain,
    } = req.body;

    // Check if user already exists
    const existingUser = await query(
      "SELECT id FROM users WHERE email = $1 AND is_active = true",
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists",
        code: "USER_EXISTS",
      });
    }

    // Handle organization
    let finalOrganizationId = null;

    if (organizationId) {
      // Check if organization exists and user has permission to join
      const orgCheck = await query(
        "SELECT id, max_users FROM organizations WHERE id = $1 AND is_active = true",
        [organizationId]
      );

      if (orgCheck.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid organization",
          code: "INVALID_ORGANIZATION",
        });
      }

      // Check user limit
      const userCount = await query(
        "SELECT COUNT(*) as count FROM users WHERE organization_id = $1 AND is_active = true",
        [organizationId]
      );

      if (parseInt(userCount.rows[0].count) >= orgCheck.rows[0].max_users) {
        return res.status(400).json({
          success: false,
          message: "Organization user limit reached",
          code: "ORGANIZATION_FULL",
        });
      }

      finalOrganizationId = organizationId;
    } else if (organizationDomain) {
      // Try to find organization by domain
      const orgByDomain = await query(
        "SELECT id, max_users FROM organizations WHERE domain = $1 AND is_active = true",
        [organizationDomain]
      );

      if (orgByDomain.rows.length > 0) {
        // Check user limit
        const userCount = await query(
          "SELECT COUNT(*) as count FROM users WHERE organization_id = $1 AND is_active = true",
          [orgByDomain.rows[0].id]
        );

        if (parseInt(userCount.rows[0].count) < orgByDomain.rows[0].max_users) {
          finalOrganizationId = orgByDomain.rows[0].id;
        }
      }
    }

    // If no organization found, use default organization
    if (!finalOrganizationId) {
      const defaultOrg = await query(
        "SELECT id FROM organizations WHERE slug = 'default' AND is_active = true",
        []
      );
      finalOrganizationId = defaultOrg.rows[0]?.id;
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const result = await query(
      `INSERT INTO users (email, password_hash, first_name, last_name, service_type, organization_id, role)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, email, first_name, last_name, service_type, organization_id, role, created_at`,
      [
        email.toLowerCase(),
        passwordHash,
        firstName,
        lastName,
        serviceType,
        finalOrganizationId,
        "user",
      ]
    );

    const user = result.rows[0];

    // Generate tokens
    const accessToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        serviceType: user.service_type,
        organizationId: user.organization_id,
        role: user.role,
      },
      process.env["JWT_SECRET"] || "your-jwt-secret",
      { expiresIn: "15m" }
    );

    const refreshToken = jwt.sign(
      { id: user.id, email: user.email },
      process.env["JWT_REFRESH_SECRET"] || "your-refresh-secret",
      { expiresIn: "7d" }
    );

    // Store refresh token
    await query(
      "UPDATE users SET refresh_tokens = array_append(refresh_tokens, $1) WHERE id = $2",
      [refreshToken, user.id]
    );

    // Note: security_events table was removed, logging is handled by the logger

    logger.info("User registered successfully", {
      userId: user.id,
      email: user.email,
      serviceType,
    });

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          serviceType: user.service_type,
          organizationId: user.organization_id,
          role: user.role,
        },
        tokens: {
          accessToken,
          refreshToken,
        },
      },
    });
  } catch (error) {
    logger.error("Registration error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
    });
  }
});

// User login
router.post("/login", loginValidation, async (req: any, res: any) => {
  try {
    const { email, password } = req.body;

    // Find user
    const result = await query(
      "SELECT * FROM users WHERE email = $1 AND is_active = true",
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
        code: "INVALID_CREDENTIALS",
      });
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
        code: "INVALID_CREDENTIALS",
      });
    }

    // Generate tokens
    const accessToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        serviceType: user.service_type,
        organizationId: user.organization_id,
        role: user.role,
      },
      process.env["JWT_SECRET"] || "your-jwt-secret",
      { expiresIn: "15m" }
    );

    const refreshToken = jwt.sign(
      { id: user.id, email: user.email },
      process.env["JWT_REFRESH_SECRET"] || "your-refresh-secret",
      { expiresIn: "7d" }
    );

    // Update user
    await query(
      "UPDATE users SET last_login_at = NOW(), refresh_tokens = array_append(refresh_tokens, $1) WHERE id = $2",
      [refreshToken, user.id]
    );

    // Note: security_events table was removed, logging is handled by the logger

    logger.info("User logged in successfully", {
      userId: user.id,
      email: user.email,
    });

    return res.json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          serviceType: user.service_type,
          tier: user.tier,
        },
        tokens: {
          accessToken,
          refreshToken,
        },
      },
    });
  } catch (error) {
    logger.error("Login error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
    });
  }
});

// Refresh token
router.post("/refresh", async (req: any, res: any) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: "Refresh token is required",
        code: "REFRESH_TOKEN_REQUIRED",
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(
      refreshToken,
      process.env["JWT_REFRESH_SECRET"] || "your-refresh-secret"
    ) as any;

    // Check if token exists in user's refresh tokens
    const result = await query(
      "SELECT * FROM users WHERE id = $1 AND $2 = ANY(refresh_tokens) AND is_active = true",
      [decoded.id, refreshToken]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
        code: "INVALID_REFRESH_TOKEN",
      });
    }

    const user = result.rows[0];

    // Generate new access token
    const newAccessToken = jwt.sign(
      { id: user.id, email: user.email, serviceType: user.service_type },
      process.env["JWT_SECRET"] || "your-jwt-secret",
      { expiresIn: "15m" }
    );

    return res.json({
      success: true,
      message: "Token refreshed successfully",
      data: {
        accessToken: newAccessToken,
      },
    });
  } catch (error) {
    logger.error("Token refresh error:", error);
    return res.status(401).json({
      success: false,
      message: "Invalid refresh token",
      code: "INVALID_REFRESH_TOKEN",
    });
  }
});

// Logout
router.post("/logout", authMiddleware, async (req: any, res: any) => {
  try {
    const { refreshToken } = req.body;
    const userId = req.user.id;

    if (refreshToken) {
      // Remove specific refresh token
      await query(
        "UPDATE users SET refresh_tokens = array_remove(refresh_tokens, $1) WHERE id = $2",
        [refreshToken, userId]
      );
    } else {
      // Clear all refresh tokens
      await query("UPDATE users SET refresh_tokens = $1 WHERE id = $2", [
        [],
        userId,
      ]);
    }

    // Note: security_events table was removed, logging is handled by the logger

    logger.info("User logged out", { userId });

    return res.json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    logger.error("Logout error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
    });
  }
});

// Get current user profile
router.get("/profile", authMiddleware, async (req: any, res: any) => {
  try {
    const userId = req.user.id;

    const result = await query(
      `SELECT id, email, first_name, last_name, service_type, tier, 
               subscription_status, subscription_end_date, cancel_at_period_end,
               subscription_plan_type, profile,
               last_known_location, two_factor_enabled,
               is_email_verified, provider, google_id, created_at, last_login_at
        FROM users WHERE id = $1 AND is_active = true`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        code: "USER_NOT_FOUND",
      });
    }

    const user = result.rows[0];

    return res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          serviceType: user.service_type,
          tier: user.tier,
          subscriptionStatus: user.subscription_status,
          subscriptionEndDate: user.subscription_end_date,
          cancelAtPeriodEnd: user.cancel_at_period_end,
          subscriptionPlanType: user.subscription_plan_type,
          profile: user.profile,
          lastKnownLocation: user.last_known_location,
          twoFactorEnabled: user.two_factor_enabled,
          isEmailVerified: user.is_email_verified,
          provider: user.provider,
          googleId: user.google_id,
          createdAt: user.created_at,
          lastLoginAt: user.last_login_at,
        },
      },
    });
  } catch (error) {
    logger.error("Get profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
    });
  }
});

// =============================================================================
// GOOGLE OAUTH ROUTES
// =============================================================================

// Google OAuth login
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

// Google OAuth callback
router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/login",
  }),
  async (req: any, res: any) => {
    try {
      const user = req.user;

      // Generate tokens
      const accessToken = jwt.sign(
        { id: user.id, email: user.email, serviceType: user.service_type },
        process.env["JWT_SECRET"] || "your-jwt-secret",
        { expiresIn: "15m" }
      );

      const refreshToken = jwt.sign(
        { id: user.id, email: user.email },
        process.env["JWT_REFRESH_SECRET"] || "your-refresh-secret",
        { expiresIn: "7d" }
      );

      // Store refresh token
      await query(
        "UPDATE users SET refresh_tokens = array_append(refresh_tokens, $1) WHERE id = $2",
        [refreshToken, user.id]
      );

      // Note: security_events table was removed, logging is handled by the logger

      // Redirect to frontend with tokens
      const redirectUrl = `${process.env["FRONTEND_URL"] || "http://localhost:3000"}/auth/callback?accessToken=${accessToken}&refreshToken=${refreshToken}`;
      return res.redirect(redirectUrl);
    } catch (error) {
      logger.error("Google OAuth callback error:", error);
      return res.redirect(
        `${process.env["FRONTEND_URL"] || "http://localhost:3000"}/auth/error`
      );
    }
  }
);

// =============================================================================
// PROFILE MANAGEMENT ROUTES
// =============================================================================

// Update user profile
router.put("/profile", authMiddleware, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { firstName, lastName, profile } = req.body;

    const result = await query(
      `UPDATE users 
       SET first_name = COALESCE($1, first_name),
           last_name = COALESCE($2, last_name),
           profile = COALESCE($3, profile),
           updated_at = NOW()
       WHERE id = $4 AND is_active = true
       RETURNING id, email, first_name, last_name, profile, updated_at`,
      [firstName, lastName, JSON.stringify(profile), userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        code: "USER_NOT_FOUND",
      });
    }

    const user = result.rows[0];

    return res.json({
      success: true,
      message: "Profile updated successfully",
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          profile: user.profile,
          updatedAt: user.updated_at,
        },
      },
    });
  } catch (error) {
    logger.error("Update profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
    });
  }
});

// Update user location
router.put("/location", authMiddleware, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { city, country, coordinates } = req.body;

    const locationData = {
      city,
      country,
      coordinates,
      timestamp: new Date().toISOString(),
    };

    const result = await query(
      `UPDATE users 
       SET last_known_location = $1, updated_at = NOW()
       WHERE id = $2 AND is_active = true
       RETURNING id, last_known_location, updated_at`,
      [JSON.stringify(locationData), userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        code: "USER_NOT_FOUND",
      });
    }

    return res.json({
      success: true,
      message: "Location updated successfully",
      data: {
        location: result.rows[0].last_known_location,
        updatedAt: result.rows[0].updated_at,
      },
    });
  } catch (error) {
    logger.error("Update location error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
    });
  }
});

// =============================================================================
// TWO-FACTOR AUTHENTICATION ROUTES
// =============================================================================

// Enable two-factor authentication
router.post("/2fa/enable", authMiddleware, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { secret, backupCodes } = req.body;

    if (!secret || !backupCodes || !Array.isArray(backupCodes)) {
      return res.status(400).json({
        success: false,
        message: "Secret and backup codes are required",
        code: "INVALID_INPUT",
      });
    }

    const result = await query(
      `UPDATE users 
       SET two_factor_enabled = true,
           two_factor_secret = $1,
           two_factor_backup_codes = $2,
           updated_at = NOW()
       WHERE id = $3 AND is_active = true
       RETURNING id, two_factor_enabled, updated_at`,
      [secret, backupCodes, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        code: "USER_NOT_FOUND",
      });
    }

    return res.json({
      success: true,
      message: "Two-factor authentication enabled successfully",
      data: {
        twoFactorEnabled: result.rows[0].two_factor_enabled,
        backupCodes,
        updatedAt: result.rows[0].updated_at,
      },
    });
  } catch (error) {
    logger.error("Enable 2FA error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
    });
  }
});

// Disable two-factor authentication
router.post("/2fa/disable", authMiddleware, async (req: any, res: any) => {
  try {
    const userId = req.user.id;

    const result = await query(
      `UPDATE users 
       SET two_factor_enabled = false,
           two_factor_secret = NULL,
           two_factor_backup_codes = NULL,
           updated_at = NOW()
       WHERE id = $1 AND is_active = true
       RETURNING id, two_factor_enabled, updated_at`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        code: "USER_NOT_FOUND",
      });
    }

    return res.json({
      success: true,
      message: "Two-factor authentication disabled successfully",
      data: {
        twoFactorEnabled: result.rows[0].two_factor_enabled,
        updatedAt: result.rows[0].updated_at,
      },
    });
  } catch (error) {
    logger.error("Disable 2FA error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
    });
  }
});

// =============================================================================
// PASSWORD MANAGEMENT ROUTES
// =============================================================================

// Change password
router.put("/password", authMiddleware, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
        code: "INVALID_INPUT",
      });
    }

    // Verify current password
    const userResult = await query(
      "SELECT password_hash FROM users WHERE id = $1 AND is_active = true",
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        code: "USER_NOT_FOUND",
      });
    }

    const isValidPassword = await bcrypt.compare(
      currentPassword,
      userResult.rows[0].password_hash
    );
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
        code: "INVALID_PASSWORD",
      });
    }

    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await query(
      `UPDATE users 
       SET password_hash = $1, 
           password_changed_at = NOW(),
           updated_at = NOW()
       WHERE id = $2`,
      [newPasswordHash, userId]
    );

    return res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    logger.error("Change password error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
    });
  }
});

// Request password reset
router.post("/password/reset-request", async (req: any, res: any) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
        code: "INVALID_INPUT",
      });
    }

    const userResult = await query(
      "SELECT id, email FROM users WHERE email = $1 AND is_active = true",
      [email.toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      // Don't reveal if user exists or not
      return res.json({
        success: true,
        message:
          "If an account with that email exists, a password reset link has been sent",
      });
    }

    const user = userResult.rows[0];
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour

    await query(
      `UPDATE users 
       SET password_reset_token = $1, 
           password_reset_expires = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [resetToken, resetExpires, user.id]
    );

    // TODO: Send password reset email with token
    logger.info("Password reset requested", {
      userId: user.id,
      email: user.email,
    });

    return res.json({
      success: true,
      message:
        "If an account with that email exists, a password reset link has been sent",
    });
  } catch (error) {
    logger.error("Password reset request error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
    });
  }
});

// Reset password with token
router.post("/password/reset", async (req: any, res: any) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Token and new password are required",
        code: "INVALID_INPUT",
      });
    }

    // Find user with valid reset token
    const userResult = await query(
      "SELECT id, email FROM users WHERE password_reset_token = $1 AND password_reset_expires > NOW() AND is_active = true",
      [token]
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
        code: "INVALID_TOKEN",
      });
    }

    const user = userResult.rows[0];

    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password and clear reset token
    await query(
      `UPDATE users 
       SET password_hash = $1, 
           password_reset_token = NULL,
           password_reset_expires = NULL,
           password_changed_at = NOW(),
           updated_at = NOW()
       WHERE id = $2`,
      [newPasswordHash, user.id]
    );

    logger.info("Password reset completed", {
      userId: user.id,
      email: user.email,
    });

    return res.json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    logger.error("Password reset error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
    });
  }
});

export default router;
