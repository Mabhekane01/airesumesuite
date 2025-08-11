package com.airesumesuite.pdfservice.controller;

import java.io.IOException;

import com.airesumesuite.pdfservice.service.*;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Advanced PDF Editor Controller
 * Handles advanced PDF operations like watermarks, forms, security, optimization
 */
@RestController
@RequestMapping("/api/pdf/advanced")
@CrossOrigin(origins = "*")
public class AdvancedPdfController {

    @Autowired
    private PdfWatermarkService watermarkService;
    
    @Autowired
    private PdfAnnotationService annotationService;
    
    @Autowired
    private PdfFormService formService;
    
    @Autowired
    private PdfSecurityService securityService;
    
    @Autowired
    private PdfOptimizationService optimizationService;
    
    @Autowired
    private PdfImageService imageService;
    
    @Autowired
    private PdfOcrService ocrService;

    // ==================== WATERMARK ENDPOINTS ====================

    /**
     * Add text watermark to PDF
     */
    @PostMapping("/add-text-watermark")
    public ResponseEntity<byte[]> addTextWatermark(@RequestParam MultipartFile file,
                                                  @RequestParam String text,
                                                  @RequestParam float x,
                                                  @RequestParam float y,
                                                  @RequestParam(defaultValue = "0.5") float opacity,
                                                  @RequestParam(defaultValue = "0") float rotation,
                                                  @RequestParam(defaultValue = "24") float fontSize,
                                                  @RequestParam(defaultValue = "red") String color,
                                                  @RequestParam(defaultValue = "Arial") String fontFamily) {
        try {
            byte[] result = watermarkService.addTextWatermark(file, text, x, y, opacity, rotation, fontSize, color, fontFamily);
            return createPdfResponse(result, "watermarked-document.pdf");
        } catch (IOException | IllegalArgumentException e) {
            return createErrorByteResponse("Failed to add text watermark: " + e.getMessage());
        } 
    }

    /**
     * Add image watermark to PDF
     */
    @PostMapping("/add-image-watermark")
    public ResponseEntity<byte[]> addImageWatermark(@RequestParam MultipartFile file,
                                                   @RequestParam MultipartFile watermarkImage,
                                                   @RequestParam float x,
                                                   @RequestParam float y,
                                                   @RequestParam float width,
                                                   @RequestParam float height,
                                                   @RequestParam(defaultValue = "0.5") float opacity,
                                                   @RequestParam(defaultValue = "0") float rotation) {
        try {
            byte[] result = watermarkService.addImageWatermark(file, watermarkImage, x, y, width, height, opacity, rotation);
            return createPdfResponse(result, "watermarked-document.pdf");
        } catch (IOException | IllegalArgumentException e) {
            return createErrorByteResponse("Failed to add image watermark: " + e.getMessage());
        }
    }

    /**
     * Apply watermark to all pages
     */
    @PostMapping("/apply-watermark-all-pages")
    public ResponseEntity<byte[]> applyWatermarkAllPages(@RequestParam MultipartFile file,
                                                        @RequestParam String text,
                                                        @RequestParam(defaultValue = "0.3") float opacity,
                                                        @RequestParam(defaultValue = "45") float rotation,
                                                        @RequestParam(defaultValue = "center") String position,
                                                        @RequestParam(defaultValue = "36") float fontSize,
                                                        @RequestParam(defaultValue = "lightgray") String color) {
        try {
            byte[] result = watermarkService.applyWatermarkToAllPages(file, text, opacity, rotation, position, fontSize, color);
            return createPdfResponse(result, "watermarked-all-pages.pdf");
        } catch (IOException e) {
            return createErrorByteResponse("Failed to apply watermark: " + e.getMessage());
        } catch (Exception e) {
            return createErrorByteResponse("Unexpected error occurred");
        }
    }

    // ==================== ANNOTATION ENDPOINTS ====================

