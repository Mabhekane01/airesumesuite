import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";

// Mock implementations for now - these would be installed as dependencies
const logger = {
  info: console.log,
  error: console.error,
  warn: console.warn,
  debug: console.log,
};

// Mock sharp for now
const sharp = (filePath: string) => ({
  metadata: () => Promise.resolve({ width: 800, height: 600 }),
  resize: () => ({ composite: () => ({ toFile: () => Promise.resolve() }) }),
  jpeg: () => ({ toBuffer: () => Promise.resolve(Buffer.from("")) }),
  png: () => ({ toBuffer: () => Promise.resolve(Buffer.from("")) }),
  toFile: () => Promise.resolve(),
});

// Mock PDF libraries for now
const PDFDocument = {
  load: () => Promise.resolve({
    getPages: () => [],
    addPage: () => ({ getSize: () => ({ width: 800, height: 600 }), drawText: () => {} }),
    embedPdf: () => Promise.resolve({}),
    removePage: () => {},
    getPageCount: () => 1,
    save: () => Promise.resolve(Buffer.from("")),
  }),
};

// Mock pdf2pic for now
const fromPath = () => () => Promise.resolve([{ base64: "" }]);

// Mock tesseract for now
const createWorker = () => Promise.resolve({
  loadLanguage: () => Promise.resolve(),
  initialize: () => Promise.resolve(),
  recognize: () => Promise.resolve({ data: { text: "" } }),
  terminate: () => Promise.resolve(),
});

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

