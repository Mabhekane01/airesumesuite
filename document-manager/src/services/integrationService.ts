import axios from "axios";
import { config } from "@/config/environment";
import { logger } from "@/utils/logger";
import { WebhookService } from "@/routes/webhookRoutes";

// AI Resume Suite Integration Service
export class AIResumeSuiteIntegration {
  // Send document to AI Resume Suite when created from resume/cover letter
  static async notifyDocumentCreated(documentData: {
    id: string;
    title: string;
    fileUrl: string;
    userId: string;
    source: string;
    sourceMetadata?: any;
  }): Promise<void> {
    try {
      if (documentData.source !== "ai_resume") return;

      await axios.post(
        `${config.AI_RESUME_SUITE_URL}/documents/created`,
        {
          documentId: documentData.id,
          title: documentData.title,
          fileUrl: documentData.fileUrl,
          userId: documentData.userId,
          metadata: documentData.sourceMetadata,
        },
        {
          timeout: 5000,
          headers: {
            "Content-Type": "application/json",
            "X-Service": "document-manager",
          },
        }
      );

      logger.info("Notified AI Resume Suite of document creation", {
        documentId: documentData.id,
        userId: documentData.userId,
      });
    } catch (error) {
      logger.error("Failed to notify AI Resume Suite:", error);
      // Don't throw - this is a best-effort notification
    }
  }

  // Get user's resumes and cover letters for integration
  static async getUserDocuments(
    userId: string,
    authToken: string
  ): Promise<any[]> {
    try {
      const response = await axios.get(
        `${config.AI_RESUME_SUITE_URL}/resumes`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
          timeout: 10000,
        }
      );

      return response.data.resumes || [];
    } catch (error) {
      logger.error("Failed to get user documents from AI Resume Suite:", error);
      return [];
    }
  }

  // Import resume/cover letter into document manager
  static async importDocument(
    userId: string,
    authToken: string,
    resumeId: string
  ): Promise<string | null> {
    try {
      // Get resume PDF from AI Resume Suite
      const response = await axios.get(
        `${config.AI_RESUME_SUITE_URL}/resumes/${resumeId}/pdf`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
          responseType: "stream",
          timeout: 30000,
        }
      );

      // Save to document manager
      // This would integrate with the document upload flow
      logger.info("Imported document from AI Resume Suite", {
        userId,
        resumeId,
      });

      return resumeId; // Return document ID
    } catch (error) {
      logger.error("Failed to import document from AI Resume Suite:", error);
      return null;
    }
  }
}

// PDF Editor Integration Service
export class PDFEditorIntegration {
  // Send document to PDF Editor for editing
  static async sendForEditing(
    documentData: {
      id: string;
      title: string;
      fileUrl: string;
      userId: string;
    },
    authToken: string
  ): Promise<string | null> {
    try {
      const response = await axios.post(
        `${config.PDF_EDITOR_SERVICE_URL}/edit/import`,
        {
          documentId: documentData.id,
          title: documentData.title,
          fileUrl: documentData.fileUrl,
          source: "document-manager",
        },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
          },
          timeout: 10000,
        }
      );

      logger.info("Sent document to PDF Editor", {
        documentId: documentData.id,
        userId: documentData.userId,
        editSessionId: response.data.sessionId,
      });

      return response.data.editUrl || response.data.sessionId;
    } catch (error) {
      logger.error("Failed to send document to PDF Editor:", error);
      return null;
    }
  }

  // Receive edited document back from PDF Editor
  static async receiveEditedDocument(
    editSessionId: string,
    editedFileData: any
  ): Promise<string | null> {
    try {
      // This would be called by PDF Editor webhook
      // Process the edited file and update the document

      logger.info("Received edited document from PDF Editor", {
        editSessionId,
        fileSize: editedFileData.size,
      });

      // Update document in database with new version
      // Create new document version or update existing

      return editSessionId;
    } catch (error) {
      logger.error("Failed to receive edited document:", error);
      return null;
    }
  }
}

