package com.airesumesuite.pdfservice.service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xslf.usermodel.XMLSlideShow;
import org.apache.poi.xslf.usermodel.XSLFSlide;
import org.apache.poi.xslf.usermodel.XSLFTextBox;
import org.apache.poi.xslf.usermodel.XSLFTextParagraph;
import org.apache.poi.xslf.usermodel.XSLFTextRun;
import org.apache.poi.xssf.usermodel.XSSFCell;
import org.apache.poi.xssf.usermodel.XSSFRow;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFRun;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.airesumesuite.pdfservice.config.PdfErrorHandler;
import com.airesumesuite.pdfservice.config.PdfErrorHandler.CorruptedFileException;
import com.airesumesuite.pdfservice.config.PdfErrorHandler.InsufficientMemoryException;
import com.airesumesuite.pdfservice.config.PdfErrorHandler.PdfServiceException;

import jakarta.annotation.PostConstruct;

/**
 * Service for converting PDF files to other office and text formats.
 * This version uses PDFBox 3.0.5 for text extraction and Apache POI
 * for creating proper Office documents (DOCX, XLSX, PPTX).
 */
@Service
public class PdfConversionService {

    private static final Logger logger = LoggerFactory.getLogger(PdfConversionService.class);


    @PostConstruct
    public void init() {
        logger.info("PDFBox Conversion Service initialized - using PDFBox 3.0.5 + Apache POI");
    }

    /**
     * Converts a PDF to a Word (DOCX) document using PDFBox + Apache POI.
     */
    public byte[] convertPdfToDocx(MultipartFile pdfFile) throws IOException, PdfServiceException {
        try {
            PdfErrorHandler.validateFileForOperation(pdfFile, "conversion");
            
            logger.info("Starting PDF to DOCX conversion using PDFBox: {}", pdfFile.getOriginalFilename());
            
            try (PDDocument document = Loader.loadPDF(pdfFile.getBytes())) {
                PdfErrorHandler.validatePageCount(document.getNumberOfPages(), "conversion");
                
                String extractedText = extractTextFromPdf(pdfFile);
                if (extractedText.length() > PdfErrorHandler.MAX_TEXT_LENGTH) {
                    throw new PdfErrorHandler.UnsupportedOperationException("Extracted text is too large for conversion (max " + PdfErrorHandler.MAX_TEXT_LENGTH + " characters)");
                }
                
                byte[] docxBytes = createWordDocument(extractedText);
                
                logger.info("Successfully converted PDF to DOCX. Output size: {} bytes", docxBytes.length);
                return docxBytes;
            }
        } catch (PdfServiceException e) {
            logger.error("PDF service error during DOCX conversion: {}", e.getMessage());
            throw e;
        } catch (OutOfMemoryError e) {
            logger.error("Out of memory during DOCX conversion: {}", e.getMessage());
            throw new InsufficientMemoryException("File too complex for conversion - insufficient memory");
        } catch (IOException e) {
            logger.error("IO error during DOCX conversion: {}", e.getMessage());
            if (e.getMessage().contains("damaged") || e.getMessage().contains("corrupt")) {
                throw new CorruptedFileException("PDF file appears to be corrupted");
            }
            throw new PdfServiceException("Failed to convert PDF to DOCX: " + e.getMessage(), e, 500);
        } catch (Exception e) {
            logger.error("Unexpected error during DOCX conversion: {}", e.getMessage());
            throw new PdfServiceException("Conversion failed due to unexpected error", e, 500);
        }
    }

