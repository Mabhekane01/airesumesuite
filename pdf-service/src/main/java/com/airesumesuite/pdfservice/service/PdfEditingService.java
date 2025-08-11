package com.airesumesuite.pdfservice.service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.sejda.sambox.pdmodel.PDDocument;
import org.sejda.sambox.pdmodel.PDPage;
import org.sejda.sambox.pdmodel.PDPageContentStream;
import org.sejda.sambox.pdmodel.font.PDType1Font;
import org.sejda.sambox.text.PDFTextStripper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class PdfEditingService {

    private static final Logger logger = LoggerFactory.getLogger(PdfEditingService.class);
    
    // Configuration constants
    private static final long MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    private static final int MAX_PAGES = 1000;

    /**
     * Extract text from PDF with position information
     */
    public Map<String, Object> extractTextWithPositions(MultipartFile file) throws IOException {
        validatePdfFile(file);
        
        File tempFile = null;
        try {
            logger.info("Extracting text with positions for file: {}", file.getOriginalFilename());
            
            tempFile = createTempFile(file, "pdf-extract-", ".pdf");
            
            try (PDDocument document = PDDocument.load(tempFile)) {
                validatePageCount(document.getNumberOfPages());
                
                Map<String, Object> result = new HashMap<>();
                List<Map<String, Object>> pages = new ArrayList<>();
                
                for (int i = 0; i < document.getNumberOfPages(); i++) {
                    try {
                        PDPage page = document.getPage(i);
                        PDFTextStripper stripper = new PDFTextStripper();
                        stripper.setStartPage(i + 1);
                        stripper.setEndPage(i + 1);
                        String text = stripper.getText(document);
                        
                        Map<String, Object> pageInfo = new HashMap<>();
                        pageInfo.put("pageNumber", i + 1);
                        pageInfo.put("text", text);
                        pageInfo.put("width", page.getMediaBox().getWidth());
                        pageInfo.put("height", page.getMediaBox().getHeight());
                        
                        pages.add(pageInfo);
                        
                        logger.debug("Extracted text from page {} of {}", i + 1, document.getNumberOfPages());
                        
                    } catch (IOException e) {
                        logger.warn("Error extracting text from page {}: {}", i + 1, e.getMessage());
                    }
                }
                
                result.put("pages", pages);
                result.put("totalPages", document.getNumberOfPages());
                
                logger.info("Successfully extracted text from {} pages", pages.size());
                return result;
            }
        } catch (IllegalArgumentException e) {
            logger.error("Invalid argument for extracting text: {}", e.getMessage());
            throw e;
        } catch (IOException e) {
            logger.error("IO error extracting text with positions: {}", e.getMessage());
            throw e;
        } finally {
            cleanupTempFile(tempFile);
        }
    }

    /**
     * Replace text in PDF (simplified approach with overlay)
     */
    public byte[] replaceText(MultipartFile file, Map<String, String> replacements) throws IOException {
        validatePdfFile(file);
        
        if (replacements == null || replacements.isEmpty()) {
            throw new IllegalArgumentException("Replacements map cannot be null or empty");
        }
        
        File tempFile = null;
        try {
            logger.info("Replacing text in file: {}", file.getOriginalFilename());
            
            tempFile = createTempFile(file, "pdf-replace-", ".pdf");
            
            try (PDDocument document = PDDocument.load(tempFile)) {
                validatePageCount(document.getNumberOfPages());
                
                for (int i = 0; i < document.getNumberOfPages(); i++) {
                    try {
                        PDPage page = document.getPage(i);
                        
                        // Extract text
                        PDFTextStripper stripper = new PDFTextStripper();
                        stripper.setStartPage(i + 1);
                        stripper.setEndPage(i + 1);
                        String pageText = stripper.getText(document);
                        
                        // Check if any replacements are needed on this page
                        Map<String, String> pageReplacements = new HashMap<>();
                        for (Map.Entry<String, String> entry : replacements.entrySet()) {
                            if (pageText.contains(entry.getKey())) {
                                pageReplacements.put(entry.getKey(), entry.getValue());
                            }
                        }
                        
                        if (!pageReplacements.isEmpty()) {
                            addTextOverlay(document, page, pageReplacements);
                            logger.debug("Added text overlay to page {}", i + 1);
                        }
                        
                    } catch (IOException e) {
                        logger.warn("Error processing page {} for text replacement: {}", i + 1, e.getMessage());
                    }
                }
                
                return saveDocumentToByteArray(document);
            }
        } catch (IllegalArgumentException e) {
            logger.error("Invalid argument for replacing text: {}", e.getMessage());
            throw e;
        } catch (IOException e) {
            logger.error("IO error replacing text: {}", e.getMessage());
            throw e;
        } finally {
            cleanupTempFile(tempFile);
        }
    }

    /**
     * Add text overlay to a page (simplified text editing)
     */
    private void addTextOverlay(PDDocument document, PDPage page, Map<String, String> textToAdd) throws IOException {
        try (PDPageContentStream contentStream = new PDPageContentStream(document, page, 
                PDPageContentStream.AppendMode.APPEND, true, true)) {
            
            contentStream.beginText();
            contentStream.setFont(PDType1Font.HELVETICA(), 12);
            contentStream.setNonStrokingColor(0f, 0f, 0f); // Black color using RGB values
            
            float yPosition = page.getMediaBox().getHeight() - 50;
            
            for (Map.Entry<String, String> entry : textToAdd.entrySet()) {
                String newText = entry.getValue();
                if (newText != null && !newText.trim().isEmpty()) {
                    contentStream.newLineAtOffset(50, yPosition);
                    contentStream.showText(newText);
                    yPosition -= 20;
                }
            }
            
            contentStream.endText();
        }
    }

    /**
     * Add text at specific coordinates
     */
    public byte[] addTextAtPosition(MultipartFile file, String text, float x, float y, 
                                   int pageNumber, float fontSize, String fontColor) throws IOException {
        validatePdfFile(file);
        
        if (text == null || text.trim().isEmpty()) {
            throw new IllegalArgumentException("Text cannot be null or empty");
        }
        
        if (pageNumber < 1) {
            throw new IllegalArgumentException("Page number must be positive");
        }
        
        if (fontSize <= 0) {
            throw new IllegalArgumentException("Font size must be positive");
        }
        
        File tempFile = null;
        try {
            logger.info("Adding text at position ({}, {}) on page {} for file: {}", 
                       x, y, pageNumber, file.getOriginalFilename());
            
            tempFile = createTempFile(file, "pdf-addtext-", ".pdf");
            
            try (PDDocument document = PDDocument.load(tempFile)) {
                validatePageCount(document.getNumberOfPages());
                
                if (pageNumber > document.getNumberOfPages()) {
                    throw new IllegalArgumentException("Page number " + pageNumber + 
                        " exceeds document pages (" + document.getNumberOfPages() + ")");
                }
                
                PDPage page = document.getPage(pageNumber - 1);
                
                try (PDPageContentStream contentStream = new PDPageContentStream(document, page, 
                        PDPageContentStream.AppendMode.APPEND, true, true)) {
                    
                    contentStream.beginText();
                    contentStream.setFont(PDType1Font.HELVETICA(), fontSize);
                    
                    // Parse and set color using RGB values
                    float[] rgbColor = parseColorToRGB(fontColor);
                    contentStream.setNonStrokingColor(rgbColor[0], rgbColor[1], rgbColor[2]);
                    
                    contentStream.newLineAtOffset(x, y);
                    contentStream.showText(text);
                    contentStream.endText();
                }
                
                logger.info("Successfully added text at position");
                return saveDocumentToByteArray(document);
            }
        } catch (IllegalArgumentException e) {
            logger.error("Invalid argument for adding text: {}", e.getMessage());
            throw e;
        } catch (IOException e) {
            logger.error("IO error adding text at position: {}", e.getMessage());
            throw e;
        } finally {
            cleanupTempFile(tempFile);
        }
    }

    /**
     * Delete specific pages
     */
    public byte[] deletePages(MultipartFile file, List<Integer> pagesToDelete) throws IOException {
        validatePdfFile(file);
        
        if (pagesToDelete == null || pagesToDelete.isEmpty()) {
            throw new IllegalArgumentException("Pages to delete list cannot be null or empty");
        }
        
        File tempFile = null;
        try {
            logger.info("Deleting {} pages from file: {}", pagesToDelete.size(), file.getOriginalFilename());
            
            tempFile = createTempFile(file, "pdf-delete-", ".pdf");
            
            try (PDDocument document = PDDocument.load(tempFile)) {
                validatePageCount(document.getNumberOfPages());
                
                // Validate page numbers
                for (Integer pageNum : pagesToDelete) {
                    if (pageNum < 1 || pageNum > document.getNumberOfPages()) {
                        throw new IllegalArgumentException("Invalid page number: " + pageNum);
                    }
                }
                
                // Sort in descending order to avoid index shifting issues
                List<Integer> sortedPages = new ArrayList<>(pagesToDelete);
                sortedPages.sort((a, b) -> b.compareTo(a));
                
                for (int pageNum : sortedPages) {
                    document.removePage(pageNum - 1); // Convert to 0-based index
                    logger.debug("Deleted page {}", pageNum);
                }
                
                logger.info("Successfully deleted {} pages. Remaining pages: {}", 
                           pagesToDelete.size(), document.getNumberOfPages());
                return saveDocumentToByteArray(document);
            }
        } catch (IllegalArgumentException e) {
            logger.error("Invalid argument for deleting pages: {}", e.getMessage());
            throw e;
        } catch (IOException e) {
            logger.error("IO error deleting pages: {}", e.getMessage());
            throw e;
        } finally {
            cleanupTempFile(tempFile);
        }
    }

    /**
     * Split PDF into separate files
     */
    public Map<String, byte[]> splitPdf(MultipartFile file, List<Integer> splitPoints) throws IOException {
        validatePdfFile(file);
        
        if (splitPoints == null) {
            splitPoints = new ArrayList<>();
        }
        
        File tempFile = null;
        try {
            logger.info("Splitting PDF at {} points for file: {}", splitPoints.size(), file.getOriginalFilename());
            
            tempFile = createTempFile(file, "pdf-split-", ".pdf");
            
            Map<String, byte[]> result = new HashMap<>();
            
            try (PDDocument originalDoc = PDDocument.load(tempFile)) {
                validatePageCount(originalDoc.getNumberOfPages());
                
                int totalPages = originalDoc.getNumberOfPages();
                
                // Validate split points
                for (Integer point : splitPoints) {
                    if (point < 1 || point > totalPages) {
                        throw new IllegalArgumentException("Invalid split point: " + point);
                    }
                }
                
                // Add boundaries
                List<Integer> boundaries = new ArrayList<>();
                boundaries.add(1);
                boundaries.addAll(splitPoints);
                boundaries.add(totalPages + 1);
                boundaries.sort(Integer::compareTo);
                
                for (int i = 0; i < boundaries.size() - 1; i++) {
                    int startPage = boundaries.get(i);
                    int endPage = boundaries.get(i + 1) - 1;
                    
                    try (PDDocument splitDoc = new PDDocument()) {
                        for (int pageNum = startPage; pageNum <= endPage; pageNum++) {
                            if (pageNum <= totalPages) {
                                PDPage originalPage = originalDoc.getPage(pageNum - 1);
                                // Add the page directly to the new document
                                splitDoc.addPage(originalPage);
                            }
                        }
                        
                        String fileName = "part_" + (i + 1) + ".pdf";
                        byte[] splitBytes = saveDocumentToByteArray(splitDoc);
                        result.put(fileName, splitBytes);
                        
                        logger.debug("Created split part {} with {} pages", i + 1, splitDoc.getNumberOfPages());
                    }
                }
                
                logger.info("Successfully split PDF into {} parts", result.size());
                return result;
            }
        } catch (IllegalArgumentException e) {
            logger.error("Invalid argument for splitting PDF: {}", e.getMessage());
            throw e;
        } catch (IOException e) {
            logger.error("IO error splitting PDF: {}", e.getMessage());
            throw e;
        } finally {
            cleanupTempFile(tempFile);
        }
    }

    /**
     * Merge multiple PDFs
     */
    public byte[] mergePdfs(List<MultipartFile> files) throws IOException {
        if (files == null || files.isEmpty()) {
            throw new IllegalArgumentException("Files list cannot be null or empty");
        }
        
        // Validate all files first
        for (MultipartFile file : files) {
            validatePdfFile(file);
        }
        
        List<File> tempFiles = new ArrayList<>();
        try {
            logger.info("Merging {} PDF files", files.size());
            
            try (PDDocument mergedDoc = new PDDocument()) {
                
                for (MultipartFile file : files) {
                    File tempFile = createTempFile(file, "pdf-merge-", ".pdf");
                    tempFiles.add(tempFile);
                    
                    try (PDDocument sourceDoc = PDDocument.load(tempFile)) {
                        validatePageCount(sourceDoc.getNumberOfPages());
                        
                        for (int i = 0; i < sourceDoc.getNumberOfPages(); i++) {
                            PDPage originalPage = sourceDoc.getPage(i);
                            // Add the page directly to the merged document
                            mergedDoc.addPage(originalPage);
                        }
                        
                        logger.debug("Merged {} pages from file: {}", 
                                   sourceDoc.getNumberOfPages(), file.getOriginalFilename());
                    }
                }
                
                logger.info("Successfully merged PDFs. Total pages: {}", mergedDoc.getNumberOfPages());
                return saveDocumentToByteArray(mergedDoc);
            }
        } catch (IllegalArgumentException e) {
            logger.error("Invalid argument for merging PDFs: {}", e.getMessage());
            throw e;
        } catch (IOException e) {
            logger.error("IO error merging PDFs: {}", e.getMessage());
            throw e;
        } finally {
            // Cleanup all temp files
            for (File tempFile : tempFiles) {
                cleanupTempFile(tempFile);
            }
        }
    }

    /**
     * Rotate pages
     */
    public byte[] rotatePages(MultipartFile file, Map<Integer, Integer> rotations) throws IOException {
        validatePdfFile(file);
        
        if (rotations == null || rotations.isEmpty()) {
            throw new IllegalArgumentException("Rotations map cannot be null or empty");
        }
        
        File tempFile = null;
        try {
            logger.info("Rotating {} pages in file: {}", rotations.size(), file.getOriginalFilename());
            
            tempFile = createTempFile(file, "pdf-rotate-", ".pdf");
            
            try (PDDocument document = PDDocument.load(tempFile)) {
                validatePageCount(document.getNumberOfPages());
                
                for (Map.Entry<Integer, Integer> entry : rotations.entrySet()) {
                    int pageNum = entry.getKey();
                    int rotation = entry.getValue();
                    
                    // Validate page number
                    if (pageNum < 1 || pageNum > document.getNumberOfPages()) {
                        logger.warn("Invalid page number for rotation: {}", pageNum);
                        continue;
                    }
                    
                    // Validate rotation (must be multiple of 90)
                    if (rotation % 90 != 0) {
                        logger.warn("Invalid rotation angle: {}. Must be multiple of 90.", rotation);
                        continue;
                    }
                    
                    PDPage page = document.getPage(pageNum - 1);
                    page.setRotation(rotation);
                    
                    logger.debug("Rotated page {} by {} degrees", pageNum, rotation);
                }
                
                logger.info("Successfully rotated pages");
                return saveDocumentToByteArray(document);
            }
        } catch (IllegalArgumentException e) {
            logger.error("Invalid argument for rotating pages: {}", e.getMessage());
            throw e;
        } catch (IOException e) {
            logger.error("IO error rotating pages: {}", e.getMessage());
            throw e;
        } finally {
            cleanupTempFile(tempFile);
        }
    }

    // Validation methods
    private void validatePdfFile(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("PDF file cannot be null or empty");
        }
        
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException(
                    "File size exceeds maximum limit of %d bytes".formatted(MAX_FILE_SIZE));
        }
        
        String contentType = file.getContentType();
        boolean validContentType = false;
        if (contentType != null) {
            validContentType = switch (contentType) {
                case "application/pdf" -> true;
                default -> false;
            };
        }
        
        if (!validContentType) {
            throw new IllegalArgumentException("Invalid file type. Only PDF files are allowed.");
        }
    }
    
    private void validatePageCount(int pageCount) throws IOException {
        if (pageCount > MAX_PAGES) {
            throw new IllegalArgumentException(
                    "PDF has too many pages (%d). Maximum allowed: %d".formatted(pageCount, MAX_PAGES));
        }
    }

    // Helper methods
    private File createTempFile(MultipartFile file, String prefix, String suffix) throws IOException {
        Path tempFile = Files.createTempFile(prefix, suffix);
        Files.copy(file.getInputStream(), tempFile, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
        File result = tempFile.toFile();
        result.deleteOnExit();
        return result;
    }
    
    private void cleanupTempFile(File tempFile) {
        if (tempFile != null && tempFile.exists()) {
            try {
                Files.delete(tempFile.toPath());
            } catch (IOException e) {
                logger.warn("Failed to delete temp file: {}", e.getMessage());
            }
        }
    }

    /**
     * Save document to byte array
     */
    private byte[] saveDocumentToByteArray(PDDocument document) throws IOException {
        try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            document.writeTo(outputStream);
            return outputStream.toByteArray();
        }
    }

    /**
     * Parse color string to RGB float array for SAMBox compatibility
     */
    private float[] parseColorToRGB(String colorString) {
        if (colorString == null || colorString.trim().isEmpty()) {
            return new float[]{0f, 0f, 0f}; // Black
        }
        
        try {
            String color = colorString.trim();
            
            // Handle hex colors
            if (color.startsWith("#")) {
                Color awtColor = switch (color.length()) {
                    case 7 -> Color.decode(color); // #RRGGBB
                    case 4 -> { // #RGB -> #RRGGBB
                        String expanded = "#" + color.charAt(1) + color.charAt(1) + 
                                        color.charAt(2) + color.charAt(2) + 
                                        color.charAt(3) + color.charAt(3);
                        yield Color.decode(expanded);
                    }
                    default -> Color.BLACK;
                };
                return new float[]{awtColor.getRed() / 255f, awtColor.getGreen() / 255f, awtColor.getBlue() / 255f};
            }
            
            // Handle RGB format
            if (color.startsWith("rgb(") && color.endsWith(")")) {
                String values = color.substring(4, color.length() - 1);
                String[] rgb = values.split(",");
                if (rgb.length == 3) {
                    int r = Math.max(0, Math.min(255, Integer.parseInt(rgb[0].trim())));
                    int g = Math.max(0, Math.min(255, Integer.parseInt(rgb[1].trim())));
                    int b = Math.max(0, Math.min(255, Integer.parseInt(rgb[2].trim())));
                    return new float[]{r / 255f, g / 255f, b / 255f};
                }
            }
            
            // Handle named colors
            Color awtColor = switch (color.toLowerCase()) {
                case "red" -> Color.RED;
                case "blue" -> Color.BLUE;
                case "green" -> Color.GREEN;
                case "yellow" -> Color.YELLOW;
                case "white" -> Color.WHITE;
                case "black" -> Color.BLACK;
                case "gray", "grey" -> Color.GRAY;
                case "orange" -> Color.ORANGE;
                case "pink" -> Color.PINK;
                case "cyan" -> Color.CYAN;
                case "magenta" -> Color.MAGENTA;
                case "darkgray", "darkgrey" -> Color.DARK_GRAY;
                case "lightgray", "lightgrey" -> Color.LIGHT_GRAY;
                default -> {
                    logger.warn("Unknown color: {}. Using black as default.", colorString);
                    yield Color.BLACK;
                }
            };
            return new float[]{awtColor.getRed() / 255f, awtColor.getGreen() / 255f, awtColor.getBlue() / 255f};
            
        } catch (NumberFormatException e) {
            logger.warn("Number format error parsing color '{}': {}. Using black as default.", colorString, e.getMessage());
            return new float[]{0f, 0f, 0f}; // Black
        } catch (Exception e) {
            logger.warn("Unexpected error parsing color '{}': {}. Using black as default.", colorString, e.getMessage());
            return new float[]{0f, 0f, 0f}; // Black
        }
    }
}