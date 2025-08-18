import { Router } from "express";
import { body, param, query } from "express-validator";
import { requireSubscription } from "@/middleware/auth";
import { validationErrorHandler } from "@/middleware/errorHandler";
import {
  // AI Integration
  analyzeDocumentWithAI,
  generateDocumentSummary,
  extractDocumentData,
  translateDocument,
  optimizeDocumentContent,

  // External Service Integrations
  connectGoogleDrive,
  connectDropbox,
  connectOneDrive,
  connectBox,
  connectSlack,
  connectTeams,
  connectZoom,
  connectNotion,
  connectAirtable,

  // Workflow Automation
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  executeWorkflow,
  getWorkflowStatus,
  getWorkflowHistory,

  // API Integrations
  createWebhook,
  updateWebhook,
  deleteWebhook,
  testWebhook,
  getWebhookLogs,

  // Third-party Integrations
  integrateWithCRM,
  integrateWithEmailMarketing,
  integrateWithProjectManagement,
  integrateWithAccounting,
  integrateWithHR,

  // Data Sync
  syncExternalData,
  getSyncStatus,
  forceSync,
  configureSyncSchedule,

  // Advanced Features
  enableRealTimeCollaboration,
  setupDocumentApprovalWorkflow,
  configureAutomatedBackup,
  setupDisasterRecovery,
  enableAdvancedSecurity,
} from "@/controllers/integrationController";

const router = Router();

// Validation middleware
const validateRequest = (req: any, res: any, next: any) => {
  const errors = require("express-validator").validationResult(req);
  if (!errors.isEmpty()) {
    throw validationErrorHandler(errors.array());
  }
  next();
};

// ===== AI INTEGRATION ENDPOINTS =====

// Analyze document with AI
router.post(
  "/ai/analyze",
  [
    body("documentId").isUUID().withMessage("Invalid document ID"),
    body("analysisType")
      .isIn([
        "content",
        "sentiment",
        "readability",
        "compliance",
        "security",
        "comprehensive",
      ])
      .withMessage("Invalid analysis type"),
    body("options")
      .optional()
      .isObject()
      .withMessage("Options must be an object"),
    body("includeRecommendations")
      .optional()
      .isBoolean()
      .withMessage("Include recommendations must be boolean"),
    body("language")
      .optional()
      .isString()
      .withMessage("Language must be a string"),
  ],
  validateRequest,
  requireSubscription(["enterprise"]),
  analyzeDocumentWithAI
);

// Generate AI-powered document summary
router.post(
  "/ai/summary",
  [
    body("documentId").isUUID().withMessage("Invalid document ID"),
    body("summaryType")
      .isIn(["executive", "detailed", "bullet_points", "key_insights"])
      .withMessage("Invalid summary type"),
    body("maxLength")
      .optional()
      .isInt({ min: 100, max: 2000 })
      .withMessage("Max length must be 100-2000 characters"),
    body("includeActionItems")
      .optional()
      .isBoolean()
      .withMessage("Include action items must be boolean"),
    body("includeMetrics")
      .optional()
      .isBoolean()
      .withMessage("Include metrics must be boolean"),
  ],
  validateRequest,
  requireSubscription(["pro", "enterprise"]),
  generateDocumentSummary
);

// Extract structured data from documents
router.post(
  "/ai/extract",
  [
    body("documentId").isUUID().withMessage("Invalid document ID"),
    body("extractionType")
      .isIn(["tables", "forms", "invoices", "contracts", "resumes", "custom"])
      .withMessage("Invalid extraction type"),
    body("fields").optional().isArray().withMessage("Fields must be an array"),
    body("confidenceThreshold")
      .optional()
      .isFloat({ min: 0.1, max: 1.0 })
      .withMessage("Confidence threshold must be 0.1-1.0"),
    body("outputFormat")
      .optional()
      .isIn(["json", "csv", "xml"])
      .withMessage("Output format must be json, csv, or xml"),
  ],
  validateRequest,
  requireSubscription(["enterprise"]),
  extractDocumentData
);