    /**
     * Converts a PDF to an Excel (XLSX) spreadsheet using PDFBox + Apache POI.
     */
    public byte[] convertPdfToXlsx(MultipartFile pdfFile) throws IOException, PdfServiceException {
        try {
            PdfErrorHandler.validateFileForOperation(pdfFile, "conversion");
            
            logger.info("Starting PDF to XLSX conversion using PDFBox: {}", pdfFile.getOriginalFilename());
            
            try (PDDocument document = Loader.loadPDF(pdfFile.getBytes())) {
                PdfErrorHandler.validatePageCount(document.getNumberOfPages(), "conversion");
                
                String extractedText = extractTextFromPdf(pdfFile);
                if (extractedText.length() > PdfErrorHandler.MAX_TEXT_LENGTH) {
                    throw new PdfErrorHandler.UnsupportedOperationException("Extracted text is too large for conversion (max " + PdfErrorHandler.MAX_TEXT_LENGTH + " characters)");
                }
                
                byte[] xlsxBytes = createExcelDocument(extractedText);
                
                logger.info("Successfully converted PDF to XLSX. Output size: {} bytes", xlsxBytes.length);
                return xlsxBytes;
            }
        } catch (PdfServiceException e) {
            logger.error("PDF service error during XLSX conversion: {}", e.getMessage());
            throw e;
        } catch (OutOfMemoryError e) {
            logger.error("Out of memory during XLSX conversion: {}", e.getMessage());
            throw new InsufficientMemoryException("File too complex for conversion - insufficient memory");
        } catch (IOException e) {
            logger.error("IO error during XLSX conversion: {}", e.getMessage());
            if (e.getMessage().contains("damaged") || e.getMessage().contains("corrupt")) {
                throw new CorruptedFileException("PDF file appears to be corrupted");
            }
            throw new PdfServiceException("Failed to convert PDF to XLSX: " + e.getMessage(), e, 500);
        } catch (Exception e) {
            logger.error("Unexpected error during XLSX conversion: {}", e.getMessage());
            throw new PdfServiceException("Conversion failed due to unexpected error", e, 500);
        }
    }

    /**
     * Converts a PDF to a PowerPoint (PPTX) presentation using PDFBox + Apache POI.
     */
    public byte[] convertPdfToPptx(MultipartFile pdfFile) throws IOException, PdfServiceException {
        try {
            PdfErrorHandler.validateFileForOperation(pdfFile, "conversion");
            
            logger.info("Starting PDF to PPTX conversion using PDFBox: {}", pdfFile.getOriginalFilename());
            
            try (PDDocument document = Loader.loadPDF(pdfFile.getBytes())) {
                PdfErrorHandler.validatePageCount(document.getNumberOfPages(), "conversion");
                
                String extractedText = extractTextFromPdf(pdfFile);
                if (extractedText.length() > PdfErrorHandler.MAX_TEXT_LENGTH) {
                    throw new PdfErrorHandler.UnsupportedOperationException("Extracted text is too large for conversion (max " + PdfErrorHandler.MAX_TEXT_LENGTH + " characters)");
                }
                
                byte[] pptxBytes = createPowerPointDocument(extractedText);
                
                logger.info("Successfully converted PDF to PPTX. Output size: {} bytes", pptxBytes.length);
                return pptxBytes;
            }
        } catch (PdfServiceException e) {
            logger.error("PDF service error during PPTX conversion: {}", e.getMessage());
            throw e;
        } catch (OutOfMemoryError e) {
            logger.error("Out of memory during PPTX conversion: {}", e.getMessage());
            throw new InsufficientMemoryException("File too complex for conversion - insufficient memory");
        } catch (IOException e) {
            logger.error("IO error during PPTX conversion: {}", e.getMessage());
            if (e.getMessage().contains("damaged") || e.getMessage().contains("corrupt")) {
                throw new CorruptedFileException("PDF file appears to be corrupted");
            }
            throw new PdfServiceException("Failed to convert PDF to PPTX: " + e.getMessage(), e, 500);
        } catch (Exception e) {
            logger.error("Unexpected error during PPTX conversion: {}", e.getMessage());
            throw new PdfServiceException("Conversion failed due to unexpected error", e, 500);
        }
    }
    
