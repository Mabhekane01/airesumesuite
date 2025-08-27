import { Router } from "express";
import { UserModel } from "@document-sharing/core/models/User";
import { logger } from "@document-sharing/core/utils/logger";
import jwt from "jsonwebtoken";

const router = Router();

// JWT secret from environment
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Middleware to verify JWT token
const authenticateToken = (req: any, res: any, next: any) => {
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
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      error: "Invalid or expired token",
      code: "INVALID_TOKEN",
    });
  }
};

/**
 * @route GET /api/v1/users
 * @desc Get users for the authenticated user's organization
 * @access Private
 */
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, role } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    // Check if user has permission to view other users
    if (!req.user.permissions.includes("manage_members")) {
      return res.status(403).json({
        error: "Insufficient permissions",
        code: "INSUFFICIENT_PERMISSIONS",
      });
    }

    // Get users by organization
    const users = await UserModel.findByOrganization(req.user.organizationId);

    // Apply filters
    let filteredUsers = users;

    if (search) {
      const searchTerm = (search as string).toLowerCase();
      filteredUsers = filteredUsers.filter(
        (user) =>
          user.firstName.toLowerCase().includes(searchTerm) ||
          user.lastName.toLowerCase().includes(searchTerm) ||
          user.email.toLowerCase().includes(searchTerm)
      );
    }

    if (role) {
      filteredUsers = filteredUsers.filter((user) => user.role === role);
    }

    // Apply pagination
    const total = filteredUsers.length;
    const paginatedUsers = filteredUsers.slice(
      offset,
      offset + parseInt(limit as string)
    );

    // Remove sensitive data
    const safeUsers = paginatedUsers.map((user) => {
      const { passwordHash, ...safeUser } = user;
      return safeUser;
    });

    res.json({
      success: true,
      data: {
        users: safeUsers,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string)),
        },
      },
    });
  } catch (error) {
    logger.error("Get users error:", error);
    res.status(500).json({
      error: "Failed to get users",
      code: "GET_USERS_ERROR",
    });
  }
});

/**
 * @route GET /api/v1/users/:id
 * @desc Get a specific user
 * @access Private
 */
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Users can only view their own profile unless they have manage_members permission
    if (
      id !== req.user.userId &&
      !req.user.permissions.includes("manage_members")
    ) {
      return res.status(403).json({
        error: "Access denied",
        code: "ACCESS_DENIED",
      });
    }

    const user = await UserModel.findByIdWithOrganization(id);
    if (!user) {
      return res.status(404).json({
        error: "User not found",
        code: "USER_NOT_FOUND",
      });
    }

    // Check if user is in the same organization
    if (user.organizationId !== req.user.organizationId) {
      return res.status(403).json({
        error: "Access denied",
        code: "ACCESS_DENIED",
      });
    }

    // Remove sensitive data
    const { passwordHash, ...safeUser } = user;

    res.json({
      success: true,
      data: {
        user: safeUser,
      },
    });
  } catch (error) {
    logger.error("Get user error:", error);
    res.status(500).json({
      error: "Failed to get user",
      code: "GET_USER_ERROR",
    });
  }
});

/**
 * @route PUT /api/v1/users/:id
 * @desc Update a user
 * @access Private
 */
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Users can only update their own profile unless they have manage_members permission
    if (
      id !== req.user.userId &&
      !req.user.permissions.includes("manage_members")
    ) {
      return res.status(403).json({
        error: "Access denied",
        code: "ACCESS_DENIED",
      });
    }

    // Get the user first to check permissions
    const existingUser = await UserModel.findById(id);
    if (!existingUser) {
      return res.status(404).json({
        error: "User not found",
        code: "USER_NOT_FOUND",
      });
    }

    // Check if user is in the same organization
    if (existingUser.organizationId !== req.user.organizationId) {
      return res.status(403).json({
        error: "Access denied",
        code: "ACCESS_DENIED",
      });
    }

    // Only allow admins to change roles and permissions
    if (
      (updateData.role || updateData.permissions) &&
      !req.user.permissions.includes("manage_members")
    ) {
      return res.status(403).json({
        error: "Insufficient permissions to change roles or permissions",
        code: "INSUFFICIENT_PERMISSIONS",
      });
    }

    const updatedUser = await UserModel.update(id, updateData);
    if (!updatedUser) {
      return res.status(500).json({
        error: "Failed to update user",
        code: "UPDATE_FAILED",
      });
    }

    // Remove sensitive data
    const { passwordHash, ...safeUser } = updatedUser;

    logger.info("User updated successfully", {
      userId: id,
      updatedBy: req.user.userId,
    });

    res.json({
      success: true,
      message: "User updated successfully",
      data: {
        user: safeUser,
      },
    });
  } catch (error) {
    logger.error("Update user error:", error);
    res.status(500).json({
      error: "Failed to update user",
      code: "UPDATE_USER_ERROR",
    });
  }
});

