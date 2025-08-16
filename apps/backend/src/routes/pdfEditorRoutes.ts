import express, { IRouter } from 'express';
import { body } from 'express-validator';
import { PdfEditorController, uploadMiddleware } from '../controllers/pdfEditorController';
import { PdfEditorControllerExtensions } from '../controllers/pdfEditorControllerExtensions';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { handleValidationErrors } from '../middleware/validation';

const router: IRouter = express.Router();

// Validation middleware
const addTextValidation = [
  body('text').notEmpty().withMessage('Text is required'),
  body('x').isFloat().withMessage('X coordinate must be a number'),
  body('y').isFloat().withMessage('Y coordinate must be a number'),
  body('pageNumber').isInt({ min: 1 }).withMessage('Page number must be a positive integer'),
  body('fontSize').optional().isFloat({ min: 1, max: 72 }).withMessage('Font size must be between 1 and 72'),
  body('color').optional().isString().withMessage('Color must be a string')
];

const signatureValidation = [
  body('signerName').notEmpty().withMessage('Signer name is required'),
  body('x').isFloat().withMessage('X coordinate must be a number'),
  body('y').isFloat().withMessage('Y coordinate must be a number'),
  body('width').isFloat({ min: 1 }).withMessage('Width must be a positive number'),
  body('height').isFloat({ min: 1 }).withMessage('Height must be a positive number'),
  body('pageNumber').isInt({ min: 1 }).withMessage('Page number must be a positive integer'),
  body('reason').optional().isString().withMessage('Reason must be a string')
];

const generateSignatureValidation = [
  body('text').notEmpty().withMessage('Signature text is required'),
  body('style').optional().isIn(['cursive', 'elegant', 'modern', 'bold']).withMessage('Invalid signature style'),
  body('width').optional().isInt({ min: 100, max: 800 }).withMessage('Width must be between 100 and 800'),
  body('height').optional().isInt({ min: 50, max: 400 }).withMessage('Height must be between 50 and 400')
];

const deletePagesValidation = [
  body('pagesToDelete').isArray().withMessage('Pages to delete must be an array'),
  body('pagesToDelete.*').isInt({ min: 1 }).withMessage('Each page number must be a positive integer')
];

const watermarkValidation = [
  body('text').optional().isString().withMessage('Watermark text must be a string'),
  body('x').isFloat().withMessage('X coordinate must be a number'),
  body('y').isFloat().withMessage('Y coordinate must be a number'),
  body('opacity').optional().isFloat({ min: 0, max: 1 }).withMessage('Opacity must be between 0 and 1'),
  body('rotation').optional().isFloat().withMessage('Rotation must be a number'),
  body('fontSize').optional().isFloat({ min: 1, max: 72 }).withMessage('Font size must be between 1 and 72')
];

const securityValidation = [
  body('password').notEmpty().withMessage('Password is required'),
  body('permissions').optional().isObject().withMessage('Permissions must be an object'),
  body('encryption').optional().isIn(['40bit', '128bit', '256bit']).withMessage('Invalid encryption level')
];

const optimizationValidation = [
  body('quality').optional().isIn(['low', 'medium', 'high', 'maximum']).withMessage('Invalid quality level'),
  body('dpi').optional().isInt({ min: 72, max: 300 }).withMessage('DPI must be between 72 and 300'),
  body('colorSpace').optional().isIn(['rgb', 'grayscale', 'monochrome']).withMessage('Invalid color space')
];

// ==================== GENERAL ENDPOINTS ====================

/**
 * Health check for PDF editor service
 * GET /api/v1/pdf-editor/health
 */
router.get('/health', PdfEditorController.healthCheck);

/**
 * Get PDF information
 * POST /api/v1/pdf-editor/info
 */
router.post('/info', 
  authMiddleware, 
  uploadMiddleware.single, 
  (req: AuthenticatedRequest, res) => PdfEditorController.getPdfInfo(req, res)
);

// ==================== TEXT EDITING ENDPOINTS ====================

/**
 * Extract text from PDF
 * POST /api/v1/pdf-editor/extract-text
 */
router.post('/extract-text',
  authMiddleware,
  uploadMiddleware.single,
  (req: AuthenticatedRequest, res) => PdfEditorController.extractText(req, res)
);

/**
 * Add text to PDF at specific position
 * POST /api/v1/pdf-editor/add-text
 */
