package com.airesumesuite.pdfservice.service;

import org.sejda.sambox.pdmodel.PDDocument;
import org.sejda.sambox.pdmodel.PDPage;
import org.sejda.sambox.pdmodel.PDPageContentStream;
import org.sejda.sambox.pdmodel.font.PDType1Font;
import org.sejda.sambox.pdmodel.font.PDFont;
import org.sejda.sambox.pdmodel.graphics.image.PDImageXObject;
import org.sejda.sambox.pdmodel.graphics.state.PDExtendedGraphicsState;
import org.sejda.sambox.util.Matrix;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.awt.*;
import java.io.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

/**
 * Production-ready service for adding watermarks to PDF documents
 * Compatible with SAMBox 5.1.13
 */
@Service
public class PdfWatermarkService {

    private static final Logger logger = LoggerFactory.getLogger(PdfWatermarkService.class);
    
    // Supported image formats
    private static final Set<String> SUPPORTED_IMAGE_FORMATS = new HashSet<>(
        Arrays.asList("jpg", "jpeg", "png", "gif", "bmp", "tiff", "tif")
    );
    
    // Maximum file size (50MB)
    private static final long MAX_FILE_SIZE = 50 * 1024 * 1024;

    /**
     * Add text watermark to PDF with comprehensive validation
     */
    public byte[] addTextWatermark(MultipartFile file, String text, Float x, Float y, 
                                  Float opacity, Float rotation, Float fontSize, 
                                  String color, String fontFamily) throws IOException, IllegalArgumentException {
        
        // Input validation
        validatePdfFile(file);
        validateTextWatermarkParams(text, x, y, opacity, rotation, fontSize, color, fontFamily);
        
        Path tempInputFile = null;
        Path tempOutputFile = null;
        
        try {
            // Create temporary files for SAMBox 5.1.13 compatibility
            tempInputFile = createTempFile(file, "input_", ".pdf");
            tempOutputFile = Files.createTempFile("watermarked_", ".pdf");
            
            try (PDDocument document = PDDocument.load(tempInputFile.toFile())) {
                logger.info("Processing PDF with {} pages for text watermark", document.getNumberOfPages());
                
                // Use all provided parameters with proper defaults
                float finalX = x != null ? x : getDefaultX(document.getPage(0));
                float finalY = y != null ? y : getDefaultY(document.getPage(0));
                float finalOpacity = opacity != null ? opacity : 0.5f;
                float finalRotation = rotation != null ? rotation : 0f;
                float finalFontSize = fontSize != null ? fontSize : 36f;
                String finalColor = color != null ? color : "red";
                String finalFontFamily = fontFamily != null ? fontFamily : "helvetica";
                
                for (PDPage page : document.getPages()) {
                    addTextWatermarkToPage(page, document, text, finalX, finalY, 
                                         finalOpacity, finalRotation, finalFontSize, 
                                         finalColor, finalFontFamily);
                }
                
                document.save(tempOutputFile.toString());
                logger.info("Text watermark applied successfully with parameters: x={}, y={}, opacity={}, rotation={}, fontSize={}, color={}, fontFamily={}", 
                           finalX, finalY, finalOpacity, finalRotation, finalFontSize, finalColor, finalFontFamily);
            }
            
            return Files.readAllBytes(tempOutputFile);
            
        } catch (IOException e) {
            logger.error("Error adding text watermark: {}", e.getMessage(), e);
            throw new IOException("Failed to add text watermark: " + e.getMessage(), e);
        } finally {
            cleanupTempFiles(tempInputFile, tempOutputFile);
        }
    }

