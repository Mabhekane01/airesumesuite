import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { config } from "../config/environment";
import { logger } from "../utils/logger";

// Configure multer storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, config.UPLOAD_PATH);
  },
  filename: (_req, file, cb) => {
    // Generate unique filename with original extension
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

// File filter function
const fileFilter = (
  _req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  try {
    // Check file type
    const allowedTypes = config.ALLOWED_FILE_TYPES;
    const fileExtension = path
      .extname(file.originalname)
      .toLowerCase()
      .substring(1);

    if (!allowedTypes.includes(fileExtension)) {
      logger.warn("File upload rejected - unsupported type", {
        filename: file.originalname,
        mimeType: file.mimetype,
        fileExtension,
        allowedTypes,
      });

      cb(
        new Error(
          `File type not allowed. Supported types: ${allowedTypes.join(", ")}`
        )
      );
      return;
    }

    // Check file size
    if (file.size > config.MAX_FILE_SIZE) {
      logger.warn("File upload rejected - size too large", {
        filename: file.originalname,
        fileSize: file.size,
        maxSize: config.MAX_FILE_SIZE,
      });

      cb(
        new Error(
          `File too large. Maximum size: ${config.MAX_FILE_SIZE / (1024 * 1024)}MB`
        )
      );
      return;
    }

    // Sanitize filename
    const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
    file.originalname = sanitizedFilename;

    logger.info("File upload accepted", {
      filename: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
    });

    cb(null, true);
  } catch (error) {
    logger.error("File filter error", {
      error: error instanceof Error ? error.message : String(error),
      filename: file.originalname,
    });
    cb(new Error("File validation failed"));
  }
};

// Configure multer
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.MAX_FILE_SIZE,
    files: 1, // Only allow single file uploads
  },
});

// Error handling middleware for multer
export const handleUploadError = (
  error: any,
  _req: any,
  res: any,
  _next: any
) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: `File too large. Maximum size: ${config.MAX_FILE_SIZE / (1024 * 1024)}MB`,
      });
    }

    if (error.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        success: false,
        message: "Too many files. Only one file allowed per upload.",
      });
    }

    return res.status(400).json({
      success: false,
      message: "File upload error",
      error: error.message,
    });
  }

  if (error.message) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  logger.error("Upload error", { error: error.message || "Unknown error" });

  return res.status(500).json({
    success: false,
    message: "Internal server error during file upload",
  });
};

// Middleware to ensure upload directory exists
export const ensureUploadDir = (_req: any, _res: any, next: any) => {
  const fs = require("fs");
  const uploadPath = config.UPLOAD_PATH;

  if (!fs.existsSync(uploadPath)) {
    try {
      fs.mkdirSync(uploadPath, { recursive: true });
      logger.info("Upload directory created", { path: uploadPath });
    } catch (error) {
      logger.error("Failed to create upload directory", {
        error: error instanceof Error ? error.message : String(error),
        path: uploadPath,
      });
      // Can't use res here since it's not available, just log and continue
      logger.error("Failed to initialize upload directory", {
        path: uploadPath,
      });
    }
  }

  next();
};
