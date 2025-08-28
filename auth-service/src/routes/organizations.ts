import { Router } from "express";
import { body } from "express-validator";
import { query } from "../config/database";
import { logger } from "../utils/logger";
import { authMiddleware } from "../middleware/auth";

const router: Router = Router();

// =============================================================================
// VALIDATION MIDDLEWARE
// =============================================================================

const createOrganizationValidation = [
  body("name").trim().isLength({ min: 1, max: 255 }),
  body("slug")
    .trim()
    .isLength({ min: 1, max: 100 })
    .matches(/^[a-z0-9-]+$/),
  body("description").optional().isString(),
  body("domain").optional().isString(),
  body("maxUsers").optional().isInt({ min: 1, max: 1000 }),
];

const updateOrganizationValidation = [
  body("name").optional().trim().isLength({ min: 1, max: 255 }),
  body("description").optional().isString(),
  body("maxUsers").optional().isInt({ min: 1, max: 1000 }),
  body("settings").optional().isObject(),
];

const addUserValidation = [
  body("email").isEmail().normalizeEmail(),
  body("role").optional().isIn(["admin", "user", "viewer"]),
];

// =============================================================================
// ORGANIZATION ROUTES
// =============================================================================

// Create new organization
router.post(
  "/",
  authMiddleware,
  createOrganizationValidation,
  async (req: any, res: any) => {
    try {
      const { name, slug, description, domain, maxUsers = 10 } = req.body;
      const userId = req.user?.id;

      // Check if user is admin of their current organization or has no organization
      const userCheck = await query(
        "SELECT organization_id, role FROM users WHERE id = $1",
        [userId]
      );

      if (userCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found",
          code: "USER_NOT_FOUND",
        });
      }

      const user = userCheck.rows[0];

      // Only allow if user is admin of current org or has no org
      if (user.organization_id && user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Only organization admins can create new organizations",
          code: "INSUFFICIENT_PERMISSIONS",
        });
      }

      // Check if slug already exists
      const existingSlug = await query(
        "SELECT id FROM organizations WHERE slug = $1",
        [slug]
      );

      if (existingSlug.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Organization slug already exists",
          code: "SLUG_EXISTS",
        });
      }

      // Check if domain already exists
      if (domain) {
        const existingDomain = await query(
          "SELECT id FROM organizations WHERE domain = $1",
          [domain]
        );

        if (existingDomain.rows.length > 0) {
          return res.status(400).json({
            success: false,
            message: "Domain already registered",
            code: "DOMAIN_EXISTS",
          });
        }
      }

      // Create organization
      const result = await query(
        `INSERT INTO organizations (name, slug, description, domain, max_users, subscription_plan_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [name, slug, description, domain, maxUsers, null] // No subscription plan initially
      );

      const organization = result.rows[0];

      // Update user to be admin of new organization
      await query(
        "UPDATE users SET organization_id = $1, role = 'admin' WHERE id = $2",
        [organization.id, userId]
      );

      logger.info("Organization created successfully", {
        organizationId: organization.id,
        slug: organization.slug,
        createdBy: userId,
      });

      return res.status(201).json({
        success: true,
        message: "Organization created successfully",
        data: { organization },
      });
    } catch (error) {
      logger.error("Organization creation error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        code: "INTERNAL_ERROR",
      });
    }
  }
);

// Get organization details
router.get("/:organizationId", authMiddleware, async (req: any, res: any) => {
  try {
    const { organizationId } = req.params;
    const userId = (req as any).user?.id;

    // Check if user belongs to this organization
    const userCheck = await query(
      "SELECT organization_id, role FROM users WHERE id = $1",
      [userId]
    );

    if (
      userCheck.rows.length === 0 ||
      userCheck.rows[0].organization_id !== organizationId
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
        code: "ACCESS_DENIED",
      });
    }

    // Get organization details
    const orgResult = await query(
      `SELECT o.*, sp.name as plan_name, sp.features, sp.limits
       FROM organizations o
       LEFT JOIN subscription_plans sp ON o.subscription_plan_id = sp.id
       WHERE o.id = $1 AND o.is_active = true`,
      [organizationId]
    );

    if (orgResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
        code: "ORGANIZATION_NOT_FOUND",
      });
    }

    const organization = orgResult.rows[0];

    // Get user count
    const userCountResult = await query(
      "SELECT COUNT(*) as count FROM users WHERE organization_id = $1 AND is_active = true",
      [organizationId]
    );

    const userCount = parseInt(userCountResult.rows[0].count);

    return res.json({
      success: true,
      data: {
        ...organization,
        userCount,
        isAtLimit: userCount >= organization.max_users,
      },
    });
  } catch (error) {
    logger.error("Get organization error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
    });
  }
});

// Update organization
router.put(
  "/:organizationId",
  authMiddleware,
  updateOrganizationValidation,
  async (req: any, res: any) => {
    try {
      const { organizationId } = req.params;
      const { name, description, maxUsers, settings } = req.body;
      const userId = (req as any).user?.id;

      // Check if user is admin of this organization
      const userCheck = await query(
        "SELECT organization_id, role FROM users WHERE id = $1",
        [userId]
      );

      if (
        userCheck.rows.length === 0 ||
        userCheck.rows[0].organization_id !== organizationId ||
        userCheck.rows[0].role !== "admin"
      ) {
        return res.status(403).json({
          success: false,
          message: "Only organization admins can update organization",
          code: "INSUFFICIENT_PERMISSIONS",
        });
      }

      // Build update query dynamically
      const updates = [];
      const values = [];
      let paramCount = 1;

      if (name !== undefined) {
        updates.push(`name = $${paramCount++}`);
        values.push(name);
      }

      if (description !== undefined) {
        updates.push(`description = $${paramCount++}`);
        values.push(description);
      }

      if (maxUsers !== undefined) {
        updates.push(`max_users = $${paramCount++}`);
        values.push(maxUsers);
      }

      if (settings !== undefined) {
        updates.push(`settings = $${paramCount++}`);
        values.push(JSON.stringify(settings));
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No fields to update",
          code: "NO_UPDATES",
        });
      }

      values.push(organizationId);

      const result = await query(
        `UPDATE organizations SET ${updates.join(", ")}, updated_at = NOW()
       WHERE id = $${paramCount} RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Organization not found",
          code: "ORGANIZATION_NOT_FOUND",
        });
      }

      const organization = result.rows[0];

      logger.info("Organization updated successfully", {
        organizationId: organization.id,
        updatedBy: userId,
      });

      res.json({
        success: true,
        message: "Organization updated successfully",
        data: { organization },
      });
    } catch (error) {
      logger.error("Organization update error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        code: "INTERNAL_ERROR",
      });
    }
  }
);

