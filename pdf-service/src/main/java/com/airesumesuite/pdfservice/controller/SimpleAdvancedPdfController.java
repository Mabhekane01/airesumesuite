package com.airesumesuite.pdfservice.controller;

import java.io.IOException;

import com.airesumesuite.pdfservice.service.PdfCompressionService;
import com.airesumesuite.pdfservice.service.PdfConversionService;
import com.airesumesuite.pdfservice.config.PdfErrorHandler;
import com.airesumesuite.pdfservice.config.PdfErrorHandler.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
/**
 * Simplified PDF Controller with working compression endpoint
 */
@RestController
@RequestMapping("/api/pdf/advanced")
public class SimpleAdvancedPdfController {

    private static final Logger log = LoggerFactory.getLogger(SimpleAdvancedPdfController.class);

    @Autowired
    private PdfCompressionService compressionService;
    
    @Autowired
    private PdfConversionService pdfConversionService;

    /**
     * Compress PDF
     */
    @PostMapping("/compress")
    public ResponseEntity<byte[]> compressPdf(@RequestParam MultipartFile file,
                                             @RequestParam(defaultValue = "medium") String compressionLevel) {
        try {
            log.info("Compressing PDF: {} (Original size: {} bytes, Level: {})", 
                     file.getOriginalFilename(), file.getSize(), compressionLevel);
            
            byte[] result = compressionService.compressPdf(file, compressionLevel);
            
            log.info("Compression complete. New size: {} bytes. Reduction: {}%", 
                     result.length, Math.round(((file.getSize() - result.length) / (double)file.getSize()) * 100));
            
            return createPdfResponse(result, "compressed-document.pdf");
        } catch (PdfServiceException e) {
            log.error("PDF Service Error: {}", e.getMessage(), e);
            return createErrorByteResponse(PdfErrorHandler.getUserFriendlyMessage(e), HttpStatus.valueOf(e.getErrorCode()));
        } catch (IOException e) {
            log.error("PDF Compression IO Error: {}", e.getMessage(), e);
            return createErrorByteResponse("Failed to compress PDF: " + e.getMessage());
        } catch (Exception e) {
            log.error("PDF Compression Error: {} - {}", e.getClass().getSimpleName(), e.getMessage(), e);
            return createErrorByteResponse("Compression error: " + e.getMessage());
        }
    }

    /**
     * Convert PDF to Word (DOCX) using LibreOffice for proper conversion
     */
    @PostMapping("/convert-to-word")
    public ResponseEntity<byte[]> convertToWord(@RequestParam MultipartFile file) {
        try {
            log.info("Converting PDF to Word using LibreOffice: {} (size: {} bytes)", 
                     file.getOriginalFilename(), file.getSize());
            
            // Use the proper LibreOffice conversion service
            byte[] result = pdfConversionService.convertPdfToDocx(file);
            
            log.info("LibreOffice conversion successful. Output size: {} bytes", result.length);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.wordprocessingml.document"));
            headers.setContentDispositionFormData("attachment", "converted-document.docx");
            headers.setContentLength(result.length);
            
            return new ResponseEntity<>(result, headers, HttpStatus.OK);
        } catch (PdfServiceException e) {
            log.error("PDF Service Error: {}", e.getMessage(), e);
            return createErrorByteResponse(PdfErrorHandler.getUserFriendlyMessage(e), HttpStatus.valueOf(e.getErrorCode()));
        } catch (IOException e) {
            log.error("PDF to Word conversion IO error: {}", e.getMessage(), e);
            return createErrorByteResponse("File processing failed: " + e.getMessage());
        } catch (Exception e) {
            log.error("PDF to Word conversion error: {} - {}", e.getClass().getSimpleName(), e.getMessage(), e);
            return createErrorByteResponse("Conversion failed: " + e.getMessage());
        }
    }

    /**
     * Convert PDF to Excel (XLSX) using LibreOffice for proper conversion
     */
    @PostMapping("/convert-to-excel")
    public ResponseEntity<byte[]> convertToExcel(@RequestParam MultipartFile file) {
        try {
            log.info("Converting PDF to Excel using LibreOffice: {} (size: {} bytes)", 
                     file.getOriginalFilename(), file.getSize());
            
            // Use the proper LibreOffice conversion service
            byte[] result = pdfConversionService.convertPdfToXlsx(file);
            
            log.info("LibreOffice conversion successful. Output size: {} bytes", result.length);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
            headers.setContentDispositionFormData("attachment", "converted-document.xlsx");
            headers.setContentLength(result.length);
            
            return new ResponseEntity<>(result, headers, HttpStatus.OK);
        } catch (PdfServiceException e) {
            log.error("PDF Service Error: {}", e.getMessage(), e);
            return createErrorByteResponse(PdfErrorHandler.getUserFriendlyMessage(e), HttpStatus.valueOf(e.getErrorCode()));
        } catch (IOException e) {
            log.error("PDF to Excel conversion IO error: {}", e.getMessage(), e);
            return createErrorByteResponse("File processing failed: " + e.getMessage());
        } catch (Exception e) {
            log.error("PDF to Excel conversion error: {} - {}", e.getClass().getSimpleName(), e.getMessage(), e);
            return createErrorByteResponse("Conversion failed: " + e.getMessage());
        }
    }

