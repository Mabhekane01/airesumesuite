import multer from "multer";
import path from "path";
import fs from "fs/promises";
import sharp from "sharp";
import pdfParse from "pdf-parse";
import { fromPath } from "pdf2pic";
import { config } from "@/config/environment";
import { logger } from "@/utils/logger";
import { createError } from "@/middleware/errorHandler";
import { v4 as uuidv4 } from "uuid";

// File type definitions
export interface UploadedFile {
  id: string;
  originalName: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  fileType: string;
  url: string;
  thumbnailUrl?: string;
  previewImages?: string[];
  textContent?: string;
  pageCount?: number;
  metadata?: any;
}

// Supported file types
const SUPPORTED_FILE_TYPES = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    "pptx",
  "text/plain": "txt",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};

// File validation
const fileFilter = (
  req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  // Check file type
  if (
    !SUPPORTED_FILE_TYPES[file.mimetype as keyof typeof SUPPORTED_FILE_TYPES]
  ) {
    cb(
      createError(
        `File type ${file.mimetype} not supported`,
        400,
        "UNSUPPORTED_FILE_TYPE",
        { supportedTypes: Object.keys(SUPPORTED_FILE_TYPES) }
      )
    );
    return;
  }

  // Check file size
  if (file.size > config.MAX_FILE_SIZE) {
    cb(
      createError("File size too large", 413, "FILE_TOO_LARGE", {
        maxSize: config.MAX_FILE_SIZE,
        fileSize: file.size,
      })
    );
    return;
  }

  cb(null, true);
};

// Multer storage configuration
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const uploadDir = path.join(config.UPLOAD_PATH, "documents");
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error, "");
    }
  },
  filename: (req, file, cb) => {
    const uniqueId = uuidv4();
    const extension = path.extname(file.originalname);
    const fileName = `${uniqueId}${extension}`;
    cb(null, fileName);
  },
});

// Multer configuration
export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.MAX_FILE_SIZE,
    files: 10, // Maximum 10 files per upload
  },
});

// Document processing service
export class DocumentProcessingService {
  // Process uploaded file
  static async processFile(
    file: Express.Multer.File,
    userId: string
  ): Promise<UploadedFile> {
    try {
      const fileId = uuidv4();
      const fileType =
        SUPPORTED_FILE_TYPES[
          file.mimetype as keyof typeof SUPPORTED_FILE_TYPES
        ];

      const processedFile: UploadedFile = {
        id: fileId,
        originalName: file.originalname,
        fileName: file.filename,
        filePath: file.path,
        fileSize: file.size,
        mimeType: file.mimetype,
        fileType,
        url: `/uploads/documents/${file.filename}`,
      };

      // Process based on file type
      switch (fileType) {
        case "pdf":
          await this.processPDF(processedFile);
          break;
        case "jpg":
        case "png":
        case "gif":
        case "webp":
          await this.processImage(processedFile);
          break;
        case "txt":
          await this.processText(processedFile);
          break;
        default:
          // For other file types, just basic metadata
          processedFile.metadata = {
            processed: false,
            reason: "File type processing not implemented",
          };
      }

      logger.info("File processed successfully", {
        fileId,
        fileName: file.originalname,
        fileType,
        fileSize: file.size,
        userId,
      });

      return processedFile;
    } catch (error) {
      logger.error("File processing failed:", error);
      throw createError(
        "File processing failed",
        500,
        "FILE_PROCESSING_ERROR",
        { originalError: error }
      );
    }
  }

  // Process PDF files
  private static async processPDF(file: UploadedFile): Promise<void> {
    try {
      // Read PDF file
      const pdfBuffer = await fs.readFile(file.filePath);

      // Extract text content
      const pdfData = await pdfParse(pdfBuffer);
      file.textContent = pdfData.text;
      file.pageCount = pdfData.numpages;

      // Generate thumbnail (first page)
      const thumbnailPath = await this.generatePDFThumbnail(
        file.filePath,
        file.fileName
      );
      if (thumbnailPath) {
        file.thumbnailUrl = `/uploads/thumbnails/${path.basename(thumbnailPath)}`;
      }

      // Generate preview images for each page (limited to first 10 pages)
      const previewImages = await this.generatePDFPreviews(
        file.filePath,
        file.fileName
      );
      file.previewImages = previewImages.map(
        (img) => `/uploads/previews/${path.basename(img)}`
      );

      file.metadata = {
        processed: true,
        processingType: "pdf",
        textLength: file.textContent.length,
        pageCount: file.pageCount,
        hasThumbnail: !!file.thumbnailUrl,
        previewCount: file.previewImages.length,
      };
    } catch (error) {
      logger.error("PDF processing failed:", error);
      file.metadata = {
        processed: false,
        error: error.message,
        processingType: "pdf",
      };
    }
  }

