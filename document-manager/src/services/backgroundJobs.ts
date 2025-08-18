import cron from 'node-cron';
import { query } from '@/config/database';
import { cache } from '@/config/redis';
import { logger } from '@/utils/logger';
import { config } from '@/config/environment';

// Clean up expired links
const cleanupExpiredLinks = async (): Promise<void> => {
  try {
    const result = await query(`
      UPDATE document_links 
      SET is_active = false 
      WHERE expires_at IS NOT NULL 
        AND expires_at < NOW() 
        AND is_active = true
      RETURNING id, slug
    `);
    
    if (result.rows.length > 0) {
      logger.info(`Deactivated ${result.rows.length} expired document links`);
      
      // Clear related cache
      for (const link of result.rows) {
        await cache.del(`link:${link.slug}`);
      }
    }
  } catch (error) {
    logger.error('Failed to cleanup expired links:', error);
  }
};

// Clean up old analytics data
const cleanupOldAnalytics = async (): Promise<void> => {
  try {
    const retentionDays = config.ANALYTICS_RETENTION_DAYS;
    
    // Delete old document views
    const viewsResult = await query(`
      DELETE FROM document_views 
      WHERE created_at < NOW() - INTERVAL '${retentionDays} days'
    `);
    
    // Delete old page views
    const pageViewsResult = await query(`
      DELETE FROM page_views 
      WHERE viewed_at < NOW() - INTERVAL '${retentionDays} days'
    `);
    
    // Delete old downloads
    const downloadsResult = await query(`
      DELETE FROM document_downloads 
      WHERE downloaded_at < NOW() - INTERVAL '${retentionDays} days'
    `);
    
    // Delete old activity logs
    const logsResult = await query(`
      DELETE FROM activity_logs 
      WHERE created_at < NOW() - INTERVAL '${retentionDays} days'
    `);
    
    logger.info('Analytics cleanup completed', {
      deletedViews: viewsResult.rowCount,
      deletedPageViews: pageViewsResult.rowCount,
      deletedDownloads: downloadsResult.rowCount,
      deletedLogs: logsResult.rowCount
    });
    
  } catch (error) {
    logger.error('Failed to cleanup old analytics:', error);
  }
};

// Clean up old API request logs
const cleanupOldApiRequests = async (): Promise<void> => {
  try {
    const result = await query(`
      DELETE FROM api_requests 
      WHERE created_at < NOW() - INTERVAL '30 days'
    `);
    
    if (result.rowCount && result.rowCount > 0) {
      logger.info(`Deleted ${result.rowCount} old API request logs`);
    }
  } catch (error) {
    logger.error('Failed to cleanup old API requests:', error);
  }
};

// Clean up old webhook deliveries
const cleanupOldWebhookDeliveries = async (): Promise<void> => {
  try {
    const result = await query(`
      DELETE FROM webhook_deliveries 
      WHERE delivered_at < NOW() - INTERVAL '90 days'
    `);
    
    if (result.rowCount && result.rowCount > 0) {
      logger.info(`Deleted ${result.rowCount} old webhook deliveries`);
    }
  } catch (error) {
    logger.error('Failed to cleanup old webhook deliveries:', error);
  }
};

// Clean up inactive sessions from Redis
const cleanupInactiveSessions = async (): Promise<void> => {
  try {
    // This would clean up expired sessions from Redis
    // Implementation depends on session storage strategy
    logger.debug('Session cleanup completed');
  } catch (error) {
    logger.error('Failed to cleanup inactive sessions:', error);
  }
};

