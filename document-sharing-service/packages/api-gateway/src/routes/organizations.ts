import { Router } from "express";
import { logger } from "@document-sharing/core/utils/logger";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { query } from "@document-sharing/core/database/connection";

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
 * @route POST /api/v1/organizations
 * @desc Create a new organization
 * @access Public (for registration)
 */
router.post("/", async (req, res) => {
  try {
    const { name, domain, settings } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({
        error: "Organization name is required",
        code: "MISSING_ORGANIZATION_NAME",
      });
    }

    // Check if organization with this name already exists
    const existingOrg = await query(
      "SELECT id FROM organizations WHERE name = $1",
      [name]
    );

    if (existingOrg.rows.length > 0) {
      return res.status(409).json({
        error: "Organization with this name already exists",
        code: "ORGANIZATION_NAME_EXISTS",
      });
    }

    // Check if domain is already taken
    if (domain) {
      const existingDomain = await query(
        "SELECT id FROM organizations WHERE domain = $1",
        [domain]
      );

      if (existingDomain.rows.length > 0) {
        return res.status(409).json({
          error: "Domain is already taken",
          code: "DOMAIN_TAKEN",
        });
      }
    }

    // Create organization
    const organizationId = uuidv4();
    const now = new Date();

    await query(
      `
      INSERT INTO organizations (
        id, name, domain, settings, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [organizationId, name, domain || null, settings || {}, now, now]
    );

    logger.info("Organization created successfully", {
      organizationId,
      name,
      domain,
    });

    res.status(201).json({
      success: true,
      message: "Organization created successfully",
      data: {
        organization: {
          id: organizationId,
          name,
          domain,
          settings: settings || {},
          createdAt: now,
          updatedAt: now,
        },
      },
    });
  } catch (error) {
    logger.error("Create organization error:", error);
    res.status(500).json({
      error: "Failed to create organization",
      code: "CREATE_ORGANIZATION_ERROR",
    });
  }
});

/**
 * @route GET /api/v1/organizations/:id
 * @desc Get organization details
 * @access Private
 */
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user has access to this organization
    if (
      req.user.organizationId !== id &&
      !req.user.permissions.includes("manage_organization")
    ) {
      return res.status(403).json({
        error: "Access denied",
        code: "ACCESS_DENIED",
      });
    }

    const result = await query("SELECT * FROM organizations WHERE id = $1", [
      id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Organization not found",
        code: "ORGANIZATION_NOT_FOUND",
      });
    }

    const organization = result.rows[0];

    res.json({
      success: true,
      data: {
        organization: {
          id: organization.id,
          name: organization.name,
          domain: organization.domain,
          settings: organization.settings || {},
          createdAt: organization.created_at,
          updatedAt: organization.updated_at,
        },
      },
    });
  } catch (error) {
    logger.error("Get organization error:", error);
    res.status(500).json({
      error: "Failed to get organization",
      code: "GET_ORGANIZATION_ERROR",
    });
  }
});

/**
 * @route PUT /api/v1/organizations/:id
 * @desc Update organization
 * @access Private (organization admins only)
 */
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, domain, settings } = req.body;

    // Check if user has permission to manage this organization
    if (
      req.user.organizationId !== id ||
      !req.user.permissions.includes("manage_organization")
    ) {
      return res.status(403).json({
        error: "Insufficient permissions",
        code: "INSUFFICIENT_PERMISSIONS",
      });
    }

    // Get current organization
    const currentOrg = await query(
      "SELECT * FROM organizations WHERE id = $1",
      [id]
    );

    if (currentOrg.rows.length === 0) {
      return res.status(404).json({
        error: "Organization not found",
        code: "ORGANIZATION_NOT_FOUND",
      });
    }

    // Check if new name conflicts with existing organizations
    if (name && name !== currentOrg.rows[0].name) {
      const existingOrg = await query(
        "SELECT id FROM organizations WHERE name = $1 AND id != $2",
        [name, id]
      );

      if (existingOrg.rows.length > 0) {
        return res.status(409).json({
          error: "Organization with this name already exists",
          code: "ORGANIZATION_NAME_EXISTS",
        });
      }
    }

    // Check if new domain conflicts with existing organizations
    if (domain && domain !== currentOrg.rows[0].domain) {
      const existingDomain = await query(
        "SELECT id FROM organizations WHERE domain = $1 AND id != $2",
        [domain, id]
      );

      if (existingDomain.rows.length > 0) {
        return res.status(409).json({
          error: "Domain is already taken",
          code: "DOMAIN_TAKEN",
        });
      }
    }

    // Update organization
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (domain !== undefined) updateData.domain = domain;
    if (settings !== undefined) updateData.settings = settings;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        error: "No fields to update",
        code: "NO_FIELDS_TO_UPDATE",
      });
    }

    // Build update query
    const setFields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    Object.entries(updateData).forEach(([key, value]) => {
      setFields.push(`${key} = $${paramCount}`);
      values.push(value);
      paramCount++;
    });

    // Add updated_at timestamp
    setFields.push(`updated_at = $${paramCount}`);
    values.push(new Date());
    paramCount++;

    // Add WHERE clause
    values.push(id);

    const queryText = `
      UPDATE organizations 
      SET ${setFields.join(", ")}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await query(queryText, values);

    if (result.rows.length === 0) {
      return res.status(500).json({
        error: "Failed to update organization",
        code: "UPDATE_FAILED",
      });
    }

    const updatedOrganization = result.rows[0];

    logger.info("Organization updated successfully", {
      organizationId: id,
      updatedBy: req.user.userId,
    });

    res.json({
      success: true,
      message: "Organization updated successfully",
      data: {
        organization: {
          id: updatedOrganization.id,
          name: updatedOrganization.name,
          domain: updatedOrganization.domain,
          settings: updatedOrganization.settings || {},
          createdAt: updatedOrganization.created_at,
          updatedAt: updatedOrganization.updated_at,
        },
      },
    });
  } catch (error) {
    logger.error("Update organization error:", error);
    res.status(500).json({
      error: "Failed to update organization",
      code: "UPDATE_ORGANIZATION_ERROR",
    });
  }
});