// Translate document content
router.post(
  "/ai/translate",
  [
    body("documentId").isUUID().withMessage("Invalid document ID"),
    body("targetLanguage")
      .isString()
      .withMessage("Target language is required"),
    body("sourceLanguage")
      .optional()
      .isString()
      .withMessage("Source language must be a string"),
    body("preserveFormatting")
      .optional()
      .isBoolean()
      .withMessage("Preserve formatting must be boolean"),
    body("includeGlossary")
      .optional()
      .isBoolean()
      .withMessage("Include glossary must be boolean"),
  ],
  validateRequest,
  requireSubscription(["enterprise"]),
  translateDocument
);

// Optimize document content with AI
router.post(
  "/ai/optimize",
  [
    body("documentId").isUUID().withMessage("Invalid document ID"),
    body("optimizationType")
      .isIn(["readability", "seo", "accessibility", "compliance", "branding"])
      .withMessage("Invalid optimization type"),
    body("targetAudience")
      .optional()
      .isString()
      .withMessage("Target audience must be a string"),
    body("industry")
      .optional()
      .isString()
      .withMessage("Industry must be a string"),
    body("preserveOriginal")
      .optional()
      .isBoolean()
      .withMessage("Preserve original must be boolean"),
  ],
  validateRequest,
  requireSubscription(["enterprise"]),
  optimizeDocumentContent
);

// ===== EXTERNAL SERVICE INTEGRATIONS =====

// Google Drive integration
router.post(
  "/connect/google-drive",
  [
    body("clientId").isString().withMessage("Client ID is required"),
    body("clientSecret").isString().withMessage("Client secret is required"),
    body("redirectUri").isURL().withMessage("Valid redirect URI is required"),
    body("scopes").isArray().withMessage("Scopes must be an array"),
    body("autoSync")
      .optional()
      .isBoolean()
      .withMessage("Auto sync must be boolean"),
  ],
  validateRequest,
  requireSubscription(["pro", "enterprise"]),
  connectGoogleDrive
);

// Dropbox integration
router.post(
  "/connect/dropbox",
  [
    body("appKey").isString().withMessage("App key is required"),
    body("appSecret").isString().withMessage("App secret is required"),
    body("redirectUri").isURL().withMessage("Valid redirect URI is required"),
    body("autoSync")
      .optional()
      .isBoolean()
      .withMessage("Auto sync must be boolean"),
  ],
  validateRequest,
  requireSubscription(["pro", "enterprise"]),
  connectDropbox
);

// OneDrive integration
router.post(
  "/connect/onedrive",
  [
    body("clientId").isString().withMessage("Client ID is required"),
    body("clientSecret").isString().withMessage("Client secret is required"),
    body("redirectUri").isURL().withMessage("Valid redirect URI is required"),
    body("autoSync")
      .optional()
      .isBoolean()
      .withMessage("Auto sync must be boolean"),
  ],
  validateRequest,
  requireSubscription(["pro", "enterprise"]),
  connectOneDrive
);

// Box integration
router.post(
  "/connect/box",
  [
    body("clientId").isString().withMessage("Client ID is required"),
    body("clientSecret").isString().withMessage("Client secret is required"),
    body("redirectUri").isURL().withMessage("Valid redirect URI is required"),
    body("autoSync")
      .optional()
      .isBoolean()
      .withMessage("Auto sync must be boolean"),
  ],
  validateRequest,
  requireSubscription(["enterprise"]),
  connectBox
);

// Slack integration
router.post(
  "/connect/slack",
  [
    body("clientId").isString().withMessage("Client ID is required"),
    body("clientSecret").isString().withMessage("Client secret is required"),
    body("redirectUri").isURL().withMessage("Valid redirect URI is required"),
    body("channels")
      .optional()
      .isArray()
      .withMessage("Channels must be an array"),
    body("notifications")
      .optional()
      .isObject()
      .withMessage("Notifications must be an object"),
  ],
  validateRequest,
  requireSubscription(["pro", "enterprise"]),
  connectSlack
);

