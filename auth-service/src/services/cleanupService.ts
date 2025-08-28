import { logger } from "../utils/logger";
import { OTPService } from "./otpService";
import { SessionService } from "./sessionService";

export class CleanupService {
  private static cleanupInterval: NodeJS.Timeout | null = null;
  private static readonly CLEANUP_INTERVAL = 10 * 60 * 1000; // 10 minutes (increased for better performance)

  /**
   * Start the cleanup service
   */
  static start(): void {
    if (this.cleanupInterval) {
      logger.warn("Cleanup service already running");
      return;
    }

    this.cleanupInterval = setInterval(async () => {
      try {
        await this.performCleanup();
      } catch (error) {
        logger.error("Cleanup service error", { error });
      }
    }, this.CLEANUP_INTERVAL);

    logger.info("Cleanup service started", { interval: this.CLEANUP_INTERVAL });
  }

  /**
   * Stop the cleanup service
   */
  static stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      logger.info("Cleanup service stopped");
    }
  }

  /**
   * Perform all cleanup tasks
   */
  private static async performCleanup(): Promise<void> {
    const startTime = Date.now();
    logger.debug("Starting cleanup cycle");

    try {
      // Clean up expired OTPs
      const otpCleaned = await OTPService.cleanupExpiredOTPs();

      // Clean up expired sessions
      const sessionCleaned = await SessionService.cleanupExpiredSessions();

      const duration = Date.now() - startTime;
      logger.info("Cleanup cycle completed", {
        otpCleaned,
        sessionCleaned,
        duration: `${duration}ms`,
      });
    } catch (error) {
      logger.error("Cleanup cycle failed", {
        error,
        duration: Date.now() - startTime,
      });
    }
  }

  /**
   * Force immediate cleanup
   */
  static async forceCleanup(): Promise<void> {
    logger.info("Forcing immediate cleanup");
    await this.performCleanup();
  }

  /**
   * Get cleanup service status
   */
  static getStatus(): { running: boolean; interval: number } {
    return {
      running: this.cleanupInterval !== null,
      interval: this.CLEANUP_INTERVAL,
    };
  }
}
