package com.airesumesuite.pdfservice.service;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.airesumesuite.pdfservice.config.PdfErrorHandler;
import com.airesumesuite.pdfservice.config.PdfErrorHandler.*;

import java.io.*;
import java.nio.file.Files;
import java.util.HashMap;
import java.util.Map;

@Service
public class PdfCompressionService {

    private static final Logger logger = LoggerFactory.getLogger(PdfCompressionService.class);
    
    // Ghostscript PDF preset mappings
    private static final Map<String, String> PRESET_SETTINGS = new HashMap<>();

    static {
        PRESET_SETTINGS.put("maximum", "/screen");   // smallest size, lowest quality
        PRESET_SETTINGS.put("high", "/ebook");       // high compression, good for most
        PRESET_SETTINGS.put("medium", "/printer");   // medium compression, decent quality
        PRESET_SETTINGS.put("low", "/prepress");     // lower compression, high quality
        PRESET_SETTINGS.put("less", "/default");     // minimal compression
    }

    /**
     * Compress PDF using Ghostscript
     *
     * @param file              Multipart PDF file
     * @param compressionLevel  one of: maximum, high, medium, low, less
     * @return compressed PDF bytes
     * @throws IOException if file IO or Ghostscript fails
     */
    public byte[] compressPdf(MultipartFile file, String compressionLevel) throws IOException, PdfServiceException {
        try {
            PdfErrorHandler.validateFileForOperation(file, "compression");
            
            logger.info("Starting PDF compression with level: {} for file: {}", compressionLevel, file.getOriginalFilename());

            String preset = PRESET_SETTINGS.getOrDefault(
                    compressionLevel != null ? compressionLevel.toLowerCase() : "medium",
                    PRESET_SETTINGS.get("medium")
            );

            // Create temp files
            File inputFile = Files.createTempFile("pdf_input_", ".pdf").toFile();
            File outputFile = Files.createTempFile("pdf_output_", ".pdf").toFile();
            
            try {
                file.transferTo(inputFile);
                
                // Check if input file is actually a valid PDF by trying to read it
                if (inputFile.length() == 0) {
                    throw new CorruptedFileException("Uploaded file is empty or corrupted");
                }
                
                runGhostscriptCompression(inputFile, outputFile, preset);
                
                if (!outputFile.exists() || outputFile.length() == 0) {
                    throw new PdfServiceException("Compression failed - no output produced", 500);
                }
                
                byte[] result = Files.readAllBytes(outputFile.toPath());
                logger.info("PDF compression completed. Original: {} bytes, Compressed: {} bytes", 
                          file.getSize(), result.length);
                
                return result;
            } finally {
                if (inputFile.exists()) inputFile.delete();
                if (outputFile.exists()) outputFile.delete();
            }
        } catch (PdfServiceException e) {
            logger.error("PDF service error during compression: {}", e.getMessage());
            throw e;
        } catch (OutOfMemoryError e) {
            logger.error("Out of memory during compression: {}", e.getMessage());
            throw new InsufficientMemoryException("File too large or complex for compression");
        } catch (IOException e) {
            logger.error("IO error during compression: {}", e.getMessage());
            if (e.getMessage().contains("Ghostscript") || e.getMessage().contains("Exit code")) {
                throw new CorruptedFileException("PDF file cannot be processed - may be corrupted or password protected");
            }
            throw new PdfServiceException("Compression failed: " + e.getMessage(), e, 500);
        } catch (Exception e) {
            logger.error("Unexpected error during compression: {}", e.getMessage());
            throw new PdfServiceException("Compression failed due to unexpected error", e, 500);
        }
    }

    /**
     * Executes Ghostscript command for compression
     */
    private void runGhostscriptCompression(File inputFile, File outputFile, String preset) throws IOException {
        String gsCommand = detectGhostscriptCommand();

        ProcessBuilder pb = new ProcessBuilder(
                gsCommand,
                "-sDEVICE=pdfwrite",
                "-dCompatibilityLevel=1.4",
                "-dPDFSETTINGS=" + preset,
                "-dNOPAUSE",
                "-dQUIET",
                "-dBATCH",
                "-sOutputFile=" + outputFile.getAbsolutePath(),
                inputFile.getAbsolutePath()
        );

        Process process = pb.start();

        try {
            int exitCode = process.waitFor();
            if (exitCode != 0) {
                throw new IOException("Ghostscript compression failed. Exit code: " + exitCode);
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IOException("Ghostscript process was interrupted", e);
        }
    }

    /**
     * Detects Ghostscript command depending on OS
     */
    private String detectGhostscriptCommand() {
        String os = System.getProperty("os.name").toLowerCase();
        if (os.contains("win")) {
            // Adjust for your Ghostscript installation name/path if needed
            return "gswin64c.exe";
        } else {
            return "gs";
        }
    }
}
