import cron from 'node-cron';
import { cleanupExpiredTokens } from '../utils/tokenCleanup';

class TokenCleanupScheduler {
  private isRunning = false;
  private cleanupTask: cron.ScheduledTask | null = null;

  /**
   * Start the token cleanup scheduler
   * Runs every 6 hours by default
   */
  start(schedule: string = '0 */6 * * *') { // Every 6 hours
    if (this.isRunning) {
      console.log('🧹 Token cleanup scheduler is already running');
      return;
    }

    console.log(`🧹 Starting token cleanup scheduler (${schedule})`);
    
    this.cleanupTask = cron.schedule(schedule, async () => {
      console.log('🧹 Running scheduled token cleanup...');
      try {
        const result = await cleanupExpiredTokens();
        console.log(`✅ Scheduled cleanup completed: ${result.tokensRemoved} tokens removed, ${result.oldSessionsClosed} old sessions closed`);
      } catch (error) {
        console.error('❌ Scheduled token cleanup failed:', error);
      }
    }, {
      scheduled: false,
      timezone: 'UTC'
    });

    this.cleanupTask.start();
    this.isRunning = true;
    console.log('✅ Token cleanup scheduler started successfully');
  }

  /**
   * Stop the token cleanup scheduler
   */
  stop() {
    if (this.cleanupTask) {
      this.cleanupTask.stop();
      this.cleanupTask = null;
    }
    this.isRunning = false;
    console.log('🛑 Token cleanup scheduler stopped');
  }

  /**
   * Run cleanup manually
   */
  async runNow() {
    console.log('🧹 Running manual token cleanup...');
    try {
      const result = await cleanupExpiredTokens();
      console.log(`✅ Manual cleanup completed: ${result.tokensRemoved} tokens removed, ${result.oldSessionsClosed} old sessions closed`);
      return result;
    } catch (error) {
      console.error('❌ Manual token cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      nextRun: this.isRunning ? 'Scheduled (every 6 hours)' : null
    };
  }
}

export const tokenCleanupScheduler = new TokenCleanupScheduler();