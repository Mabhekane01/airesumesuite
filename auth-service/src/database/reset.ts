import { query } from "../config/database";
import { logger } from "../utils/logger";

const resetDatabase = async () => {
  try {
    logger.info("🗑️ Starting database reset...");

    // Drop all tables in reverse order of dependencies
    const tables = [
      "sessions",
      "resource_usage",
      "subscription_events",
      "subscriptions",
      "users",
      "organizations",
      "subscription_plans",
    ];

    for (const table of tables) {
      try {
        await query(`DROP TABLE IF EXISTS ${table} CASCADE`);
        logger.info(`✅ Dropped table: ${table}`);
      } catch (error) {
        logger.warn(`⚠️ Could not drop table ${table}:`, error);
      }
    }

    // Drop functions
    try {
      await query("DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE");
      await query("DROP FUNCTION IF EXISTS cleanup_expired_sessions() CASCADE");
      await query(
        "DROP FUNCTION IF EXISTS cleanup_expired_refresh_tokens() CASCADE"
      );
      logger.info("✅ Dropped functions");
    } catch (error) {
      logger.warn("⚠️ Could not drop functions:", error);
    }

    // Drop extensions
    try {
      await query('DROP EXTENSION IF EXISTS "uuid-ossp"');
      logger.info("✅ Dropped extensions");
    } catch (error) {
      logger.warn("⚠️ Could not drop extensions:", error);
    }

    logger.info("🎉 Database reset completed successfully!");
    logger.info("💡 Run 'pnpm db:migrate' to recreate the schema");
    logger.info("💡 Run 'pnpm db:seed' to populate with test data");
  } catch (error) {
    logger.error("❌ Reset failed:", error);
    throw error;
  }
};

// Run reset if called directly
if (require.main === module) {
  resetDatabase()
    .then(() => {
      logger.info("Reset completed");
      process.exit(0);
    })
    .catch((error) => {
      logger.error("Reset failed:", error);
      process.exit(1);
    });
}

export { resetDatabase };
