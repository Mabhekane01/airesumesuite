package com.airesumesuite.pdfservice.controller;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.airesumesuite.pdfservice.config.PdfErrorHandler;
import com.airesumesuite.pdfservice.config.PdfErrorHandler.InvalidFileException;
import com.airesumesuite.pdfservice.config.PdfErrorHandler.PdfServiceException;
import com.airesumesuite.pdfservice.service.PdfEditingService;

/**
 * SeJda-Style PDF Editor Controller
 * Implements the 3-step architecture:
 * 1. Upload Once - Store PDF, return file ID
 * 2. Frontend Editing - Live preview with overlay
 * 3. Apply Changes - Process JSON changes and return new PDF
 */
@RestController
@RequestMapping("/api/pdf/editor")
public class PdfEditorController {

    private static final Logger logger = LoggerFactory.getLogger(PdfEditorController.class);
    
    @Autowired
    private PdfEditingService pdfEditingService;
    
    // Temporary storage for uploaded PDFs (in production, use S3, database, etc.)
    private static final String TEMP_UPLOAD_DIR = System.getProperty("java.io.tmpdir") + "/pdf-editor/";
    
    static {
        try {
            Files.createDirectories(Paths.get(TEMP_UPLOAD_DIR));
        } catch (IOException e) {
            throw new RuntimeException("Failed to create temp upload directory", e);
        }
    }