    /**
     * Convert PDF to PowerPoint (PPTX) using LibreOffice for proper conversion
     */
    @PostMapping("/convert-to-powerpoint")
    public ResponseEntity<byte[]> convertToPowerPoint(@RequestParam MultipartFile file) {
        try {
            log.info("Converting PDF to PowerPoint using LibreOffice: {} (size: {} bytes)", 
                     file.getOriginalFilename(), file.getSize());
            
            // Use the proper LibreOffice conversion service
            byte[] result = pdfConversionService.convertPdfToPptx(file);
            
            log.info("LibreOffice conversion successful. Output size: {} bytes", result.length);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.presentationml.presentation"));
            headers.setContentDispositionFormData("attachment", "converted-document.pptx");
            headers.setContentLength(result.length);
            
            return new ResponseEntity<>(result, headers, HttpStatus.OK);
        } catch (PdfServiceException e) {
            log.error("PDF Service Error: {}", e.getMessage(), e);
            return createErrorByteResponse(PdfErrorHandler.getUserFriendlyMessage(e), HttpStatus.valueOf(e.getErrorCode()));
        } catch (IOException e) {
            log.error("PDF to PowerPoint conversion IO error: {}", e.getMessage(), e);
            return createErrorByteResponse("File processing failed: " + e.getMessage());
        } catch (Exception e) {
            log.error("PDF to PowerPoint conversion error: {} - {}", e.getClass().getSimpleName(), e.getMessage(), e);
            return createErrorByteResponse("Conversion failed: " + e.getMessage());
        }
    }

    /**
     * Convert PDF to Text using LibreOffice for better text extraction
     */
    @PostMapping("/convert-to-text")
    public ResponseEntity<String> convertToText(@RequestParam MultipartFile file) {
        try {
            log.info("Converting PDF to Text using LibreOffice: {} (size: {} bytes)", 
                     file.getOriginalFilename(), file.getSize());
            
            // Use the proper LibreOffice conversion service
            byte[] resultBytes = pdfConversionService.convertPdfToText(file);
            String result = new String(resultBytes, "UTF-8");
            
            log.info("LibreOffice text conversion successful. Text length: {} characters", result.length());
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            String jsonResponse = "{\"success\": true, \"text\": \"" + 
                result.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "\\r") + 
                "\"}";
            
            return new ResponseEntity<>(jsonResponse, headers, HttpStatus.OK);
        } catch (PdfServiceException e) {
            log.error("PDF Service Error: {}", e.getMessage(), e);
            return new ResponseEntity<>("{\"success\": false, \"error\": \"" + PdfErrorHandler.getUserFriendlyMessage(e).replace("\"", "\\\"") + "\"}", HttpStatus.valueOf(e.getErrorCode()));
        } catch (IOException e) {
            log.error("PDF to Text conversion IO error: {}", e.getMessage(), e);
            return new ResponseEntity<>("{\"success\": false, \"error\": \"File processing failed: " + e.getMessage() + "\"}", HttpStatus.INTERNAL_SERVER_ERROR);
        } catch (Exception e) {
            log.error("PDF to Text conversion error: {} - {}", e.getClass().getSimpleName(), e.getMessage(), e);
            return new ResponseEntity<>("{\"success\": false, \"error\": \"Conversion failed: " + e.getMessage() + "\"}", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Convert PDF to HTML using LibreOffice for better formatting preservation
     */
    @PostMapping("/convert-to-html")
    public ResponseEntity<String> convertToHtml(@RequestParam MultipartFile file) {
        try {
            log.info("Converting PDF to HTML using LibreOffice: {} (size: {} bytes)", 
                     file.getOriginalFilename(), file.getSize());
            
            // Use the proper LibreOffice conversion service
            byte[] resultBytes = pdfConversionService.convertPdfToHtml(file);
            String result = new String(resultBytes, "UTF-8");
            
            log.info("LibreOffice HTML conversion successful. HTML length: {} characters", result.length());
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            String jsonResponse = "{\"success\": true, \"html\": \"" + 
                result.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "\\r") + 
                "\"}";
            
            return new ResponseEntity<>(jsonResponse, headers, HttpStatus.OK);
        } catch (PdfServiceException e) {
            log.error("PDF Service Error: {}", e.getMessage(), e);
            return new ResponseEntity<>("{\"success\": false, \"error\": \"" + PdfErrorHandler.getUserFriendlyMessage(e).replace("\"", "\\\"") + "\"}", HttpStatus.valueOf(e.getErrorCode()));
        } catch (IOException e) {
            log.error("PDF to HTML conversion IO error: {}", e.getMessage(), e);
            return new ResponseEntity<>("{\"success\": false, \"error\": \"File processing failed: " + e.getMessage() + "\"}", HttpStatus.INTERNAL_SERVER_ERROR);
        } catch (Exception e) {
            log.error("PDF to HTML conversion error: {} - {}", e.getClass().getSimpleName(), e.getMessage(), e);
            return new ResponseEntity<>("{\"success\": false, \"error\": \"Conversion failed: " + e.getMessage() + "\"}", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // Helper methods
    private ResponseEntity<byte[]> createPdfResponse(byte[] content, String filename) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("attachment", filename);
        headers.setContentLength(content.length);
        return new ResponseEntity<>(content, headers, HttpStatus.OK);
    }

    private ResponseEntity<byte[]> createErrorByteResponse(String message) {
        return createErrorByteResponse(message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
    
    private ResponseEntity<byte[]> createErrorByteResponse(String message, HttpStatus status) {
        log.error("Error: {}", message);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        String jsonError = "{\"success\": false, \"error\": \"" + message.replace("\"", "\\\"") + "\"}";
        return new ResponseEntity<>(jsonError.getBytes(), headers, status);
    }
}