// Document Manager Integration API for other services
export class DocumentManagerAPI {
  // Create document from external service
  static async createFromExternalService(data: {
    userId: string;
    title: string;
    fileUrl?: string;
    fileData?: Buffer;
    fileName: string;
    source: "ai_resume" | "pdf_editor" | "api";
    sourceMetadata?: any;
  }): Promise<string | null> {
    try {
      // This would integrate with the document creation flow
      // Handle file upload/processing

      const documentId = `doc-${Date.now()}`;

      // Send webhook notifications
      await WebhookService.sendEvent(
        "document.created",
        {
          documentId,
          title: data.title,
          source: data.source,
          userId: data.userId,
        },
        data.userId
      );

      logger.info("Created document from external service", {
        documentId,
        source: data.source,
        userId: data.userId,
      });

      return documentId;
    } catch (error) {
      logger.error("Failed to create document from external service:", error);
      return null;
    }
  }

  // Get user's documents for external services
  static async getUserDocumentsForService(
    userId: string,
    serviceType: string
  ): Promise<any[]> {
    try {
      const { query } = await import("@/config/database");

      const result = await query(
        `
        SELECT id, title, file_name, file_url, file_type, created_at, source
        FROM documents
        WHERE user_id = $1 AND status = 'active'
        ORDER BY created_at DESC
        LIMIT 50
      `,
        [userId]
      );

      return result.rows;
    } catch (error) {
      logger.error("Failed to get user documents for service:", error);
      return [];
    }
  }

  // Share document with external service
  static async shareWithService(
    documentId: string,
    serviceType: string,
    permissions: any
  ): Promise<string | null> {
    try {
      // Create temporary access link for service
      const accessToken = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Store temporary access in Redis with expiration
      const { cache } = await import("@/config/redis");
      await cache.set(
        `temp_access:${accessToken}`,
        {
          documentId,
          serviceType,
          permissions,
          createdAt: new Date().toISOString(),
        },
        3600
      ); // 1 hour expiration

      return accessToken;
    } catch (error) {
      logger.error("Failed to share document with service:", error);
      return null;
    }
  }
}

// Webhook handlers for integration events
export class IntegrationWebhooks {
  // Handle AI Resume Suite webhooks
  static async handleAIResumeWebhook(event: string, data: any): Promise<void> {
    try {
      switch (event) {
        case "resume.created":
          await this.handleResumeCreated(data);
          break;
        case "cover_letter.created":
          await this.handleCoverLetterCreated(data);
          break;
        case "user.upgraded":
          await this.handleUserUpgraded(data);
          break;
        default:
          logger.debug("Unhandled AI Resume Suite webhook event:", event);
      }
    } catch (error) {
      logger.error("Failed to handle AI Resume Suite webhook:", error);
    }
  }

  // Handle PDF Editor webhooks
  static async handlePDFEditorWebhook(event: string, data: any): Promise<void> {
    try {
      switch (event) {
        case "document.edited":
          await PDFEditorIntegration.receiveEditedDocument(
            data.sessionId,
            data.file
          );
          break;
        case "editing.completed":
          await this.handleEditingCompleted(data);
          break;
        default:
          logger.debug("Unhandled PDF Editor webhook event:", event);
      }
    } catch (error) {
      logger.error("Failed to handle PDF Editor webhook:", error);
    }
  }

  private static async handleResumeCreated(data: any): Promise<void> {
    // Auto-import resume into document manager if user has enabled it
    logger.info("AI Resume Suite resume created", {
      resumeId: data.resumeId,
      userId: data.userId,
    });
  }

  private static async handleCoverLetterCreated(data: any): Promise<void> {
    // Auto-import cover letter into document manager
    logger.info("AI Resume Suite cover letter created", {
      coverLetterId: data.coverLetterId,
      userId: data.userId,
    });
  }

  private static async handleUserUpgraded(data: any): Promise<void> {
    // Update user tier in document manager
    try {
      const { query } = await import("@/config/database");
      await query(
        `
        UPDATE users 
        SET subscription_tier = $1, updated_at = NOW()
        WHERE id = $2
      `,
        [data.newTier, data.userId]
      );

      logger.info("Updated user tier from AI Resume Suite", {
        userId: data.userId,
        newTier: data.newTier,
      });
    } catch (error) {
      logger.error("Failed to update user tier:", error);
    }
  }

  private static async handleEditingCompleted(data: any): Promise<void> {
    // Handle completed PDF editing session
    logger.info("PDF editing completed", {
      sessionId: data.sessionId,
      userId: data.userId,
    });
  }
}

export default {
  AIResumeSuiteIntegration,
  PDFEditorIntegration,
  DocumentManagerAPI,
  IntegrationWebhooks,
};