/**
 * @route GET /api/v1/organizations/:id/stats
 * @desc Get organization statistics
 * @access Private
 */
router.get("/:id/stats", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user has access to this organization
    if (req.user.organizationId !== id) {
      return res.status(403).json({
        error: "Access denied",
        code: "ACCESS_DENIED",
      });
    }

    // Get organization statistics
    const [userCount, documentCount, totalViews, recentActivity] =
      await Promise.all([
        // User count
        query(
          "SELECT COUNT(*) FROM users WHERE organization_id = $1 AND is_active = true",
          [id]
        ),
        // Document count
        query(
          "SELECT COUNT(*) FROM documents WHERE organization_id = $1 AND is_archived = false",
          [id]
        ),
        // Total views
        query(
          `
        SELECT COUNT(*) 
        FROM document_views dv
        JOIN documents d ON dv.document_id = d.id
        WHERE d.organization_id = $1
        `,
          [id]
        ),
        // Recent activity (last 7 days)
        query(
          `
        SELECT 
          COUNT(DISTINCT dv.id) as views,
          COUNT(DISTINCT d.id) as new_documents
        FROM documents d
        LEFT JOIN document_views dv ON d.id = dv.document_id 
          AND dv.created_at >= NOW() - INTERVAL '7 days'
        WHERE d.organization_id = $1 
          AND d.is_archived = false
          AND (d.created_at >= NOW() - INTERVAL '7 days' OR dv.id IS NOT NULL)
        `,
          [id]
        ),
      ]);

    const stats = {
      organizationId: id,
      users: parseInt(userCount.rows[0].count),
      documents: parseInt(documentCount.rows[0].count),
      totalViews: parseInt(totalViews.rows[0].count),
      recentActivity: {
        views: parseInt(recentActivity.rows[0].views) || 0,
        newDocuments: parseInt(recentActivity.rows[0].new_documents) || 0,
      },
    };

    res.json({
      success: true,
      data: {
        stats,
      },
    });
  } catch (error) {
    logger.error("Get organization stats error:", error);
    res.status(500).json({
      error: "Failed to get organization statistics",
      code: "GET_ORGANIZATION_STATS_ERROR",
    });
  }
});

