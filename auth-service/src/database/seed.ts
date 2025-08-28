import { query } from "../config/database";
import { logger } from "../utils/logger";
import bcrypt from "bcryptjs";

const seedDatabase = async () => {
  try {
    logger.info("🌱 Starting database seeding...");

    // Check if data already exists
    const existingUsers = await query("SELECT COUNT(*) as count FROM users");
    if (parseInt(existingUsers.rows[0].count) > 0) {
      logger.info("⚠️ Database already has data, skipping seed");
      return;
    }

    // Create test users
    const testUsers = [
      {
        email: "test@example.com",
        password: "password123",
        firstName: "Test",
        lastName: "User",
        serviceType: "ai-resume",
        role: "user",
      },
      {
        email: "admin@example.com",
        password: "admin123",
        firstName: "Admin",
        lastName: "User",
        serviceType: "both",
        role: "admin",
      },
      {
        email: "viewer@example.com",
        password: "viewer123",
        firstName: "Viewer",
        lastName: "User",
        serviceType: "document-service",
        role: "viewer",
      },
    ];

    // Get default organization
    const defaultOrg = await query(
      "SELECT id FROM organizations WHERE slug = 'default'"
    );
    const organizationId = defaultOrg.rows[0]?.id;

    if (!organizationId) {
      throw new Error("Default organization not found");
    }

    // Create test users
    for (const userData of testUsers) {
      const passwordHash = await bcrypt.hash(userData.password, 12);

      await query(
        `INSERT INTO users (email, password_hash, first_name, last_name, organization_id, role, service_type, is_active, is_email_verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          userData.email,
          passwordHash,
          userData.firstName,
          userData.lastName,
          organizationId,
          userData.role,
          userData.serviceType,
          true,
          true,
        ]
      );

      logger.info(`✅ Created test user: ${userData.email}`);
    }

    // Create test organization
    const testOrg = await query(
      `INSERT INTO organizations (name, slug, description, domain, max_users)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [
        "Test Organization",
        "test-org",
        "A test organization for development",
        "test.example.com",
        25,
      ]
    );

    logger.info("✅ Created test organization");

    // Add test users to test organization
    const testOrgId = testOrg.rows[0].id;

    await query(
      "UPDATE users SET organization_id = $1 WHERE email = 'admin@example.com'",
      [testOrgId]
    );

    // Create test subscriptions
    const freePlan = await query(
      "SELECT id FROM subscription_plans WHERE name = 'Free'"
    );
    const proPlan = await query(
      "SELECT id FROM subscription_plans WHERE name = 'Pro'"
    );

    if (freePlan.rows.length > 0 && proPlan.rows.length > 0) {
      const users = await query("SELECT id FROM users LIMIT 2");

      // Create subscription for first user (Free plan)
      await query(
        `INSERT INTO subscriptions (user_id, plan_id, status, current_period_start, current_period_end)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          users.rows[0].id,
          freePlan.rows[0].id,
          "active",
          new Date(),
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        ]
      );

      // Create subscription for second user (Pro plan)
      await query(
        `INSERT INTO subscriptions (user_id, plan_id, status, current_period_start, current_period_end)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          users.rows[1].id,
          proPlan.rows[0].id,
          "active",
          new Date(),
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        ]
      );

      logger.info("✅ Created test subscriptions");
    }

    logger.info("🎉 Database seeding completed successfully!");
  } catch (error) {
    logger.error("❌ Seeding failed:", error);
    throw error;
  }
};

// Run seeding if called directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      logger.info("Seeding completed");
      process.exit(0);
    })
    .catch((error) => {
      logger.error("Seeding failed:", error);
      process.exit(1);
    });
}

export { seedDatabase };
