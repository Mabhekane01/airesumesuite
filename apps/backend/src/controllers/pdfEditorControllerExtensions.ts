import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { pdfEditorService } from '../services/pdfEditorService';

/**
 * Extended PDF Editor Controller Methods
 * This file contains additional methods for advanced PDF operations
 */
export class PdfEditorControllerExtensions {

  // ==================== SECURITY & OPTIMIZATION METHODS ====================

  /**
   * Secure PDF with password and permissions
   */
  static async securePdf(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'No PDF file uploaded' });
        return;
      }

      const { password, permissions, encryption } = req.body;
      const result = await pdfEditorService.securePdf(req.file.buffer, {
        password,
        permissions: permissions || {},
        encryption: encryption || '256bit'
      });
      
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="secured_${req.file.originalname}"`
      });
      res.send(result);
    } catch (error) {
      console.error('PDF security failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to secure PDF',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Remove security/password from PDF
   */
  static async removeSecurity(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'No PDF file uploaded' });
        return;
      }

      const { ownerPassword, userPassword } = req.body;
      const result = await pdfEditorService.removeSecurity(req.file.buffer, {
        ownerPassword,
        userPassword
      });
      
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="unsecured_${req.file.originalname}"`
      });
      res.send(result);
    } catch (error) {
      console.error('PDF security removal failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove PDF security',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Apply watermark to all pages
   */
  static async applyWatermarkAllPages(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'No PDF file uploaded' });
        return;
      }

      const { text, opacity, rotation, position, fontSize, color } = req.body;
      const result = await pdfEditorService.applyWatermarkToAllPages(req.file.buffer, {
        text,
        opacity: opacity ? parseFloat(opacity) : undefined,
        rotation: rotation ? parseFloat(rotation) : undefined,
        position,
        fontSize: fontSize ? parseFloat(fontSize) : undefined,
        color
      });
      
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="watermarked_all_pages_${req.file.originalname}"`
      });
      res.send(result);
    } catch (error) {
      console.error('Watermark all pages failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to apply watermark to all pages',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Optimize PDF file size
   */
  static async optimizePdf(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'No PDF file uploaded' });
        return;
      }

      const { quality, dpi, colorSpace, compressImages, removeMetadata } = req.body;
      const result = await pdfEditorService.optimizePdf(req.file.buffer, {
        quality: quality || 'medium',
        dpi: parseInt(dpi) || 150,
        colorSpace: colorSpace || 'rgb',
        compressImages: compressImages !== 'false',
        removeMetadata: removeMetadata === 'true'
      });
      
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="optimized_${req.file.originalname}"`
      });
      res.send(result);
    } catch (error) {
      console.error('PDF optimization failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to optimize PDF',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Perform OCR on PDF
   */
  static async performOcr(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'No PDF file uploaded' });
        return;
      }

      const { language } = req.body;
      const result = await pdfEditorService.performOcr(req.file.buffer, language || 'eng');
      res.status(200).json({
        success: true,
        message: 'OCR completed successfully',
        text: result
      });
    } catch (error) {
      console.error('OCR failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to perform OCR',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Analyze PDF document
   */
  static async analyzePdf(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'No PDF file uploaded' });
        return;
      }

      const result = await pdfEditorService.analyzePdf(req.file.buffer);
      res.status(200).json({
        success: true,
        message: 'PDF analysis completed',
        analysis: result
      });
    } catch (error) {
      console.error('PDF analysis failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to analyze PDF',
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

      const pdfFile = req.files.find((f: any) => f.mimetype === 'application/pdf');
      const watermarkFile = req.files.find((f: any) => f.mimetype?.startsWith('image/'));
      
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
   * Split PDF into individual pages
   */
  static async splitPdf(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'No PDF file uploaded' });
        return;
      }

      const result = await pdfEditorService.splitPdf(req.file.buffer);
      res.json({ success: true, data: result });
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
   * Rotate a specific page
   */
  static async rotatePage(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'No PDF file uploaded' });
        return;
      }

      const { pageNumber, rotation } = req.body;
      const result = await pdfEditorService.rotatePage(req.file.buffer, parseInt(pageNumber), parseInt(rotation));
      
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

      const { pageOrder } = req.body;
      const result = await pdfEditorService.reorderPages(req.file.buffer, pageOrder);
      
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

  /**
   * Convert PDF to images
   */
  static async convertToImages(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'No PDF file uploaded' });
        return;
      }

      const { format = 'png', quality = 150 } = req.body;
      const result = await pdfEditorService.convertToImages(req.file.buffer, format);
      res.json({ success: true, data: result });
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
   * Extract text content from PDF
   */
  static async extractTextContent(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'No PDF file uploaded' });
        return;
      }

      const result = await pdfEditorService.extractTextContent(req.file.buffer);
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('Text extraction failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to extract text content',
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

      const pdfFile = req.files.find((f: any) => f.mimetype === 'application/pdf');
      const imageFile = req.files.find((f: any) => f.mimetype?.startsWith('image/'));
      
      if (!pdfFile || !imageFile) {
        res.status(400).json({ success: false, message: 'Both PDF and image files are required' });
        return;
      }

      const { x, y, width, height, pageNumber } = req.body;
      const result = await pdfEditorService.addImage(
        pdfFile.buffer,
        imageFile.buffer,
        {
          x: parseFloat(x),
          y: parseFloat(y),
          width: parseFloat(width),
          height: parseFloat(height),
          pageNumber: parseInt(pageNumber)
        }
      );
      
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="image_added_${pdfFile.originalname}"`
      });
      res.send(result);
    } catch (error) {
      console.error('Adding image failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add image to PDF',
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

      const { type, text, x, y, width, height, pageNumber } = req.body;
      const result = await pdfEditorService.addAnnotation(
        req.file.buffer,
        {
          type,
          content: text,
          x: parseFloat(x),
          y: parseFloat(y),
          width: parseFloat(width),
          height: parseFloat(height),
          pageNumber: parseInt(pageNumber)
        }
      );
      
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="annotated_${req.file.originalname}"`
      });
      res.send(result);
    } catch (error) {
      console.error('Adding annotation failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add annotation to PDF',
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

      const { type, name, x, y, width, height, pageNumber } = req.body;
      const result = await pdfEditorService.addFormField(
        req.file.buffer,
        {
          fieldType: type,
          name,
          x: parseFloat(x),
          y: parseFloat(y),
          width: parseFloat(width),
          height: parseFloat(height),
          pageNumber: parseInt(pageNumber)
        }
      );
      
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="form_field_added_${req.file.originalname}"`
      });
      res.send(result);
    } catch (error) {
      console.error('Adding form field failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add form field to PDF',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Find and replace text in PDF
   */
  static async findReplaceText(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'No PDF file uploaded' });
        return;
      }

      const { searchText, replaceText } = req.body;
      const result = await pdfEditorService.replaceText(req.file.buffer, req.file.originalname, { [searchText]: replaceText });
      
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="text_replaced_${req.file.originalname}"`
      });
      res.send(result);
    } catch (error) {
      console.error('Text replacement failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to replace text in PDF',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Remove pages from PDF
   */
  static async removePages(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'No PDF file uploaded' });
        return;
      }

      const { pageNumbers } = req.body;
      const result = await pdfEditorService.removePages(req.file.buffer, pageNumbers);
      
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="pages_removed_${req.file.originalname}"`
      });
      res.send(result);
    } catch (error) {
      console.error('Page removal failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove pages from PDF',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Compress PDF file
   */
  static async compressPdf(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'No PDF file uploaded' });
        return;
      }

      const { quality = 'medium' } = req.body;
      const result = await pdfEditorService.compressPdf(req.file.buffer, quality);
      
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="compressed_${req.file.originalname}"`
      });
      res.send(result);
    } catch (error) {
      console.error('PDF compression failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to compress PDF',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}