package com.airesumesuite.pdfservice.controller;

import java.io.IOException;

import com.airesumesuite.pdfservice.service.PdfCompressionService;
import com.airesumesuite.pdfservice.service.PdfConversionService;
import com.airesumesuite.pdfservice.config.PdfErrorHandler;
import com.airesumesuite.pdfservice.config.PdfErrorHandler.*;
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
            System.out.println("Compressing PDF: " + file.getOriginalFilename() + 
                             " (Original size: " + file.getSize() + " bytes, Level: " + compressionLevel + ")");
            
            byte[] result = compressionService.compressPdf(file, compressionLevel);
            
            System.out.println("Compression complete. New size: " + result.length + " bytes. " +
                             "Reduction: " + Math.round(((file.getSize() - result.length) / (double)file.getSize()) * 100) + "%");
            
            return createPdfResponse(result, "compressed-document.pdf");
        } catch (PdfServiceException e) {
            System.err.println("PDF Service Error: " + e.getMessage());
            return createErrorByteResponse(PdfErrorHandler.getUserFriendlyMessage(e), HttpStatus.valueOf(e.getErrorCode()));
        } catch (IOException e) {
            System.err.println("PDF Compression IO Error: " + e.getMessage());
            return createErrorByteResponse("Failed to compress PDF: " + e.getMessage());
        } catch (Exception e) {
            System.err.println("PDF Compression Error: " + e.getClass().getSimpleName() + " - " + e.getMessage());
            return createErrorByteResponse("Compression error: " + e.getMessage());
        }
    }

    /**
     * Convert PDF to Word (DOCX) using LibreOffice for proper conversion
     */
    @PostMapping("/convert-to-word")
    public ResponseEntity<byte[]> convertToWord(@RequestParam MultipartFile file) {
        try {
            System.out.println("Converting PDF to Word using LibreOffice: " + file.getOriginalFilename() + " (size: " + file.getSize() + " bytes)");
            
            // Use the proper LibreOffice conversion service
            byte[] result = pdfConversionService.convertPdfToDocx(file);
            
            System.out.println("LibreOffice conversion successful. Output size: " + result.length + " bytes");
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.wordprocessingml.document"));
            headers.setContentDispositionFormData("attachment", "converted-document.docx");
            headers.setContentLength(result.length);
            
            return new ResponseEntity<>(result, headers, HttpStatus.OK);
        } catch (PdfServiceException e) {
            System.err.println("PDF Service Error: " + e.getMessage());
            return createErrorByteResponse(PdfErrorHandler.getUserFriendlyMessage(e), HttpStatus.valueOf(e.getErrorCode()));
        } catch (IOException e) {
            System.err.println("PDF to Word conversion IO error: " + e.getMessage());
            e.printStackTrace();
            return createErrorByteResponse("File processing failed: " + e.getMessage());
        } catch (Exception e) {
            System.err.println("PDF to Word conversion error: " + e.getClass().getSimpleName() + " - " + e.getMessage());
            e.printStackTrace();
            return createErrorByteResponse("Conversion failed: " + e.getMessage());
        }
    }

    /**
     * Convert PDF to Excel (XLSX) using LibreOffice for proper conversion
     */
    @PostMapping("/convert-to-excel")
    public ResponseEntity<byte[]> convertToExcel(@RequestParam MultipartFile file) {
        try {
            System.out.println("Converting PDF to Excel using LibreOffice: " + file.getOriginalFilename() + " (size: " + file.getSize() + " bytes)");
            
            // Use the proper LibreOffice conversion service
            byte[] result = pdfConversionService.convertPdfToXlsx(file);
            
            System.out.println("LibreOffice conversion successful. Output size: " + result.length + " bytes");
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
            headers.setContentDispositionFormData("attachment", "converted-document.xlsx");
            headers.setContentLength(result.length);
            
            return new ResponseEntity<>(result, headers, HttpStatus.OK);
        } catch (PdfServiceException e) {
            System.err.println("PDF Service Error: " + e.getMessage());
            return createErrorByteResponse(PdfErrorHandler.getUserFriendlyMessage(e), HttpStatus.valueOf(e.getErrorCode()));
        } catch (IOException e) {
            System.err.println("PDF to Excel conversion IO error: " + e.getMessage());
            e.printStackTrace();
            return createErrorByteResponse("File processing failed: " + e.getMessage());
        } catch (Exception e) {
            System.err.println("PDF to Excel conversion error: " + e.getClass().getSimpleName() + " - " + e.getMessage());
            e.printStackTrace();
            return createErrorByteResponse("Conversion failed: " + e.getMessage());
        }
    }

    /**
     * Convert PDF to PowerPoint (PPTX) using LibreOffice for proper conversion
     */
    @PostMapping("/convert-to-powerpoint")
    public ResponseEntity<byte[]> convertToPowerPoint(@RequestParam MultipartFile file) {
        try {
            System.out.println("Converting PDF to PowerPoint using LibreOffice: " + file.getOriginalFilename() + " (size: " + file.getSize() + " bytes)");
            
            // Use the proper LibreOffice conversion service
            byte[] result = pdfConversionService.convertPdfToPptx(file);
            
            System.out.println("LibreOffice conversion successful. Output size: " + result.length + " bytes");
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.presentationml.presentation"));
            headers.setContentDispositionFormData("attachment", "converted-document.pptx");
            headers.setContentLength(result.length);
            
            return new ResponseEntity<>(result, headers, HttpStatus.OK);
        } catch (PdfServiceException e) {
            System.err.println("PDF Service Error: " + e.getMessage());
            return createErrorByteResponse(PdfErrorHandler.getUserFriendlyMessage(e), HttpStatus.valueOf(e.getErrorCode()));
        } catch (IOException e) {
            System.err.println("PDF to PowerPoint conversion IO error: " + e.getMessage());
            e.printStackTrace();
            return createErrorByteResponse("File processing failed: " + e.getMessage());
        } catch (Exception e) {
            System.err.println("PDF to PowerPoint conversion error: " + e.getClass().getSimpleName() + " - " + e.getMessage());
            e.printStackTrace();
            return createErrorByteResponse("Conversion failed: " + e.getMessage());
        }
    }

    /**
     * Convert PDF to Text using LibreOffice for better text extraction
     */
    @PostMapping("/convert-to-text")
    public ResponseEntity<String> convertToText(@RequestParam MultipartFile file) {
        try {
            System.out.println("Converting PDF to Text using LibreOffice: " + file.getOriginalFilename() + " (size: " + file.getSize() + " bytes)");
            
            // Use the proper LibreOffice conversion service
            byte[] resultBytes = pdfConversionService.convertPdfToText(file);
            String result = new String(resultBytes, "UTF-8");
            
            System.out.println("LibreOffice text conversion successful. Text length: " + result.length() + " characters");
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            String jsonResponse = "{\"success\": true, \"text\": \"" + 
                result.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "\\r") + 
                "\"}";
            
            return new ResponseEntity<>(jsonResponse, headers, HttpStatus.OK);
        } catch (PdfServiceException e) {
            System.err.println("PDF Service Error: " + e.getMessage());
            return new ResponseEntity<>("{\"success\": false, \"error\": \"" + PdfErrorHandler.getUserFriendlyMessage(e).replace("\"", "\\\"") + "\"}", HttpStatus.valueOf(e.getErrorCode()));
        } catch (IOException e) {
            System.err.println("PDF to Text conversion IO error: " + e.getMessage());
            e.printStackTrace();
            return new ResponseEntity<>("{\"success\": false, \"error\": \"File processing failed: " + e.getMessage() + "\"}", HttpStatus.INTERNAL_SERVER_ERROR);
        } catch (Exception e) {
            System.err.println("PDF to Text conversion error: " + e.getClass().getSimpleName() + " - " + e.getMessage());
            e.printStackTrace();
            return new ResponseEntity<>("{\"success\": false, \"error\": \"Conversion failed: " + e.getMessage() + "\"}", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Convert PDF to HTML using LibreOffice for better formatting preservation
     */
    @PostMapping("/convert-to-html")
    public ResponseEntity<String> convertToHtml(@RequestParam MultipartFile file) {
        try {
            System.out.println("Converting PDF to HTML using LibreOffice: " + file.getOriginalFilename() + " (size: " + file.getSize() + " bytes)");
            
            // Use the proper LibreOffice conversion service
            byte[] resultBytes = pdfConversionService.convertPdfToHtml(file);
            String result = new String(resultBytes, "UTF-8");
            
            System.out.println("LibreOffice HTML conversion successful. HTML length: " + result.length() + " characters");
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            String jsonResponse = "{\"success\": true, \"html\": \"" + 
                result.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "\\r") + 
                "\"}";
            
            return new ResponseEntity<>(jsonResponse, headers, HttpStatus.OK);
        } catch (PdfServiceException e) {
            System.err.println("PDF Service Error: " + e.getMessage());
            return new ResponseEntity<>("{\"success\": false, \"error\": \"" + PdfErrorHandler.getUserFriendlyMessage(e).replace("\"", "\\\"") + "\"}", HttpStatus.valueOf(e.getErrorCode()));
        } catch (IOException e) {
            System.err.println("PDF to HTML conversion IO error: " + e.getMessage());
            e.printStackTrace();
            return new ResponseEntity<>("{\"success\": false, \"error\": \"File processing failed: " + e.getMessage() + "\"}", HttpStatus.INTERNAL_SERVER_ERROR);
        } catch (Exception e) {
            System.err.println("PDF to HTML conversion error: " + e.getClass().getSimpleName() + " - " + e.getMessage());
            e.printStackTrace();
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
        System.err.println("Error: " + message);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        String jsonError = "{\"success\": false, \"error\": \"" + message.replace("\"", "\\\"") + "\"}";
        return new ResponseEntity<>(jsonError.getBytes(), headers, status);
    }
}