// Microsoft Teams integration
router.post(
  "/connect/teams",
  [
    body("clientId").isString().withMessage("Client ID is required"),
    body("clientSecret").isString().withMessage("Client secret is required"),
    body("redirectUri").isURL().withMessage("Valid redirect URI is required"),
    body("teams").optional().isArray().withMessage("Teams must be an array"),
    body("autoSync")
      .optional()
      .isBoolean()
      .withMessage("Auto sync must be boolean"),
  ],
  validateRequest,
  requireSubscription(["enterprise"]),
  connectTeams
);

// Zoom integration
router.post(
  "/connect/zoom",
  [
    body("clientId").isString().withMessage("Client ID is required"),
    body("clientSecret").isString().withMessage("Client secret is required"),
    body("redirectUri").isURL().withMessage("Valid redirect URI is required"),
    body("autoRecord")
      .optional()
      .isBoolean()
      .withMessage("Auto record must be boolean"),
  ],
  validateRequest,
  requireSubscription(["enterprise"]),
  connectZoom
);

// Notion integration
router.post(
  "/connect/notion",
  [
    body("clientId").isString().withMessage("Client ID is required"),
    body("clientSecret").isString().withMessage("Client secret is required"),
    body("redirectUri").isURL().withMessage("Valid redirect URI is required"),
    body("databases")
      .optional()
      .isArray()
      .withMessage("Databases must be an array"),
    body("autoSync")
      .optional()
      .isBoolean()
      .withMessage("Auto sync must be boolean"),
  ],
  validateRequest,
  requireSubscription(["enterprise"]),
  connectNotion
);

// Airtable integration
router.post(
  "/connect/airtable",
  [
    body("apiKey").isString().withMessage("API key is required"),
    body("baseId").isString().withMessage("Base ID is required"),
    body("tables").optional().isArray().withMessage("Tables must be an array"),
    body("autoSync")
      .optional()
      .isBoolean()
      .withMessage("Auto sync must be boolean"),
  ],
  validateRequest,
  requireSubscription(["enterprise"]),
  connectAirtable
);

// ===== WORKFLOW AUTOMATION =====

// Create workflow
router.post(
  "/workflows",
  [
    body("name")
      .isLength({ min: 1, max: 255 })
      .withMessage("Name must be 1-255 characters"),
    body("description")
      .optional()
      .isLength({ max: 1000 })
      .withMessage("Description must be max 1000 characters"),
    body("triggers")
      .isArray({ min: 1 })
      .withMessage("At least one trigger is required"),
    body("actions")
      .isArray({ min: 1 })
      .withMessage("At least one action is required"),
    body("conditions")
      .optional()
      .isArray()
      .withMessage("Conditions must be an array"),
    body("isActive")
      .optional()
      .isBoolean()
      .withMessage("Is active must be boolean"),
    body("schedule")
      .optional()
      .isObject()
      .withMessage("Schedule must be an object"),
  ],
  validateRequest,
  requireSubscription(["enterprise"]),
  createWorkflow
);

// Update workflow
router.put(
  "/workflows/:id",
  [
    param("id").isUUID().withMessage("Invalid workflow ID"),
    body("name")
      .optional()
      .isLength({ min: 1, max: 255 })
      .withMessage("Name must be 1-255 characters"),
    body("description")
      .optional()
      .isLength({ max: 1000 })
      .withMessage("Description must be max 1000 characters"),
    body("triggers")
      .optional()
      .isArray()
      .withMessage("Triggers must be an array"),
    body("actions")
      .optional()
      .isArray()
      .withMessage("Actions must be an array"),
    body("conditions")
      .optional()
      .isArray()
      .withMessage("Conditions must be an array"),
    body("isActive")
      .optional()
      .isBoolean()
      .withMessage("Is active must be boolean"),
    body("schedule")
      .optional()
      .isObject()
      .withMessage("Schedule must be an object"),
  ],
  validateRequest,
  requireSubscription(["enterprise"]),
  updateWorkflow
);

