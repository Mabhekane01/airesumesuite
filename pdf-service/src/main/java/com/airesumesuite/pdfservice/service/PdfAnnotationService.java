package com.airesumesuite.pdfservice.service;
import java.awt.Color;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import org.sejda.sambox.pdmodel.PDDocument;
import org.sejda.sambox.pdmodel.PDPage;
import org.sejda.sambox.pdmodel.PDPageContentStream;
import org.sejda.sambox.pdmodel.common.PDRectangle;
import org.sejda.sambox.pdmodel.graphics.color.PDColor;
import org.sejda.sambox.pdmodel.graphics.color.PDDeviceRGB;
import org.sejda.sambox.pdmodel.interactive.annotation.PDAnnotationText;
import org.sejda.sambox.pdmodel.interactive.annotation.PDAnnotationTextMarkup;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

/**
 * Service for adding annotations to PDF documents
 */
@Service
public class PdfAnnotationService {

    // Helper: load PDDocument from MultipartFile (copy to temp file since load(InputStream) removed)
    private PDDocument loadDocument(MultipartFile file) throws IOException {
        File tempFile = File.createTempFile("upload-", ".pdf");
        tempFile.deleteOnExit();
        Files.copy(file.getInputStream(), tempFile.toPath(), java.nio.file.StandardCopyOption.REPLACE_EXISTING);
        return PDDocument.load(tempFile);
    }

    /**
     * Add highlight annotation
     */
    public byte[] addHighlight(MultipartFile file, float x, float y, float width, float height,
                               int pageNumber, String colorName, float opacity) throws IOException {

        try (PDDocument document = loadDocument(file)) {
            int numPages = document.getNumberOfPages();
            if (pageNumber <= 0 || pageNumber > numPages) {
                throw new IllegalArgumentException("Invalid page number: " + pageNumber);
            }
            PDPage page = document.getPage(pageNumber - 1);

            // Create highlight annotation - PDAnnotationTextMarkup with subtype Highlight
            PDAnnotationTextMarkup highlight = new PDAnnotationTextMarkup(PDAnnotationTextMarkup.SUB_TYPE_HIGHLIGHT);

            PDRectangle position = new PDRectangle(x, y, width, height);
            highlight.setRectangle(position);

            // Set QuadPoints (required for highlight)
            float[] quadPoints = new float[]{
                    x, y + height,          // top-left
                    x + width, y + height,  // top-right
                    x, y,                   // bottom-left
                    x + width, y            // bottom-right
            };
            highlight.setQuadPoints(quadPoints);

            // Set color (convert java.awt.Color to PDColor)
            highlight.setColor(toPDColor(getColorFromString(colorName)));

            // NOTE: opacity / graphics state is NOT supported on annotation in this API version
            // So opacity parameter is currently ignored for highlight annotation.

            page.getAnnotations().add(highlight);

            return saveDocumentToByteArray(document);
        }
    }

    /**
     * Add text note annotation
     */
    public byte[] addTextNote(MultipartFile file, float x, float y, String content,
                              int pageNumber, String author) throws IOException {

        try (PDDocument document = loadDocument(file)) {
            int numPages = document.getNumberOfPages();
            if (pageNumber <= 0 || pageNumber > numPages) {
                throw new IllegalArgumentException("Invalid page number: " + pageNumber);
            }
            PDPage page = document.getPage(pageNumber - 1);

            PDAnnotationText textAnnotation = new PDAnnotationText();

            PDRectangle position = new PDRectangle(x, y, 20, 20);
            textAnnotation.setRectangle(position);
            textAnnotation.setContents(content);
            textAnnotation.setTitlePopup(author);
            textAnnotation.setOpen(false);
            textAnnotation.setName(PDAnnotationText.NAME_NOTE); // icon

            // Set yellow color for note annotations
            textAnnotation.setColor(toPDColor(Color.YELLOW));

            page.getAnnotations().add(textAnnotation);

            return saveDocumentToByteArray(document);
        }
    }

    /**
     * Add drawing annotation (simplified)
     */
    public byte[] addDrawing(MultipartFile file, String drawingData, int pageNumber,
                             String colorName, float strokeWidth) throws IOException {

        try (PDDocument document = loadDocument(file)) {
            int numPages = document.getNumberOfPages();
            if (pageNumber <= 0 || pageNumber > numPages) {
                throw new IllegalArgumentException("Invalid page number: " + pageNumber);
            }
            PDPage page = document.getPage(pageNumber - 1);

            try (PDPageContentStream contentStream = new PDPageContentStream(document, page,
                    PDPageContentStream.AppendMode.APPEND, true, true)) {

                contentStream.setStrokingColor(toPDColor(getColorFromString(colorName)));
                contentStream.setLineWidth(strokeWidth);

                // Simple drawing example (replace with actual path parsing from drawingData)
                contentStream.moveTo(100, 100);
                contentStream.lineTo(200, 150);
                contentStream.lineTo(150, 200);
                contentStream.stroke();
            }

            return saveDocumentToByteArray(document);
        }
    }