    /**
     * Add highlight annotation
     */
    @PostMapping("/add-highlight")
    public ResponseEntity<byte[]> addHighlight(@RequestParam MultipartFile file,
                                              @RequestParam float x,
                                              @RequestParam float y,
                                              @RequestParam float width,
                                              @RequestParam float height,
                                              @RequestParam int pageNumber,
                                              @RequestParam(defaultValue = "yellow") String color,
                                              @RequestParam(defaultValue = "0.4") float opacity) {
        try {
            byte[] result = annotationService.addHighlight(file, x, y, width, height, pageNumber, color, opacity);
            return createPdfResponse(result, "highlighted-document.pdf");
        } catch (IOException e) {
            return createErrorByteResponse("Failed to add highlight: " + e.getMessage());
        } catch (Exception e) {
            return createErrorByteResponse("Unexpected error occurred");
        }
    }

    /**
     * Add text note annotation
     */
    @PostMapping("/add-text-note")
    public ResponseEntity<byte[]> addTextNote(@RequestParam MultipartFile file,
                                             @RequestParam float x,
                                             @RequestParam float y,
                                             @RequestParam String content,
                                             @RequestParam int pageNumber,
                                             @RequestParam(defaultValue = "Anonymous") String author) {
        try {
            byte[] result = annotationService.addTextNote(file, x, y, content, pageNumber, author);
            return createPdfResponse(result, "annotated-document.pdf");
        } catch (IOException e) {
            return createErrorByteResponse("Failed to add text note: " + e.getMessage());
        } catch (Exception e) {
            return createErrorByteResponse("Unexpected error occurred");
        }
    }

    /**
     * Add drawing annotation
     */
    @PostMapping("/add-drawing")
    public ResponseEntity<byte[]> addDrawing(@RequestParam MultipartFile file,
                                            @RequestParam String drawingData,
                                            @RequestParam int pageNumber,
                                            @RequestParam(defaultValue = "black") String color,
                                            @RequestParam(defaultValue = "2") float strokeWidth) {
        try {
            byte[] result = annotationService.addDrawing(file, drawingData, pageNumber, color, strokeWidth);
            return createPdfResponse(result, "drawing-added.pdf");
        } catch (IOException e) {
            return createErrorByteResponse("Failed to add drawing: " + e.getMessage());
        } catch (Exception e) {
            return createErrorByteResponse("Unexpected error occurred");
        }
    }

    // ==================== FORM FIELD ENDPOINTS ====================

    /**
     * Add text field
     */
    @PostMapping("/add-text-field")
    public ResponseEntity<byte[]> addTextField(@RequestParam MultipartFile file,
                                              @RequestParam String fieldName,
                                              @RequestParam float x,
                                              @RequestParam float y,
                                              @RequestParam float width,
                                              @RequestParam float height,
                                              @RequestParam int pageNumber,
                                              @RequestParam(defaultValue = "") String defaultValue,
                                              @RequestParam(defaultValue = "false") boolean required) {
        try {
            byte[] result = formService.addTextField(file, fieldName, x, y, width, height, pageNumber, defaultValue, required);
            return createPdfResponse(result, "form-with-textfield.pdf");
        } catch (IOException e) {
            return createErrorByteResponse("Failed to add text field: " + e.getMessage());
        } catch (Exception e) {
            return createErrorByteResponse("Unexpected error occurred");
        }
    }

    /**
     * Add checkbox field
     */
    @PostMapping("/add-checkbox")
    public ResponseEntity<byte[]> addCheckbox(@RequestParam MultipartFile file,
                                             @RequestParam String fieldName,
                                             @RequestParam float x,
                                             @RequestParam float y,
                                             @RequestParam int pageNumber,
                                             @RequestParam(defaultValue = "false") boolean checked) {
        try {
            byte[] result = formService.addCheckbox(file, fieldName, x, y, pageNumber, checked);
            return createPdfResponse(result, "form-with-checkbox.pdf");
        } catch (IOException e) {
            return createErrorByteResponse("Failed to add checkbox: " + e.getMessage());
        } catch (Exception e) {
            return createErrorByteResponse("Unexpected error occurred");
        }
    }