// Add user to organization
router.post(
  "/:organizationId/users",
  authMiddleware,
  addUserValidation,
  async (req: any, res: any) => {
    try {
      const { organizationId } = req.params;
      const { email, role = "user" } = req.body;
      const userId = (req as any).user?.id;

      // Check if user is admin of this organization
      const userCheck = await query(
        "SELECT organization_id, role FROM users WHERE id = $1",
        [userId]
      );

      if (
        userCheck.rows.length === 0 ||
        userCheck.rows[0].organization_id !== organizationId ||
        userCheck.rows[0].role !== "admin"
      ) {
        return res.status(403).json({
          success: false,
          message: "Only organization admins can add users",
          code: "INSUFFICIENT_PERMISSIONS",
        });
      }

      // Check organization user limit
      const orgCheck = await query(
        "SELECT max_users FROM organizations WHERE id = $1 AND is_active = true",
        [organizationId]
      );

      if (orgCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Organization not found",
          code: "ORGANIZATION_NOT_FOUND",
        });
      }

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

      // Find user by email
      const existingUser = await query(
        "SELECT id, organization_id FROM users WHERE email = $1 AND is_active = true",
        [email.toLowerCase()]
      );

      if (existingUser.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found",
          code: "USER_NOT_FOUND",
        });
      }

      const user = existingUser.rows[0];

      if (user.organization_id) {
        return res.status(400).json({
          success: false,
          message: "User already belongs to an organization",
          code: "USER_ALREADY_IN_ORG",
        });
      }

      // Add user to organization
      await query(
        "UPDATE users SET organization_id = $1, role = $2 WHERE id = $3",
        [organizationId, role, user.id]
      );

      logger.info("User added to organization successfully", {
        userId: user.id,
        organizationId,
        role,
        addedBy: userId,
      });

      return res.json({
        success: true,
        message: "User added to organization successfully",
        data: { userId: user.id, role },
      });
    } catch (error) {
      logger.error("Add user to organization error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        code: "INTERNAL_ERROR",
      });
    }
  }
);

// Get organization users
router.get(
  "/:organizationId/users",
  authMiddleware,
  async (req: any, res: any) => {
    try {
      const { organizationId } = req.params;
      const userId = (req as any).user?.id;

      // Check if user belongs to this organization
      const userCheck = await query(
        "SELECT organization_id, role FROM users WHERE id = $1",
        [userId]
      );

      if (
        userCheck.rows.length === 0 ||
        userCheck.rows[0].organization_id !== organizationId
      ) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
          code: "ACCESS_DENIED",
        });
      }

      // Get organization users
      const usersResult = await query(
        `SELECT id, email, first_name, last_name, role, service_type, created_at, last_login_at
       FROM users 
       WHERE organization_id = $1 AND is_active = true
       ORDER BY created_at DESC`,
        [organizationId]
      );

      return res.json({
        success: true,
        data: { users: usersResult.rows },
      });
    } catch (error) {
      logger.error("Get organization users error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        code: "INTERNAL_ERROR",
      });
    }
  }
);