    /**
     * Add rectangle annotation (drawing rectangle shape on page)
     */
    public byte[] addRectangle(MultipartFile file, float x, float y, float width, float height,
                               int pageNumber, String colorName, float strokeWidth) throws IOException {

        try (PDDocument document = loadDocument(file)) {
            int numPages = document.getNumberOfPages();
            if (pageNumber <= 0 || pageNumber > numPages) {
                throw new IllegalArgumentException("Invalid page number: " + pageNumber);
            }
            PDPage page = document.getPage(pageNumber - 1);

            try (PDPageContentStream contentStream = new PDPageContentStream(document, page,
                    PDPageContentStream.AppendMode.APPEND, true, true)) {

                contentStream.setStrokingColor(toPDColor(getColorFromString(colorName)));
                contentStream.setLineWidth(strokeWidth);

                contentStream.addRect(x, y, width, height);
                contentStream.stroke();
            }

            return saveDocumentToByteArray(document);
        }
    }

    /**
     * Add circle annotation (approximated with Bezier curves)
     */
    public byte[] addCircle(MultipartFile file, float centerX, float centerY, float radius,
                            int pageNumber, String colorName, float strokeWidth) throws IOException {

        try (PDDocument document = loadDocument(file)) {
            int numPages = document.getNumberOfPages();
            if (pageNumber <= 0 || pageNumber > numPages) {
                throw new IllegalArgumentException("Invalid page number: " + pageNumber);
            }
            PDPage page = document.getPage(pageNumber - 1);

            try (PDPageContentStream contentStream = new PDPageContentStream(document, page,
                    PDPageContentStream.AppendMode.APPEND, true, true)) {

                contentStream.setStrokingColor(toPDColor(getColorFromString(colorName)));
                contentStream.setLineWidth(strokeWidth);

                // Bezier control point offset for circle approximation
                float k = 0.552284749831f;

                contentStream.moveTo(centerX, centerY + radius);
                contentStream.curveTo(centerX + k * radius, centerY + radius,
                        centerX + radius, centerY + k * radius,
                        centerX + radius, centerY);
                contentStream.curveTo(centerX + radius, centerY - k * radius,
                        centerX + k * radius, centerY - radius,
                        centerX, centerY - radius);
                contentStream.curveTo(centerX - k * radius, centerY - radius,
                        centerX - radius, centerY - k * radius,
                        centerX - radius, centerY);
                contentStream.curveTo(centerX - radius, centerY + k * radius,
                        centerX - k * radius, centerY + radius,
                        centerX, centerY + radius);
                contentStream.stroke();
            }

            return saveDocumentToByteArray(document);
        }
    }

    // Convert java.awt.Color to PDColor with DeviceRGB colorspace
    private PDColor toPDColor(Color color) {
        float[] components = new float[]{
                color.getRed() / 255f,
                color.getGreen() / 255f,
                color.getBlue() / 255f
        };
        return new PDColor(components, PDDeviceRGB.INSTANCE);
    }

    // Map color names to java.awt.Color
   // Map color names to java.awt.Color
private Color getColorFromString(String colorName) {
    return switch (colorName.toLowerCase()) {
        case "red" -> Color.RED;
        case "blue" -> Color.BLUE;
        case "green" -> Color.GREEN;
        case "yellow" -> Color.YELLOW;
        case "black" -> Color.BLACK;
        case "white" -> Color.WHITE;
        case "gray", "grey" -> Color.GRAY;
        case "orange" -> Color.ORANGE;
        case "pink" -> Color.PINK;
        case "cyan" -> Color.CYAN;
        case "magenta" -> Color.MAGENTA;
        default -> Color.BLACK;
    };
}

    // Save document to byte array for return - FIXED for latest SAMBox
    private byte[] saveDocumentToByteArray(PDDocument document) throws IOException {
        // Create a temporary file to save the document
        Path tempFile = Files.createTempFile("pdf-output-", ".pdf");
        try {
            // Save document to the temporary file (latest SAMBox expects file path)
            document.save(tempFile.toString());
            
            // Read the file content into byte array
            byte[] pdfBytes = Files.readAllBytes(tempFile);
            
            return pdfBytes;
        } finally {
            // Clean up the temporary file
            Files.deleteIfExists(tempFile);
        }
    }
}