    /**
     * Add dropdown field
     */
    @PostMapping("/add-dropdown")
    public ResponseEntity<byte[]> addDropdown(@RequestParam MultipartFile file,
                                             @RequestParam String fieldName,
                                             @RequestParam float x,
                                             @RequestParam float y,
                                             @RequestParam float width,
                                             @RequestParam float height,
                                             @RequestParam int pageNumber,
                                             @RequestBody List<String> options) {
        try {
            byte[] result = formService.addDropdown(file, fieldName, x, y, width, height, pageNumber, options);
            return createPdfResponse(result, "form-with-dropdown.pdf");
        } catch (IOException e) {
            return createErrorByteResponse("Failed to add dropdown: " + e.getMessage());
        } catch (Exception e) {
            return createErrorByteResponse("Unexpected error occurred");
        }
    }

    // ==================== SECURITY ENDPOINTS ====================

    /**
     * Add password protection
     */
    @PostMapping("/secure-with-password")
    public ResponseEntity<byte[]> secureWithPassword(@RequestParam MultipartFile file,
                                                    @RequestParam String password,
                                                    @RequestParam(required = false) String ownerPassword,
                                                    @RequestParam(defaultValue = "true") boolean allowPrinting,
                                                    @RequestParam(defaultValue = "true") boolean allowCopy,
                                                    @RequestParam(defaultValue = "false") boolean allowEdit,
                                                    @RequestParam(defaultValue = "true") boolean allowAnnotations) {
        try {
            byte[] result = securityService.secureWithPassword(file, password, ownerPassword, 
                                                              allowPrinting, allowCopy, allowEdit, allowAnnotations);
            return createPdfResponse(result, "secured-document.pdf");
        } catch (IOException e) {
            return createErrorByteResponse("Failed to secure PDF: " + e.getMessage());
        } catch (Exception e) {
            return createErrorByteResponse("Unexpected error occurred");
        }
    }

    /**
     * Remove password protection
     * FIXED: Now correctly matches the service method signature and handles exceptions properly
     */
    @PostMapping("/remove-security")
    public ResponseEntity<byte[]> removeSecurity(@RequestParam MultipartFile file,
                                                @RequestParam(required = false) String ownerPassword,
                                                @RequestParam(required = false) String userPassword) {
        try {
            // Provide default empty strings if passwords are null
            String ownerPwd = ownerPassword != null ? ownerPassword : "";
            String userPwd = userPassword != null ? userPassword : "";
            
            byte[] result = securityService.removeSecurity(file, ownerPwd, userPwd);
            return createPdfResponse(result, "unsecured-document.pdf");
        } catch (IOException e) {
            return createErrorByteResponse("Failed to remove security: " + e.getMessage());
        } catch (PdfSecurityService.SecurityException e) { // Catch any PdfSecurityService.SecurityException or other exceptions
            return createErrorByteResponse("Security removal failed: " + e.getMessage());
        }
    }

    // ==================== OPTIMIZATION ENDPOINTS ====================

    /**
     * Optimize PDF for file size
     */
    @PostMapping("/optimize")
    public ResponseEntity<byte[]> optimizePdf(@RequestParam MultipartFile file,
                                             @RequestParam(defaultValue = "medium") String quality,
                                             @RequestParam(defaultValue = "true") boolean compressImages,
                                             @RequestParam(defaultValue = "false") boolean removeMetadata,
                                             @RequestParam(defaultValue = "150") int dpi) {
        try {
            byte[] result = optimizationService.optimizePdf(file, quality, compressImages, removeMetadata, dpi);
            return createPdfResponse(result, "optimized-document.pdf");
        } catch (IOException e) {
            return createErrorByteResponse("Failed to optimize PDF: " + e.getMessage());
        } catch (Exception e) {
            return createErrorByteResponse("Unexpected error occurred");
        }
    }

    /**
     * Compress PDF
     */
    @PostMapping("/compress")
    public ResponseEntity<byte[]> compressPdf(@RequestParam MultipartFile file,
                                             @RequestParam(defaultValue = "medium") String compressionLevel) {
        try {
            byte[] result = optimizationService.compressPdf(file, compressionLevel);
            return createPdfResponse(result, "compressed-document.pdf");
        } catch (IOException e) {
            return createErrorByteResponse("Failed to compress PDF: " + e.getMessage());
        } catch (Exception e) {
            return createErrorByteResponse("Unexpected error occurred");
        }
    }