// Delete workflow
router.delete(
  "/workflows/:id",
  [param("id").isUUID().withMessage("Invalid workflow ID")],
  validateRequest,
  requireSubscription(["enterprise"]),
  deleteWorkflow
);

// Execute workflow
router.post(
  "/workflows/:id/execute",
  [
    param("id").isUUID().withMessage("Invalid workflow ID"),
    body("input").optional().isObject().withMessage("Input must be an object"),
    body("force").optional().isBoolean().withMessage("Force must be boolean"),
  ],
  validateRequest,
  requireSubscription(["enterprise"]),
  executeWorkflow
);

// Get workflow status
router.get(
  "/workflows/:id/status",
  [param("id").isUUID().withMessage("Invalid workflow ID")],
  validateRequest,
  requireSubscription(["enterprise"]),
  getWorkflowStatus
);

// Get workflow execution history
router.get(
  "/workflows/:id/history",
  [
    param("id").isUUID().withMessage("Invalid workflow ID"),
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be 1-100"),
    query("status")
      .optional()
      .isIn(["success", "failed", "running", "pending"])
      .withMessage("Invalid status"),
  ],
  validateRequest,
  requireSubscription(["enterprise"]),
  getWorkflowHistory
);

// ===== API INTEGRATIONS =====

// Create webhook
router.post(
  "/webhooks",
  [
    body("name")
      .isLength({ min: 1, max: 255 })
      .withMessage("Name must be 1-255 characters"),
    body("url").isURL().withMessage("Valid URL is required"),
    body("events")
      .isArray({ min: 1 })
      .withMessage("At least one event is required"),
    body("secret").optional().isString().withMessage("Secret must be a string"),
    body("isActive")
      .optional()
      .isBoolean()
      .withMessage("Is active must be boolean"),
    body("retryCount")
      .optional()
      .isInt({ min: 0, max: 5 })
      .withMessage("Retry count must be 0-5"),
  ],
  validateRequest,
  requireSubscription(["pro", "enterprise"]),
  createWebhook
);

// Update webhook
router.put(
  "/webhooks/:id",
  [
    param("id").isUUID().withMessage("Invalid webhook ID"),
    body("name")
      .optional()
      .isLength({ min: 1, max: 255 })
      .withMessage("Name must be 1-255 characters"),
    body("url").optional().isURL().withMessage("Valid URL is required"),
    body("events").optional().isArray().withMessage("Events must be an array"),
    body("secret").optional().isString().withMessage("Secret must be a string"),
    body("isActive")
      .optional()
      .isBoolean()
      .withMessage("Is active must be boolean"),
    body("retryCount")
      .optional()
      .isInt({ min: 0, max: 5 })
      .withMessage("Retry count must be 0-5"),
  ],
  validateRequest,
  requireSubscription(["pro", "enterprise"]),
  updateWebhook
);

// Delete webhook
router.delete(
  "/webhooks/:id",
  [param("id").isUUID().withMessage("Invalid webhook ID")],
  validateRequest,
  requireSubscription(["pro", "enterprise"]),
  deleteWebhook
);

// Test webhook
router.post(
  "/webhooks/:id/test",
  [
    param("id").isUUID().withMessage("Invalid webhook ID"),
    body("payload")
      .optional()
      .isObject()
      .withMessage("Payload must be an object"),
  ],
  validateRequest,
  requireSubscription(["pro", "enterprise"]),
  testWebhook
);

// Get webhook logs
router.get(
  "/webhooks/:id/logs",
  [
    param("id").isUUID().withMessage("Invalid webhook ID"),
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be 1-100"),
    query("status")
      .optional()
      .isIn(["success", "failed", "pending"])
      .withMessage("Invalid status"),
  ],
  validateRequest,
  requireSubscription(["pro", "enterprise"]),
  getWebhookLogs
);

