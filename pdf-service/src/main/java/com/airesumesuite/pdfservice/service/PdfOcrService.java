package com.airesumesuite.pdfservice.service;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.apache.pdfbox.text.PDFTextStripper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.airesumesuite.pdfservice.config.PdfErrorHandler;
import com.airesumesuite.pdfservice.config.PdfErrorHandler.CorruptedFileException;
import com.airesumesuite.pdfservice.config.PdfErrorHandler.InsufficientMemoryException;
import com.airesumesuite.pdfservice.config.PdfErrorHandler.PdfServiceException;

import net.sourceforge.tess4j.Tesseract;
import net.sourceforge.tess4j.TesseractException;


@Service
public class PdfOcrService {

    private static final Logger logger = LoggerFactory.getLogger(PdfOcrService.class);
    private static final String DEFAULT_TESSDATA_PATH = "/usr/share/tesseract-ocr/4.00/tessdata";
    private static final String DEFAULT_LANGUAGE = "eng";
    private static final int DEFAULT_DPI = 300;
    private static final float DEFAULT_FONT_SIZE = 12f;

    public Map<String, Object> performOcr(MultipartFile file, String language) throws IOException, PdfServiceException {
        try {
            PdfErrorHandler.validateFileForOperation(file, "ocr");
            
            logger.info("Starting OCR processing for file: {}", file.getOriginalFilename());

            File tempFile = createTempFile(file);
            try (PDDocument document = Loader.loadPDF(tempFile)) {
                PdfErrorHandler.validatePageCount(document.getNumberOfPages(), "ocr");
                
                long startTime = System.currentTimeMillis();
                Map<String, Object> result = new HashMap<>();
                PDFTextStripper stripper = new PDFTextStripper();
                String existingText = stripper.getText(document);

                if (existingText != null && !existingText.trim().isEmpty()) {
                    result.put("success", true);
                    result.put("text", existingText);
                    result.put("method", "PDFBox text extraction");
                    result.put("confidence", 1.0);
                    result.put("hasExistingText", true);
                } else {
                    String ocrText = performOcrOnPdf(document, language != null ? language : DEFAULT_LANGUAGE);
                    result.put("success", true);
                    result.put("text", ocrText);
                    result.put("method", "Tesseract OCR");
                    result.put("confidence", 0.85);
                    result.put("hasExistingText", false);
                    result.put("language", language);
                }

                result.put("pageCount", document.getNumberOfPages());
                result.put("processingTime", System.currentTimeMillis() - startTime);
                
                logger.info("OCR processing completed for file: {}", file.getOriginalFilename());
                return result;
            } finally {
                cleanupTempFile(tempFile);
            }
        } catch (PdfServiceException e) {
            logger.error("PDF service error during OCR: {}", e.getMessage());
            throw e;
        } catch (OutOfMemoryError e) {
            logger.error("Out of memory during OCR: {}", e.getMessage());
            throw new InsufficientMemoryException("File too large or complex for OCR processing");
        } catch (IOException e) {
            logger.error("IO error during OCR: {}", e.getMessage());
            if (e.getMessage().contains("damaged") || e.getMessage().contains("corrupt")) {
                throw new CorruptedFileException("PDF file appears to be corrupted");
            }
            throw new PdfServiceException("OCR processing failed: " + e.getMessage(), e, 500);
        } catch (Exception e) {
            logger.error("Unexpected error during OCR: {}", e.getMessage());
            throw new PdfServiceException("OCR processing failed due to unexpected error", e, 500);
        }
    }