    /**
     * Converts a PDF to a plain text file using PDFBox.
     */
    public byte[] convertPdfToText(MultipartFile pdfFile) throws IOException, PdfServiceException {
        try {
            PdfErrorHandler.validateFileForOperation(pdfFile, "conversion");
            
            logger.info("Starting PDF to TEXT conversion using PDFBox: {}", pdfFile.getOriginalFilename());
            
            try (PDDocument document = Loader.loadPDF(pdfFile.getBytes())) {
                PdfErrorHandler.validatePageCount(document.getNumberOfPages(), "conversion");
                
                String extractedText = extractTextFromPdf(pdfFile);
                byte[] textBytes = extractedText.getBytes(StandardCharsets.UTF_8);
                
                logger.info("Successfully converted PDF to TEXT. Output size: {} bytes", textBytes.length);
                return textBytes;
            }
        } catch (PdfServiceException e) {
            logger.error("PDF service error during TEXT conversion: {}", e.getMessage());
            throw e;
        } catch (OutOfMemoryError e) {
            logger.error("Out of memory during TEXT conversion: {}", e.getMessage());
            throw new InsufficientMemoryException("File too complex for conversion - insufficient memory");
        } catch (IOException e) {
            logger.error("IO error during TEXT conversion: {}", e.getMessage());
            if (e.getMessage().contains("damaged") || e.getMessage().contains("corrupt")) {
                throw new CorruptedFileException("PDF file appears to be corrupted");
            }
            throw new PdfServiceException("Failed to convert PDF to TEXT: " + e.getMessage(), e, 500);
        } catch (Exception e) {
            logger.error("Unexpected error during TEXT conversion: {}", e.getMessage());
            throw new PdfServiceException("Conversion failed due to unexpected error", e, 500);
        }
    }
    
    /**
     * Converts a PDF to an HTML file using PDFBox.
     */
    public byte[] convertPdfToHtml(MultipartFile pdfFile) throws IOException, PdfServiceException {
        try {
            PdfErrorHandler.validateFileForOperation(pdfFile, "conversion");
            
            logger.info("Starting PDF to HTML conversion using PDFBox: {}", pdfFile.getOriginalFilename());
            
            try (PDDocument document = Loader.loadPDF(pdfFile.getBytes())) {
                PdfErrorHandler.validatePageCount(document.getNumberOfPages(), "conversion");
                
                String extractedText = extractTextFromPdf(pdfFile);
                if (extractedText.length() > PdfErrorHandler.MAX_TEXT_LENGTH) {
                    throw new PdfErrorHandler.UnsupportedOperationException("Extracted text is too large for conversion (max " + PdfErrorHandler.MAX_TEXT_LENGTH + " characters)");
                }
                
                String htmlContent = createHtmlDocument(extractedText);
                byte[] htmlBytes = htmlContent.getBytes(StandardCharsets.UTF_8);
                
                logger.info("Successfully converted PDF to HTML. Output size: {} bytes", htmlBytes.length);
                return htmlBytes;
            }
        } catch (PdfServiceException e) {
            logger.error("PDF service error during HTML conversion: {}", e.getMessage());
            throw e;
        } catch (OutOfMemoryError e) {
            logger.error("Out of memory during HTML conversion: {}", e.getMessage());
            throw new InsufficientMemoryException("File too complex for conversion - insufficient memory");
        } catch (IOException e) {
            logger.error("IO error during HTML conversion: {}", e.getMessage());
            if (e.getMessage().contains("damaged") || e.getMessage().contains("corrupt")) {
                throw new CorruptedFileException("PDF file appears to be corrupted");
            }
            throw new PdfServiceException("Failed to convert PDF to HTML: " + e.getMessage(), e, 500);
        } catch (Exception e) {
            logger.error("Unexpected error during HTML conversion: {}", e.getMessage());
            throw new PdfServiceException("Conversion failed due to unexpected error", e, 500);
        }
    }

    /**
     * Extract text from PDF using PDFBox 3.0.5
     */
    private String extractTextFromPdf(MultipartFile pdfFile) throws IOException {
        try (InputStream inputStream = pdfFile.getInputStream();
             PDDocument document = Loader.loadPDF(inputStream.readAllBytes())) {
            
            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setSortByPosition(true);
            
            String text = stripper.getText(document);
            
            if (text == null || text.trim().isEmpty()) {
                logger.warn("No text extracted from PDF: {}", pdfFile.getOriginalFilename());
                return "No text content found in PDF.";
            }
            
            logger.debug("Extracted {} characters of text from PDF", text.length());
            return text;
        }
    }