// ===== THIRD-PARTY INTEGRATIONS =====

// CRM integration
router.post(
  "/integrate/crm",
  [
    body("provider")
      .isIn(["salesforce", "hubspot", "pipedrive", "zoho", "custom"])
      .withMessage("Invalid CRM provider"),
    body("credentials").isObject().withMessage("Credentials must be an object"),
    body("syncSettings")
      .optional()
      .isObject()
      .withMessage("Sync settings must be an object"),
    body("autoSync")
      .optional()
      .isBoolean()
      .withMessage("Auto sync must be boolean"),
  ],
  validateRequest,
  requireSubscription(["enterprise"]),
  integrateWithCRM
);

// Email marketing integration
router.post(
  "/integrate/email-marketing",
  [
    body("provider")
      .isIn([
        "mailchimp",
        "constant_contact",
        "sendgrid",
        "convertkit",
        "custom",
      ])
      .withMessage("Invalid email marketing provider"),
    body("credentials").isObject().withMessage("Credentials must be an object"),
    body("lists").optional().isArray().withMessage("Lists must be an array"),
    body("autoSync")
      .optional()
      .isBoolean()
      .withMessage("Auto sync must be boolean"),
  ],
  validateRequest,
  requireSubscription(["enterprise"]),
  integrateWithEmailMarketing
);

// Project management integration
router.post(
  "/integrate/project-management",
  [
    body("provider")
      .isIn(["asana", "trello", "jira", "monday", "clickup", "custom"])
      .withMessage("Invalid project management provider"),
    body("credentials").isObject().withMessage("Credentials must be an object"),
    body("projects")
      .optional()
      .isArray()
      .withMessage("Projects must be an array"),
    body("autoSync")
      .optional()
      .isBoolean()
      .withMessage("Auto sync must be boolean"),
  ],
  validateRequest,
  requireSubscription(["enterprise"]),
  integrateWithProjectManagement
);

// Accounting integration
router.post(
  "/integrate/accounting",
  [
    body("provider")
      .isIn(["quickbooks", "xero", "freshbooks", "wave", "custom"])
      .withMessage("Invalid accounting provider"),
    body("credentials").isObject().withMessage("Credentials must be an object"),
    body("syncSettings")
      .optional()
      .isObject()
      .withMessage("Sync settings must be an object"),
    body("autoSync")
      .optional()
      .isBoolean()
      .withMessage("Auto sync must be boolean"),
  ],
  validateRequest,
  requireSubscription(["enterprise"]),
  integrateWithAccounting
);

// HR integration
router.post(
  "/integrate/hr",
  [
    body("provider")
      .isIn(["bamboo", "gusto", "workday", "adp", "custom"])
      .withMessage("Invalid HR provider"),
    body("credentials").isObject().withMessage("Credentials must be an object"),
    body("syncSettings")
      .optional()
      .isObject()
      .withMessage("Sync settings must be an object"),
    body("autoSync")
      .optional()
      .isBoolean()
      .withMessage("Auto sync must be boolean"),
  ],
  validateRequest,
  requireSubscription(["enterprise"]),
  integrateWithHR
);

// ===== DATA SYNC =====

// Sync external data
router.post(
  "/sync",
  [
    body("integrationId").isUUID().withMessage("Integration ID is required"),
    body("syncType")
      .isIn(["full", "incremental", "selective"])
      .withMessage("Invalid sync type"),
    body("options")
      .optional()
      .isObject()
      .withMessage("Options must be an object"),
  ],
  validateRequest,
  requireSubscription(["pro", "enterprise"]),
  syncExternalData
);

// Get sync status
router.get(
  "/sync/:integrationId/status",
  [param("integrationId").isUUID().withMessage("Invalid integration ID")],
  validateRequest,
  requireSubscription(["pro", "enterprise"]),
  getSyncStatus
);