    public byte[] makeSearchablePdf(MultipartFile file, String language) throws IOException, PdfServiceException {
        try {
            PdfErrorHandler.validateFileForOperation(file, "ocr");
            
            logger.info("Creating searchable PDF for file: {}", file.getOriginalFilename());

            File tempFile = createTempFile(file);
            try (PDDocument document = Loader.loadPDF(tempFile)) {
                PdfErrorHandler.validatePageCount(document.getNumberOfPages(), "ocr");

                PDFTextStripper stripper = new PDFTextStripper();
                String existingText = stripper.getText(document);
                if (existingText != null && !existingText.trim().isEmpty()) {
                    logger.info("PDF already has searchable text, returning original");
                    return saveToByteArray(document);
                }

                PDFRenderer renderer = new PDFRenderer(document);
                String lang = language != null ? language : DEFAULT_LANGUAGE;

                for (int i = 0; i < document.getNumberOfPages(); i++) {
                    try {
                        BufferedImage image = renderer.renderImageWithDPI(i, DEFAULT_DPI);
                        String ocrText = performOcrOnImage(image, lang);
                        if (!ocrText.isEmpty()) {
                            addInvisibleTextLayer(document, i, ocrText);
                        }
                    } catch (IOException | RuntimeException e) {
                        logger.warn("Error processing page {}: {}", i + 1, e.getMessage());
                    }
                }
                
                logger.info("Successfully created searchable PDF");
                return saveToByteArray(document);
            } finally {
                cleanupTempFile(tempFile);
            }
        } catch (PdfServiceException e) {
            logger.error("PDF service error during searchable PDF creation: {}", e.getMessage());
            throw e;
        } catch (OutOfMemoryError e) {
            logger.error("Out of memory during searchable PDF creation: {}", e.getMessage());
            throw new InsufficientMemoryException("File too large or complex for OCR processing");
        } catch (IOException e) {
            logger.error("IO error during searchable PDF creation: {}", e.getMessage());
            if (e.getMessage().contains("damaged") || e.getMessage().contains("corrupt")) {
                throw new CorruptedFileException("PDF file appears to be corrupted");
            }
            throw new PdfServiceException("Searchable PDF creation failed: " + e.getMessage(), e, 500);
        } catch (Exception e) {
            logger.error("Unexpected error during searchable PDF creation: {}", e.getMessage());
            throw new PdfServiceException("Searchable PDF creation failed due to unexpected error", e, 500);
        }
    }

    public String extractTextFromPage(MultipartFile file, int pageNumber, String language) throws IOException {
        if (file == null || file.isEmpty())
            throw new IllegalArgumentException("File cannot be null or empty");
        if (pageNumber <= 0)
            throw new IllegalArgumentException("Page number must be greater than 0");

        File tempFile = createTempFile(file);
        try (PDDocument document = Loader.loadPDF(tempFile)) {
            if (pageNumber > document.getNumberOfPages())
                throw new IllegalArgumentException("Page number exceeds page count");

            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setStartPage(pageNumber);
            stripper.setEndPage(pageNumber);
            String existingText = stripper.getText(document);
            if (existingText != null && !existingText.trim().isEmpty())
                return existingText;

            BufferedImage image = new PDFRenderer(document).renderImageWithDPI(pageNumber - 1, DEFAULT_DPI);
            return performOcrOnImage(image, language != null ? language : DEFAULT_LANGUAGE);
        } finally {
            cleanupTempFile(tempFile);
        }
    }

    public Map<String, Object> getOcrConfidence(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty())
            throw new IllegalArgumentException("File cannot be null or empty");