router.post('/add-text',
  authMiddleware,
  uploadMiddleware.single,
  addTextValidation,
  handleValidationErrors,
  (req: AuthenticatedRequest, res) => PdfEditorController.addText(req, res)
);

// ==================== PAGE OPERATIONS ENDPOINTS ====================

/**
 * Delete pages from PDF
 * POST /api/v1/pdf-editor/delete-pages
 */
router.post('/delete-pages',
  authMiddleware,
  uploadMiddleware.single,
  deletePagesValidation,
  handleValidationErrors,
  (req: AuthenticatedRequest, res) => PdfEditorController.deletePages(req, res)
);

/**
 * Merge multiple PDFs
 * POST /api/v1/pdf-editor/merge
 */
router.post('/merge',
  authMiddleware,
  uploadMiddleware.multiple,
  (req: AuthenticatedRequest, res) => PdfEditorController.mergePdfs(req, res)
);

/**
 * Split PDF into multiple files
 * POST /api/v1/pdf-editor/split
 */
router.post('/split',
  uploadMiddleware.single,
  (req: AuthenticatedRequest, res) => PdfEditorControllerExtensions.splitPdf(req, res)
);

/**
 * Rotate PDF pages
 * POST /api/v1/pdf-editor/rotate
 */
router.post('/rotate',
  uploadMiddleware.single,
  (req: AuthenticatedRequest, res) => PdfEditorControllerExtensions.rotatePage(req, res)
);

/**
 * Reorder PDF pages
 * POST /api/v1/pdf-editor/reorder
 */
router.post('/reorder',
  uploadMiddleware.single,
  (req: AuthenticatedRequest, res) => PdfEditorControllerExtensions.reorderPages(req, res)
);

// ==================== SIGNATURE ENDPOINTS ====================

/**
 * Add signature to PDF
 * POST /api/v1/pdf-editor/add-signature
 */
router.post('/add-signature',
  authMiddleware,
  uploadMiddleware.signature,
  signatureValidation,
  handleValidationErrors,
  (req: AuthenticatedRequest, res) => PdfEditorController.addSignature(req, res)
);

/**
 * Generate signature image from text
 * POST /api/v1/pdf-editor/generate-signature
 */
router.post('/generate-signature',
  authMiddleware,
  generateSignatureValidation,
  handleValidationErrors,
  (req: AuthenticatedRequest, res) => PdfEditorController.generateSignature(req, res)
);

// ==================== CONVERSION ENDPOINTS ====================

/**
 * Convert PDF to Word document
 * POST /api/v1/pdf-editor/convert-to-word
 */
router.post('/convert-to-word',
  authMiddleware,
  uploadMiddleware.single,
  (req: AuthenticatedRequest, res) => PdfEditorController.convertToWord(req, res)
);

/**
 * Convert PDF to HTML
 * POST /api/v1/pdf-editor/convert-to-html
 */
router.post('/convert-to-html',
  uploadMiddleware.single,
  (req: AuthenticatedRequest, res) => PdfEditorControllerExtensions.convertToHtml(req, res)
);

/**
 * Convert PDF to images
 * POST /api/v1/pdf-editor/convert-to-images
 */
router.post('/convert-to-images',
  uploadMiddleware.single,
  (req: AuthenticatedRequest, res) => PdfEditorControllerExtensions.convertToImages(req, res)
);

/**
 * Extract text content
 * POST /api/v1/pdf-editor/extract-text-content
 */
router.post('/extract-text-content',
  uploadMiddleware.single,
  (req: AuthenticatedRequest, res) => PdfEditorControllerExtensions.extractTextContent(req, res)
);

// ==================== ENTERPRISE FEATURES ====================

/**
 * Batch process multiple PDFs (Enterprise feature)
 * POST /api/v1/pdf-editor/batch-process
 */
router.post('/batch-process',
  authMiddleware,
  // requireEnterpriseSubscription, // Uncomment when enterprise middleware is available
  uploadMiddleware.multiple,
  (req: AuthenticatedRequest, res) => {
    res.status(200).json({
      success: true,
      message: 'Batch processing feature - Enterprise only',
      note: 'This endpoint will handle multiple PDF operations in a single request'
    });
  }
);

/**
 * Advanced signature with certificate (Enterprise feature)  
 * POST /api/v1/pdf-editor/digital-signature
 */
