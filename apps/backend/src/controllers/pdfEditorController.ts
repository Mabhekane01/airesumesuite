import { Request, Response, RequestHandler } from 'express';
import { pdfEditorService } from '../services/pdfEditorService';
import { AuthenticatedRequest } from '../middleware/auth';
import multer from 'multer';
import { validationResult } from 'express-validator';

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.mimetype?.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and image files are allowed'));
    }
  },
});

export class PdfEditorController {

  // ==================== CONVERSION METHODS ====================

  /**
   * Convert PDF to HTML
   */
  static async convertToHtml(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'No PDF file uploaded' });
        return;
      }

      const result = await pdfEditorService.convertToHtml(req.file.buffer, req.file.originalname);
      res.set({
        'Content-Type': 'text/html',
        'Content-Disposition': `attachment; filename="${req.file.originalname.replace('.pdf', '.html')}"`
      });
      res.send(result);
    } catch (error) {
      console.error('PDF to HTML conversion failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to convert PDF to HTML',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Convert PDF to images
   */
  static async convertToImages(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'No PDF file uploaded' });
        return;
      }

      const result = await pdfEditorService.convertToImages(req.file.buffer, req.body.format || 'png');
      res.status(200).json({
        success: true,
        message: 'PDF converted to images successfully',
        images: result
      });
    } catch (error) {
      console.error('PDF to images conversion failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to convert PDF to images',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Extract text content
   */
  static async extractTextContent(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'No PDF file uploaded' });
        return;
      }

      const result = await pdfEditorService.extractTextContent(req.file.buffer);
      res.set({
        'Content-Type': 'text/plain',
        'Content-Disposition': `attachment; filename="${req.file.originalname.replace('.pdf', '.txt')}"`
      });
      res.send(result);
    } catch (error) {
      console.error('Text extraction failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to extract text content',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // ==================== PAGE MANIPULATION METHODS ====================

  /**
   * Split PDF into multiple files
   */
  static async splitPdf(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'No PDF file uploaded' });
        return;
      }

      const { splitBy, ranges } = req.body;
      const result = await pdfEditorService.splitPdf(req.file.buffer);
      res.status(200).json({
        success: true,
        message: 'PDF split successfully',
        files: result
      });
    } catch (error) {
      console.error('PDF split failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to split PDF',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Rotate PDF pages
   */
  static async rotatePage(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'No PDF file uploaded' });
        return;
      }

      const { pageNumber, rotation } = req.body;
      const result = await pdfEditorService.rotatePage(req.file.buffer, pageNumber, rotation);
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="rotated_${req.file.originalname}"`
      });
      res.send(result);
    } catch (error) {
      console.error('Page rotation failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to rotate page',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Reorder PDF pages
   */
  static async reorderPages(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'No PDF file uploaded' });
        return;
      }

      const { newOrder } = req.body;
      const result = await pdfEditorService.reorderPages(req.file.buffer, newOrder);
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="reordered_${req.file.originalname}"`
      });
      res.send(result);
    } catch (error) {
      console.error('Page reordering failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reorder pages',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // ==================== WATERMARK & ANNOTATION METHODS ====================

  /**
   * Add watermark to PDF
   */
  static async addWatermark(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length < 1) {
        res.status(400).json({ success: false, message: 'PDF file is required' });
        return;
      }

      const pdfFile = req.files.find(f => f.mimetype === 'application/pdf');
      const watermarkFile = req.files.find(f => f.mimetype?.startsWith('image/'));
      
      if (!pdfFile) {
        res.status(400).json({ success: false, message: 'No PDF file found' });
        return;
      }

      const { text, x, y, opacity, rotation, fontSize } = req.body;
      const result = await pdfEditorService.addWatermark(
        pdfFile.buffer,
        { text, x: parseFloat(x), y: parseFloat(y), opacity: parseFloat(opacity || '0.5'), rotation: parseFloat(rotation || '0'), fontSize: parseInt(fontSize || '24') },
        watermarkFile?.buffer
      );
      
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="watermarked_${pdfFile.originalname}"`
      });
      res.send(result);
    } catch (error) {
      console.error('Watermark addition failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add watermark',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Add image to PDF
   */
  static async addImage(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length < 2) {
        res.status(400).json({ success: false, message: 'PDF file and image file are required' });
        return;
      }

      const pdfFile = req.files.find(f => f.mimetype === 'application/pdf');
      const imageFile = req.files.find(f => f.mimetype?.startsWith('image/'));
      
      if (!pdfFile || !imageFile) {
        res.status(400).json({ success: false, message: 'Both PDF and image files are required' });
        return;
      }

      const { x, y, width, height, pageNumber } = req.body;
      const result = await pdfEditorService.addImage(
        pdfFile.buffer,
        imageFile.buffer,
        { x: parseFloat(x), y: parseFloat(y), width: parseFloat(width), height: parseFloat(height), pageNumber: parseInt(pageNumber || '1') }
      );
      
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="image_added_${pdfFile.originalname}"`
      });
      res.send(result);
    } catch (error) {
      console.error('Image addition failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add image',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Add annotation to PDF
   */
  static async addAnnotation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'No PDF file uploaded' });
        return;
      }

      const { type, content, x, y, width, height, pageNumber, color } = req.body;
      const result = await pdfEditorService.addAnnotation(req.file.buffer, {
        type,
        content,
        x: parseFloat(x),
        y: parseFloat(y),
        width: parseFloat(width),
        height: parseFloat(height),
        pageNumber: parseInt(pageNumber || '1'),
        color
      });
      
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="annotated_${req.file.originalname}"`
      });
      res.send(result);
    } catch (error) {
      console.error('Annotation addition failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add annotation',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Add form field to PDF
   */
  static async addFormField(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'No PDF file uploaded' });
        return;
      }

      const { fieldType, name, x, y, width, height, pageNumber, options } = req.body;
      const result = await pdfEditorService.addFormField(req.file.buffer, {
        fieldType,
        name,
        x: parseFloat(x),
        y: parseFloat(y),
        width: parseFloat(width),
        height: parseFloat(height),
        pageNumber: parseInt(pageNumber || '1'),
        options
      });
      
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="form_${req.file.originalname}"`
      });
      res.send(result);
    } catch (error) {
      console.error('Form field addition failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add form field',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Health check for PDF editor service
   */
  static async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      const health = await pdfEditorService.healthCheck();
      res.status(200).json({
        success: true,
        service: 'PDF Editor Integration',
        pdfService: health
      });
    } catch (error) {
      console.error('PDF Editor health check failed:', error);
      res.status(503).json({
        success: false,
        message: 'PDF Editor service is unavailable',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Extract text from uploaded PDF
   */
  static async extractText(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
        return;
      }

      if (!req.file) {
        res.status(400).json({
          success: false,
          message: 'No PDF file provided'
        });
        return;
      }

      const result = await pdfEditorService.extractText(req.file.buffer, req.file.originalname);
      
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Text extraction error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to extract text from PDF',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Edit PDF by adding text
   */
  static async addText(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
        return;
      }

      if (!req.file) {
        res.status(400).json({
          success: false,
          message: 'No PDF file provided'
        });
        return;
      }

      const { text, x, y, pageNumber, fontSize, color } = req.body;

      const editedPdf = await pdfEditorService.addText(req.file.buffer, req.file.originalname, {
        text,
        x: parseFloat(x),
        y: parseFloat(y),
        pageNumber: parseInt(pageNumber),
        fontSize: fontSize ? parseFloat(fontSize) : undefined,
        color: color || undefined
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="edited-document.pdf"');
      res.send(editedPdf);
    } catch (error) {
      console.error('Add text error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add text to PDF',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Add signature to PDF
   */
  static async addSignature(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
        return;
      }

      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        res.status(400).json({
          success: false,
          message: 'No PDF file provided'
        });
        return;
      }

      // Find PDF and signature files
      const pdfFile = req.files.find(f => f.mimetype === 'application/pdf');
      const signatureFile = req.files.find(f => f.mimetype.startsWith('image/'));

      if (!pdfFile) {
        res.status(400).json({
          success: false,
          message: 'PDF file is required'
        });
        return;
      }

      const { signerName, x, y, width, height, pageNumber, reason } = req.body;

      const signedPdf = await pdfEditorService.addSignature(
        pdfFile.buffer,
        pdfFile.originalname,
        signatureFile ? signatureFile.buffer : null,
        signatureFile ? signatureFile.originalname : null,
        {
          signerName,
          x: parseFloat(x),
          y: parseFloat(y),
          width: parseFloat(width),
          height: parseFloat(height),
          pageNumber: parseInt(pageNumber),
          reason: reason || undefined
        }
      );

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="signed-document.pdf"');
      res.send(signedPdf);
    } catch (error) {
      console.error('Add signature error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add signature to PDF',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Generate signature image
   */
  static async generateSignature(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { text, style, width, height } = req.body;

      if (!text) {
        res.status(400).json({
          success: false,
          message: 'Signature text is required'
        });
        return;
      }

      const signatureImage = await pdfEditorService.generateSignature(
        text,
        style || 'cursive',
        width ? parseInt(width) : 300,
        height ? parseInt(height) : 100
      );

      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', 'attachment; filename="signature.png"');
      res.send(signatureImage);
    } catch (error) {
      console.error('Generate signature error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate signature',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Merge multiple PDFs
   */
  static async mergePdfs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length < 2) {
        res.status(400).json({
          success: false,
          message: 'At least 2 PDF files are required for merging'
        });
        return;
      }

      const pdfFiles = req.files.filter(f => f.mimetype === 'application/pdf');

      if (pdfFiles.length < 2) {
        res.status(400).json({
          success: false,
          message: 'At least 2 PDF files are required for merging'
        });
        return;
      }

      const files = pdfFiles.map(file => ({
        buffer: file.buffer,
        filename: file.originalname
      }));

      const mergedPdf = await pdfEditorService.mergePdfs(files);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="merged-document.pdf"');
      res.send(mergedPdf);
    } catch (error) {
      console.error('Merge PDFs error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to merge PDFs',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Convert PDF to Word
   */
  static async convertToWord(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          message: 'No PDF file provided'
        });
        return;
      }

      const wordDocument = await pdfEditorService.convertToWord(req.file.buffer, req.file.originalname);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', 'attachment; filename="converted-document.docx"');
      res.send(wordDocument);
    } catch (error) {
      console.error('Convert to Word error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to convert PDF to Word',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get PDF information
   */
  static async getPdfInfo(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          message: 'No PDF file provided'
        });
        return;
      }

      const pdfInfo = await pdfEditorService.getPdfInfo(req.file.buffer, req.file.originalname);

      res.status(200).json({
        success: true,
        data: pdfInfo
      });
    } catch (error) {
      console.error('Get PDF info error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get PDF information',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Delete pages from PDF
   */
  static async deletePages(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          message: 'No PDF file provided'
        });
        return;
      }

      const { pagesToDelete } = req.body;

      if (!Array.isArray(pagesToDelete) || pagesToDelete.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Pages to delete must be provided as an array'
        });
        return;
      }

      const editedPdf = await pdfEditorService.deletePages(req.file.buffer, req.file.originalname, pagesToDelete);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="pages-deleted.pdf"');
      res.send(editedPdf);
    } catch (error) {
      console.error('Delete pages error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete pages from PDF',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

// Export multer upload middleware
export const uploadMiddleware: {
  single: RequestHandler;
  multiple: RequestHandler;
  signature: RequestHandler;
  watermark: RequestHandler;
  image: RequestHandler;
} = {
  single: upload.single('pdf'),
  multiple: upload.array('pdfs', 10),
  signature: upload.fields([
    { name: 'pdf', maxCount: 1 },
    { name: 'signatureImage', maxCount: 1 }
  ]),
  watermark: upload.fields([
    { name: 'pdf', maxCount: 1 },
    { name: 'watermarkImage', maxCount: 1 }
  ]),
  image: upload.fields([
    { name: 'pdf', maxCount: 1 },
    { name: 'image', maxCount: 1 }
  ])
};