    /**
     * Add image watermark to PDF with comprehensive validation
     */
    public byte[] addImageWatermark(MultipartFile file, MultipartFile watermarkImage, 
                                   Float x, Float y, Float width, Float height, 
                                   Float opacity, Float rotation) throws IOException, IllegalArgumentException {
        
        // Input validation
        validatePdfFile(file);
        validateImageWatermarkParams(watermarkImage, x, y, width, height, opacity, rotation);
        
        Path tempInputFile = null;
        Path tempImageFile = null;
        Path tempOutputFile = null;
        
        try {
            // Create temporary files
            tempInputFile = createTempFile(file, "input_", ".pdf");
            tempImageFile = createTempFile(watermarkImage, "watermark_", getImageExtension(watermarkImage));
            tempOutputFile = Files.createTempFile("watermarked_", ".pdf");
            
            try (PDDocument document = PDDocument.load(tempInputFile.toFile())) {
                logger.info("Processing PDF with {} pages for image watermark", document.getNumberOfPages());
                
                // Load image once for all pages
                PDImageXObject image = PDImageXObject.createFromFile(tempImageFile.toFile());
                
                // Use all provided parameters with proper defaults
                float finalX = x != null ? x : getDefaultX(document.getPage(0));
                float finalY = y != null ? y : getDefaultY(document.getPage(0));
                float finalWidth = width != null ? width : Math.min(200f, document.getPage(0).getMediaBox().getWidth() * 0.3f);
                float finalHeight = height != null ? height : Math.min(200f, document.getPage(0).getMediaBox().getHeight() * 0.3f);
                float finalOpacity = opacity != null ? opacity : 0.5f;
                float finalRotation = rotation != null ? rotation : 0f;
                
                for (PDPage page : document.getPages()) {
                    addImageWatermarkToPage(page, document, image, finalX, finalY, 
                                          finalWidth, finalHeight, finalOpacity, finalRotation);
                }
                
                document.save(tempOutputFile.toString());
                logger.info("Image watermark applied successfully with parameters: x={}, y={}, width={}, height={}, opacity={}, rotation={}", 
                           finalX, finalY, finalWidth, finalHeight, finalOpacity, finalRotation);
            }
            
            return Files.readAllBytes(tempOutputFile);
            
        } catch (IOException e) {
            logger.error("Error adding image watermark: {}", e.getMessage(), e);
            throw new IOException("Failed to add image watermark: " + e.getMessage(), e);
        } finally {
            cleanupTempFiles(tempInputFile, tempImageFile, tempOutputFile);
        }
    }

    /**
     * Apply centered watermark to all pages with smart positioning
     */
    public byte[] applyWatermarkToAllPages(MultipartFile file, String text, 
                                          Float opacity, Float rotation, 
                                          String position, Float fontSize, String color) throws IOException {
        
        validatePdfFile(file);
        validateTextWatermarkParams(text, null, null, opacity, rotation, fontSize, color, null);
        
        Path tempInputFile = null;
        Path tempOutputFile = null;
        
        try {
            tempInputFile = createTempFile(file, "input_", ".pdf");
            tempOutputFile = Files.createTempFile("watermarked_", ".pdf");
            
            try (PDDocument document = PDDocument.load(tempInputFile.toFile())) {
                logger.info("Applying watermark to all {} pages", document.getNumberOfPages());
                
                // Use all provided parameters with proper defaults
                float finalOpacity = opacity != null ? opacity : 0.3f;
                float finalRotation = rotation != null ? rotation : 45f;
                String finalPosition = position != null ? position : "center";
                float finalFontSize = fontSize != null ? fontSize : 36f;
                String finalColor = color != null ? color : "lightgray";
                
                for (PDPage page : document.getPages()) {
                    float[] coords = calculateWatermarkPosition(page, finalPosition);
                    float calculatedFontSize = fontSize != null ? finalFontSize : calculateOptimalFontSize(page, text);
                    
                    addTextWatermarkToPage(page, document, text, coords[0], coords[1], 
                                         finalOpacity, finalRotation, calculatedFontSize,
                                         finalColor, "helvetica");
                }
                
                document.save(tempOutputFile.toString());
                logger.info("Watermark applied to all pages successfully with parameters: opacity={}, rotation={}, position={}, fontSize={}, color={}", 
                           finalOpacity, finalRotation, finalPosition, finalFontSize, finalColor);
            }
            
            return Files.readAllBytes(tempOutputFile);
            
        } catch (IOException e) {
            logger.error("Error applying watermark to all pages: {}", e.getMessage(), e);
            throw new IOException("Failed to apply watermark: " + e.getMessage(), e);
        } finally {
            cleanupTempFiles(tempInputFile, tempOutputFile);
        }
    }