    /**
     * Create a Word document using Apache POI
     */
    private byte[] createWordDocument(String text) throws IOException {
        try (XWPFDocument document = new XWPFDocument();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            
            // Split text into paragraphs
            String[] paragraphs = text.split("\n\n|\r\n\r\n");
            
            for (String paragraph : paragraphs) {
                if (paragraph.trim().isEmpty()) continue;
                
                XWPFParagraph p = document.createParagraph();
                XWPFRun run = p.createRun();
                run.setText(paragraph.trim());
            }
            
            // If no paragraphs were created, add the entire text as one paragraph
            if (document.getParagraphs().isEmpty()) {
                XWPFParagraph p = document.createParagraph();
                XWPFRun run = p.createRun();
                run.setText(text);
            }
            
            document.write(out);
            return out.toByteArray();
        }
    }

    /**
     * Create an Excel document using Apache POI
     */
    private byte[] createExcelDocument(String text) throws IOException {
        try (XSSFWorkbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            
            XSSFSheet sheet = workbook.createSheet("PDF Content");
            
            String[] lines = text.split("\n|\r\n");
            
            for (int i = 0; i < Math.min(lines.length, 1000); i++) { // Limit to 1000 rows
                XSSFRow row = sheet.createRow(i);
                XSSFCell cell = row.createCell(0);
                cell.setCellValue(lines[i]);
            }
            
            // Auto-size the column
            sheet.autoSizeColumn(0);
            
            workbook.write(out);
            return out.toByteArray();
        }
    }

    /**
     * Create a PowerPoint document using Apache POI
     */
    private byte[] createPowerPointDocument(String text) throws IOException {
        try (XMLSlideShow ppt = new XMLSlideShow();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            
            // Split text into slides (every 500 characters or at paragraph breaks)
            String[] paragraphs = text.split("\n\n|\r\n\r\n");
            StringBuilder currentSlideText = new StringBuilder();
            
            for (String paragraph : paragraphs) {
                if (currentSlideText.length() + paragraph.length() > 500 && currentSlideText.length() > 0) {
                    createSlide(ppt, currentSlideText.toString());
                    currentSlideText = new StringBuilder();
                }
                currentSlideText.append(paragraph).append("\n\n");
            }
            
            // Add remaining text as final slide
            if (currentSlideText.length() > 0) {
                createSlide(ppt, currentSlideText.toString());
            }
            
            // If no slides were created, add all text as one slide
            if (ppt.getSlides().isEmpty()) {
                createSlide(ppt, text);
            }
            
            ppt.write(out);
            return out.toByteArray();
        }
    }

    /**
     * Helper method to create a slide with text
     */
    private void createSlide(XMLSlideShow ppt, String text) {
        XSLFSlide slide = ppt.createSlide();
        XSLFTextBox textBox = slide.createTextBox();
        XSLFTextParagraph paragraph = textBox.addNewTextParagraph();
        XSLFTextRun run = paragraph.addNewTextRun();
        run.setText(text.trim());
        
        // Position the text box
        textBox.setAnchor(new java.awt.Rectangle(50, 50, 600, 400));
    }

    /**
     * Create an HTML document
     */
    private String createHtmlDocument(String text) {
        StringBuilder html = new StringBuilder();
        html.append("<!DOCTYPE html>\n");
        html.append("<html>\n<head>\n<title>PDF Content</title>\n");
        html.append("<meta charset=\"UTF-8\">\n");
        html.append("<style>body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }</style>\n");
        html.append("</head>\n<body>\n");
        
        // Convert text to HTML paragraphs
        String[] paragraphs = text.split("\n\n|\r\n\r\n");
        for (String paragraph : paragraphs) {
            if (!paragraph.trim().isEmpty()) {
                html.append("<p>").append(escapeHtml(paragraph.trim())).append("</p>\n");
            }
        }
        
        html.append("</body>\n</html>");
        return html.toString();
    }

    /**
     * Escape HTML special characters
     */
    private String escapeHtml(String text) {
        return text.replace("&", "&amp;")
                  .replace("<", "&lt;")
                  .replace(">", "&gt;")
                  .replace("\"", "&quot;")
                  .replace("'", "&#x27;")
                  .replace("\n", "<br>");
    }

    /**
     * Validates the input PDF file based on size and content type.
     */
}