router.post('/digital-signature',
  authMiddleware,
  // requireEnterpriseSubscription, // Uncomment when enterprise middleware is available
  uploadMiddleware.signature,
  (req: AuthenticatedRequest, res) => {
    res.status(200).json({
      success: true,
      message: 'Digital signature with certificate - Enterprise only',
      note: 'This endpoint will handle PKI-based digital signatures'
    });
  }
);

// ==================== WATERMARK & ANNOTATION ENDPOINTS ====================

/**
 * Add watermark to PDF
 * POST /api/v1/pdf-editor/add-watermark
 */
router.post('/add-watermark',
  uploadMiddleware.watermark,
  watermarkValidation,
  handleValidationErrors,
  (req: AuthenticatedRequest, res) => PdfEditorControllerExtensions.addWatermark(req, res)
);

/**
 * Apply watermark to all pages
 * POST /api/v1/pdf-editor/apply-watermark-all-pages
 */
router.post('/apply-watermark-all-pages',
  uploadMiddleware.single,
  watermarkValidation,
  handleValidationErrors,
  (req: AuthenticatedRequest, res) => PdfEditorControllerExtensions.applyWatermarkAllPages(req, res)
);

/**
 * Add image to PDF
 * POST /api/v1/pdf-editor/add-image
 */
router.post('/add-image',
  uploadMiddleware.image,
  (req: AuthenticatedRequest, res) => PdfEditorControllerExtensions.addImage(req, res)
);

/**
 * Add annotation to PDF
 * POST /api/v1/pdf-editor/add-annotation
 */
router.post('/add-annotation',
  uploadMiddleware.single,
  (req: AuthenticatedRequest, res) => PdfEditorControllerExtensions.addAnnotation(req, res)
);

/**
 * Add form field to PDF
 * POST /api/v1/pdf-editor/add-form-field
 */
router.post('/add-form-field',
  uploadMiddleware.single,
  (req: AuthenticatedRequest, res) => PdfEditorControllerExtensions.addFormField(req, res)
);

// ==================== SECURITY & OPTIMIZATION ENDPOINTS ====================

/**
 * Add password protection to PDF
 * POST /api/v1/pdf-editor/secure
 */
router.post('/secure',
  uploadMiddleware.single,
  securityValidation,
  handleValidationErrors,
  (req: AuthenticatedRequest, res) => PdfEditorControllerExtensions.securePdf(req, res)
);

/**
 * Remove password protection from PDF
 * POST /api/v1/pdf-editor/remove-security
 */
router.post('/remove-security',
  uploadMiddleware.single,
  (req: AuthenticatedRequest, res) => PdfEditorControllerExtensions.removeSecurity(req, res)
);

/**
 * Optimize PDF file size
 * POST /api/v1/pdf-editor/optimize
 */
router.post('/optimize',
  uploadMiddleware.single,
  optimizationValidation,
  handleValidationErrors,
  (req: AuthenticatedRequest, res) => PdfEditorControllerExtensions.optimizePdf(req, res)
);

/**
 * OCR text recognition
 * POST /api/v1/pdf-editor/ocr
 */
router.post('/ocr',
  uploadMiddleware.single,
  (req: AuthenticatedRequest, res) => PdfEditorControllerExtensions.performOcr(req, res)
);

/**
 * Analyze PDF document
 * POST /api/v1/pdf-editor/analyze
 */
router.post('/analyze',
  uploadMiddleware.single,
  (req: AuthenticatedRequest, res) => PdfEditorControllerExtensions.analyzePdf(req, res)
);

// ==================== BATCH & ADVANCED OPERATIONS ====================

/**
 * Find and replace text
 * POST /api/v1/pdf-editor/find-replace
 */
router.post('/find-replace',
  uploadMiddleware.single,
  (req: AuthenticatedRequest, res) => PdfEditorControllerExtensions.findReplaceText(req, res)
);

/**
 * Remove pages by criteria
 * POST /api/v1/pdf-editor/remove-pages
 */
router.post('/remove-pages',
  uploadMiddleware.single,
  (req: AuthenticatedRequest, res) => PdfEditorControllerExtensions.removePages(req, res)
);

/**
 * Compress PDF
 * POST /api/v1/pdf-editor/compress
 */
router.post('/compress',
  uploadMiddleware.single,
  (req: AuthenticatedRequest, res) => PdfEditorControllerExtensions.compressPdf(req, res)
);

export default router;