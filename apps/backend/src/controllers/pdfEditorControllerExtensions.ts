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

      const result = await pdfEditorService.convertToHtml(req.file.buffer);
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
}