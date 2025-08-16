package com.airesumesuite.pdfservice.service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.graphics.color.PDColor;
import org.apache.pdfbox.pdmodel.graphics.color.PDDeviceRGB;
import org.apache.pdfbox.pdmodel.interactive.annotation.PDAnnotationHighlight;
import org.apache.pdfbox.pdmodel.interactive.annotation.PDAnnotationText;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class PdfAnnotationService {

    private PDDocument loadDocument(MultipartFile file) throws IOException {
        File tempFile = File.createTempFile("upload-", ".pdf");
        tempFile.deleteOnExit();
        Files.copy(file.getInputStream(), tempFile.toPath(), StandardCopyOption.REPLACE_EXISTING);
        return Loader.loadPDF(tempFile);
    }

   public byte[] addHighlight(MultipartFile file, float x, float y, float width, float height,
                           int pageNumber, String colorName, float opacity) throws IOException {

    try (PDDocument document = loadDocument(file)) {
        int numPages = document.getNumberOfPages();
        if (pageNumber <= 0 || pageNumber > numPages) {
            throw new IllegalArgumentException("Invalid page number: " + pageNumber);
        }
        PDPage page = document.getPage(pageNumber - 1);

        // Use the concrete Highlight annotation class (PDFBox 3.x)
        PDAnnotationHighlight highlight = new PDAnnotationHighlight();

        PDRectangle position = new PDRectangle(x, y, width, height);
        highlight.setRectangle(position);

        float[] quadPoints = new float[] {
            x,          y + height,      // top-left
            x + width,  y + height,      // top-right
            x,          y,               // bottom-left
            x + width,  y                // bottom-right
        };
        highlight.setQuadPoints(quadPoints);

        highlight.setColor(toPDColor(getColorFromString(colorName)));

        if (opacity >= 0f && opacity <= 1f) {
            highlight.setConstantOpacity(opacity); // inherited from PDAnnotationMarkup
        }

        page.getAnnotations().add(highlight);

        // Ensure appearance streams are generated (important for some viewers)
        highlight.constructAppearances(document);
        // Or: page.getAnnotations().forEach(ann -> ann.constructAppearances(document));

        return saveDocumentToByteArray(document);
    }
}

    public byte[] addTextNote(MultipartFile file, float x, float y, String content,
                              int pageNumber, String author) throws IOException {

        try (PDDocument document = loadDocument(file)) {
            int numPages = document.getNumberOfPages();
            if (pageNumber <= 0 || pageNumber > numPages) {
                throw new IllegalArgumentException("Invalid page number: " + pageNumber);
            }
            PDPage page = document.getPage(pageNumber - 1);

            PDAnnotationText textAnnotation = new PDAnnotationText();

            PDRectangle position = new PDRectangle(x, y, 20f, 20f);
            textAnnotation.setRectangle(position);
            textAnnotation.setContents(content);
            textAnnotation.setTitlePopup(author);
            textAnnotation.setOpen(false);
            textAnnotation.setName(PDAnnotationText.NAME_NOTE);

            textAnnotation.setColor(toPDColor(Color.YELLOW));

            page.getAnnotations().add(textAnnotation);

            return saveDocumentToByteArray(document);
        }
    }

    public byte[] addDrawing(MultipartFile file, String drawingData, int pageNumber,
                             String colorName, float strokeWidth) throws IOException {

        try (PDDocument document = loadDocument(file)) {
            int numPages = document.getNumberOfPages();
            if (pageNumber <= 0 || pageNumber > numPages) {
                throw new IllegalArgumentException("Invalid page number: " + pageNumber);
            }
            PDPage page = document.getPage(pageNumber - 1);

            try (PDPageContentStream contentStream = new PDPageContentStream(
                    document, page, PDPageContentStream.AppendMode.APPEND, true)) {

                contentStream.setStrokingColor(toPDColor(getColorFromString(colorName)));
                contentStream.setLineWidth(strokeWidth);

                contentStream.moveTo(100f, 100f);
                contentStream.lineTo(200f, 150f);
                contentStream.lineTo(150f, 200f);
                contentStream.stroke();
            }

            return saveDocumentToByteArray(document);
        }
    }

    public byte[] addRectangle(MultipartFile file, float x, float y, float width, float height,
                               int pageNumber, String colorName, float strokeWidth) throws IOException {

        try (PDDocument document = loadDocument(file)) {
            int numPages = document.getNumberOfPages();
            if (pageNumber <= 0 || pageNumber > numPages) {
                throw new IllegalArgumentException("Invalid page number: " + pageNumber);
            }
            PDPage page = document.getPage(pageNumber - 1);

            try (PDPageContentStream contentStream = new PDPageContentStream(
                    document, page, PDPageContentStream.AppendMode.APPEND, true)) {

                contentStream.setStrokingColor(toPDColor(getColorFromString(colorName)));
                contentStream.setLineWidth(strokeWidth);

                contentStream.addRect(x, y, width, height);
                contentStream.stroke();
            }

            return saveDocumentToByteArray(document);
        }
    }

    public byte[] addCircle(MultipartFile file, float centerX, float centerY, float radius,
                            int pageNumber, String colorName, float strokeWidth) throws IOException {

        try (PDDocument document = loadDocument(file)) {
            int numPages = document.getNumberOfPages();
            if (pageNumber <= 0 || pageNumber > numPages) {
                throw new IllegalArgumentException("Invalid page number: " + pageNumber);
            }
            PDPage page = document.getPage(pageNumber - 1);

            try (PDPageContentStream contentStream = new PDPageContentStream(
                    document, page, PDPageContentStream.AppendMode.APPEND, true)) {

                contentStream.setStrokingColor(toPDColor(getColorFromString(colorName)));
                contentStream.setLineWidth(strokeWidth);

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

    private PDColor toPDColor(Color color) {
        float[] components = new float[]{
                color.getRed() / 255f,
                color.getGreen() / 255f,
                color.getBlue() / 255f
        };
        return new PDColor(components, PDDeviceRGB.INSTANCE);
    }

    private Color getColorFromString(String colorName) {
        return switch (colorName == null ? "" : colorName.toLowerCase()) {
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

    private byte[] saveDocumentToByteArray(PDDocument document) throws IOException {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            document.save(baos);
            return baos.toByteArray();
        }
    }
}
