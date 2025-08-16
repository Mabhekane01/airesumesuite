package com.airesumesuite.pdfservice.controller;

import java.io.File;
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
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.airesumesuite.pdfservice.config.PdfErrorHandler;
import com.airesumesuite.pdfservice.config.PdfErrorHandler.*;
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
@CrossOrigin(origins = "*")
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
        } catch (Exception e) {
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