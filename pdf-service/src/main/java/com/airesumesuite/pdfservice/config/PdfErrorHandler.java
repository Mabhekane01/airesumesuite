package com.airesumesuite.pdfservice.config;

public class PdfErrorHandler {
    
    // File size limits (in bytes)
    public static final long MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
    public static final long MAX_COMPRESSION_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    public static final long MAX_OCR_FILE_SIZE = 25 * 1024 * 1024; // 25MB
    public static final long MAX_CONVERSION_FILE_SIZE = 75 * 1024 * 1024; // 75MB
    public static final long MAX_IMAGE_FILE_SIZE = 20 * 1024 * 1024; // 20MB
    
    // Page limits
    public static final int MAX_PDF_PAGES = 500;
    public static final int MAX_OCR_PAGES = 100;
    public static final int MAX_CONVERSION_PAGES = 200;
    
    // Text limits
    public static final int MAX_TEXT_LENGTH = 50000;
    public static final int MAX_SEARCH_RESULTS = 1000;
    
    // Timeout limits (in seconds)
    public static final int OCR_TIMEOUT = 300; // 5 minutes
    public static final int CONVERSION_TIMEOUT = 180; // 3 minutes
    public static final int COMPRESSION_TIMEOUT = 120; // 2 minutes
    
    public static class PdfServiceException extends Exception {
        private final int errorCode;
        
        public PdfServiceException(String message, int errorCode) {
            super(message);
            this.errorCode = errorCode;
        }
        
        public PdfServiceException(String message, Throwable cause, int errorCode) {
            super(message, cause);
            this.errorCode = errorCode;
        }
        
        public int getErrorCode() {
            return errorCode;
        }
    }
    
    public static class FileSizeException extends PdfServiceException {
        public FileSizeException(String message) {
            super(message, 413);
        }
    }
    
    public static class InvalidFileException extends PdfServiceException {
        public InvalidFileException(String message) {
            super(message, 400);
        }
    }
    
    public static class ProcessingTimeoutException extends PdfServiceException {
        public ProcessingTimeoutException(String message) {
            super(message, 408);
        }
    }
    
    public static class UnsupportedOperationException extends PdfServiceException {
        public UnsupportedOperationException(String message) {
            super(message, 422);
        }
    }
    
    public static class CorruptedFileException extends PdfServiceException {
        public CorruptedFileException(String message) {
            super(message, 422);
        }
    }
    
    public static class InsufficientMemoryException extends PdfServiceException {
        public InsufficientMemoryException(String message) {
            super(message, 507);
        }
    }
    
    public static class SecurityException extends PdfServiceException {
        public SecurityException(String message) {
            super(message, 403);
        }
    }
    
    // Error code constants
    public static final int ERROR_FILE_TOO_LARGE = 413;
    public static final int ERROR_INVALID_FILE = 400;
    public static final int ERROR_CORRUPTED_FILE = 422;
    public static final int ERROR_TIMEOUT = 408;
    public static final int ERROR_UNSUPPORTED = 422;
    public static final int ERROR_MEMORY = 507;
    public static final int ERROR_SECURITY = 403;
    public static final int ERROR_INTERNAL = 500;
    
    public static String getErrorMessage(int errorCode) {
        return switch (errorCode) {
            case 400 -> "Invalid file format or parameters";
            case 403 -> "Security restrictions prevent this operation";
            case 408 -> "Processing timeout - file too complex or system overloaded";
            case 413 -> "File size exceeds maximum allowed limit";
            case 422 -> "File is corrupted or operation not supported";
            case 507 -> "Insufficient memory to process file";
            default -> "Internal server error during processing";
        };
    }
    
    public static String getUserFriendlyMessage(Exception e) {
        if (e instanceof FileSizeException) {
            return "The uploaded file is too large. Please try with a smaller file (max " + (MAX_FILE_SIZE / 1024 / 1024) + "MB).";
        } else if (e instanceof InvalidFileException) {
            return "The uploaded file is not a valid PDF or has an unsupported format.";
        } else if (e instanceof ProcessingTimeoutException) {
            return "The file is taking too long to process. Please try with a simpler or smaller file.";
        } else if (e instanceof CorruptedFileException) {
            return "The PDF file appears to be corrupted or damaged. Please try with a different file.";
        } else if (e instanceof UnsupportedOperationException) {
            return "This operation is not supported for the current file type or content.";
        } else if (e instanceof InsufficientMemoryException) {
            return "The file is too complex to process. Please try with a simpler file or contact support.";
        } else if (e instanceof SecurityException) {
            return "Security restrictions prevent this operation on the uploaded file.";
        } else {
            return "An error occurred while processing your file. Please try again or contact support.";
        }
    }
    
    public static void validateBasicFile(org.springframework.web.multipart.MultipartFile file) throws PdfServiceException {
        if (file == null || file.isEmpty()) {
            throw new InvalidFileException("No file uploaded or file is empty");
        }
        
        String filename = file.getOriginalFilename();
        if (filename == null || !filename.toLowerCase().endsWith(".pdf")) {
            throw new InvalidFileException("File must be a PDF document");
        }
        
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new FileSizeException("File size (" + (file.getSize() / 1024 / 1024) + "MB) exceeds maximum allowed size of " + (MAX_FILE_SIZE / 1024 / 1024) + "MB");
        }
    }
    
    public static void validateFileForOperation(org.springframework.web.multipart.MultipartFile file, String operation) throws PdfServiceException {
        validateBasicFile(file);
        
        switch (operation.toLowerCase()) {
            case "compression", "compress" -> {
                if (file.getSize() > MAX_COMPRESSION_FILE_SIZE) {
                    throw new FileSizeException("File size for compression cannot exceed " + (MAX_COMPRESSION_FILE_SIZE / 1024 / 1024) + "MB");
                }
            }
            case "ocr" -> {
                if (file.getSize() > MAX_OCR_FILE_SIZE) {
                    throw new FileSizeException("File size for OCR cannot exceed " + (MAX_OCR_FILE_SIZE / 1024 / 1024) + "MB");
                }
            }
            case "conversion", "convert" -> {
                if (file.getSize() > MAX_CONVERSION_FILE_SIZE) {
                    throw new FileSizeException("File size for conversion cannot exceed " + (MAX_CONVERSION_FILE_SIZE / 1024 / 1024) + "MB");
                }
            }
        }
    }
    
    public static void validatePageCount(int pageCount, String operation) throws PdfServiceException {
        switch (operation.toLowerCase()) {
            case "ocr" -> {
                if (pageCount > MAX_OCR_PAGES) {
                    throw new UnsupportedOperationException("PDF has too many pages for OCR processing (max " + MAX_OCR_PAGES + " pages)");
                }
            }
            case "conversion", "convert" -> {
                if (pageCount > MAX_CONVERSION_PAGES) {
                    throw new UnsupportedOperationException("PDF has too many pages for conversion (max " + MAX_CONVERSION_PAGES + " pages)");
                }
            }
            default -> {
                if (pageCount > MAX_PDF_PAGES) {
                    throw new UnsupportedOperationException("PDF has too many pages to process (max " + MAX_PDF_PAGES + " pages)");
                }
            }
        }
    }
}