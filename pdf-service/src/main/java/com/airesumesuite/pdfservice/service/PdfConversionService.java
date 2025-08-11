package com.airesumesuite.pdfservice.service;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;

import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFRun;
import org.sejda.sambox.pdmodel.PDDocument;
import org.sejda.sambox.pdmodel.PDPage;
import org.sejda.sambox.pdmodel.common.PDRectangle;
import org.sejda.sambox.text.PDFTextStripper;
import org.sejda.sambox.text.TextPosition;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class PdfConversionService {

    private static final Logger logger = LoggerFactory.getLogger(PdfConversionService.class);
    
    // Configuration constants
    private static final long MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    private static final int MAX_PAGES = 1000;
    private static final String[] ALLOWED_CONTENT_TYPES = {"application/pdf"};

    /**
     * Convert PDF to Word document with enhanced error handling and validation
     */
    public byte[] convertPdfToWord(MultipartFile pdfFile) throws IOException {
        validatePdfFile(pdfFile);
        
        File tempFile = null;
        try {
            logger.info("Starting PDF to Word conversion for file: {}", pdfFile.getOriginalFilename());
            
            // Create temp file for SAMBox compatibility
            tempFile = createTempFile(pdfFile, "pdf-input-", ".pdf");
            
            try (PDDocument pdfDocument = PDDocument.load(tempFile);
                 XWPFDocument wordDocument = new XWPFDocument()) {
                
                validatePageCount(pdfDocument.getNumberOfPages());
                
                // Extract text with formatting information
                for (int pageNum = 0; pageNum < pdfDocument.getNumberOfPages(); pageNum++) {
                    try {
                        CustomTextStripper stripper = new CustomTextStripper();
                        stripper.setStartPage(pageNum + 1);
                        stripper.setEndPage(pageNum + 1);
                        
                        // Get page text and formatting
                        String pageText = stripper.getText(pdfDocument);
                        List<TextFormatInfo> formatInfo = stripper.getTextFormatInfo();
                        
                        // Convert to Word paragraphs
                        convertTextToWordParagraphs(wordDocument, pageText, formatInfo);
                        
                        // Add page break if not last page
                        if (pageNum < pdfDocument.getNumberOfPages() - 1) {
                            addPageBreak(wordDocument);
                        }
                        
                        logger.debug("Processed page {} of {}", pageNum + 1, pdfDocument.getNumberOfPages());
                        
                    } catch (IOException e) {
                        logger.warn("IO error processing page {}: {}", pageNum + 1, e.getMessage());
                        // Continue with next page instead of failing completely
                    } catch (RuntimeException e) {
                        logger.warn("Runtime error processing page {}: {}", pageNum + 1, e.getMessage());
                        // Continue with next page instead of failing completely
                    }
                }
                
                // Save to byte array
                try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
                    wordDocument.write(outputStream);
                    
                    logger.info("Successfully converted PDF to Word. Output size: {} bytes", outputStream.size());
                    return outputStream.toByteArray();
                }
            }
        } catch (IOException e) {
            logger.error("IO error converting PDF to Word: {}", e.getMessage(), e);
            throw e; // Re-throw as it's already an IOException
        } catch (IllegalArgumentException e) {
            logger.error("Invalid argument converting PDF to Word: {}", e.getMessage(), e);
            throw new IOException("Invalid PDF file: " + e.getMessage(), e);
        } catch (RuntimeException e) {
            logger.error("Runtime error converting PDF to Word: {}", e.getMessage(), e);
            throw new IOException("Failed to convert PDF to Word: " + e.getMessage(), e);
        } finally {
            cleanupTempFile(tempFile);
        }
    }

    /**
     * Convert PDF to plain text with improved error handling
     */
    public String convertPdfToText(MultipartFile pdfFile) throws IOException {
        validatePdfFile(pdfFile);
        
        File tempFile = null;
        try {
            logger.info("Starting PDF to text conversion for file: {}", pdfFile.getOriginalFilename());
            
            tempFile = createTempFile(pdfFile, "pdf-text-", ".pdf");
            
            try (PDDocument document = PDDocument.load(tempFile)) {
                validatePageCount(document.getNumberOfPages());
                
                PDFTextStripper stripper = new PDFTextStripper();
                String text = stripper.getText(document);
                
                logger.info("Successfully converted PDF to text. Text length: {} characters", text.length());
                return text;
            }
        } catch (IOException e) {
            logger.error("IO error converting PDF to text: {}", e.getMessage(), e);
            throw e; // Re-throw as it's already an IOException
        } catch (IllegalArgumentException e) {
            logger.error("Invalid argument converting PDF to text: {}", e.getMessage(), e);
            throw new IOException("Invalid PDF file: " + e.getMessage(), e);
        } catch (RuntimeException e) {
            logger.error("Runtime error converting PDF to text: {}", e.getMessage(), e);
            throw new IOException("Failed to convert PDF to text: " + e.getMessage(), e);
        } finally {
            cleanupTempFile(tempFile);
        }
    }

    /**
     * Convert PDF to HTML with enhanced formatting and error handling
     */
    public String convertPdfToHtml(MultipartFile pdfFile) throws IOException {
        validatePdfFile(pdfFile);
        
        File tempFile = null;
        try {
            logger.info("Starting PDF to HTML conversion for file: {}", pdfFile.getOriginalFilename());
            
            tempFile = createTempFile(pdfFile, "pdf-html-", ".pdf");
            
            StringBuilder htmlBuilder = new StringBuilder();
            htmlBuilder.append("<!DOCTYPE html>\n<html>\n<head>\n<meta charset=\"UTF-8\">\n");
            htmlBuilder.append("<title>").append(escapeHtml(pdfFile.getOriginalFilename())).append("</title>\n");
            htmlBuilder.append("<style>\n");
            htmlBuilder.append("body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }\n");
            htmlBuilder.append(".page { page-break-after: always; margin-bottom: 2em; }\n");
            htmlBuilder.append(".page-header { color: #666; border-bottom: 1px solid #ccc; margin-bottom: 1em; }\n");
            htmlBuilder.append("p { margin: 0.5em 0; }\n");
            htmlBuilder.append("</style>\n</head>\n<body>\n");

            try (PDDocument document = PDDocument.load(tempFile)) {
                validatePageCount(document.getNumberOfPages());
                
                for (int i = 0; i < document.getNumberOfPages(); i++) {
                    try {
                        htmlBuilder.append("<div class=\"page\">\n");
                        htmlBuilder.append("<h3 class=\"page-header\">Page ").append(i + 1).append("</h3>\n");
                        
                        PDFTextStripper stripper = new PDFTextStripper();
                        stripper.setStartPage(i + 1);
                        stripper.setEndPage(i + 1);
                        
                        String pageText = stripper.getText(document);
                        String[] lines = pageText.split("\n");
                        
                        for (String line : lines) {
                            if (!line.trim().isEmpty()) {
                                htmlBuilder.append("<p>").append(escapeHtml(line.trim())).append("</p>\n");
                            }
                        }
                        
                        htmlBuilder.append("</div>\n");
                        
                        logger.debug("Processed page {} of {} for HTML conversion", i + 1, document.getNumberOfPages());
                        
                    } catch (IOException e) {
                        logger.warn("IO error processing page {} for HTML: {}", i + 1, e.getMessage());
                        htmlBuilder.append("<p><em>Error processing page content: ").append(escapeHtml(e.getMessage())).append("</em></p>\n");
                    } catch (RuntimeException e) {
                        logger.warn("Runtime error processing page {} for HTML: {}", i + 1, e.getMessage());
                        htmlBuilder.append("<p><em>Error processing page content: ").append(escapeHtml(e.getMessage())).append("</em></p>\n");
                    }
                }
            }
            
            htmlBuilder.append("</body>\n</html>");
            
            logger.info("Successfully converted PDF to HTML");
            return htmlBuilder.toString();
            
        } catch (IOException e) {
            logger.error("IO error converting PDF to HTML: {}", e.getMessage(), e);
            throw e; // Re-throw as it's already an IOException
        } catch (IllegalArgumentException e) {
            logger.error("Invalid argument converting PDF to HTML: {}", e.getMessage(), e);
            throw new IOException("Invalid PDF file: " + e.getMessage(), e);
        } catch (RuntimeException e) {
            logger.error("Runtime error converting PDF to HTML: {}", e.getMessage(), e);
            throw new IOException("Failed to convert PDF to HTML: " + e.getMessage(), e);
        } finally {
            cleanupTempFile(tempFile);
        }
    }

    /**
     * Get PDF metadata and structure information with comprehensive error handling
     */
    public PdfInfo getPdfInfo(MultipartFile pdfFile) throws IOException {
        validatePdfFile(pdfFile);
        
        File tempFile = null;
        try {
            logger.info("Extracting PDF info for file: {}", pdfFile.getOriginalFilename());
            
            tempFile = createTempFile(pdfFile, "pdf-info-", ".pdf");
            
            try (PDDocument document = PDDocument.load(tempFile)) {
                PdfInfo info = new PdfInfo();
                
                info.setTotalPages(document.getNumberOfPages());
                
                // Safely extract document information
                if (document.getDocumentInformation() != null) {
                    info.setTitle(safeGetString(document.getDocumentInformation().getTitle()));
                    info.setAuthor(safeGetString(document.getDocumentInformation().getAuthor()));
                    info.setSubject(safeGetString(document.getDocumentInformation().getSubject()));
                    info.setCreator(safeGetString(document.getDocumentInformation().getCreator()));
                    info.setProducer(safeGetString(document.getDocumentInformation().getProducer()));
                    
                    // Handle dates safely
                    try {
                        Calendar creationDate = document.getDocumentInformation().getCreationDate();
                        if (creationDate != null) {
                            info.setCreationDate(LocalDateTime.ofInstant(
                                creationDate.toInstant(), ZoneId.systemDefault()));
                        }
                    } catch (RuntimeException e) {
                        logger.warn("Error parsing creation date: {}", e.getMessage());
                    }
                    
                    try {
                        Calendar modDate = document.getDocumentInformation().getModificationDate();
                        if (modDate != null) {
                            info.setModificationDate(LocalDateTime.ofInstant(
                                modDate.toInstant(), ZoneId.systemDefault()));
                        }
                    } catch (RuntimeException e) {
                        logger.warn("Error parsing modification date: {}", e.getMessage());
                    }
                }
                
                // Get page dimensions
                List<PageInfo> pages = new ArrayList<>();
                for (int i = 0; i < document.getNumberOfPages(); i++) {
                    try {
                        PDPage page = document.getPage(i);
                        PDRectangle mediaBox = page.getMediaBox();
                        
                        PageInfo pageInfo = new PageInfo();
                        pageInfo.setPageNumber(i + 1);
                        pageInfo.setWidth(mediaBox.getWidth());
                        pageInfo.setHeight(mediaBox.getHeight());
                        pageInfo.setRotation(page.getRotation());
                        
                        pages.add(pageInfo);
                    } catch (IndexOutOfBoundsException e) {
                        logger.warn("Page index {} out of bounds: {}", i + 1, e.getMessage());
                    } catch (RuntimeException e) {
                        logger.warn("Error processing page {} dimensions: {}", i + 1, e.getMessage());
                    }
                }
                info.setPages(pages);
                
                logger.info("Successfully extracted PDF info. Pages: {}", info.getTotalPages());
                return info;
            }
        } catch (IOException e) {
            logger.error("IO error extracting PDF info: {}", e.getMessage(), e);
            throw e; // Re-throw as it's already an IOException
        } catch (IllegalArgumentException e) {
            logger.error("Invalid argument extracting PDF info: {}", e.getMessage(), e);
            throw new IOException("Invalid PDF file: " + e.getMessage(), e);
        } catch (RuntimeException e) {
            logger.error("Runtime error extracting PDF info: {}", e.getMessage(), e);
            throw new IOException("Failed to extract PDF information: " + e.getMessage(), e);
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
            for (String allowed : ALLOWED_CONTENT_TYPES) {
                if (allowed.equals(contentType)) {
                    validContentType = true;
                    break;
                }
            }
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
            } catch (SecurityException e) {
                logger.warn("Security exception deleting temp file: {}", e.getMessage());
            }
        }
    }
    
    private String safeGetString(String value) {
        return value != null ? value.trim() : null;
    }

    private void convertTextToWordParagraphs(XWPFDocument wordDocument, String text, List<TextFormatInfo> formatInfo) {
        if (text == null || text.trim().isEmpty()) {
            return;
        }
        
        String[] lines = text.split("\n");
        
        for (String line : lines) {
            if (!line.trim().isEmpty()) {
                XWPFParagraph paragraph = wordDocument.createParagraph();
                XWPFRun run = paragraph.createRun();
                run.setText(line.trim());
                
                // Apply basic formatting
                run.setFontFamily("Calibri");
                run.setFontSize(11);
                
                // Apply formatting from format info if available
                if (formatInfo != null && !formatInfo.isEmpty()) {
                    // Find matching format info (simplified approach)
                    TextFormatInfo format = formatInfo.get(0); // Use first format as default
                    if (format != null) {
                        if (format.getFontSize() > 0) {
                            run.setFontSize((int) Math.round(format.getFontSize()));
                        }
                        run.setBold(format.isBold());
                        run.setItalic(format.isItalic());
                    }
                }
            }
        }
    }

    private void addPageBreak(XWPFDocument document) {
        XWPFParagraph paragraph = document.createParagraph();
        XWPFRun run = paragraph.createRun();
        run.addBreak(org.apache.poi.xwpf.usermodel.BreakType.PAGE);
    }

    private String escapeHtml(String text) {
        if (text == null) return "";
        return text.replace("&", "&amp;")
                  .replace("<", "&lt;")
                  .replace(">", "&gt;")
                  .replace("\"", "&quot;")
                  .replace("'", "&#39;");
    }

    // Data classes with improved structure
    public static class PdfInfo {
        private int totalPages;
        private String title;
        private String author;
        private String subject;
        private String creator;
        private String producer;
        private LocalDateTime creationDate;
        private LocalDateTime modificationDate;
        private List<PageInfo> pages = new ArrayList<>();

        // Getters and setters
        public int getTotalPages() { return totalPages; }
        public void setTotalPages(int totalPages) { this.totalPages = totalPages; }
        
        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }
        
        public String getAuthor() { return author; }
        public void setAuthor(String author) { this.author = author; }
        
        public String getSubject() { return subject; }
        public void setSubject(String subject) { this.subject = subject; }
        
        public String getCreator() { return creator; }
        public void setCreator(String creator) { this.creator = creator; }
        
        public String getProducer() { return producer; }
        public void setProducer(String producer) { this.producer = producer; }
        
        public LocalDateTime getCreationDate() { return creationDate; }
        public void setCreationDate(LocalDateTime creationDate) { this.creationDate = creationDate; }
        
        public LocalDateTime getModificationDate() { return modificationDate; }
        public void setModificationDate(LocalDateTime modificationDate) { this.modificationDate = modificationDate; }
        
        public List<PageInfo> getPages() { return pages; }
        public void setPages(List<PageInfo> pages) { this.pages = pages != null ? pages : new ArrayList<>(); }
    }

    public static class PageInfo {
        private int pageNumber;
        private float width;
        private float height;
        private int rotation;

        // Getters and setters
        public int getPageNumber() { return pageNumber; }
        public void setPageNumber(int pageNumber) { this.pageNumber = pageNumber; }
        
        public float getWidth() { return width; }
        public void setWidth(float width) { this.width = width; }
        
        public float getHeight() { return height; }
        public void setHeight(float height) { this.height = height; }
        
        public int getRotation() { return rotation; }
        public void setRotation(int rotation) { this.rotation = rotation; }
    }

    public static class TextFormatInfo {
        private String fontName;
        private float fontSize;
        private boolean isBold;
        private boolean isItalic;
        private float x, y;

        // Getters and setters
        public String getFontName() { return fontName; }
        public void setFontName(String fontName) { this.fontName = fontName; }
        
        public float getFontSize() { return fontSize; }
        public void setFontSize(float fontSize) { this.fontSize = fontSize; }
        
        public boolean isBold() { return isBold; }
        public void setBold(boolean bold) { isBold = bold; }
        
        public boolean isItalic() { return isItalic; }
        public void setItalic(boolean italic) { isItalic = italic; }
        
        public float getX() { return x; }
        public void setX(float x) { this.x = x; }
        
        public float getY() { return y; }
        public void setY(float y) { this.y = y; }
    }

    // Thread-safe custom text stripper
    private static class CustomTextStripper extends PDFTextStripper {
        private final List<TextFormatInfo> formatInfo = new ArrayList<>();

        public CustomTextStripper() throws IOException {
            super();
            setSuppressDuplicateOverlappingText(false);
        }

        @Override
        protected void processTextPosition(TextPosition text) {
            super.processTextPosition(text);
            
            try {
                TextFormatInfo info = new TextFormatInfo();
                
                if (text.getFont() != null && text.getFont().getName() != null) {
                    info.setFontName(text.getFont().getName());
                    
                    // Determine bold/italic from font name (heuristic approach)
                    String fontName = text.getFont().getName().toLowerCase();
                    info.setBold(fontName.contains("bold") || fontName.contains("black"));
                    info.setItalic(fontName.contains("italic") || fontName.contains("oblique"));
                }
                
                info.setFontSize(text.getFontSize());
                info.setX(text.getX());
                info.setY(text.getY());
                
                formatInfo.add(info);
            } catch (RuntimeException e) {
                logger.warn("Error processing text position: {}", e.getMessage());
            }
        }

        public List<TextFormatInfo> getTextFormatInfo() {
            return new ArrayList<>(formatInfo); // Return defensive copy
        }
    }
}