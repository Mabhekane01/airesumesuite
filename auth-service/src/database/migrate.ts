import { readFileSync } from "fs";
import { join } from "path";
import { connectDB, query } from "../config/database";
import { logger } from "../utils/logger";

const runMigration = async () => {
  try {
    logger.info("🚀 Starting database migration...");

    // Connect to database
    await connectDB();
    logger.info("✅ Database connected");

    // Read schema file
    const schemaPath = join(__dirname, "../../database/schema.sql");
    const schema = readFileSync(schemaPath, "utf8");

    // Split schema into individual statements
    const statements = schema
      .split(";")
      .map((stmt) => stmt.trim())
      .filter(
        (stmt): stmt is string => stmt.length > 0 && !stmt.startsWith("--")
      );

    logger.info(`📝 Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement && statement.trim()) {
        try {
          await query(statement);
          logger.info(`✅ Executed statement ${i + 1}/${statements.length}`);
        } catch (error) {
          // Skip errors for statements that might already exist
          if (
            error instanceof Error &&
            error.message.includes("already exists")
          ) {
            logger.warn(`⚠️ Statement ${i + 1} already exists, skipping`);
          } else {
            logger.error(`❌ Error executing statement ${i + 1}:`, error);
            throw error;
          }
        }
      }
    }

    logger.info("🎉 Database migration completed successfully!");
  } catch (error) {
    logger.error("❌ Migration failed:", error);
    process.exit(1);
  }
};

// Run migration if called directly
if (require.main === module) {
  runMigration()
    .then(() => {
      logger.info("Migration completed");
      process.exit(0);
    })
    .catch((error) => {
      logger.error("Migration failed:", error);
      process.exit(1);
    });
}

export { runMigration };
