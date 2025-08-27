import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface ProcessingOptions {
  generateThumbnails?: boolean;
  generatePreviews?: boolean;
  extractText?: boolean;
  addWatermark?: string;
  convertToPdf?: boolean;
  compress?: boolean;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

export interface ProcessingResult {
  success: boolean;
  filePath: string;
  thumbnailPath?: string;
  previewPaths?: string[];
  textContent?: string;
  pageCount?: number;
  fileSize: number;
  processingTime: number;
  error?: string;
}

export interface FileMetadata {
  fileName: string;
  fileSize: number;
  mimeType: string;
  dimensions?: { width: number; height: number };
  pageCount?: number;
  textContent?: string;
  isImage: boolean;
  isPdf: boolean;
  isDocument: boolean;
}

export class SimpleFileProcessingService {
  private uploadDir: string;
  private tempDir: string;
  private supportedImageFormats = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"];
  private supportedDocumentFormats = [".pdf", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx"];
  private maxFileSize = 100 * 1024 * 1024; // 100MB

  constructor() {
    this.uploadDir = process.env.LOCAL_STORAGE_PATH || "./uploads";
    this.tempDir = path.join(this.uploadDir, "temp");
    this.ensureDirectories();
  }

  /**
   * Process uploaded file with various options
   */
  async processFile(
    filePath: string,
    options: ProcessingOptions = {}
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    
    try {
      // Validate file
      const metadata = await this.getFileMetadata(filePath);
      if (!metadata) {
        throw new Error("Invalid file or unsupported format");
      }

      if (metadata.fileSize > this.maxFileSize) {
        throw new Error("File size exceeds maximum allowed size");
      }

      // Create processing result
      const result: ProcessingResult = {
        success: true,
        filePath,
        fileSize: metadata.fileSize,
        processingTime: 0,
      };

      // Process based on file type and options
      if (metadata.isImage) {
        await this.processImage(filePath, options, result);
      } else if (metadata.isPdf) {
        await this.processPdf(filePath, options, result);
      } else if (metadata.isDocument) {
        await this.processDocument(filePath, options, result);
      }

      // Extract text if requested
      if (options.extractText && !result.textContent) {
        result.textContent = await this.extractText(filePath, metadata);
      }

      // Get page count
      if (metadata.isPdf || metadata.isDocument) {
        result.pageCount = await this.getPageCount(filePath, metadata);
      }

      result.processingTime = Date.now() - startTime;
      console.log("File processing completed", { filePath, processingTime: result.processingTime });

      return result;
    } catch (error) {
      console.error("File processing failed:", error);
      return {
        success: false,
        filePath,
        fileSize: 0,
        processingTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Process image files
   */
  private async processImage(
    filePath: string,
    options: ProcessingOptions,
    result: ProcessingResult
  ): Promise<void> {
    try {
      // For now, just copy the file and generate basic metadata
      const processedPath = path.join(this.tempDir, `${uuidv4()}_processed.${path.extname(filePath)}`);
      await fs.copyFile(filePath, processedPath);
      result.filePath = processedPath;

      // Generate thumbnail if requested
      if (options.generateThumbnails) {
        const thumbnailPath = await this.generateBasicThumbnail(filePath);
        result.thumbnailPath = thumbnailPath;
      }

      // Generate previews if requested
      if (options.generatePreviews) {
        const previewPaths = await this.generateBasicPreviews(filePath);
        result.previewPaths = previewPaths;
      }
    } catch (error) {
      console.error("Image processing failed:", error);
      throw error;
    }
  }

  /**
   * Process PDF files
   */
  private async processPdf(
    filePath: string,
    options: ProcessingOptions,
    result: ProcessingResult
  ): Promise<void> {
    try {
      // For now, just copy the file
      const processedPath = path.join(this.tempDir, `${uuidv4()}_processed.pdf`);
      await fs.copyFile(filePath, processedPath);
      result.filePath = processedPath;

      // Generate thumbnail if requested
      if (options.generateThumbnails) {
        const thumbnailPath = await this.generateBasicThumbnail(filePath);
        result.thumbnailPath = thumbnailPath;
      }

      // Generate previews if requested
      if (options.generatePreviews) {
        const previewPaths = await this.generateBasicPreviews(filePath);
        result.previewPaths = previewPaths;
      }
    } catch (error) {
      console.error("PDF processing failed:", error);
      throw error;
    }
  }

  /**
   * Process document files (convert to PDF if needed)
   */
  private async processDocument(
    filePath: string,
    options: ProcessingOptions,
    result: ProcessingResult
  ): Promise<void> {
    try {
      if (options.convertToPdf) {
        const pdfPath = await this.convertDocumentToPdf(filePath);
        result.filePath = pdfPath;
        
        // Process the converted PDF
        await this.processPdf(pdfPath, options, result);
      }
    } catch (error) {
      console.error("Document processing failed:", error);
      throw error;
    }
  }

  /**
   * Generate basic thumbnail
   */
  private async generateBasicThumbnail(filePath: string): Promise<string> {
    try {
      const thumbnailPath = path.join(this.tempDir, `${uuidv4()}_thumb.jpg`);
      
      // For now, just copy the original file as a placeholder
      // In production, this would use image processing libraries
      await fs.copyFile(filePath, thumbnailPath);

      return thumbnailPath;
    } catch (error) {
      console.error("Thumbnail generation failed:", error);
      throw error;
    }
  }

  /**
   * Generate basic previews
   */
  private async generateBasicPreviews(filePath: string): Promise<string[]> {
    try {
      const previewPaths: string[] = [];
      
      // For now, just copy the original file as a placeholder
      // In production, this would generate different sized previews
      const previewPath = path.join(this.tempDir, `${uuidv4()}_preview.${path.extname(filePath)}`);
      await fs.copyFile(filePath, previewPath);
      previewPaths.push(previewPath);

      return previewPaths;
    } catch (error) {
      console.error("Preview generation failed:", error);
      throw error;
    }
  }

  /**
   * Convert document to PDF
   */
  private async convertDocumentToPdf(filePath: string): Promise<string> {
    try {
      const pdfPath = path.join(this.tempDir, `${uuidv4()}.pdf`);
      const extension = path.extname(filePath).toLowerCase();

      switch (extension) {
        case ".doc":
        case ".docx":
          await this.convertWordToPdf(filePath, pdfPath);
          break;
        case ".ppt":
        case ".pptx":
          await this.convertPowerPointToPdf(filePath, pdfPath);
          break;
        case ".xls":
        case ".xlsx":
          await this.convertExcelToPdf(filePath, pdfPath);
          break;
        default:
          throw new Error(`Unsupported document format: ${extension}`);
      }

      return pdfPath;
    } catch (error) {
      console.error("Document to PDF conversion failed:", error);
      throw error;
    }
  }

  /**
   * Convert Word document to PDF
   */
  private async convertWordToPdf(inputPath: string, outputPath: string): Promise<void> {
    try {
      // Use LibreOffice for conversion
      const command = `soffice --headless --convert-to pdf --outdir "${path.dirname(outputPath)}" "${inputPath}"`;
      await execAsync(command);
      
      // Rename output file
      const defaultOutput = path.join(path.dirname(outputPath), `${path.basename(inputPath, path.extname(inputPath))}.pdf`);
      await fs.rename(defaultOutput, outputPath);
    } catch (error) {
      console.error("Word to PDF conversion failed:", error);
      throw error;
    }
  }

  /**
   * Convert PowerPoint to PDF
   */
  private async convertPowerPointToPdf(inputPath: string, outputPath: string): Promise<void> {
    try {
      // Use LibreOffice for conversion
      const command = `soffice --headless --convert-to pdf --outdir "${path.dirname(outputPath)}" "${inputPath}"`;
      await execAsync(command);
      
      // Rename output file
      const defaultOutput = path.join(path.dirname(outputPath), `${path.basename(inputPath, path.extname(inputPath))}.pdf`);
      await fs.rename(defaultOutput, outputPath);
    } catch (error) {
      console.error("PowerPoint to PDF conversion failed:", error);
      throw error;
    }
  }

  /**
   * Convert Excel to PDF
   */
  private async convertExcelToPdf(inputPath: string, outputPath: string): Promise<void> {
    try {
      // Use LibreOffice for conversion
      const command = `soffice --headless --convert-to pdf --outdir "${path.dirname(outputPath)}" "${inputPath}"`;
      await execAsync(command);
      
      // Rename output file
      const defaultOutput = path.join(path.dirname(outputPath), `${path.basename(inputPath, path.extname(inputPath))}.pdf`);
      await fs.rename(defaultOutput, outputPath);
    } catch (error) {
      console.error("Excel to PDF conversion failed:", error);
      throw error;
    }
  }

  /**
   * Extract text from file
   */
  private async extractText(filePath: string, metadata: FileMetadata): Promise<string> {
    try {
      if (metadata.isPdf) {
        return await this.extractTextFromPdf(filePath);
      } else if (metadata.isImage) {
        return await this.extractTextFromImage(filePath);
      } else if (metadata.isDocument) {
        // Convert to PDF first, then extract text
        const pdfPath = await this.convertDocumentToPdf(filePath);
        const text = await this.extractTextFromPdf(pdfPath);
        
        // Clean up temporary PDF
        await fs.unlink(pdfPath);
        
        return text;
      }
      
      return "";
    } catch (error) {
      console.error("Text extraction failed:", error);
      return "";
    }
  }

  /**
   * Extract text from PDF
   */
  private async extractTextFromPdf(filePath: string): Promise<string> {
    try {
      // Use pdftotext (poppler-utils) for text extraction
      const command = `pdftotext "${filePath}" -`;
      const { stdout } = await execAsync(command);
      return stdout.trim();
    } catch (error) {
      console.error("PDF text extraction failed:", error);
      return "";
    }
  }

  /**
   * Extract text from image using OCR
   */
  private async extractTextFromImage(filePath: string): Promise<string> {
    try {
      // For now, return placeholder text
      // In production, this would use OCR libraries like Tesseract
      return "Image text extraction not implemented yet";
    } catch (error) {
      console.error("Image OCR failed:", error);
      return "";
    }
  }

  /**
   * Get page count
   */
  private async getPageCount(filePath: string, metadata: FileMetadata): Promise<number> {
    try {
      if (metadata.isPdf) {
        const command = `pdfinfo "${filePath}" | grep Pages | awk '{print $2}'`;
        const { stdout } = await execAsync(command);
        return parseInt(stdout.trim()) || 1;
      } else if (metadata.isDocument) {
        // Convert to PDF temporarily to get page count
        const pdfPath = await this.convertDocumentToPdf(filePath);
        const pageCount = await this.getPageCount(pdfPath, metadata);
        
        // Clean up temporary PDF
        await fs.unlink(pdfPath);
        
        return pageCount;
      }
      
      return 1; // Images and other files have 1 page
    } catch (error) {
      console.error("Page count extraction failed:", error);
      return 1;
    }
  }

  /**
   * Get file metadata
   */
  private async getFileMetadata(filePath: string): Promise<FileMetadata | null> {
    try {
      const stats = await fs.stat(filePath);
      const extension = path.extname(filePath).toLowerCase();
      
      const isImage = this.supportedImageFormats.includes(extension);
      const isPdf = extension === ".pdf";
      const isDocument = this.supportedDocumentFormats.includes(extension);

      if (!isImage && !isPdf && !isDocument) {
        return null;
      }

      return {
        fileName: path.basename(filePath),
        fileSize: stats.size,
        mimeType: this.getMimeType(extension),
        isImage,
        isPdf,
        isDocument,
      };
    } catch (error) {
      console.error("Failed to get file metadata:", error);
      return null;
    }
  }

  /**
   * Get MIME type from extension
   */
  private getMimeType(extension: string): string {
    const mimeTypes: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".bmp": "image/bmp",
      ".webp": "image/webp",
      ".pdf": "application/pdf",
      ".doc": "application/msword",
      ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ".ppt": "application/vnd.ms-powerpoint",
      ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      ".xls": "application/vnd.ms-excel",
      ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    };

    return mimeTypes[extension] || "application/octet-stream";
  }

  /**
   * Ensure required directories exist
   */
  private async ensureDirectories(): Promise<void> {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      console.error("Failed to create directories:", error);
    }
  }

  /**
   * Clean up temporary files
   */
  async cleanupTempFiles(): Promise<void> {
    try {
      const files = await fs.readdir(this.tempDir);
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        const stats = await fs.stat(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          await fs.unlink(filePath);
          console.debug("Cleaned up temporary file:", filePath);
        }
      }
    } catch (error) {
      console.error("Failed to cleanup temporary files:", error);
    }
  }
}