export class FileProcessingService {
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
        result.pageCount = await this.getPageCount(filePath, { isPdf: metadata.isPdf, isDocument: metadata.isDocument });
      }

      result.processingTime = Date.now() - startTime;
      logger.info("File processing completed", { filePath, processingTime: result.processingTime });

      return result;
    } catch (error) {
      logger.error("File processing failed:", error);
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
      const image = sharp(filePath);
      const metadata = await image.metadata();

      // Resize if needed
      if (options.maxWidth || options.maxHeight) {
        image.resize(options.maxWidth, options.maxHeight, {
          fit: "inside",
          withoutEnlargement: true,
        });
      }

      // Add watermark if requested
      if (options.addWatermark) {
        image.composite([
          {
            input: await this.createWatermarkImage(options.addWatermark, metadata.width || 800, metadata.height || 600),
            gravity: "southeast",
          },
        ]);
      }

      // Compress if requested
      if (options.compress) {
        image.jpeg({ quality: options.quality || 80 });
      }

      // Generate thumbnail
      if (options.generateThumbnails) {
        const thumbnailPath = await this.generateThumbnail(filePath, image);
        result.thumbnailPath = thumbnailPath;
      }

      // Generate previews
      if (options.generatePreviews) {
        const previewPaths = await this.generateImagePreviews(filePath, image);
        result.previewPaths = previewPaths;
      }

      // Save processed image
      const processedPath = path.join(this.tempDir, `${uuidv4()}_processed.${path.extname(filePath)}`);
      await image.toFile(processedPath);
      result.filePath = processedPath;
    } catch (error) {
      logger.error("Image processing failed:", error);
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
      // Add watermark if requested
      if (options.addWatermark) {
        const watermarkedPath = await this.addPdfWatermark(filePath, options.addWatermark);
        result.filePath = watermarkedPath;
      }

      // Generate thumbnail
      if (options.generateThumbnails) {
        const thumbnailPath = await this.generatePdfThumbnail(filePath);
        result.thumbnailPath = thumbnailPath;
      }

      // Generate previews
      if (options.generatePreviews) {
        const previewPaths = await this.generatePdfPreviews(filePath);
        result.previewPaths = previewPaths;
      }

      // Compress if requested
      if (options.compress) {
        const compressedPath = await this.compressPdf(filePath);
        result.filePath = compressedPath;
      }
    } catch (error) {
      logger.error("PDF processing failed:", error);
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
      logger.error("Document processing failed:", error);
      throw error;
    }
  }

  /**
   * Generate thumbnail from image
   */
  private async generateThumbnail(filePath: string, image: sharp.Sharp): Promise<string> {
    try {
      const thumbnailPath = path.join(this.tempDir, `${uuidv4()}_thumb.jpg`);
      
      await image
        .resize(300, 300, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toFile(thumbnailPath);

      return thumbnailPath;
    } catch (error) {
      logger.error("Thumbnail generation failed:", error);
      throw error;
    }
  }

  /**
   * Generate image previews
   */
  private async generateImagePreviews(filePath: string, image: sharp.Sharp): Promise<string[]> {
    try {
      const previewPaths: string[] = [];
      const sizes = [800, 1200, 1600];

      for (const size of sizes) {
        const previewPath = path.join(this.tempDir, `${uuidv4()}_preview_${size}.jpg`);
        
        await image
          .resize(size, size, { fit: "inside", withoutEnlargement: true })
          .jpeg({ quality: 85 })
          .toFile(previewPath);

        previewPaths.push(previewPath);
      }

      return previewPaths;
    } catch (error) {
      logger.error("Image preview generation failed:", error);
      throw error;
    }
  }

  /**
   * Generate PDF thumbnail
   */
  private async generatePdfThumbnail(filePath: string): Promise<string> {
    try {
      const thumbnailPath = path.join(this.tempDir, `${uuidv4()}_thumb.jpg`);
      
      const options = {
        density: 150,
        saveFilename: path.basename(thumbnailPath, ".jpg"),
        savePath: path.dirname(thumbnailPath),
        format: "jpg",
        width: 300,
        height: 300,
      };

      const convert = fromPath(filePath, options);
      const pageData = await convert(1);
      
      if (pageData.length > 0) {
        await fs.writeFile(thumbnailPath, pageData[0].base64, "base64");
      }

      return thumbnailPath;
    } catch (error) {
      logger.error("PDF thumbnail generation failed:", error);
      throw error;
    }
  }

  /**
   * Generate PDF previews
   */
  private async generatePdfPreviews(filePath: string): Promise<string[]> {
    try {
      const previewPaths: string[] = [];
      const pageCount = await this.getPageCount(filePath, { isPdf: true });
      const maxPages = Math.min(pageCount || 1, 5); // Limit to first 5 pages

      for (let page = 1; page <= maxPages; page++) {
        const previewPath = path.join(this.tempDir, `${uuidv4()}_preview_page_${page}.jpg`);
        
        const options = {
          density: 150,
          saveFilename: path.basename(previewPath, ".jpg"),
          savePath: path.dirname(previewPath),
          format: "jpg",
          width: 800,
          height: 1000,
        };

        const convert = fromPath(filePath, options);
        const pageData = await convert(page);
        
        if (pageData.length > 0) {
          await fs.writeFile(previewPath, pageData[0].base64, "base64");
          previewPaths.push(previewPath);
        }
      }

      return previewPaths;
    } catch (error) {
      logger.error("PDF preview generation failed:", error);
      throw error;
    }
  }

  /**
   * Add watermark to PDF
   */
  private async addPdfWatermark(filePath: string, watermarkText: string): Promise<string> {
    try {
      const pdfBytes = await fs.readFile(filePath);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pages = pdfDoc.getPages();

      // Create watermark text
      const watermarkPage = pdfDoc.addPage();
      const { width, height } = watermarkPage.getSize();
      
      watermarkPage.drawText(watermarkText, {
        x: width / 2 - 100,
        y: height / 2,
        size: 24,
        color: { r: 0.8, g: 0.8, b: 0.8 },
        opacity: 0.3,
      });

      // Add watermark to all pages
      for (const page of pages) {
        const watermarkForm = await pdfDoc.embedPdf(watermarkPage);
        page.drawPage(watermarkForm);
      }

      // Remove watermark page
      pdfDoc.removePage(pdfDoc.getPageCount() - 1);

      const watermarkedPath = path.join(this.tempDir, `${uuidv4()}_watermarked.pdf`);
      const watermarkedBytes = await pdfDoc.save();
      await fs.writeFile(watermarkedPath, watermarkedBytes);

      return watermarkedPath;
    } catch (error) {
      logger.error("PDF watermarking failed:", error);
      throw error;
    }
  }

  /**
   * Compress PDF
   */
  private async compressPdf(filePath: string): Promise<string> {
    try {
      const compressedPath = path.join(this.tempDir, `${uuidv4()}_compressed.pdf`);
      
      // Use ghostscript for PDF compression
      const command = `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/ebook -dNOPAUSE -dQUIET -dBATCH -sOutputFile="${compressedPath}" "${filePath}"`;
      
      await execAsync(command);
      
      return compressedPath;
    } catch (error) {
      logger.error("PDF compression failed:", error);
      // Return original file if compression fails
      return filePath;
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
      logger.error("Document to PDF conversion failed:", error);
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
      logger.error("Word to PDF conversion failed:", error);
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
      logger.error("PowerPoint to PDF conversion failed:", error);
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
      logger.error("Excel to PDF conversion failed:", error);
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
      logger.error("Text extraction failed:", error);
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
      logger.error("PDF text extraction failed:", error);
      return "";
    }
  }

  /**
   * Extract text from image using OCR
   */
  private async extractTextFromImage(filePath: string): Promise<string> {
    try {
      const worker = await createWorker();
      await worker.loadLanguage("eng");
      await worker.initialize("eng");
      
      const { data: { text } } = await worker.recognize(filePath);
      await worker.terminate();
      
      return text.trim();
    } catch (error) {
      logger.error("Image OCR failed:", error);
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
        const pageCount = await this.getPageCount(pdfPath, { isPdf: true });
        
        // Clean up temporary PDF
        await fs.unlink(pdfPath);
        
        return pageCount;
      }
      
      return 1; // Images and other files have 1 page
    } catch (error) {
      logger.error("Page count extraction failed:", error);
      return 1;
    }
  }

  /**
   * Create watermark image
   */
  private async createWatermarkImage(text: string, width: number, height: number): Promise<Buffer> {
    try {
      const svg = `
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <text x="50%" y="50%" text-anchor="middle" dy=".3em" 
                font-family="Arial" font-size="24" fill="rgba(128,128,128,0.3)" 
                transform="rotate(-45, ${width/2}, ${height/2})">
            ${text}
          </text>
        </svg>
      `;

      return await sharp(Buffer.from(svg)).png().toBuffer();
    } catch (error) {
      logger.error("Watermark creation failed:", error);
      throw error;
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

      let dimensions: { width: number; height: number } | undefined;
      if (isImage) {
        const image = sharp(filePath);
        const metadata = await image.metadata();
        dimensions = {
          width: metadata.width || 0,
          height: metadata.height || 0,
        };
      }

      return {
        fileName: path.basename(filePath),
        fileSize: stats.size,
        mimeType: this.getMimeType(extension),
        dimensions,
        isImage,
        isPdf,
        isDocument,
      };
    } catch (error) {
      logger.error("Failed to get file metadata:", error);
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
      logger.error("Failed to create directories:", error);
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
          logger.debug("Cleaned up temporary file:", filePath);
        }
      }
    } catch (error) {
      logger.error("Failed to cleanup temporary files:", error);
    }
  }
}