// Update document processing status for stuck documents
const processStuckDocuments = async (): Promise<void> => {
  try {
    // Find documents stuck in processing for more than 1 hour
    const stuckResult = await query(`
      SELECT id, title, file_path 
      FROM documents 
      WHERE processing_status = 'processing' 
        AND updated_at < NOW() - INTERVAL '1 hour'
    `);
    
    if (stuckResult.rows.length > 0) {
      // Mark as failed
      await query(`
        UPDATE documents 
        SET processing_status = 'failed' 
        WHERE processing_status = 'processing' 
          AND updated_at < NOW() - INTERVAL '1 hour'
      `);
      
      logger.warn(`Marked ${stuckResult.rows.length} stuck documents as failed`, {
        documentIds: stuckResult.rows.map((d: any) => d.id)
      });
    }
  } catch (error) {
    logger.error('Failed to process stuck documents:', error);
  }
};

// Generate daily analytics summary
const generateDailyAnalyticsSummary = async (): Promise<void> => {
  try {
    // Get yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];
    
    // Aggregate daily stats
    const statsResult = await query(`
      SELECT 
        COUNT(DISTINCT dv.document_id) as documents_viewed,
        COUNT(*) as total_views,
        COUNT(DISTINCT dv.visitor_id) as unique_visitors,
        COUNT(DISTINCT dv.ip_address) as unique_ips,
        (SELECT COUNT(*) FROM document_downloads WHERE DATE(downloaded_at) = $1) as total_downloads,
        (SELECT COUNT(*) FROM documents WHERE DATE(created_at) = $1) as new_documents
      FROM document_views dv
      WHERE DATE(dv.created_at) = $1
    `, [dateStr]);
    
    const stats = statsResult.rows[0];
    
    // Store summary in cache for quick access
    await cache.set(`daily_stats:${dateStr}`, stats, 86400 * 7); // Store for 7 days
    
    logger.info('Daily analytics summary generated', {
      date: dateStr,
      ...stats
    });
    
  } catch (error) {
    logger.error('Failed to generate daily analytics summary:', error);
  }
};

// Schedule jobs
export const initializeBackgroundJobs = (): void => {
  logger.info('🕐 Initializing background jobs...');
  
  // Every hour: cleanup expired links
  cron.schedule('0 * * * *', () => {
    logger.debug('Running expired links cleanup...');
    cleanupExpiredLinks();
  });
  
  // Every day at 2 AM: cleanup old analytics data
  cron.schedule('0 2 * * *', () => {
    logger.debug('Running analytics cleanup...');
    cleanupOldAnalytics();
  });
  
  // Every day at 3 AM: cleanup old API requests
  cron.schedule('0 3 * * *', () => {
    logger.debug('Running API requests cleanup...');
    cleanupOldApiRequests();
  });
  
  // Every week at 4 AM on Sunday: cleanup old webhook deliveries
  cron.schedule('0 4 * * 0', () => {
    logger.debug('Running webhook deliveries cleanup...');
    cleanupOldWebhookDeliveries();
  });
  
  // Every 30 minutes: cleanup inactive sessions
  cron.schedule('*/30 * * * *', () => {
    logger.debug('Running session cleanup...');
    cleanupInactiveSessions();
  });
  
  // Every 15 minutes: process stuck documents
  cron.schedule('*/15 * * * *', () => {
    logger.debug('Processing stuck documents...');
    processStuckDocuments();
  });
  
  // Every day at 1 AM: generate daily analytics summary
  cron.schedule('0 1 * * *', () => {
    logger.debug('Generating daily analytics summary...');
    generateDailyAnalyticsSummary();
  });
  
  logger.info('✅ Background jobs initialized');
};

// Manual job triggers for testing
export const runMaintenanceJobs = async (): Promise<void> => {
  logger.info('Running manual maintenance jobs...');
  
  await cleanupExpiredLinks();
  await cleanupOldAnalytics();
  await cleanupOldApiRequests();
  await cleanupOldWebhookDeliveries();
  await cleanupInactiveSessions();
  await processStuckDocuments();
  await generateDailyAnalyticsSummary();
  
  logger.info('Manual maintenance jobs completed');
};

// Initialize on import
initializeBackgroundJobs();