// Force sync
router.post(
  "/sync/:integrationId/force",
  [
    param("integrationId").isUUID().withMessage("Invalid integration ID"),
    body("syncType")
      .optional()
      .isIn(["full", "incremental", "selective"])
      .withMessage("Invalid sync type"),
  ],
  validateRequest,
  requireSubscription(["pro", "enterprise"]),
  forceSync
);

// Configure sync schedule
router.put(
  "/sync/:integrationId/schedule",
  [
    param("integrationId").isUUID().withMessage("Invalid integration ID"),
    body("schedule").isObject().withMessage("Schedule is required"),
    body("timezone")
      .optional()
      .isString()
      .withMessage("Timezone must be a string"),
    body("enabled")
      .optional()
      .isBoolean()
      .withMessage("Enabled must be boolean"),
  ],
  validateRequest,
  requireSubscription(["pro", "enterprise"]),
  configureSyncSchedule
);

// ===== ADVANCED FEATURES =====

// Enable real-time collaboration
router.post(
  "/features/real-time-collaboration",
  [
    body("enabled").isBoolean().withMessage("Enabled is required"),
    body("maxCollaborators")
      .optional()
      .isInt({ min: 2, max: 100 })
      .withMessage("Max collaborators must be 2-100"),
    body("features")
      .optional()
      .isArray()
      .withMessage("Features must be an array"),
  ],
  validateRequest,
  requireSubscription(["enterprise"]),
  enableRealTimeCollaboration
);

// Setup document approval workflow
router.post(
  "/features/approval-workflow",
  [
    body("enabled").isBoolean().withMessage("Enabled is required"),
    body("workflow").isObject().withMessage("Workflow is required"),
    body("approvers")
      .isArray({ min: 1 })
      .withMessage("At least one approver is required"),
    body("autoApproval")
      .optional()
      .isBoolean()
      .withMessage("Auto approval must be boolean"),
  ],
  validateRequest,
  requireSubscription(["enterprise"]),
  setupDocumentApprovalWorkflow
);

// Configure automated backup
router.post(
  "/features/automated-backup",
  [
    body("enabled").isBoolean().withMessage("Enabled is required"),
    body("frequency")
      .isIn(["hourly", "daily", "weekly", "monthly"])
      .withMessage("Invalid frequency"),
    body("retention")
      .isInt({ min: 1, max: 365 })
      .withMessage("Retention must be 1-365 days"),
    body("storage")
      .isIn(["local", "cloud", "hybrid"])
      .withMessage("Invalid storage type"),
  ],
  validateRequest,
  requireSubscription(["enterprise"]),
  configureAutomatedBackup
);

// Setup disaster recovery
router.post(
  "/features/disaster-recovery",
  [
    body("enabled").isBoolean().withMessage("Enabled is required"),
    body("rto")
      .isInt({ min: 1, max: 168 })
      .withMessage("RTO must be 1-168 hours"),
    body("rpo")
      .isInt({ min: 1, max: 24 })
      .withMessage("RPO must be 1-24 hours"),
    body("backupLocations")
      .isArray({ min: 1 })
      .withMessage("At least one backup location is required"),
  ],
  validateRequest,
  requireSubscription(["enterprise"]),
  setupDisasterRecovery
);

// Enable advanced security
router.post(
  "/features/advanced-security",
  [
    body("enabled").isBoolean().withMessage("Enabled is required"),
    body("features")
      .isArray({ min: 1 })
      .withMessage("At least one security feature is required"),
    body("compliance")
      .optional()
      .isArray()
      .withMessage("Compliance must be an array"),
    body("auditLogging")
      .optional()
      .isBoolean()
      .withMessage("Audit logging must be boolean"),
  ],
  validateRequest,
  requireSubscription(["enterprise"]),
  enableAdvancedSecurity
);

export default router;