    /**
     * Add watermark to specific page range
     */
    public byte[] addWatermarkToPageRange(MultipartFile file, String text, int startPage, int endPage,
                                         Float opacity, Float rotation, String position) throws IOException {
        
        validatePdfFile(file);
        if (startPage < 1 || endPage < startPage) {
            throw new IllegalArgumentException("Invalid page range: start=" + startPage + ", end=" + endPage);
        }
        
        Path tempInputFile = null;
        Path tempOutputFile = null;
        
        try {
            tempInputFile = createTempFile(file, "input_", ".pdf");
            tempOutputFile = Files.createTempFile("watermarked_", ".pdf");
            
            try (PDDocument document = PDDocument.load(tempInputFile.toFile())) {
                int totalPages = document.getNumberOfPages();
                int actualEndPage = Math.min(endPage, totalPages);
                
                logger.info("Applying watermark to pages {}-{} of {}", startPage, actualEndPage, totalPages);
                
                // Use all provided parameters with proper defaults
                float finalOpacity = opacity != null ? opacity : 0.3f;
                float finalRotation = rotation != null ? rotation : 45f;
                String finalPosition = position != null ? position : "center";
                
                for (int i = startPage - 1; i < actualEndPage; i++) {
                    PDPage page = document.getPage(i);
                    float[] coords = calculateWatermarkPosition(page, finalPosition);
                    float calculatedFontSize = calculateOptimalFontSize(page, text);
                    
                    addTextWatermarkToPage(page, document, text, coords[0], coords[1], 
                                         finalOpacity, finalRotation, calculatedFontSize, 
                                         "lightgray", "helvetica");
                }
                
                document.save(tempOutputFile.toString());
                logger.info("Watermark applied to page range {}-{} successfully with parameters: opacity={}, rotation={}, position={}", 
                           startPage, actualEndPage, finalOpacity, finalRotation, finalPosition);
            }
            
            return Files.readAllBytes(tempOutputFile);
            
        } finally {
            cleanupTempFiles(tempInputFile, tempOutputFile);
        }
    }

    /**
     * Add text watermark to specific page with enhanced positioning and styling
     */
    private void addTextWatermarkToPage(PDPage page, PDDocument document, String text, 
                                       float x, float y, float opacity, float rotation, 
                                       float fontSize, String color, String fontFamily) throws IOException {
        
        try (PDPageContentStream contentStream = new PDPageContentStream(document, page, 
                                                                         PDPageContentStream.AppendMode.APPEND, true, true)) {
            
            // Set transparency
            PDExtendedGraphicsState graphicsState = new PDExtendedGraphicsState();
            graphicsState.setNonStrokingAlphaConstant(Math.max(0.1f, Math.min(1.0f, opacity)));
            contentStream.setGraphicsStateParameters(graphicsState);
            
            // Set color
            contentStream.setNonStrokingColor(getColorFromString(color));
            
            // Set font with fallback
            PDFont font = getFontFromFamily(fontFamily);
            contentStream.setFont(font, fontSize);
            
            // Calculate text width for better positioning
            float textWidth = font.getStringWidth(text) / 1000 * fontSize;
            float adjustedX = x - (textWidth / 2); // Center the text
            
            // Apply rotation and position
            contentStream.beginText();
            contentStream.setTextMatrix(Matrix.getRotateInstance(Math.toRadians(rotation), adjustedX, y));
            contentStream.showText(text);
            contentStream.endText();
        }
    }

    /**
     * Add image watermark to specific page with enhanced positioning
     */
    private void addImageWatermarkToPage(PDPage page, PDDocument document, PDImageXObject image, 
                                        float x, float y, float width, float height, 
                                        float opacity, float rotation) throws IOException {
        
        try (PDPageContentStream contentStream = new PDPageContentStream(document, page, 
                                                                         PDPageContentStream.AppendMode.APPEND, true, true)) {
            
            // Set transparency for both stroke and fill
            PDExtendedGraphicsState graphicsState = new PDExtendedGraphicsState();
            float clampedOpacity = Math.max(0.1f, Math.min(1.0f, opacity));
            graphicsState.setNonStrokingAlphaConstant(clampedOpacity);
            graphicsState.setStrokingAlphaConstant(clampedOpacity);
            contentStream.setGraphicsStateParameters(graphicsState);
            
            // Save graphics state
            contentStream.saveGraphicsState();
            
            // Calculate center coordinates for rotation pivot
            float centerX = x - (width / 2);
            float centerY = y - (height / 2);
            
            // Apply transformations - translate to center point, then rotate around center
            contentStream.transform(Matrix.getTranslateInstance(x, y));
            contentStream.transform(Matrix.getRotateInstance(Math.toRadians(rotation), 0, 0));
            contentStream.transform(Matrix.getTranslateInstance(centerX - x, centerY - y));
            
            // Draw image
            contentStream.drawImage(image, 0, 0, width, height);
            
            // Restore graphics state
            contentStream.restoreGraphicsState();
        }
    }

