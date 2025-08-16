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

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.PDPageContentStream.AppendMode;
import org.apache.pdfbox.pdmodel.PDPageTree;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.pdfbox.text.PDFTextStripper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.airesumesuite.pdfservice.config.PdfErrorHandler;
import com.airesumesuite.pdfservice.config.PdfErrorHandler.CorruptedFileException;
import com.airesumesuite.pdfservice.config.PdfErrorHandler.InsufficientMemoryException;
import com.airesumesuite.pdfservice.config.PdfErrorHandler.PdfServiceException;

@Service
public class PdfEditingService {

    private static final Logger logger = LoggerFactory.getLogger(PdfEditingService.class);

    // Configuration constants
    private static final long MAX_FILE_SIZE = 50L * 1024L * 1024L; // 50MB
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

            try (PDDocument document = Loader.loadPDF(tempFile)) {
                validatePageCount(document.getNumberOfPages());

                Map<String, Object> result = new HashMap<>();
                List<Map<String, Object>> pages = new ArrayList<>();

                int numPages = document.getNumberOfPages();
                for (int i = 0; i < numPages; i++) {
                    try {
                        PDPage page = document.getPage(i);
                        PDFTextStripper stripper = new PDFTextStripper();
                        stripper.setStartPage(i + 1);
                        stripper.setEndPage(i + 1);
                        String text = stripper.getText(document);

                        Map<String, Object> pageInfo = new HashMap<>();
                        pageInfo.put("pageNumber", i + 1);
                        pageInfo.put("text", text);
                        PDRectangle media = page.getMediaBox();
                        pageInfo.put("width", media != null ? media.getWidth() : null);
                        pageInfo.put("height", media != null ? media.getHeight() : null);

                        pages.add(pageInfo);

                        logger.debug("Extracted text from page {} of {}", i + 1, numPages);

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

            try (PDDocument document = Loader.loadPDF(tempFile)) {
                validatePageCount(document.getNumberOfPages());

                int numPages = document.getNumberOfPages();
                for (int i = 0; i < numPages; i++) {
                    try {
                        PDPage page = document.getPage(i);

                        // Extract text for this page
                        PDFTextStripper stripper = new PDFTextStripper();
                        stripper.setStartPage(i + 1);
                        stripper.setEndPage(i + 1);
                        String pageText = stripper.getText(document);

                        // Find replacements that appear on this page
                        Map<String, String> pageReplacements = new HashMap<>();
                        for (Map.Entry<String, String> entry : replacements.entrySet()) {
                            if (entry.getKey() != null && pageText != null && pageText.contains(entry.getKey())) {
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
        // Append mode: append new content streams (keeps existing content)
        try (PDPageContentStream contentStream = new PDPageContentStream(document, page, AppendMode.APPEND, true, true)) {

            contentStream.beginText();
            contentStream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 12);
            contentStream.setNonStrokingColor(0f, 0f, 0f); // Black color using RGB floats

            float yPosition = page.getMediaBox().getHeight() - 50f;

            for (Map.Entry<String, String> entry : textToAdd.entrySet()) {
                String newText = entry.getValue();
                if (newText != null && !newText.trim().isEmpty()) {
                    contentStream.newLineAtOffset(50f, yPosition);
                    contentStream.showText(newText);
                    // Reset text matrix for next line (move back to left margin)
                    contentStream.newLineAtOffset(-50f, 0f);
                    yPosition -= 20f;
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

        if (fontSize <= 0f) {
            throw new IllegalArgumentException("Font size must be positive");
        }

        File tempFile = null;
        try {
            logger.info("Adding text at position ({}, {}) on page {} for file: {}",
                    x, y, pageNumber, file.getOriginalFilename());

            tempFile = createTempFile(file, "pdf-addtext-", ".pdf");

            try (PDDocument document = Loader.loadPDF(tempFile)) {
                validatePageCount(document.getNumberOfPages());

                if (pageNumber > document.getNumberOfPages()) {
                    throw new IllegalArgumentException("Page number " + pageNumber +
                            " exceeds document pages (" + document.getNumberOfPages() + ")");
                }

                PDPage page = document.getPage(pageNumber - 1);

                try (PDPageContentStream contentStream = new PDPageContentStream(document, page, AppendMode.APPEND, true, true)) {

                    contentStream.beginText();
                    contentStream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), fontSize);

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

            try (PDDocument document = Loader.loadPDF(tempFile)) {
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

            try (PDDocument originalDoc = Loader.loadPDF(tempFile)) {
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
                                // import the page into the new document (safe cross-document copy)
                                splitDoc.importPage(originalPage);
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
     *
     * Note: load all source documents first (keeps their streams open), then import pages into a new document.
     * Using importPage() ensures pages are copied correctly between documents. See PDFBox 3 migration guidance.
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
        List<PDDocument> sourceDocuments = new ArrayList<>();
        File tempFile = null;

        try {
            logger.info("Merging {} PDF files", files.size());

            // Step 1: Load all source documents and keep them open
            for (MultipartFile file : files) {
                tempFile = createTempFile(file, "pdf-merge-", ".pdf");
                tempFiles.add(tempFile);

                PDDocument sourceDoc = Loader.loadPDF(tempFile);
                sourceDocuments.add(sourceDoc);
                validatePageCount(sourceDoc.getNumberOfPages());

                logger.debug("Loaded source document: {} with {} pages",
                        file.getOriginalFilename(), sourceDoc.getNumberOfPages());
            }

            // Step 2: Create merged document and import pages
            try (PDDocument mergedDoc = new PDDocument()) {
                int totalPages = 0;

                for (int docIndex = 0; docIndex < sourceDocuments.size(); docIndex++) {
                    PDDocument sourceDoc = sourceDocuments.get(docIndex);
                    MultipartFile file = files.get(docIndex);

                    PDPageTree pages = sourceDoc.getPages();
                    for (PDPage page : pages) {
                        mergedDoc.importPage(page); // safe copy into mergedDoc
                        totalPages++;
                    }

                    logger.debug("Added {} pages from file: {}",
                            sourceDoc.getNumberOfPages(), file.getOriginalFilename());
                }

                logger.info("Successfully prepared merge. Total pages: {}", totalPages);

                // Step 3: Save the merged document to byte[]
                byte[] result = saveDocumentToByteArray(mergedDoc);
                logger.info("Successfully saved merged PDF with {} pages", totalPages);
                return result;
            }

        } catch (IllegalArgumentException e) {
            logger.error("Invalid argument for merging PDFs: {}", e.getMessage());
            throw e;
        } catch (IOException e) {
            logger.error("IO error merging PDFs: {}", e.getMessage());
            throw e;
        } finally {
            // Close all source documents
            for (PDDocument sourceDoc : sourceDocuments) {
                try {
                    if (sourceDoc != null) {
                        sourceDoc.close();
                    }
                } catch (IOException e) {
                    logger.warn("Error closing source document: {}", e.getMessage());
                }
            }

            // Cleanup all temp files
            for (File f : tempFiles) {
                cleanupTempFile(f);
            }
        }
    }

    /**
     * Extract selected pages into a new PDF
     */
    public byte[] extractPages(MultipartFile file, List<Integer> selectedPages) throws IOException {
        validatePdfFile(file);

        if (selectedPages == null || selectedPages.isEmpty()) {
            throw new IllegalArgumentException("Selected pages list cannot be null or empty");
        }

        File tempFile = null;
        try {
            logger.info("Extracting {} pages from PDF: {}", selectedPages.size(), file.getOriginalFilename());

            tempFile = createTempFile(file, "pdf-extract-", ".pdf");

            try (PDDocument sourceDoc = Loader.loadPDF(tempFile)) {
                validatePageCount(sourceDoc.getNumberOfPages());

                // Validate page numbers
                for (Integer pageNum : selectedPages) {
                    if (pageNum < 1 || pageNum > sourceDoc.getNumberOfPages()) {
                        throw new IndexOutOfBoundsException("Page number " + pageNum + " is out of range (1-" + sourceDoc.getNumberOfPages() + ")");
                    }
                }

                // Create new document with selected pages
                try (PDDocument extractedDoc = new PDDocument()) {
                    for (Integer pageNum : selectedPages) {
                        PDPage originalPage = sourceDoc.getPage(pageNum - 1); // Convert to 0-based index
                        extractedDoc.importPage(originalPage);
                    }

                    logger.info("Successfully extracted {} pages", selectedPages.size());
                    return saveDocumentToByteArray(extractedDoc);
                }
            }
        } catch (IllegalArgumentException e) {
            logger.error("Invalid argument for extracting pages: {}", e.getMessage());
            throw e;
        } catch (IOException e) {
            logger.error("IO error extracting pages: {}", e.getMessage());
            throw e;
        } finally {
            cleanupTempFile(tempFile);
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

            try (PDDocument document = Loader.loadPDF(tempFile)) {
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
            // PDDocument.save(OutputStream) is available in PDFBox 3.x
            document.save(outputStream);
            return outputStream.toByteArray();
        }
    }

    /**
     * Parse color string to RGB float array
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

    /**
     * Step 1: Get PDF info for uploaded file
     * Returns: { pageCount: 10, fileSize: 1234567, ... }
     */
    public Map<String, Object> getPdfInfo(File pdfFile) throws IOException, PdfServiceException {
        try {
            logger.info("Getting PDF info for file: {}", pdfFile.getName());
            
            try (PDDocument document = Loader.loadPDF(pdfFile)) {
                Map<String, Object> info = new HashMap<>();
                info.put("pageCount", document.getNumberOfPages());
                info.put("fileSize", pdfFile.length());
                info.put("success", true);
                
                logger.info("PDF info retrieved: {} pages", document.getNumberOfPages());
                return info;
            }
        } catch (IOException e) {
            logger.error("IO error getting PDF info: {}", e.getMessage());
            if (e.getMessage().contains("damaged") || e.getMessage().contains("corrupt")) {
                throw new CorruptedFileException("PDF file appears to be corrupted");
            }
            throw new PdfServiceException("Failed to get PDF information: " + e.getMessage(), e, 500);
        } catch (Exception e) {
            logger.error("Unexpected error getting PDF info: {}", e.getMessage());
            throw new PdfServiceException("PDF info retrieval failed", e, 500);
        }
    }

    /**
     * Step 3: Apply JSON changes to PDF (exactly like infotouse.md spec)
     * Input: JSON array like [
     *   { "page": 1, "action": "add_text", "x": 120, "y": 300, "text": "Hello World", "font": "Arial", "size": 14 },
     *   { "page": 2, "action": "highlight", "x": 50, "y": 100, "width": 200, "height": 20, "color": "#FFFF00" }
     * ]
     */
    public byte[] applyChangesToPdf(File pdfFile, List<Map<String, Object>> changes) throws IOException, PdfServiceException {
        try {
            logger.info("Applying {} changes to PDF: {}", changes.size(), pdfFile.getName());
            
            try (PDDocument document = Loader.loadPDF(pdfFile)) {
                PdfErrorHandler.validatePageCount(document.getNumberOfPages(), "editing");
                
                // Apply each change from the JSON array
                for (Map<String, Object> change : changes) {
                    applyChangeToDocument(document, change);
                }
                
                // Save modified PDF to byte array
                ByteArrayOutputStream baos = new ByteArrayOutputStream();
                document.save(baos);
                
                logger.info("Successfully applied {} changes to PDF", changes.size());
                return baos.toByteArray();
                
            }
        } catch (PdfServiceException e) {
            logger.error("PDF service error during change application: {}", e.getMessage());
            throw e;
        } catch (OutOfMemoryError e) {
            logger.error("Out of memory during change application: {}", e.getMessage());
            throw new InsufficientMemoryException("File too complex for editing - insufficient memory");
        } catch (IOException e) {
            logger.error("IO error during change application: {}", e.getMessage());
            if (e.getMessage().contains("damaged") || e.getMessage().contains("corrupt")) {
                throw new CorruptedFileException("PDF file appears to be corrupted");
            }
            throw new PdfServiceException("Failed to apply changes to PDF: " + e.getMessage(), e, 500);
        } catch (Exception e) {
            logger.error("Unexpected error during change application: {}", e.getMessage());
            throw new PdfServiceException("Change application failed due to unexpected error", e, 500);
        }
    }

    /**
     * Apply a single change from the JSON structure to the PDF document
     */
    private void applyChangeToDocument(PDDocument document, Map<String, Object> change) throws IOException {
        String action = (String) change.get("action");
        int pageNum = ((Number) change.get("page")).intValue();
        double x = ((Number) change.get("x")).doubleValue();
        double y = ((Number) change.get("y")).doubleValue();
        
        // Get the page (1-indexed in JSON, 0-indexed in PDFBox)
        PDPage page = document.getPage(pageNum - 1);
        PDRectangle pageRect = page.getMediaBox();
        
        logger.debug("Applying change: {} on page {} at ({}, {})", action, pageNum, x, y);
        
        switch (action) {
            case "add_text" -> addTextToPage(document, page, change, pageRect, x, y);
                
            case "highlight" -> addHighlightToPage(document, page, change, pageRect, x, y);
                
            case "delete_text" -> // For delete, we'd typically overlay a white rectangle
                deleteTextFromPage(document, page, change, pageRect, x, y);
                
            default -> logger.warn("Unknown action: {}. Skipping change.", action);
        }
    }

    /**
     * Add text to page (infotouse.md: "add_text" action)
     */
    private void addTextToPage(PDDocument document, PDPage page, Map<String, Object> change, PDRectangle pageRect, double x, double y) throws IOException {
        String text = (String) change.get("text");
        String fontName = (String) change.getOrDefault("font", "Arial");
        Number sizeNum = (Number) change.getOrDefault("size", 14);
        float fontSize = sizeNum.floatValue();
        String colorStr = (String) change.getOrDefault("color", "#000000");
        
        if (text == null || text.trim().isEmpty()) {
            return; // Skip empty text
        }
        
        try (PDPageContentStream contentStream = new PDPageContentStream(document, page, AppendMode.APPEND, true)) {
            // Set font
            PDType1Font font = getFont(fontName);
            contentStream.setFont(font, fontSize);
            
            // Set color
            float[] rgbColor = parseColorString(colorStr);
            contentStream.setNonStrokingColor(rgbColor[0], rgbColor[1], rgbColor[2]);
            
            // Convert coordinates (PDF uses bottom-left origin, frontend uses top-left)
            float pdfY = pageRect.getHeight() - (float) y - fontSize;
            
            // Add text
            contentStream.beginText();
            contentStream.newLineAtOffset((float) x, pdfY);
            contentStream.showText(text);
            contentStream.endText();
            
            logger.debug("Added text '{}' at ({}, {}) with font {} size {}", text, x, pdfY, fontName, fontSize);
        }
    }

    /**
     * Add highlight to page (infotouse.md: "highlight" action)
     */
    private void addHighlightToPage(PDDocument document, PDPage page, Map<String, Object> change, PDRectangle pageRect, double x, double y) throws IOException {
        Number widthNum = (Number) change.getOrDefault("width", 200);
        Number heightNum = (Number) change.getOrDefault("height", 20);
        float width = widthNum.floatValue();
        float height = heightNum.floatValue();
        String colorStr = (String) change.getOrDefault("color", "#FFFF00");
        
        try (PDPageContentStream contentStream = new PDPageContentStream(document, page, AppendMode.APPEND, true)) {
            // Set highlight color with transparency
            float[] rgbColor = parseColorString(colorStr);
            contentStream.setNonStrokingColor(rgbColor[0], rgbColor[1], rgbColor[2]);
            
            // Convert coordinates (PDF uses bottom-left origin)
            float pdfY = pageRect.getHeight() - (float) y - height;
            
            // Draw highlight rectangle
            contentStream.addRect((float) x, pdfY, width, height);
            contentStream.fill();
            
            logger.debug("Added highlight at ({}, {}) with size {}x{}", x, pdfY, width, height);
        }
    }

    /**
     * Delete text by overlaying white rectangle (infotouse.md: "delete_text" action)
     */
    private void deleteTextFromPage(PDDocument document, PDPage page, Map<String, Object> change, PDRectangle pageRect, double x, double y) throws IOException {
        Number widthNum = (Number) change.getOrDefault("width", 100);
        Number heightNum = (Number) change.getOrDefault("height", 20);
        float width = widthNum.floatValue();
        float height = heightNum.floatValue();
        
        try (PDPageContentStream contentStream = new PDPageContentStream(document, page, AppendMode.APPEND, true)) {
            // Set white color to "delete" text
            contentStream.setNonStrokingColor(1f, 1f, 1f); // White
            
            // Convert coordinates (PDF uses bottom-left origin)
            float pdfY = pageRect.getHeight() - (float) y - height;
            
            // Draw white rectangle over text
            contentStream.addRect((float) x, pdfY, width, height);
            contentStream.fill();
            
            logger.debug("Deleted text at ({}, {}) with size {}x{}", x, pdfY, width, height);
        }
    }

    /**
     * Get PDFBox font from font name
     */
    private PDType1Font getFont(String fontName) {
        return switch (fontName.toLowerCase()) {
            case "arial", "helvetica" -> new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            case "times", "times new roman" -> new PDType1Font(Standard14Fonts.FontName.TIMES_ROMAN);
            case "courier" -> new PDType1Font(Standard14Fonts.FontName.COURIER);
            case "arial-bold", "helvetica-bold" -> new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
            case "times-bold" -> new PDType1Font(Standard14Fonts.FontName.TIMES_BOLD);
            case "courier-bold" -> new PDType1Font(Standard14Fonts.FontName.COURIER_BOLD);
            default -> {
                logger.debug("Unknown font '{}', using Helvetica", fontName);
                yield new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            }
        };
    }

    /**
     * Parse color string to RGB float array
     */
    private float[] parseColorString(String colorStr) {
        if (colorStr == null || colorStr.trim().isEmpty()) {
            return new float[]{0f, 0f, 0f}; // Default to black
        }
        
        colorStr = colorStr.trim().toLowerCase();
        
        // Handle hex colors
        if (colorStr.startsWith("#")) {
            try {
                String hex = colorStr.substring(1);
                if (hex.length() == 6) {
                    int r = Integer.parseInt(hex.substring(0, 2), 16);
                    int g = Integer.parseInt(hex.substring(2, 4), 16);
                    int b = Integer.parseInt(hex.substring(4, 6), 16);
                    return new float[]{r / 255f, g / 255f, b / 255f};
                }
            } catch (NumberFormatException e) {
                logger.warn("Invalid hex color: {}", colorStr);
            }
        }
        
        // Handle named colors
        return switch (colorStr) {
            case "red" -> new float[]{1f, 0f, 0f};
            case "green" -> new float[]{0f, 1f, 0f};
            case "blue" -> new float[]{0f, 0f, 1f};
            case "white" -> new float[]{1f, 1f, 1f};
            case "black" -> new float[]{0f, 0f, 0f};
            case "yellow" -> new float[]{1f, 1f, 0f};
            case "cyan" -> new float[]{0f, 1f, 1f};
            case "magenta" -> new float[]{1f, 0f, 1f};
            case "gray", "grey" -> new float[]{0.5f, 0.5f, 0.5f};
            case "lightgray", "lightgrey" -> new float[]{0.75f, 0.75f, 0.75f};
            case "darkgray", "darkgrey" -> new float[]{0.25f, 0.25f, 0.25f};
            default -> {
                logger.warn("Unknown color '{}', using black", colorStr);
                yield new float[]{0f, 0f, 0f};
            }
        };
    }
}