    /**
     * Analyze PDF document
     */
    @PostMapping("/analyze")
    public ResponseEntity<Map<String, Object>> analyzePdf(@RequestParam MultipartFile file) {
        try {
            Map<String, Object> result = optimizationService.analyzePdf(file);
            return ResponseEntity.ok(result);
        } catch (IOException e) {
            return createErrorResponse("Failed to analyze PDF: " + e.getMessage());
        } catch (Exception e) {
            return createErrorResponse("Unexpected error occurred");
        }
    }

    // ==================== IMAGE ENDPOINTS ====================

    /**
     * Add image to PDF
     */
    @PostMapping("/add-image")
    public ResponseEntity<byte[]> addImage(@RequestParam MultipartFile file,
                                          @RequestParam MultipartFile image,
                                          @RequestParam float x,
                                          @RequestParam float y,
                                          @RequestParam float width,
                                          @RequestParam float height,
                                          @RequestParam int pageNumber,
                                          @RequestParam(defaultValue = "1.0") float opacity) {
        try {
            byte[] result = imageService.addImage(file, image, x, y, width, height, pageNumber, opacity);
            return createPdfResponse(result, "image-added.pdf");
        } catch (IOException e) {
            return createErrorByteResponse("Failed to add image: " + e.getMessage());
        } catch (Exception e) {
            return createErrorByteResponse("Unexpected error occurred");
        }
    }

    /**
     * Extract images from PDF
     */
    @PostMapping("/extract-images")
    public ResponseEntity<Map<String, Object>> extractImages(@RequestParam MultipartFile file) {
        try {
            Map<String, Object> result = imageService.extractImages(file);
            return ResponseEntity.ok(result);
        } catch (IOException e) {
            return createErrorResponse("Failed to extract images: " + e.getMessage());
        } catch (Exception e) {
            return createErrorResponse("Unexpected error occurred");
        }
    }

    /**
     * Convert PDF pages to images
     */
    @PostMapping("/convert-to-images")
    public ResponseEntity<Map<String, Object>> convertToImages(@RequestParam MultipartFile file,
                                                              @RequestParam(defaultValue = "PNG") String format,
                                                              @RequestParam(defaultValue = "300") int dpi) {
        try {
            Map<String, byte[]> result = imageService.convertPagesToImages(file, format, dpi);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("images", result.keySet());
            response.put("count", result.size());
            
            return ResponseEntity.ok(response);
        } catch (IOException e) {
            return createErrorResponse("Failed to convert to images: " + e.getMessage());
        } catch (Exception e) {
            return createErrorResponse("Unexpected error occurred");
        }
    }

    // ==================== OCR ENDPOINTS ====================

    /**
     * Perform OCR on PDF
     */
    @PostMapping("/ocr")
    public ResponseEntity<Map<String, Object>> performOcr(@RequestParam MultipartFile file,
                                                         @RequestParam(defaultValue = "eng") String language) {
        try {
            Map<String, Object> result = ocrService.performOcr(file, language);
            return ResponseEntity.ok(result);
        } catch (IOException e) {
            return createErrorResponse("Failed to perform OCR: " + e.getMessage());
        } catch (Exception e) {
            return createErrorResponse("Unexpected error occurred");
        }
    }

    /**
     * OCR and create searchable PDF
     */
    @PostMapping("/make-searchable")
    public ResponseEntity<byte[]> makeSearchable(@RequestParam MultipartFile file,
                                                @RequestParam(defaultValue = "eng") String language) {
        try {
            byte[] result = ocrService.makeSearchablePdf(file, language);
            return createPdfResponse(result, "searchable-document.pdf");
        } catch (IOException e) {
            return createErrorByteResponse("Failed to make PDF searchable: " + e.getMessage());
        }
    }

    // ==================== ADVANCED PAGE OPERATIONS ====================

