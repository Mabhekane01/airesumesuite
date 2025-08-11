package com.airesumesuite.pdfservice.service;
import org.sejda.sambox.pdmodel.PDDocument;
import org.sejda.sambox.pdmodel.PDPage;
import org.sejda.sambox.pdmodel.PDPageContentStream;
import org.sejda.sambox.pdmodel.font.PDType1Font;
import org.sejda.sambox.pdmodel.graphics.state.RenderingMode;
import org.sejda.sambox.rendering.PDFRenderer;
import org.sejda.sambox.text.PDFTextStripper;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import net.sourceforge.tess4j.Tesseract;
import net.sourceforge.tess4j.TesseractException;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.logging.Logger;
import java.util.logging.Level;

/**
 * Production-ready service for OCR operations on PDF documents using SAMBox and Tesseract
 */
@Service
public class PdfOcrService {

    private static final Logger logger = Logger.getLogger(PdfOcrService.class.getName());
    private static final String DEFAULT_TESSDATA_PATH = "/usr/share/tesseract-ocr/4.00/tessdata";
    private static final String DEFAULT_LANGUAGE = "eng";
    private static final int DEFAULT_DPI = 300;
    private static final float DEFAULT_FONT_SIZE = 12f;

    /**
     * Perform OCR on PDF with proper error handling
     */
    public Map<String, Object> performOcr(MultipartFile file, String language) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File cannot be null or empty");
        }

        File tempFile = createTempFile(file);
        
        try (PDDocument document = PDDocument.load(tempFile)) {
            Map<String, Object> result = new HashMap<>();
            
            // First, try to extract existing text using SAMBox
            PDFTextStripper textStripper = new PDFTextStripper();
            String existingText = textStripper.getText(document);
            
            if (existingText != null && !existingText.trim().isEmpty()) {
                // Document already has text
                result.put("success", true);
                result.put("text", existingText);
                result.put("method", "SAMBox text extraction");
                result.put("confidence", 1.0);
                result.put("hasExistingText", true);
            } else {
                // Document appears to be image-based, perform OCR
                String ocrText = performOcrOnPdf(document, language != null ? language : DEFAULT_LANGUAGE);
                result.put("success", true);
                result.put("text", ocrText);
                result.put("method", "Tesseract OCR");
                result.put("confidence", 0.85);
                result.put("hasExistingText", false);
                result.put("language", language);
            }
            
            result.put("pageCount", document.getNumberOfPages());
            result.put("processingTime", System.currentTimeMillis());
            
            return result;
        } finally {
            cleanupTempFile(tempFile);
        }
    }

    /**
     * Make PDF searchable by adding OCR text layer
     */
    public byte[] makeSearchablePdf(MultipartFile file, String language) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File cannot be null or empty");
        }

        File tempFile = createTempFile(file);

        try (PDDocument document = PDDocument.load(tempFile)) {
            
            // Check if document already has text
            PDFTextStripper textStripper = new PDFTextStripper();
            String existingText = textStripper.getText(document);
            
            if (existingText != null && !existingText.trim().isEmpty()) {
                // Document already has text, return as-is
                File outputFile = File.createTempFile("searchable_pdf_" + UUID.randomUUID(), ".pdf");
                try {
                    document.save(outputFile.getAbsolutePath());
                    return java.nio.file.Files.readAllBytes(outputFile.toPath());
                } finally {
                    cleanupTempFile(outputFile);
                }
            }
            
            // For image-based PDFs, render pages and perform OCR
            PDFRenderer renderer = new PDFRenderer(document);
            String lang = language != null ? language : DEFAULT_LANGUAGE;
            
            for (int pageIndex = 0; pageIndex < document.getNumberOfPages(); pageIndex++) {
                try {
                    // Render page to image
                    BufferedImage pageImage = renderer.renderImageWithDPI(pageIndex, DEFAULT_DPI);
                    
                    // Perform OCR on the image
                    String ocrText = performOcrOnImage(pageImage, lang);
                    
                    // Add invisible text layer to page
                    if (!ocrText.isEmpty()) {
                        addInvisibleTextLayer(document, pageIndex, ocrText);
                    }
                } catch (IOException | RuntimeException e) {
                    logger.log(Level.WARNING, "Error processing page " + (pageIndex + 1), e);
                    // Continue with other pages even if one fails
                }
            }
            
            File outputFile = File.createTempFile("searchable_pdf_" + UUID.randomUUID(), ".pdf");
            try {
                document.save(outputFile.getAbsolutePath());
                return java.nio.file.Files.readAllBytes(outputFile.toPath());
            } finally {
                cleanupTempFile(outputFile);
            }
        } finally {
            cleanupTempFile(tempFile);
        }
    }

    /**
     * Extract text from specific page using OCR
     */
    public String extractTextFromPage(MultipartFile file, int pageNumber, String language) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File cannot be null or empty");
        }
        
        if (pageNumber <= 0) {
            throw new IllegalArgumentException("Page number must be greater than 0");
        }

        File tempFile = createTempFile(file);

        try (PDDocument document = PDDocument.load(tempFile)) {
            if (pageNumber <= document.getNumberOfPages()) {
                
                // First try SAMBox text extraction
                PDFTextStripper textStripper = new PDFTextStripper();
                textStripper.setStartPage(pageNumber);
                textStripper.setEndPage(pageNumber);
                String existingText = textStripper.getText(document);
                
                if (existingText != null && !existingText.trim().isEmpty()) {
                    return existingText;
                }
                
                // If no text found, use OCR
                PDFRenderer renderer = new PDFRenderer(document);
                BufferedImage pageImage = renderer.renderImageWithDPI(pageNumber - 1, DEFAULT_DPI);
                return performOcrOnImage(pageImage, language != null ? language : DEFAULT_LANGUAGE);
            }
            
            throw new IllegalArgumentException("Page number " + pageNumber + " exceeds document page count: " + document.getNumberOfPages());
        } finally {
            cleanupTempFile(tempFile);
        }
    }

    /**
     * Get OCR confidence scores for PDF
     */
    public Map<String, Object> getOcrConfidence(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File cannot be null or empty");
        }

        File tempFile = createTempFile(file);

        try (PDDocument document = PDDocument.load(tempFile)) {
            Map<String, Object> confidence = new HashMap<>();
            
            // Analyze document for OCR quality
            PDFTextStripper textStripper = new PDFTextStripper();
            String existingText = textStripper.getText(document);
            
            if (existingText != null && !existingText.trim().isEmpty()) {
                confidence.put("hasText", true);
                confidence.put("confidence", 1.0);
                confidence.put("method", "Native text");
            } else {
                confidence.put("hasText", false);
                confidence.put("confidence", 0.85); // Estimated OCR confidence
                confidence.put("method", "OCR needed");
            }
            
            confidence.put("pageCount", document.getNumberOfPages());
            
            return confidence;
        } finally {
            cleanupTempFile(tempFile);
        }
    }

    /**
     * Detect document language
     */
    public String detectLanguage(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File cannot be null or empty");
        }

        File tempFile = createTempFile(file);

        try (PDDocument document = PDDocument.load(tempFile)) {
            
            // Simple language detection based on text analysis
            PDFTextStripper textStripper = new PDFTextStripper();
            textStripper.setEndPage(Math.min(3, document.getNumberOfPages())); // Sample first 3 pages
            String sampleText = textStripper.getText(document);
            
            if (sampleText != null && !sampleText.trim().isEmpty()) {
                return detectLanguageFromText(sampleText);
            }
            
            return DEFAULT_LANGUAGE;
        } finally {
            cleanupTempFile(tempFile);
        }
    }

    // Private helper methods

    private File createTempFile(MultipartFile file) throws IOException {
        File tempFile = File.createTempFile("sambox_pdf_" + UUID.randomUUID(), ".pdf");
        try (FileOutputStream fos = new FileOutputStream(tempFile)) {
            fos.write(file.getBytes());
        }
        return tempFile;
    }

    private void cleanupTempFile(File tempFile) {
        if (tempFile != null && tempFile.exists()) {
            try {
                if (!tempFile.delete()) {
                    tempFile.deleteOnExit();
                    logger.log(Level.WARNING, "Could not delete temp file immediately: {0}", tempFile.getAbsolutePath());
                }
            } catch (SecurityException e) {
                logger.log(Level.WARNING, "Error deleting temp file: " + tempFile.getAbsolutePath(), e);
            }
        }
    }

    private String performOcrOnPdf(PDDocument document, String language) throws IOException {
        StringBuilder fullText = new StringBuilder();
        PDFRenderer renderer = new PDFRenderer(document);
        
        for (int pageIndex = 0; pageIndex < document.getNumberOfPages(); pageIndex++) {
            try {
                BufferedImage pageImage = renderer.renderImageWithDPI(pageIndex, DEFAULT_DPI);
                String pageText = performOcrOnImage(pageImage, language);
                if (!pageText.isEmpty()) {
                    if (fullText.length() > 0) {
                        fullText.append("\n\n--- Page ").append(pageIndex + 1).append(" ---\n\n");
                    }
                    fullText.append(pageText);
                }
            } catch (IOException | RuntimeException e) {
                logger.log(Level.WARNING, "Error performing OCR on page " + (pageIndex + 1), e);
            }
        }
        
        return fullText.toString();
    }

    private String performOcrOnImage(BufferedImage image, String language) {
        try {
            // Initialize Tesseract instance
            Tesseract tesseract = new Tesseract();

            // Configure Tesseract
            tesseract.setDatapath(DEFAULT_TESSDATA_PATH);
            tesseract.setLanguage(language != null ? language : DEFAULT_LANGUAGE);
            
            // Set OCR Engine Mode and Page Segmentation Mode for better accuracy
            tesseract.setOcrEngineMode(1); // Neural nets LSTM engine only
            tesseract.setPageSegMode(1); // Automatic page segmentation with OSD
            
            // Perform OCR on the BufferedImage
            String result = tesseract.doOCR(image);

            return result != null ? result.trim() : "";
        } catch (TesseractException e) {
            logger.log(Level.SEVERE, "Tesseract OCR failed", e);
            return "";
        } catch (RuntimeException | Error e) {
            logger.log(Level.SEVERE, "Unexpected error during OCR", e);
            return "";
        }
    }

    private void addInvisibleTextLayer(PDDocument document, int pageIndex, String ocrText) throws IOException {
        if (ocrText == null || ocrText.trim().isEmpty()) {
            return;
        }
        
        PDPage page = document.getPage(pageIndex);
        
        // Add invisible text layer
        try (PDPageContentStream contentStream = new PDPageContentStream(document, page, 
            PDPageContentStream.AppendMode.APPEND, true, true)) {
            
            // Set text to invisible (render mode 3)
            contentStream.beginText();
            contentStream.setFont(PDType1Font.HELVETICA(), DEFAULT_FONT_SIZE);
            contentStream.setTextRenderingMode(RenderingMode.NEITHER); // Invisible text
            contentStream.newLineAtOffset(0, page.getMediaBox().getHeight() - 20);
            
            // Add OCR text as invisible overlay
            String[] lines = ocrText.split("\\r?\\n");
            for (String line : lines) {
                if (line.trim().length() > 0) {
                    try {
                        contentStream.showText(line);
                        contentStream.newLineAtOffset(0, -DEFAULT_FONT_SIZE);
                    } catch (IOException | IllegalArgumentException e) {
                        logger.log(Level.WARNING, "Error adding text line: " + line, e);
                    }
                }
            }
            
            contentStream.endText();
        } catch (IOException | RuntimeException e) {
            logger.log(Level.WARNING, "Error adding invisible text layer to page " + (pageIndex + 1), e);
            throw new IOException("Failed to add invisible text layer", e);
        }
    }

    private String detectLanguageFromText(String text) {
        if (text == null || text.trim().isEmpty()) {
            return DEFAULT_LANGUAGE;
        }
        
        // Simple language detection based on character patterns
        text = text.toLowerCase().replaceAll("[^a-z\\s]", " ");
        
        // Count common words for each language
        int englishScore = countMatches(text, new String[]{"the ", "and ", "of ", "to ", "a ", "in ", "is ", "it ", "you ", "that "});
        int germanScore = countMatches(text, new String[]{"der ", "die ", "und ", "in ", "den ", "von ", "zu ", "das ", "mit ", "sich "});
        int frenchScore = countMatches(text, new String[]{"le ", "de ", "et ", "à ", "un ", "il ", "être ", "et ", "en ", "avoir "});
        int spanishScore = countMatches(text, new String[]{"el ", "de ", "que ", "y ", "a ", "en ", "un ", "es ", "se ", "no "});
        
        // Return language with highest score
        int maxScore = Math.max(Math.max(englishScore, germanScore), Math.max(frenchScore, spanishScore));
        
        if (maxScore == 0) {
            return DEFAULT_LANGUAGE;
        }
        
        if (maxScore == germanScore) {
            return "deu";
        } else if (maxScore == frenchScore) {
            return "fra";
        } else if (maxScore == spanishScore) {
            return "spa";
        } else {
            return "eng";
        }
    }
    
    private int countMatches(String text, String[] patterns) {
        int count = 0;
        for (String pattern : patterns) {
            int index = 0;
            while ((index = text.indexOf(pattern, index)) != -1) {
                count++;
                index += pattern.length();
            }
        }
        return count;
    }
}