    // Validation methods
    private void validatePdfFile(MultipartFile file) throws IllegalArgumentException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("PDF file is required and cannot be empty");
        }
        
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("File size exceeds maximum allowed size of " + (MAX_FILE_SIZE / 1024 / 1024) + "MB");
        }
        
        String contentType = file.getContentType();
        if (contentType == null || !contentType.equals("application/pdf")) {
            throw new IllegalArgumentException("File must be a PDF document");
        }
    }

    private void validateTextWatermarkParams(String text, Float x, Float y, Float opacity, 
                                           Float rotation, Float fontSize, String color, String fontFamily) {
        if (text == null || text.trim().isEmpty()) {
            throw new IllegalArgumentException("Watermark text cannot be empty");
        }
        
        if (text.length() > 100) {
            throw new IllegalArgumentException("Watermark text cannot exceed 100 characters");
        }
        
        if (x != null && (x < 0 || x > 5000)) {
            throw new IllegalArgumentException("X coordinate must be between 0 and 5000");
        }
        
        if (y != null && (y < 0 || y > 5000)) {
            throw new IllegalArgumentException("Y coordinate must be between 0 and 5000");
        }
        
        if (opacity != null && (opacity < 0.1f || opacity > 1.0f)) {
            throw new IllegalArgumentException("Opacity must be between 0.1 and 1.0");
        }
        
        if (fontSize != null && (fontSize < 8f || fontSize > 144f)) {
            throw new IllegalArgumentException("Font size must be between 8 and 144 points");
        }
        
        if (rotation != null && (rotation < -360f || rotation > 360f)) {
            throw new IllegalArgumentException("Rotation must be between -360 and 360 degrees");
        }
        
        if (color != null && color.trim().isEmpty()) {
            throw new IllegalArgumentException("Color cannot be empty");
        }
        
        if (fontFamily != null && fontFamily.trim().isEmpty()) {
            throw new IllegalArgumentException("Font family cannot be empty");
        }
    }

    private void validateImageWatermarkParams(MultipartFile image, Float x, Float y, Float width, 
                                            Float height, Float opacity, Float rotation) {
        if (image == null || image.isEmpty()) {
            throw new IllegalArgumentException("Watermark image is required");
        }
        
        if (image.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("Image size exceeds maximum allowed size");
        }
        
        String filename = image.getOriginalFilename();
        if (filename == null || !isValidImageFormat(filename)) {
            throw new IllegalArgumentException("Unsupported image format. Supported formats: " + SUPPORTED_IMAGE_FORMATS);
        }
        
        if (x != null && (x < 0 || x > 5000)) {
            throw new IllegalArgumentException("X coordinate must be between 0 and 5000");
        }
        
        if (y != null && (y < 0 || y > 5000)) {
            throw new IllegalArgumentException("Y coordinate must be between 0 and 5000");
        }
        
        if (width != null && width <= 0) {
            throw new IllegalArgumentException("Width must be positive");
        }
        
        if (height != null && height <= 0) {
            throw new IllegalArgumentException("Height must be positive");
        }
        
        if (opacity != null && (opacity < 0.1f || opacity > 1.0f)) {
            throw new IllegalArgumentException("Opacity must be between 0.1 and 1.0");
        }
        
        if (rotation != null && (rotation < -360f || rotation > 360f)) {
            throw new IllegalArgumentException("Rotation must be between -360 and 360 degrees");
        }
    }

    // Utility methods
    private boolean isValidImageFormat(String filename) {
        String extension = getFileExtension(filename).toLowerCase();
        return SUPPORTED_IMAGE_FORMATS.contains(extension);
    }

    private String getFileExtension(String filename) {
        int lastDotIndex = filename.lastIndexOf('.');
        return lastDotIndex > 0 ? filename.substring(lastDotIndex + 1) : "";
    }

    private String getImageExtension(MultipartFile file) {
        String filename = file.getOriginalFilename();
        return filename != null ? "." + getFileExtension(filename) : ".jpg";
    }

    private Path createTempFile(MultipartFile file, String prefix, String suffix) throws IOException {
        Path tempFile = Files.createTempFile(prefix + UUID.randomUUID().toString(), suffix);
        try (InputStream inputStream = file.getInputStream()) {
            Files.copy(inputStream, tempFile, StandardCopyOption.REPLACE_EXISTING);
        }
        return tempFile;
    }

    private void cleanupTempFiles(Path... files) {
        for (Path file : files) {
            if (file != null) {
                try {
                    Files.deleteIfExists(file);
                } catch (IOException e) {
                    logger.warn("Failed to delete temporary file: {}", file, e);
                }
            }
        }
    }

    private float getDefaultX(PDPage page) {
        return page.getMediaBox().getWidth() / 2;
    }

    private float getDefaultY(PDPage page) {
        return page.getMediaBox().getHeight() / 2;
    }

    private float[] calculateWatermarkPosition(PDPage page, String position) {
        float width = page.getMediaBox().getWidth();
        float height = page.getMediaBox().getHeight();
        
        switch (position.toLowerCase()) {
            case "topleft":
                return new float[]{width * 0.2f, height * 0.8f};
            case "topright":
                return new float[]{width * 0.8f, height * 0.8f};
            case "bottomleft":
                return new float[]{width * 0.2f, height * 0.2f};
            case "bottomright":
                return new float[]{width * 0.8f, height * 0.2f};
            case "center":
            default:
                return new float[]{width / 2, height / 2};
        }
    }

    private float calculateOptimalFontSize(PDPage page, String text) {
        float pageWidth = page.getMediaBox().getWidth();
        float pageHeight = page.getMediaBox().getHeight();
        float diagonal = (float) Math.sqrt(pageWidth * pageWidth + pageHeight * pageHeight);
        
        // Calculate font size based on diagonal and text length
        float baseFontSize = diagonal / 20; // Base size
        float textLengthFactor = Math.max(0.5f, 1.0f - (text.length() / 100.0f));
        
        return Math.max(12f, Math.min(72f, baseFontSize * textLengthFactor));
    }

    private PDFont getFontFromFamily(String fontFamily) {
        if (fontFamily == null) {
            return PDType1Font.HELVETICA_BOLD();
        }
        
        switch (fontFamily.toLowerCase()) {
            case "times":
                return PDType1Font.TIMES_BOLD();
            case "courier":
                return PDType1Font.COURIER_BOLD();
            case "symbol":
                return PDType1Font.SYMBOL();
            case "zapfdingbats":
                return PDType1Font.ZAPF_DINGBATS();
            case "helvetica":
            default:
                return PDType1Font.HELVETICA_BOLD();
        }
    }

    /**
     * Enhanced color mapping with more options and hex support
     */
    private Color getColorFromString(String colorName) {
        if (colorName == null) {
            return Color.RED;
        }
        
        // Handle hex colors
        if (colorName.startsWith("#")) {
            try {
                return Color.decode(colorName);
            } catch (NumberFormatException e) {
                logger.warn("Invalid hex color format: {}, using red", colorName);
                return Color.RED;
            }
        }
        
        // Handle named colors
        switch (colorName.toLowerCase()) {
            case "red" -> {
                return Color.RED;
            }
            case "blue" -> {
                return Color.BLUE;
            }
            case "green" -> {
                return Color.GREEN;
            }
            case "yellow" -> {
                return Color.YELLOW;
            }
            case "black" -> {
                return Color.BLACK; 
            }
            case "white" -> {
                return Color.WHITE;
            }
            case "gray", "grey" -> {
                return Color.GRAY;
            }
 case "lightgray", "lightgrey" -> {
     return Color.LIGHT_GRAY;
            }
            case "darkgray", "darkgrey" -> {
                return Color.DARK_GRAY;
            }
 case "orange" -> {
     return Color.ORANGE;
            }
            case "pink" -> {
                return Color.PINK;
            }
 case "cyan" -> {
     return Color.CYAN;
            }
            case "magenta" -> {
                return Color.MAGENTA;
            }
            default -> {
                logger.warn("Unknown color: {}, using red", colorName);
                return Color.RED;
            }
        }
    }
}