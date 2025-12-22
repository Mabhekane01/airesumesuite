import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileParserService } from '../services/file-parser/fileParserService';
import { AuthenticatedRequest } from '../middleware/auth';

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), 'uploads');

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname);
    cb(null, `resume-${uniqueSuffix}${fileExtension}`);
  }
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (fileParserService.validateFileType(file.originalname)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, DOC, and DOCX files are allowed.'));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

export class FileUploadController {
  async uploadAndParseResume(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
        return;
      }

      const filePath = req.file.path;
      
      try {
        // Validate file size
        if (!fileParserService.validateFileSize(req.file.size)) {
          await fileParserService.cleanupFile(filePath);
          res.status(400).json({
            success: false,
            message: 'File size exceeds 10MB limit'
          });
          return;
        }

        // Parse the uploaded file
        const parsedData = await fileParserService.parseResumeFile(filePath);

        // Clean up the uploaded file
        await fileParserService.cleanupFile(filePath);

        res.status(200).json({
          success: true,
          data: {
            extractedText: parsedData.text,
            parsedData: parsedData.extractedData,
            originalFilename: req.file.originalname
          }
        });
      } catch (parseError) {
        // Clean up file on parse error
        await fileParserService.cleanupFile(filePath);
        
        console.error('File parsing error:', parseError);
        res.status(422).json({
          success: false,
          message: parseError instanceof Error ? parseError.message : 'Failed to parse file'
        });
      }
    } catch (error) {
      console.error('File upload error:', error);
      res.status(500).json({
        success: false,
        message: 'File upload failed'
      });
    }
  }

  async getUploadLimits(req: Request, res: Response): Promise<void> {
    res.status(200).json({
      success: true,
      data: {
        maxFileSize: '10MB',
        supportedTypes: ['.pdf', '.doc', '.docx'],
        maxFileSizeBytes: 10 * 1024 * 1024
      }
    });
  }
}

export const fileUploadController = new FileUploadController();