  // Process image files
  private static async processImage(file: UploadedFile): Promise<void> {
    try {
      // Get image metadata
      const metadata = await sharp(file.filePath).metadata();

      // Generate thumbnail
      const thumbnailDir = path.join(config.UPLOAD_PATH, "thumbnails");
      await fs.mkdir(thumbnailDir, { recursive: true });

      const thumbnailFileName = `thumb_${file.fileName}`;
      const thumbnailPath = path.join(thumbnailDir, thumbnailFileName);

      await sharp(file.filePath)
        .resize(300, 300, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toFile(thumbnailPath);

      file.thumbnailUrl = `/uploads/thumbnails/${thumbnailFileName}`;

      file.metadata = {
        processed: true,
        processingType: "image",
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        hasThumbnail: true,
      };
    } catch (error) {
      logger.error("Image processing failed:", error);
      file.metadata = {
        processed: false,
        error: error.message,
        processingType: "image",
      };
    }
  }

  // Process text files
  private static async processText(file: UploadedFile): Promise<void> {
    try {
      // Read text content
      file.textContent = await fs.readFile(file.filePath, "utf-8");

      file.metadata = {
        processed: true,
        processingType: "text",
        textLength: file.textContent.length,
        lineCount: file.textContent.split("\n").length,
      };
    } catch (error) {
      logger.error("Text processing failed:", error);
      file.metadata = {
        processed: false,
        error: error.message,
        processingType: "text",
      };
    }
  }

  // Generate PDF thumbnail
  private static async generatePDFThumbnail(
    pdfPath: string,
    fileName: string
  ): Promise<string | null> {
    try {
      const thumbnailDir = path.join(config.UPLOAD_PATH, "thumbnails");
      await fs.mkdir(thumbnailDir, { recursive: true });

      const thumbnailFileName = `thumb_${path.parse(fileName).name}.jpg`;
      const thumbnailPath = path.join(thumbnailDir, thumbnailFileName);

      // Convert first page to image
      const options = {
        density: 150,
        saveFilename: path.parse(thumbnailFileName).name,
        savePath: thumbnailDir,
        format: "jpg",
        width: 300,
        height: 400,
      };

      const convert = fromPath(pdfPath, options);
      const pageData = await convert(1); // Convert first page

      if (pageData && pageData.path) {
        // Resize thumbnail to standard size
        await sharp(pageData.path)
          .resize(300, 400, { fit: "inside", withoutEnlargement: true })
          .jpeg({ quality: 85 })
          .toFile(thumbnailPath);

        // Clean up temporary file
        await fs.unlink(pageData.path).catch(() => {});

        logger.info("PDF thumbnail generated successfully", {
          pdfPath,
          thumbnailPath,
        });
        return thumbnailPath;
      }

      return null;
    } catch (error) {
      logger.error("PDF thumbnail generation failed:", error);
      return null;
    }
  }

  // Generate PDF preview images
  private static async generatePDFPreviews(
    pdfPath: string,
    fileName: string
  ): Promise<string[]> {
    try {
      const previewDir = path.join(config.UPLOAD_PATH, "previews");
      await fs.mkdir(previewDir, { recursive: true });

      const options = {
        density: 150,
        saveFilename: `${path.parse(fileName).name}_page`,
        savePath: previewDir,
        format: "jpg",
        width: 800,
        height: 1000,
      };

      const convert = fromPath(pdfPath, options);
      const previewImages: string[] = [];

      // Generate previews for first 10 pages
      const maxPages = 10;
      for (let page = 1; page <= maxPages; page++) {
        try {
          const pageData = await convert(page);
          if (pageData && pageData.path) {
            // Resize preview image
            const resizedPath = path.join(
              previewDir,
              `preview_${path.parse(fileName).name}_${page}.jpg`
            );
            await sharp(pageData.path)
              .resize(800, 1000, { fit: "inside", withoutEnlargement: true })
              .jpeg({ quality: 90 })
              .toFile(resizedPath);

            // Clean up temporary file
            await fs.unlink(pageData.path).catch(() => {});

            previewImages.push(resizedPath);
          }
        } catch (error) {
          // Stop if we can't process more pages
          logger.warn(`Could not process page ${page} of PDF`, {
            error: error.message,
          });
          break;
        }
      }

      logger.info("PDF previews generated successfully", {
        pdfPath,
        previewCount: previewImages.length,
      });

      return previewImages;
    } catch (error) {
      logger.error("PDF preview generation failed:", error);
      return [];
    }
  }

  // Delete file and associated assets
  static async deleteFile(file: UploadedFile): Promise<void> {
    try {
      // Delete main file
      await fs.unlink(file.filePath).catch(() => {}); // Ignore if file doesn't exist

      // Delete thumbnail
      if (file.thumbnailUrl) {
        const thumbnailPath = path.join(
          config.UPLOAD_PATH,
          file.thumbnailUrl.replace("/uploads/", "")
        );
        await fs.unlink(thumbnailPath).catch(() => {});
      }

      // Delete preview images
      if (file.previewImages) {
        for (const previewUrl of file.previewImages) {
          const previewPath = path.join(
            config.UPLOAD_PATH,
            previewUrl.replace("/uploads/", "")
          );
          await fs.unlink(previewPath).catch(() => {});
        }
      }

      logger.info("File and assets deleted successfully", {
        fileId: file.id,
        fileName: file.originalName,
      });
    } catch (error) {
      logger.error("File deletion failed:", error);
      throw createError("File deletion failed", 500, "FILE_DELETION_ERROR", {
        originalError: error,
      });
    }
  }

  // Get file size in human readable format
  static formatFileSize(bytes: number): string {
    const units = ["B", "KB", "MB", "GB", "TB"];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  // Validate file before processing
  static validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw createError("No file provided", 400, "NO_FILE");
    }

    if (
      !SUPPORTED_FILE_TYPES[file.mimetype as keyof typeof SUPPORTED_FILE_TYPES]
    ) {
      throw createError(
        `File type ${file.mimetype} not supported`,
        400,
        "UNSUPPORTED_FILE_TYPE"
      );
    }

    if (file.size > config.MAX_FILE_SIZE) {
      throw createError("File size too large", 413, "FILE_TOO_LARGE");
    }
  }
}

export default DocumentProcessingService;