    /**
     * Reorder pages
     */
    @PostMapping("/reorder-pages")
    public ResponseEntity<byte[]> reorderPages(@RequestParam MultipartFile file,
                                              @RequestBody List<Integer> newOrder) {
        try {
            byte[] result = optimizationService.reorderPages(file, newOrder);
            return createPdfResponse(result, "reordered-document.pdf");
        } catch (IOException e) {
            return createErrorByteResponse("Failed to reorder pages: " + e.getMessage());
        } catch (Exception e) {
            return createErrorByteResponse("Unexpected error occurred");
        }
    }

    /**
     * Duplicate pages
     */
    @PostMapping("/duplicate-pages")
    public ResponseEntity<byte[]> duplicatePages(@RequestParam MultipartFile file,
                                                @RequestBody List<Integer> pagesToDuplicate) {
        try {
            byte[] result = optimizationService.duplicatePages(file, pagesToDuplicate);
            return createPdfResponse(result, "duplicated-pages.pdf");
        } catch (IOException e) {
            return createErrorByteResponse("Failed to duplicate pages: " + e.getMessage());
        } catch (Exception e) {
            return createErrorByteResponse("Unexpected error occurred");
        }
    }

    /**
     * Extract pages as new PDF
     */
    @PostMapping("/extract-pages")
    public ResponseEntity<byte[]> extractPages(@RequestParam MultipartFile file,
                                              @RequestBody List<Integer> pagesToExtract) {
        try {
            byte[] result = optimizationService.extractPages(file, pagesToExtract);
            return createPdfResponse(result, "extracted-pages.pdf");
        } catch (IOException e) {
            return createErrorByteResponse("Failed to extract pages: " + e.getMessage());
        } catch (Exception e) {
            return createErrorByteResponse("Unexpected error occurred");
        }
    }

    // ==================== ADVANCED TEXT OPERATIONS ====================

    /**
     * Find and replace text with formatting
     */
    @PostMapping("/find-replace-formatted")
    public ResponseEntity<byte[]> findReplaceFormatted(@RequestParam MultipartFile file,
                                                      @RequestParam String findText,
                                                      @RequestParam String replaceText,
                                                      @RequestParam(defaultValue = "false") boolean matchCase,
                                                      @RequestParam(defaultValue = "false") boolean wholeWords,
                                                      @RequestParam(required = false) Float fontSize,
                                                      @RequestParam(required = false) String fontColor) {
        try {
            byte[] result = optimizationService.findReplaceFormatted(file, findText, replaceText, matchCase, wholeWords, fontSize, fontColor);
            return createPdfResponse(result, "text-replaced.pdf");
        } catch (IOException e) {
            return createErrorByteResponse("Failed to replace text: " + e.getMessage());
        } catch (Exception e) {
            return createErrorByteResponse("Unexpected error occurred");
        }
    }

    // ==================== HELPER METHODS ====================

    private ResponseEntity<byte[]> createPdfResponse(byte[] pdfBytes, String filename) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("attachment", filename);
        headers.add("Access-Control-Expose-Headers", "Content-Disposition");
        
        return new ResponseEntity<>(pdfBytes, headers, HttpStatus.OK);
    }

    private ResponseEntity<Map<String, Object>> createErrorResponse(String message) {
        Map<String, Object> error = new HashMap<>();
        error.put("success", false);
        error.put("error", message);
        error.put("timestamp", System.currentTimeMillis());
        
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }

    /**
     * Helper method for creating error responses that return byte arrays (for PDF endpoints)
     */
    private ResponseEntity<byte[]> createErrorByteResponse(String message) {
        // Log the error for debugging
        System.err.println("PDF Service Error: " + message);
        
        // Return empty byte array with error status
        HttpHeaders headers = new HttpHeaders();
        headers.add("X-Error-Message", message);
        headers.add("Access-Control-Expose-Headers", "X-Error-Message");
        
        return new ResponseEntity<>(new byte[0], headers, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    // ==================== HEALTH CHECK ENDPOINT ====================

    /**
     * Health check endpoint for deployment monitoring
     */

      @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> healthCheck() {
        Map<String, Object> health = new HashMap<>();
        health.put("status", "UP");
        health.put("service", "PDF Advanced Service");
        health.put("timestamp", System.currentTimeMillis());
        health.put("version", "1.0.0");
        
        return ResponseEntity.ok(health);
    }
   
}