/**
 * @route DELETE /api/v1/users/:id
 * @desc Delete a user (soft delete)
 * @access Private
 */
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Only users with manage_members permission can delete users
    if (!req.user.permissions.includes("manage_members")) {
      return res.status(403).json({
        error: "Insufficient permissions",
        code: "INSUFFICIENT_PERMISSIONS",
      });
    }

    // Users cannot delete themselves
    if (id === req.user.userId) {
      return res.status(400).json({
        error: "Cannot delete your own account",
        code: "CANNOT_DELETE_SELF",
      });
    }

    // Get the user first to check permissions
    const existingUser = await UserModel.findById(id);
    if (!existingUser) {
      return res.status(404).json({
        error: "User not found",
        code: "USER_NOT_FOUND",
      });
    }

    // Check if user is in the same organization
    if (existingUser.organizationId !== req.user.organizationId) {
      return res.status(403).json({
        error: "Access denied",
        code: "ACCESS_DENIED",
      });
    }

    // Only allow admins to delete other admins
    if (
      existingUser.role === "owner" ||
      (existingUser.role === "admin" && req.user.role !== "owner")
    ) {
      return res.status(403).json({
        error: "Insufficient permissions to delete this user",
        code: "INSUFFICIENT_PERMISSIONS",
      });
    }

    const success = await UserModel.delete(id);
    if (!success) {
      return res.status(500).json({
        error: "Failed to delete user",
        code: "DELETE_FAILED",
      });
    }

    logger.info("User deleted successfully", {
      userId: id,
      deletedBy: req.user.userId,
    });

    res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    logger.error("Delete user error:", error);
    res.status(500).json({
      error: "Failed to delete user",
      code: "DELETE_USER_ERROR",
    });
  }
});

/**
 * @route POST /api/v1/users/:id/reactivate
 * @desc Reactivate a deactivated user
 * @access Private
 */
router.post("/:id/reactivate", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Only users with manage_members permission can reactivate users
    if (!req.user.permissions.includes("manage_members")) {
      return res.status(403).json({
        error: "Insufficient permissions",
        code: "INSUFFICIENT_PERMISSIONS",
      });
    }

    // Get the user first to check permissions
    const existingUser = await UserModel.findById(id);
    if (!existingUser) {
      return res.status(404).json({
        error: "User not found",
        code: "USER_NOT_FOUND",
      });
    }

    // Check if user is in the same organization
    if (existingUser.organizationId !== req.user.organizationId) {
      return res.status(403).json({
        error: "Access denied",
        code: "ACCESS_DENIED",
      });
    }

    // Check if user is actually deactivated
    if (existingUser.isActive) {
      return res.status(400).json({
        error: "User is already active",
        code: "USER_ALREADY_ACTIVE",
      });
    }

    const updatedUser = await UserModel.update(id, { isActive: true });
    if (!updatedUser) {
      return res.status(500).json({
        error: "Failed to reactivate user",
        code: "REACTIVATE_FAILED",
      });
    }

    // Remove sensitive data
    const { passwordHash, ...safeUser } = updatedUser;

    logger.info("User reactivated successfully", {
      userId: id,
      reactivatedBy: req.user.userId,
    });

    res.json({
      success: true,
      message: "User reactivated successfully",
      data: {
        user: safeUser,
      },
    });
  } catch (error) {
    logger.error("Reactivate user error:", error);
    res.status(500).json({
      error: "Failed to reactivate user",
      code: "REACTIVATE_USER_ERROR",
    });
  }
});

/**
 * @route GET /api/v1/users/profile
 * @desc Get current user's profile
 * @access Private
 */
router.get("/profile", authenticateToken, async (req, res) => {
  try {
    const user = await UserModel.findByIdWithOrganization(req.user.userId);
    if (!user) {
      return res.status(404).json({
        error: "User not found",
        code: "USER_NOT_FOUND",
      });
    }

    // Remove sensitive data
    const { passwordHash, ...safeUser } = user;

    res.json({
      success: true,
      data: {
        user: safeUser,
      },
    });
  } catch (error) {
    logger.error("Get profile error:", error);
    res.status(500).json({
      error: "Failed to get profile",
      code: "GET_PROFILE_ERROR",
    });
  }
});

/**
 * @route PUT /api/v1/users/profile
 * @desc Update current user's profile
 * @access Private
 */
router.put("/profile", authenticateToken, async (req, res) => {
  try {
    const { firstName, lastName, email } = req.body;

    // Users can only update certain fields in their profile
    const updateData: any = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (email !== undefined) updateData.email = email;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        error: "No fields to update",
        code: "NO_FIELDS_TO_UPDATE",
      });
    }

    const updatedUser = await UserModel.update(req.user.userId, updateData);
    if (!updatedUser) {
      return res.status(500).json({
        error: "Failed to update profile",
        code: "UPDATE_FAILED",
      });
    }

    // Remove sensitive data
    const { passwordHash, ...safeUser } = updatedUser;

    logger.info("Profile updated successfully", {
      userId: req.user.userId,
    });

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: {
        user: safeUser,
      },
    });
  } catch (error) {
    logger.error("Update profile error:", error);
    res.status(500).json({
      error: "Failed to update profile",
      code: "UPDATE_PROFILE_ERROR",
    });
  }
});

export default router;