        File tempFile = createTempFile(file);
        try (PDDocument document = Loader.loadPDF(tempFile)) {
            Map<String, Object> conf = new HashMap<>();
            PDFTextStripper stripper = new PDFTextStripper();
            String existingText = stripper.getText(document);

            if (existingText != null && !existingText.trim().isEmpty()) {
                conf.put("hasText", true);
                conf.put("confidence", 1.0);
                conf.put("method", "Native text");
            } else {
                conf.put("hasText", false);
                conf.put("confidence", 0.85);
                conf.put("method", "OCR needed");
            }

            conf.put("pageCount", document.getNumberOfPages());
            return conf;
        } finally {
            cleanupTempFile(tempFile);
        }
    }

    public String detectLanguage(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty())
            throw new IllegalArgumentException("File cannot be null or empty");
        File tempFile = createTempFile(file);
        try (PDDocument document = Loader.loadPDF(tempFile)) {
            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setEndPage(Math.min(3, document.getNumberOfPages()));
            String sampleText = stripper.getText(document);
            return sampleText != null && !sampleText.trim().isEmpty()
                   ? detectLanguageFromText(sampleText) : DEFAULT_LANGUAGE;
        } finally {
            cleanupTempFile(tempFile);
        }
    }

    private byte[] saveToByteArray(PDDocument document) throws IOException {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            document.save(baos);
            return baos.toByteArray();
        }
    }

    private File createTempFile(MultipartFile file) throws IOException {
        File temp = File.createTempFile("pdfocr_" + UUID.randomUUID(), ".pdf");
        try (FileOutputStream fos = new FileOutputStream(temp)) {
            fos.write(file.getBytes());
        }
        return temp;
    }

    private void cleanupTempFile(File tempFile) {
        if (tempFile != null && tempFile.exists()) {
            if (!tempFile.delete()) {
                tempFile.deleteOnExit();
                logger.warn("Could not delete temp file immediately: {}", tempFile.getAbsolutePath());
            }
        }
    }

    private String performOcrOnPdf(PDDocument document, String language) throws IOException {
        StringBuilder sb = new StringBuilder();
        PDFRenderer renderer = new PDFRenderer(document);
        for (int i = 0; i < document.getNumberOfPages(); i++) {
            try {
                BufferedImage image = renderer.renderImageWithDPI(i, DEFAULT_DPI);
                String text = performOcrOnImage(image, language);
                if (!text.isEmpty()) {
                    if (sb.length() > 0) {
                        sb.append("\n\n--- Page ").append(i + 1).append(" ---\n\n");
                    }
                    sb.append(text);
                }
            } catch (IOException e) {
                logger.warn("OCR error on page {}: {}", i + 1, e.getMessage());
            }
        }
        return sb.toString();
    }

    private String performOcrOnImage(BufferedImage image, String language) {
        Tesseract tesseract = new Tesseract();
        tesseract.setDatapath(DEFAULT_TESSDATA_PATH);
        tesseract.setLanguage(language);
        tesseract.setOcrEngineMode(1);
        tesseract.setPageSegMode(1);
        try {
            String res = tesseract.doOCR(image);
            return res != null ? res.trim() : "";
        } catch (TesseractException e) {
            logger.error("Tesseract OCR failed: {}", e.getMessage());
            return "";
        }
    }

    private void addInvisibleTextLayer(PDDocument document, int pageIndex, String ocrText) throws IOException {
        if (ocrText == null || ocrText.trim().isEmpty()) {
            return;
        }
        PDPage page = document.getPage(pageIndex);
        try (PDPageContentStream cs = new PDPageContentStream(document, page,
                PDPageContentStream.AppendMode.APPEND, true, true)) {
            cs.beginText();
            cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), DEFAULT_FONT_SIZE);
            cs.setRenderingMode(org.apache.pdfbox.pdmodel.graphics.state.RenderingMode.NEITHER);
            cs.newLineAtOffset(0, page.getMediaBox().getHeight() - 20);
            for (String line : ocrText.split("\\r?\\n")) {
                if (!line.trim().isEmpty()) {
                    cs.showText(line);
                    cs.newLineAtOffset(0, -DEFAULT_FONT_SIZE);
                }
            }
            cs.endText();
        } catch (IOException e) {
            logger.warn("Failed adding invisible text on page {}: {}", pageIndex + 1, e.getMessage());
            throw e;
        }
    }

    private String detectLanguageFromText(String text) {
        text = text == null ? "" : text.toLowerCase().replaceAll("[^a-z\\s]", " ");
        Map<String, Integer> scores = Map.of(
                "eng", countMatches(text, new String[]{" the ", " and ", " from ", " to ", " is "}),
                "deu", countMatches(text, new String[]{" der ", " die ", " und ", " in ", " den "}),
                "fra", countMatches(text, new String[]{" le ", " de ", " et ", " la ", " un "}),
                "spa", countMatches(text, new String[]{" el ", " de ", " y ", " en ", " que "})
        );
        return scores.entrySet().stream().max(Map.Entry.comparingByValue())
                .filter(e -> e.getValue() > 0)
                .map(Map.Entry::getKey).orElse(DEFAULT_LANGUAGE);
    }

    private int countMatches(String text, String[] patterns) {
        int c = 0;
        for (String p : patterns) {
            int idx = 0;
            while ((idx = text.indexOf(p, idx)) != -1) {
                c++;
                idx += p.length();
            }
        }
        return c;
    }
}