    /**
     * Step 1: Upload PDF and get file ID
     * Returns: { fileId: "file_12345", numPages: 10, previewUrl: "..." }
     */
    @PostMapping("/upload")
    public ResponseEntity<Map<String, Object>> uploadPdf(@RequestParam("file") MultipartFile file) {
        try {
            // Validate file
            PdfErrorHandler.validateBasicFile(file);
            
            logger.info("Step 1 - Upload: Received PDF file: {}", file.getOriginalFilename());
            
            // Generate unique file ID
            String fileId = "file_" + UUID.randomUUID().toString().replace("-", "").substring(0, 8);
            
            // Store PDF temporarily
            Path filePath = Paths.get(TEMP_UPLOAD_DIR, fileId + ".pdf");
            Files.copy(file.getInputStream(), filePath);
            
            // Get PDF info (page count, etc.)
            Map<String, Object> pdfInfo = pdfEditingService.getPdfInfo(filePath.toFile());
            
            // Return file ID and info for frontend
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("fileId", fileId);
            response.put("fileName", file.getOriginalFilename());
            response.put("numPages", pdfInfo.get("pageCount"));
            response.put("fileSize", file.getSize());
            
            logger.info("Step 1 - Upload complete: fileId={}, pages={}", fileId, pdfInfo.get("pageCount"));
            
            return ResponseEntity.ok(response);
            
        } catch (PdfServiceException e) {
            logger.error("PDF service error during upload: {}", e.getMessage());
            return createErrorResponse(PdfErrorHandler.getUserFriendlyMessage(e), HttpStatus.valueOf(e.getErrorCode()));
        } catch (IOException e) {
            logger.error("IO error during upload: {}", e.getMessage());
            return createErrorResponse("Failed to process uploaded file", HttpStatus.INTERNAL_SERVER_ERROR);
        } catch (Exception e) {
            logger.error("Unexpected error during upload: {}", e.getMessage());
            return createErrorResponse("Upload failed due to unexpected error", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Step 3: Apply changes to PDF
     * Input: { fileId: "file_12345", changes: [...] }
     * Returns: Modified PDF file for download
     */
    @PostMapping("/apply-changes")
    public ResponseEntity<byte[]> applyChanges(@RequestBody Map<String, Object> request) {
        try {
            String fileId = (String) request.get("fileId");
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> changes = (List<Map<String, Object>>) request.get("changes");
            
            if (fileId == null || changes == null) {
                throw new InvalidFileException("Missing fileId or changes in request");
            }
            
            logger.info("Step 3 - Apply Changes: fileId={}, changes={}", fileId, changes.size());
            
            // Load original PDF from storage
            Path filePath = Paths.get(TEMP_UPLOAD_DIR, fileId + ".pdf");
            if (!Files.exists(filePath)) {
                throw new InvalidFileException("File not found: " + fileId);
            }
            
            // Apply changes using PDF editing service
            byte[] modifiedPdf = pdfEditingService.applyChangesToPdf(filePath.toFile(), changes);
            
            // Clean up original file
            try {
                Files.deleteIfExists(filePath);
            } catch (IOException e) {
                logger.warn("Failed to cleanup temp file: {}", filePath);
            }
            
            // Return modified PDF
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment", "edited-document.pdf");
            headers.setContentLength(modifiedPdf.length);
            
            logger.info("Step 3 - Apply Changes complete: {} changes applied", changes.size());
            
            return new ResponseEntity<>(modifiedPdf, headers, HttpStatus.OK);
            
        } catch (PdfServiceException e) {
            logger.error("PDF service error during apply changes: {}", e.getMessage());
            return createErrorByteResponse(PdfErrorHandler.getUserFriendlyMessage(e), HttpStatus.valueOf(e.getErrorCode()));
        } catch (IOException e) {
            logger.error("IO error during apply changes: {}", e.getMessage());
            return createErrorByteResponse("Failed to apply changes to PDF", HttpStatus.INTERNAL_SERVER_ERROR);
        } catch (Exception e) {
            logger.error("Unexpected error during apply changes: {}", e.getMessage());
            return createErrorByteResponse("Apply changes failed due to unexpected error", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Health check endpoint
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> healthCheck() {
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("service", "PDF Editor Service");
        response.put("status", "healthy");
        response.put("timestamp", System.currentTimeMillis());
        return ResponseEntity.ok(response);
    }

    /**
     * Add missing /api/pdf/* endpoints for compatibility
     */
    @PostMapping("/merge")
    public ResponseEntity<byte[]> mergePdfs(@RequestParam("files") MultipartFile[] files) {
        try {
            if (files.length < 2) {
                throw new InvalidFileException("At least 2 PDF files are required for merging");
            }
            
            logger.info("Merging {} PDF files", files.length);
            
            // Convert array to List for service
            java.util.List<MultipartFile> fileList = java.util.Arrays.asList(files);
            
            // Use PDF editing service to merge files
            byte[] mergedPdf = pdfEditingService.mergePdfs(fileList);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment", "merged-document.pdf");
            headers.setContentLength(mergedPdf.length);
            
            return new ResponseEntity<>(mergedPdf, headers, HttpStatus.OK);
            
        } catch (InvalidFileException | IOException e) {
            logger.error("PDF merge failed: {}", e.getMessage());
            return createErrorByteResponse("Failed to merge PDFs: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Extract text from PDF
     */
    @PostMapping("/extract-text")
    public ResponseEntity<Map<String, Object>> extractText(@RequestParam("file") MultipartFile file) {
        try {
            PdfErrorHandler.validateBasicFile(file);
            
            logger.info("Extracting text from PDF: {}", file.getOriginalFilename());
            
            // Extract text using PDF editing service
            Map<String, Object> textData = pdfEditingService.extractTextWithPositions(file);
            String extractedText = (String) textData.get("text");
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("text", extractedText);
            response.put("pages", extractedText.split("\\f").length); // Form feed separates pages
            
            return ResponseEntity.ok(response);
            
        } catch (PdfServiceException | IOException e) {
            logger.error("Text extraction failed: {}", e.getMessage());
            return createErrorResponse("Failed to extract text: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Add text to PDF
     */
    @PostMapping("/add-text")
    public ResponseEntity<byte[]> addText(
            @RequestParam("file") MultipartFile file,
            @RequestParam("text") String text,
            @RequestParam("x") double x,
            @RequestParam("y") double y,
            @RequestParam("pageNumber") int pageNumber,
            @RequestParam(value = "fontSize", defaultValue = "12") double fontSize,
            @RequestParam(value = "color", defaultValue = "black") String color) {
        try {
            PdfErrorHandler.validateBasicFile(file);
            
            logger.info("Adding text to PDF: {} at ({}, {}) page {}", text, x, y, pageNumber);
            
            // Add text using PDF editing service
            byte[] modifiedPdf = pdfEditingService.addTextAtPosition(file, text, (float)x, (float)y, pageNumber, (float)fontSize, color);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment", "text-added.pdf");
            headers.setContentLength(modifiedPdf.length);
            
            return new ResponseEntity<>(modifiedPdf, headers, HttpStatus.OK);
            
        } catch (PdfServiceException | IOException e) {
            logger.error("Add text failed: {}", e.getMessage());
            return createErrorByteResponse("Failed to add text: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Delete pages from PDF
     */
    @PostMapping("/delete-pages")
    public ResponseEntity<byte[]> deletePages(
            @RequestParam("file") MultipartFile file,
            @RequestParam("pagesToDelete") String pagesToDeleteJson) {
        try {
            PdfErrorHandler.validateBasicFile(file);
            
            // Parse page numbers from JSON
            String[] pageStrings = pagesToDeleteJson.replace("[", "").replace("]", "").replace("\"", "").split(",");
            java.util.List<Integer> pagesToDelete = new java.util.ArrayList<>();
            for (String pageStr : pageStrings) {
                pagesToDelete.add(Integer.valueOf(pageStr.trim()));
            }
            
            logger.info("Deleting {} pages from PDF", pagesToDelete.size());
            
            // Delete pages using PDF editing service
            byte[] modifiedPdf = pdfEditingService.deletePages(file, pagesToDelete);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment", "pages-deleted.pdf");
            headers.setContentLength(modifiedPdf.length);
            
            return new ResponseEntity<>(modifiedPdf, headers, HttpStatus.OK);
            
        } catch (PdfServiceException | IOException | NumberFormatException e) {
            logger.error("Delete pages failed: {}", e.getMessage());
            return createErrorByteResponse("Failed to delete pages: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get PDF information
     */
    @PostMapping("/info")
    public ResponseEntity<Map<String, Object>> getPdfInfo(@RequestParam("file") MultipartFile file) {
        try {
            PdfErrorHandler.validateBasicFile(file);
            
            logger.info("Getting PDF info for: {}", file.getOriginalFilename());
            
            // Store PDF temporarily (required for getPdfInfo)
            String fileId = "info_" + UUID.randomUUID().toString().replace("-", "").substring(0, 8);
            Path filePath = Paths.get(TEMP_UPLOAD_DIR, fileId + ".pdf");
            Files.copy(file.getInputStream(), filePath);
            
            // Get PDF info using PDF editing service
            Map<String, Object> pdfInfo = pdfEditingService.getPdfInfo(filePath.toFile());
            
            // Clean up temp file
            Files.deleteIfExists(filePath);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.putAll(pdfInfo);
            
            return ResponseEntity.ok(response);
            
        } catch (PdfServiceException | IOException e) {
            logger.error("Get PDF info failed: {}", e.getMessage());
            return createErrorResponse("Failed to get PDF info: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Extract specific pages from PDF (for SplitPDFTool)
     */
    @PostMapping("/extract-pages")
    public ResponseEntity<byte[]> extractPages(
            @RequestParam("file") MultipartFile file,
            @RequestParam("pages") String pagesParam) {
        try {
            PdfErrorHandler.validateBasicFile(file);
            
            // Parse page numbers from comma-separated string
            String[] pageStrings = pagesParam.split(",");
            java.util.List<Integer> pagesToExtract = new java.util.ArrayList<>();
            for (String pageStr : pageStrings) {
                pagesToExtract.add(Integer.valueOf(pageStr.trim()));
            }
            
            logger.info("Extracting {} pages from PDF: {}", pagesToExtract.size(), file.getOriginalFilename());
            
            // Extract pages using PDF editing service
            byte[] extractedPdf = pdfEditingService.extractPages(file, pagesToExtract);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment", "extracted-pages.pdf");
            headers.setContentLength(extractedPdf.length);
            
            return new ResponseEntity<>(extractedPdf, headers, HttpStatus.OK);
            
        } catch (PdfServiceException | IOException | NumberFormatException e) {
            logger.error("Extract pages failed: {}", e.getMessage());
            return createErrorByteResponse("Failed to extract pages: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get PDF preview/info (optional endpoint for step 2)
     */
    @GetMapping("/preview/{fileId}")
    public ResponseEntity<Map<String, Object>> getPdfPreview(@PathVariable String fileId) {
        try {
            Path filePath = Paths.get(TEMP_UPLOAD_DIR, fileId + ".pdf");
            if (!Files.exists(filePath)) {
                throw new InvalidFileException("File not found: " + fileId);
            }
            
            Map<String, Object> pdfInfo = pdfEditingService.getPdfInfo(filePath.toFile());
            
            return ResponseEntity.ok(pdfInfo);
            
        } catch (PdfServiceException e) {
            logger.error("PDF service error during preview: {}", e.getMessage());
            return createErrorResponse(PdfErrorHandler.getUserFriendlyMessage(e), HttpStatus.valueOf(e.getErrorCode()));
        } catch (IOException e) {
            logger.error("Unexpected error during preview: {}", e.getMessage());
            return createErrorResponse("Preview failed", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // Helper methods
    private ResponseEntity<Map<String, Object>> createErrorResponse(String message, HttpStatus status) {
        Map<String, Object> errorResponse = new HashMap<>();
        errorResponse.put("success", false);
        errorResponse.put("error", message);
        
        return ResponseEntity.status(status).body(errorResponse);
    }
    
    private ResponseEntity<byte[]> createErrorByteResponse(String message, HttpStatus status) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        String jsonError = "{\"success\": false, \"error\": \"" + message.replace("\"", "\\\"") + "\"}";
        return new ResponseEntity<>(jsonError.getBytes(), headers, status);
    }
}