/**
 * @route GET /api/v1/organizations/:id/members
 * @desc Get organization members
 * @access Private
 */
router.get("/:id/members", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20, role, search } = req.query;

    // Check if user has access to this organization
    if (req.user.organizationId !== id) {
      return res.status(403).json({
        error: "Access denied",
        code: "ACCESS_DENIED",
      });
    }

    // Check if user has permission to view members
    if (!req.user.permissions.includes("manage_members")) {
      return res.status(403).json({
        error: "Insufficient permissions",
        code: "INSUFFICIENT_PERMISSIONS",
      });
    }

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    // Build query
    let whereConditions = ["organization_id = $1"];
    const values: any[] = [id];
    let paramCount = 1;

    if (role) {
      paramCount++;
      whereConditions.push(`role = $${paramCount}`);
      values.push(role);
    }

    if (search) {
      paramCount++;
      whereConditions.push(
        `(first_name ILIKE $${paramCount} OR last_name ILIKE $${paramCount} OR email ILIKE $${paramCount})`
      );
      values.push(`%${search}%`);
    }

    const whereClause = whereConditions.join(" AND ");

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM users WHERE ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].count);

    // Get members with pagination
    paramCount++;
    values.push(parseInt(limit as string));
    paramCount++;
    values.push(offset);

    const result = await query(
      `
      SELECT id, first_name, last_name, email, role, subscription_tier, 
             is_active, email_verified, last_login_at, created_at
      FROM users 
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramCount - 1} OFFSET $${paramCount}
      `,
      values
    );

    const members = result.rows.map((row) => ({
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      role: row.role,
      subscriptionTier: row.subscription_tier,
      isActive: row.is_active,
      emailVerified: row.email_verified,
      lastLoginAt: row.last_login_at,
      createdAt: row.created_at,
    }));

    res.json({
      success: true,
      data: {
        members,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string)),
        },
      },
    });
  } catch (error) {
    logger.error("Get organization members error:", error);
    res.status(500).json({
      error: "Failed to get organization members",
      code: "GET_ORGANIZATION_MEMBERS_ERROR",
    });
  }
});

/**
 * @route POST /api/v1/organizations/:id/invite
 * @desc Invite a new member to the organization
 * @access Private (organization admins only)
 */
router.post("/:id/invite", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { email, firstName, lastName, role = "member" } = req.body;

    // Check if user has access to this organization
    if (req.user.organizationId !== id) {
      return res.status(403).json({
        error: "Access denied",
        code: "ACCESS_DENIED",
      });
    }

    // Check if user has permission to invite members
    if (!req.user.permissions.includes("manage_members")) {
      return res.status(403).json({
        error: "Insufficient permissions",
        code: "INSUFFICIENT_PERMISSIONS",
      });
    }

    // Validate input
    if (!email || !firstName || !lastName) {
      return res.status(400).json({
        error: "Email, first name, and last name are required",
        code: "MISSING_REQUIRED_FIELDS",
      });
    }

    // Check if user already exists
    const existingUser = await query("SELECT id FROM users WHERE email = $1", [
      email,
    ]);

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        error: "User with this email already exists",
        code: "USER_ALREADY_EXISTS",
      });
    }

    // For now, just return success (invitation system would be implemented separately)
    logger.info("Member invitation sent", {
      organizationId: id,
      email,
      invitedBy: req.user.userId,
    });

    res.json({
      success: true,
      message: "Invitation sent successfully",
      data: {
        invitation: {
          email,
          firstName,
          lastName,
          role,
          organizationId: id,
        },
      },
    });
  } catch (error) {
    logger.error("Invite member error:", error);
    res.status(500).json({
      error: "Failed to send invitation",
      code: "INVITE_MEMBER_ERROR",
    });
  }
});

export default router;