// Remove user from organization
router.delete(
  "/:organizationId/users/:userId",
  authMiddleware,
  async (req: any, res: any) => {
    try {
      const { organizationId, userId: targetUserId } = req.params;
      const currentUserId = (req as any).user?.id;

      // Check if current user is admin of this organization
      const userCheck = await query(
        "SELECT organization_id, role FROM users WHERE id = $1",
        [currentUserId]
      );

      if (
        userCheck.rows.length === 0 ||
        userCheck.rows[0].organization_id !== organizationId ||
        userCheck.rows[0].role !== "admin"
      ) {
        return res.status(403).json({
          success: false,
          message: "Only organization admins can remove users",
          code: "INSUFFICIENT_PERMISSIONS",
        });
      }

      // Check if target user belongs to this organization
      const targetUserCheck = await query(
        "SELECT organization_id, role FROM users WHERE id = $1",
        [targetUserId]
      );

      if (
        targetUserCheck.rows.length === 0 ||
        targetUserCheck.rows[0].organization_id !== organizationId
      ) {
        return res.status(404).json({
          success: false,
          message: "User not found in organization",
          code: "USER_NOT_IN_ORG",
        });
      }

      // Prevent removing the last admin
      if (targetUserCheck.rows[0].role === "admin") {
        const adminCount = await query(
          "SELECT COUNT(*) as count FROM users WHERE organization_id = $1 AND role = 'admin' AND is_active = true",
          [organizationId]
        );

        if (parseInt(adminCount.rows[0].count) <= 1) {
          return res.status(400).json({
            success: false,
            message: "Cannot remove the last admin",
            code: "LAST_ADMIN",
          });
        }
      }

      // Remove user from organization (set to default org)
      const defaultOrg = await query(
        "SELECT id FROM organizations WHERE slug = 'default' AND is_active = true",
        []
      );

      await query(
        "UPDATE users SET organization_id = $1, role = 'user' WHERE id = $2",
        [defaultOrg.rows[0]?.id, targetUserId]
      );

      logger.info("User removed from organization successfully", {
        userId: targetUserId,
        organizationId,
        removedBy: currentUserId,
      });

      res.json({
        success: true,
        message: "User removed from organization successfully",
      });
    } catch (error) {
      logger.error("Remove user from organization error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        code: "INTERNAL_ERROR",
      });
    }
  }
);

// Update user role in organization
router.patch(
  "/:organizationId/users/:userId/role",
  authMiddleware,
  async (req: any, res: any) => {
    try {
      const { organizationId, userId: targetUserId } = req.params;
      const { role } = req.body;
      const currentUserId = (req as any).user?.id;

      if (!["admin", "user", "viewer"].includes(role)) {
        return res.status(400).json({
          success: false,
          message: "Invalid role",
          code: "INVALID_ROLE",
        });
      }

      // Check if current user is admin of this organization
      const userCheck = await query(
        "SELECT organization_id, role FROM users WHERE id = $1",
        [currentUserId]
      );

      if (
        userCheck.rows.length === 0 ||
        userCheck.rows[0].organization_id !== organizationId ||
        userCheck.rows[0].role !== "admin"
      ) {
        return res.status(403).json({
          success: false,
          message: "Only organization admins can update user roles",
          code: "INSUFFICIENT_PERMISSIONS",
        });
      }

      // Check if target user belongs to this organization
      const targetUserCheck = await query(
        "SELECT organization_id, role FROM users WHERE id = $1",
        [targetUserId]
      );

      if (
        targetUserCheck.rows.length === 0 ||
        targetUserCheck.rows[0].organization_id !== organizationId
      ) {
        return res.status(404).json({
          success: false,
          message: "User not found in organization",
          code: "USER_NOT_IN_ORG",
        });
      }

      // Prevent changing the last admin to non-admin
      if (targetUserCheck.rows[0].role === "admin" && role !== "admin") {
        const adminCount = await query(
          "SELECT COUNT(*) as count FROM users WHERE organization_id = $1 AND role = 'admin' AND is_active = true",
          [organizationId]
        );

        if (parseInt(adminCount.rows[0].count) <= 1) {
          return res.status(400).json({
            success: false,
            message: "Cannot change the last admin to non-admin role",
            code: "LAST_ADMIN",
          });
        }
      }

      // Update user role
      await query("UPDATE users SET role = $1 WHERE id = $2", [
        role,
        targetUserId,
      ]);

      logger.info("User role updated successfully", {
        userId: targetUserId,
        organizationId,
        newRole: role,
        updatedBy: currentUserId,
      });

      return res.json({
        success: true,
        message: "User role updated successfully",
        data: { role },
      });
    } catch (error) {
      logger.error("Update user role error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        code: "INTERNAL_ERROR",
      });
    }
  }
);

export default router;
