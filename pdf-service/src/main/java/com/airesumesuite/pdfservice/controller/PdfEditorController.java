package com.airesumesuite.pdfservice.controller;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.bouncycastle.operator.OperatorCreationException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.airesumesuite.pdfservice.service.PdfConversionService;
import com.airesumesuite.pdfservice.service.PdfEditingService;
import com.airesumesuite.pdfservice.service.PdfSignatureService;

@RestController
@RequestMapping("/api/pdf")
@CrossOrigin(origins = "*")
public class PdfEditorController {

    @Autowired
    private PdfEditingService pdfEditingService;

    @Autowired
    private PdfSignatureService pdfSignatureService;

    @Autowired
    private PdfConversionService pdfConversionService;

    /**
     * Health check endpoint
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "OK");
        response.put("service", "PDF Editor Service");
        response.put("version", "1.0.0");
        response.put("features", List.of("edit", "sign", "merge", "split", "convert"));
        return ResponseEntity.ok(response);
    }

    // ==================== TEXT EDITING ENDPOINTS ====================

    /**
     * Extract text from PDF with positions
     */
    @PostMapping("/extract-text")
    public ResponseEntity<Map<String, Object>> extractText(@RequestParam MultipartFile file) {
        try {
            Map<String, Object> result = pdfEditingService.extractTextWithPositions(file);
            return ResponseEntity.ok(result);
        } catch (IOException | IllegalArgumentException e) {
            return createErrorResponse("Invalid file or parameters: " + e.getMessage(), HttpStatus.BAD_REQUEST);
        } catch (RuntimeException e) {
            return createErrorResponse("Processing error: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Replace text in PDF
     */
    @PostMapping("/replace-text")
    public ResponseEntity<byte[]> replaceText(@RequestParam MultipartFile file,
                                            @RequestBody Map<String, String> replacements) {
        try {
            byte[] result = pdfEditingService.replaceText(file, replacements);
            return createPdfResponse(result, "edited-document.pdf");
        } catch (IOException | IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Add text at specific position
     */
    @PostMapping("/add-text")
    public ResponseEntity<byte[]> addText(@RequestParam MultipartFile file,
                                        @RequestParam String text,
                                        @RequestParam float x,
                                        @RequestParam float y,
                                        @RequestParam int pageNumber,
                                        @RequestParam(defaultValue = "12") float fontSize,
                                        @RequestParam(defaultValue = "black") String color) {
        try {
            byte[] result = pdfEditingService.addTextAtPosition(file, text, x, y, pageNumber, fontSize, color);
            return createPdfResponse(result, "text-added.pdf");
        } catch (IOException | IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // ==================== PAGE OPERATIONS ENDPOINTS ====================

    /**
     * Delete specific pages
     */
    @PostMapping("/delete-pages")
    public ResponseEntity<byte[]> deletePages(@RequestParam MultipartFile file,
                                            @RequestBody List<Integer> pagesToDelete) {
        try {
            byte[] result = pdfEditingService.deletePages(file, pagesToDelete);
            return createPdfResponse(result, "pages-deleted.pdf");
        } catch (IOException | IllegalArgumentException | IndexOutOfBoundsException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Split PDF into multiple files
     */
    @PostMapping("/split")
    public ResponseEntity<Map<String, Object>> splitPdf(@RequestParam MultipartFile file,
                                                       @RequestBody List<Integer> splitPoints) {
        try {
            Map<String, byte[]> result = pdfEditingService.splitPdf(file, splitPoints);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("files", result.keySet());
            response.put("message", "PDF split into " + result.size() + " files");
            // Note: In a real application, you'd store these files and return URLs
            
            return ResponseEntity.ok(response);
        } catch (IOException | IllegalArgumentException e) {
            return createErrorResponse("Error splitting PDF: " + e.getMessage(), HttpStatus.BAD_REQUEST);
        } catch (IndexOutOfBoundsException e) {
            return createErrorResponse("Invalid page numbers: " + e.getMessage(), HttpStatus.BAD_REQUEST);
        } catch (RuntimeException e) {
            return createErrorResponse("Processing error splitting PDF: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Merge multiple PDFs
     */
    @PostMapping("/merge")
    public ResponseEntity<byte[]> mergePdfs(@RequestParam List<MultipartFile> files) {
        try {
            byte[] result = pdfEditingService.mergePdfs(files);
            return createPdfResponse(result, "merged-document.pdf");
        } catch (IOException | IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Rotate pages
     */
    @PostMapping("/rotate-pages")
    public ResponseEntity<byte[]> rotatePages(@RequestParam MultipartFile file,
                                            @RequestBody Map<Integer, Integer> rotations) {
        try {
            byte[] result = pdfEditingService.rotatePages(file, rotations);
            return createPdfResponse(result, "rotated-document.pdf");
        } catch (IOException | IllegalArgumentException | IndexOutOfBoundsException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // ==================== SIGNATURE ENDPOINTS ====================

    /**
     * Add visual signature
     */
    @PostMapping("/add-signature")
    public ResponseEntity<byte[]> addSignature(@RequestParam MultipartFile file,
                                             @RequestParam(required = false) MultipartFile signatureImage,
                                             @RequestParam float x,
                                             @RequestParam float y,
                                             @RequestParam float width,
                                             @RequestParam float height,
                                             @RequestParam int pageNumber,
                                             @RequestParam String signerName,
                                             @RequestParam(defaultValue = "") String reason) {
        try {
            byte[] result = pdfSignatureService.addVisualSignature(file, signatureImage, x, y, width, height, pageNumber, signerName, reason);
            return createPdfResponse(result, "signed-document.pdf");
        } catch (IOException | IllegalArgumentException | IndexOutOfBoundsException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Add text signature
     */
    @PostMapping("/add-text-signature")
    public ResponseEntity<byte[]> addTextSignature(@RequestParam MultipartFile file,
                                                  @RequestParam String signatureText,
                                                  @RequestParam float x,
                                                  @RequestParam float y,
                                                  @RequestParam int pageNumber,
                                                  @RequestParam(defaultValue = "helvetica") String fontName,
                                                  @RequestParam(defaultValue = "16") float fontSize,
                                                  @RequestParam(defaultValue = "blue") String color) {
        try {
            byte[] result = pdfSignatureService.addTextSignature(file, signatureText, x, y, pageNumber, fontName, fontSize, color);
            return createPdfResponse(result, "text-signed-document.pdf");
        } catch (IOException | IllegalArgumentException | IndexOutOfBoundsException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Generate styled signature image
     */
    @PostMapping("/generate-signature")
    public ResponseEntity<byte[]> generateSignature(@RequestParam String text,
                                                   @RequestParam(defaultValue = "cursive") String style,
                                                   @RequestParam(defaultValue = "300") int width,
                                                   @RequestParam(defaultValue = "100") int height) {
        try {
            byte[] result = pdfSignatureService.generateStyledSignature(text, style, width, height);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.IMAGE_PNG);
            headers.setContentDispositionFormData("attachment", "signature.png");
            
            return new ResponseEntity<>(result, headers, HttpStatus.OK);
        } catch (IOException | IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Verify digital signature
     */
    @PostMapping("/verify-signature")
    public ResponseEntity<Map<String, Object>> verifySignature(@RequestParam MultipartFile file) throws OperatorCreationException {
        try {
            Map<String, Object> result = pdfSignatureService.verifySignature(file);
            return ResponseEntity.ok(result);
        } catch (IOException | IllegalArgumentException e) {
            return createErrorResponse("Error verifying signature: " + e.getMessage(), HttpStatus.BAD_REQUEST);
        } catch (SecurityException e) {
            return createErrorResponse("Security error during signature verification: " + e.getMessage(), HttpStatus.FORBIDDEN);
        } catch (RuntimeException e) {
            return createErrorResponse("Processing error verifying signature: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // ==================== CONVERSION ENDPOINTS ====================

    /**
     * Convert PDF to Word
     */
    @PostMapping("/convert-to-word")
    public ResponseEntity<byte[]> convertToWord(@RequestParam MultipartFile file) {
        try {
            byte[] result = pdfConversionService.convertPdfToWord(file);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.wordprocessingml.document"));
            headers.setContentDispositionFormData("attachment", "converted-document.docx");
            
            return new ResponseEntity<>(result, headers, HttpStatus.OK);
        } catch (IOException | IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Convert PDF to plain text
     */
    @PostMapping("/convert-to-text")
    public ResponseEntity<Map<String, Object>> convertToText(@RequestParam MultipartFile file) {
        try {
            String result = pdfConversionService.convertPdfToText(file);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("text", result);
            response.put("length", result.length());
            
            return ResponseEntity.ok(response);
        } catch (IOException | IllegalArgumentException e) {
            return createErrorResponse("Error converting to text: " + e.getMessage(), HttpStatus.BAD_REQUEST);
        } catch (RuntimeException e) {
            return createErrorResponse("Processing error converting to text: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Convert PDF to HTML
     */
    @PostMapping("/convert-to-html")
    public ResponseEntity<Map<String, Object>> convertToHtml(@RequestParam MultipartFile file) {
        try {
            String result = pdfConversionService.convertPdfToHtml(file);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("html", result);
            
            return ResponseEntity.ok(response);
        } catch (IOException | IllegalArgumentException e) {
            return createErrorResponse("Error converting to HTML: " + e.getMessage(), HttpStatus.BAD_REQUEST);
        } catch (RuntimeException e) {
            return createErrorResponse("Processing error converting to HTML: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get PDF information
     */
    @PostMapping("/info")
    public ResponseEntity<PdfConversionService.PdfInfo> getPdfInfo(@RequestParam MultipartFile file) {
        try {
            PdfConversionService.PdfInfo result = pdfConversionService.getPdfInfo(file);
            return ResponseEntity.ok(result);
        } catch (IOException | IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // ==================== HELPER METHODS ====================

    private ResponseEntity<byte[]> createPdfResponse(byte[] pdfBytes, String filename) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("attachment", filename);
        
        return new ResponseEntity<>(pdfBytes, headers, HttpStatus.OK);
    }

    private ResponseEntity<Map<String, Object>> createErrorResponse(String message, HttpStatus status) {
        Map<String, Object> error = new HashMap<>();
        error.put("success", false);
        error.put("error", message);
        error.put("timestamp", System.currentTimeMillis());
        
        return ResponseEntity.status(status).body(error);
    }
}