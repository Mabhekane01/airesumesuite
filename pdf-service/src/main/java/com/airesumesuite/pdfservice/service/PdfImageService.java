package com.airesumesuite.pdfservice.service;

import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import javax.imageio.ImageIO;

import org.sejda.sambox.cos.COSName;
import org.sejda.sambox.pdmodel.PDDocument;
import org.sejda.sambox.pdmodel.PDPage;
import org.sejda.sambox.pdmodel.PDPageContentStream;
import org.sejda.sambox.pdmodel.PDResources;
import org.sejda.sambox.pdmodel.graphics.image.PDImageXObject;
import org.sejda.sambox.pdmodel.graphics.state.PDExtendedGraphicsState;
import org.sejda.sambox.rendering.PDFRenderer;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

/**
 * Service for PDF image operations using SAMBox 5.1.13
 */
@Service
public class PdfImageService {

    /**
     * Add image to PDF at specified location
     */
    public byte[] addImage(MultipartFile file, MultipartFile image, float x, float y, 
                          float width, float height, int pageNumber, float opacity) throws IOException {
        
        File tempPdfFile = createTempFile(file);
        File tempImageFile = createTempImageFile(image);
        File outputFile = createTempOutputFile();
        
        try (PDDocument document = PDDocument.load(tempPdfFile)) {
            if (pageNumber > 0 && pageNumber <= document.getNumberOfPages()) {
                PDPage page = document.getPage(pageNumber - 1);
                
                // Create image object from file using correct SAMBox API
                PDImageXObject imageObject = PDImageXObject.createFromFile(tempImageFile.getAbsolutePath());
                
                // Add image to page
                try (PDPageContentStream contentStream = new PDPageContentStream(document, page, 
                                                                                 PDPageContentStream.AppendMode.APPEND, true, true)) {
                    
                    // Set opacity if needed
                    if (opacity < 1.0f) {
                        PDExtendedGraphicsState graphicsState = new PDExtendedGraphicsState();
                        graphicsState.setNonStrokingAlphaConstant(opacity);
                        graphicsState.setStrokingAlphaConstant(opacity);
                        contentStream.setGraphicsStateParameters(graphicsState);
                    }
                    
                    // Draw image
                    contentStream.drawImage(imageObject, x, y, width, height);
                }
            }
            
            document.save(outputFile.getAbsolutePath());
            return fileToByteArray(outputFile);
        } finally {
            cleanupTempFile(tempPdfFile);
            cleanupTempFile(tempImageFile);
            cleanupTempFile(outputFile);
        }
    }

    /**
     * Extract all images from PDF
     */
    public Map<String, Object> extractImages(MultipartFile file) throws IOException {
        File tempFile = createTempFile(file);
        
        try (PDDocument document = PDDocument.load(tempFile)) {
            Map<String, Object> result = new HashMap<>();
            Map<String, byte[]> images = new HashMap<>();
            
            int imageCount = 0;
            
            // Extract images from all pages
            for (int pageIndex = 0; pageIndex < document.getNumberOfPages(); pageIndex++) {
                PDPage page = document.getPage(pageIndex);
                PDResources resources = page.getResources();
                
                if (resources != null) {
                    for (COSName name : resources.getXObjectNames()) {
                        if (resources.isImageXObject(name)) {
                            try {
                                PDImageXObject imageXObject = (PDImageXObject) resources.getXObject(name);
                                BufferedImage image = imageXObject.getImage();
                                
                                // Convert to byte array
                                ByteArrayOutputStream baos = new ByteArrayOutputStream();
                                ImageIO.write(image, "PNG", baos);
                                
                                String imageName = "page_%d_image_%d.png".formatted(pageIndex + 1, imageCount + 1);
                                images.put(imageName, baos.toByteArray());
                                imageCount++;
                            } catch (IOException ioEx) {
                                System.err.println("IO error extracting image: " + ioEx.getMessage());
                            } catch (RuntimeException rEx) {
                                System.err.println("Runtime error extracting image: " + rEx.getMessage());
                            }
                        }
                    }
                }
            }
            
            result.put("success", true);
            result.put("imageCount", imageCount);
            result.put("message", "Image extraction completed using SAMBox 5.1.13");
            result.put("images", images);
            
            return result;
        } finally {
            cleanupTempFile(tempFile);
        }
    }

    /**
     * Convert PDF pages to images using SAMBox renderer
     */
    public Map<String, byte[]> convertPagesToImages(MultipartFile file, String format, int dpi) throws IOException {
        File tempFile = createTempFile(file);
        
        try (PDDocument document = PDDocument.load(tempFile)) {
            PDFRenderer renderer = new PDFRenderer(document);
            Map<String, byte[]> images = new HashMap<>();
            
            for (int pageIndex = 0; pageIndex < document.getNumberOfPages(); pageIndex++) {
                // Render page as image using SAMBox renderer
                BufferedImage pageImage = renderer.renderImageWithDPI(pageIndex, dpi);
                
                // Convert to byte array
                ByteArrayOutputStream imageStream = new ByteArrayOutputStream();
                ImageIO.write(pageImage, format.toLowerCase(), imageStream);
                
                String imageName = "page_%d.%s".formatted(pageIndex + 1, format.toLowerCase());
                images.put(imageName, imageStream.toByteArray());
            }
            
            return images;
        } finally {
            cleanupTempFile(tempFile);
        }
    }

    /**
     * Resize image in PDF - Implementation for finding and resizing existing images
     */
   public byte[] resizeImage(MultipartFile file, int pageNumber, float newWidth, float newHeight,
                           float x, float y) throws IOException {

    File tempFile = createTempFile(file);
    File outputFile = createTempOutputFile();

    try (PDDocument document = PDDocument.load(tempFile)) {
        if (pageNumber > 0 && pageNumber <= document.getNumberOfPages()) {
            PDPage page = document.getPage(pageNumber - 1);
            PDResources resources = page.getResources();

            if (resources != null) {
                PDImageXObject targetImage = null;

                // Locate the first image
                for (COSName name : resources.getXObjectNames()) {
                    if (resources.isImageXObject(name)) {
                        try {
                            targetImage = (PDImageXObject) resources.getXObject(name);
                            break;
                        } catch (IOException ioEx) {
                            System.err.println("Could not access image: " + ioEx.getMessage());
                        }
                    }
                }

                if (targetImage != null) {
                    BufferedImage originalImage = targetImage.getImage();

                    // Create resized version
                    BufferedImage resizedImage = new BufferedImage((int) newWidth, (int) newHeight, BufferedImage.TYPE_INT_RGB);
                    Graphics2D g2d = resizedImage.createGraphics();
                    g2d.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
                    g2d.drawImage(originalImage, 0, 0, (int) newWidth, (int) newHeight, null);
                    g2d.dispose();

                    File resizedImageFile = File.createTempFile("resized_image_", ".png");
                    try {
                        ImageIO.write(resizedImage, "PNG", resizedImageFile);

                        // Sambox method: createFromFile(File)
                        PDImageXObject newImageObject = PDImageXObject.createFromFile(resizedImageFile);

                        // Append the resized image
                        try (PDPageContentStream contentStream = new PDPageContentStream(document, page,
                                PDPageContentStream.AppendMode.APPEND, true, true)) {
                            contentStream.drawImage(newImageObject, x, y, newWidth, newHeight);
                        }
                    } finally {
                        cleanupTempFile(resizedImageFile);
                    }
                }
            }
        }

        document.save(outputFile.getAbsolutePath());
        return fileToByteArray(outputFile);
    } finally {
        cleanupTempFile(tempFile);
        cleanupTempFile(outputFile);
    }
}

    /**
     * Apply filter to image in PDF - Implementation for image filtering
     */
    public byte[] applyImageFilter(MultipartFile file, int pageNumber, String filterType) throws IOException {
        File tempFile = createTempFile(file);
        File outputFile = createTempOutputFile();
        
        try (PDDocument document = PDDocument.load(tempFile)) {
            if (pageNumber > 0 && pageNumber <= document.getNumberOfPages()) {
                PDPage page = document.getPage(pageNumber - 1);
                PDResources resources = page.getResources();
                
                if (resources != null) {
                    // Extract, filter, and replace images
                    List<FilteredImageInfo> filteredImages = new ArrayList<>();
                    
                    for (COSName name : resources.getXObjectNames()) {
                        if (resources.isImageXObject(name)) {
                            try {
                                PDImageXObject imageXObject = (PDImageXObject) resources.getXObject(name);
                                BufferedImage originalImage = imageXObject.getImage();
                                
                                // Apply filter based on filterType
                                BufferedImage filteredImage = applyFilter(originalImage, filterType);
                                
                                // Save filtered image to temp file
                                File filteredImageFile = File.createTempFile("filtered_image_", ".png");
                                ImageIO.write(filteredImage, "PNG", filteredImageFile);
                                
                                filteredImages.add(new FilteredImageInfo(
                                    filteredImageFile, 
                                    originalImage.getWidth(), 
                                    originalImage.getHeight()
                                ));
                                
                            } catch (IOException ioEx) {
                                System.err.println("IO error filtering image: " + ioEx.getMessage());
                            } catch (RuntimeException rEx) {
                                System.err.println("Runtime error filtering image: " + rEx.getMessage());
                            }
                        }
                    }
                    
                    // Add filtered images to the page
                    if (!filteredImages.isEmpty()) {
                        try (PDPageContentStream contentStream = new PDPageContentStream(document, page, 
                                                                                         PDPageContentStream.AppendMode.APPEND, true, true)) {
                            
                            float currentX = 50; // Starting X position
                            float currentY = 700; // Starting Y position
                            
                            for (FilteredImageInfo info : filteredImages) {
                                try {
                                    PDImageXObject filteredImageObject = PDImageXObject.createFromFile(info.file.getAbsolutePath());
                                    
                                    // Scale down if image is too large
                                    float maxWidth = 200;
                                    float maxHeight = 200;
                                    float scaleX = Math.min(1.0f, maxWidth / info.width);
                                    float scaleY = Math.min(1.0f, maxHeight / info.height);
                                    float scale = Math.min(scaleX, scaleY);
                                    
                                    float scaledWidth = info.width * scale;
                                    float scaledHeight = info.height * scale;
                                    
                                    contentStream.drawImage(filteredImageObject, currentX, currentY, scaledWidth, scaledHeight);
                                    
                                    // Move position for next image
                                    currentX += scaledWidth + 10;
                                    if (currentX > 500) { // Wrap to next row
                                        currentX = 50;
                                        currentY -= scaledHeight + 10;
                                    }
                                } finally {
                                    cleanupTempFile(info.file);
                                }
                            }
                        }
                    }
                }
            }
            
            document.save(outputFile.getAbsolutePath());
            return fileToByteArray(outputFile);
        } finally {
            cleanupTempFile(tempFile);
            cleanupTempFile(outputFile);
        }
    }

    // Helper class for filtered image information
    private static class FilteredImageInfo {
        final File file;
        final int width;
        final int height;
        
        FilteredImageInfo(File file, int width, int height) {
            this.file = file;
            this.width = width;
            this.height = height;
        }
    }

    /**
     * Replace image in PDF
     */
    public byte[] replaceImage(MultipartFile file, int pageNumber, MultipartFile newImage, 
                              float x, float y, float width, float height) throws IOException {
        
        File tempPdfFile = createTempFile(file);
        File tempImageFile = createTempImageFile(newImage);
        File outputFile = createTempOutputFile();
        
        try (PDDocument document = PDDocument.load(tempPdfFile)) {
            if (pageNumber > 0 && pageNumber <= document.getNumberOfPages()) {
                PDPage page = document.getPage(pageNumber - 1);
                
                // Create new image object using correct SAMBox API
                PDImageXObject imageObject = PDImageXObject.createFromFile(tempImageFile.getAbsolutePath());
                
                // Add new image (this adds over existing content)
                try (PDPageContentStream contentStream = new PDPageContentStream(document, page, 
                                                                                 PDPageContentStream.AppendMode.APPEND, true, true)) {
                    contentStream.drawImage(imageObject, x, y, width, height);
                }
            }
            
            document.save(outputFile.getAbsolutePath());
            return fileToByteArray(outputFile);
        } finally {
            cleanupTempFile(tempPdfFile);
            cleanupTempFile(tempImageFile);
            cleanupTempFile(outputFile);
        }
    }

    /**
     * Get image information from PDF
     */
    public Map<String, Object> getImageInfo(MultipartFile file) throws IOException {
        File tempFile = createTempFile(file);
        
        try (PDDocument document = PDDocument.load(tempFile)) {
            Map<String, Object> imageInfo = new HashMap<>();
            List<String> formats = new ArrayList<>();
            
            int totalImages = 0;
            long totalSize = 0;
            
            // Analyze images in all pages
            for (int pageIndex = 0; pageIndex < document.getNumberOfPages(); pageIndex++) {
                PDPage page = document.getPage(pageIndex);
                PDResources resources = page.getResources();
                
                if (resources != null) {
                    for (COSName name : resources.getXObjectNames()) {
                        if (resources.isImageXObject(name)) {
                            try {
                                PDImageXObject imageXObject = (PDImageXObject) resources.getXObject(name);
                                totalImages++;
                                
                                // Get image properties - SAMBox doesn't have getSuffix()
                                // Instead, determine format from colorspace or other properties
                                try {
                                    if (imageXObject.getColorSpace() != null) {
                                        String colorSpaceName = imageXObject.getColorSpace().getName();
                                        // Determine format based on color space
                                        if (colorSpaceName.contains("DeviceRGB") || colorSpaceName.contains("RGB")) {
                                            if (!formats.contains("jpeg")) {
                                                formats.add("jpeg");
                                            }
                                        } else if (colorSpaceName.contains("DeviceGray") || colorSpaceName.contains("Gray")) {
                                            if (!formats.contains("png")) {
                                                formats.add("png");
                                            }
                                        } else {
                                            if (!formats.contains("jpeg")) {
                                                formats.add("jpeg"); // Default assumption
                                            }
                                        }
                                    }
                                } catch (IOException ioEx) {
                                    // Could not determine format, skip
                                }
                                
                                // Estimate size (this is approximate)
                                BufferedImage image = imageXObject.getImage();
                                if (image != null) {
                                    totalSize += (long) image.getWidth() * image.getHeight() * 4; // Rough RGBA estimate
                                }
                                
                            } catch (IOException ioEx) {
                                System.err.println("IO error analyzing image: " + ioEx.getMessage());
                            } catch (RuntimeException rEx) {
                                System.err.println("Runtime error analyzing image: " + rEx.getMessage());
                            }
                        }
                    }
                }
            }
            
            imageInfo.put("totalImages", totalImages);
            imageInfo.put("totalSize", totalSize);
            imageInfo.put("formats", formats.toArray(String[]::new));
            imageInfo.put("renderer", "SAMBox 5.1.13");
            
            return imageInfo;
        } finally {
            cleanupTempFile(tempFile);
        }
    }

    /**
     * Compress images in PDF using SAMBox with actual compression implementation
     */
    public byte[] compressImages(MultipartFile file, String quality, int maxDpi) throws IOException {
        File tempFile = createTempFile(file);
        File outputFile = createTempOutputFile();
        
        try (PDDocument document = PDDocument.load(tempFile)) {
            List<CompressedImageInfo> compressedImages = new ArrayList<>();
            
            // Process all pages
            for (int pageIndex = 0; pageIndex < document.getNumberOfPages(); pageIndex++) {
                PDPage page = document.getPage(pageIndex);
                PDResources resources = page.getResources();
                
                if (resources != null) {
                    // Extract and compress images from this page
                    for (COSName name : resources.getXObjectNames()) {
                        if (resources.isImageXObject(name)) {
                            try {
                                PDImageXObject imageXObject = (PDImageXObject) resources.getXObject(name);
                                BufferedImage originalImage = imageXObject.getImage();
                                
                                // Apply compression using the compressImage method
                                BufferedImage compressedImage = compressImage(originalImage, quality, maxDpi);
                                
                                // Save compressed image to temp file
                                File compressedImageFile = File.createTempFile("compressed_image_", ".jpg");
                                ImageIO.write(compressedImage, "JPEG", compressedImageFile);
                                
                                // Store information for later placement
                                compressedImages.add(new CompressedImageInfo(
                                    compressedImageFile,
                                    pageIndex,
                                    originalImage.getWidth(),
                                    originalImage.getHeight()
                                ));
                                
                            } catch (IOException ioEx) {
                                System.err.println("IO error compressing image: " + ioEx.getMessage());
                            } catch (RuntimeException rEx) {
                                System.err.println("Runtime error compressing image: " + rEx.getMessage());
                            }
                        }
                    }
                }
            }
            
            // Add compressed images back to their respective pages
            for (CompressedImageInfo info : compressedImages) {
                PDPage page = document.getPage(info.pageIndex);
                
                try (PDPageContentStream contentStream = new PDPageContentStream(document, page, 
                                                                                 PDPageContentStream.AppendMode.APPEND, true, true)) {
                    
                    PDImageXObject compressedImageObject = PDImageXObject.createFromFile(info.file.getAbsolutePath());
                    
                    // Position the compressed image (you may want to adjust positioning logic)
                    float x = 50; // Default X position
                    float y = 700; // Default Y position
                    
                    // Use original dimensions or scale down if too large
                    float maxPageWidth = page.getMediaBox().getWidth() - 100; // Leave margins
                    float maxPageHeight = page.getMediaBox().getHeight() - 100;
                    
                    float scaleX = Math.min(1.0f, maxPageWidth / info.originalWidth);
                    float scaleY = Math.min(1.0f, maxPageHeight / info.originalHeight);
                    float scale = Math.min(scaleX, scaleY);
                    
                    float displayWidth = info.originalWidth * scale;
                    float displayHeight = info.originalHeight * scale;
                    
                    contentStream.drawImage(compressedImageObject, x, y, displayWidth, displayHeight);
                    
                } finally {
                    cleanupTempFile(info.file);
                }
            }
            
            document.save(outputFile.getAbsolutePath());
            return fileToByteArray(outputFile);
            
        } finally {
            cleanupTempFile(tempFile);
            cleanupTempFile(outputFile);
        }
    }

    // Helper class for compressed image information
    private static class CompressedImageInfo {
        final File file;
        final int pageIndex;
        final int originalWidth;
        final int originalHeight;
        
        CompressedImageInfo(File file, int pageIndex, int originalWidth, int originalHeight) {
            this.file = file;
            this.pageIndex = pageIndex;
            this.originalWidth = originalWidth;
            this.originalHeight = originalHeight;
        }
    }

    /**
     * Convert PDF to single image (all pages combined) using SAMBox renderer
     */
    public byte[] convertToSingleImage(MultipartFile file, String format, int dpi, 
                                      String layout) throws IOException {
        
        File tempFile = createTempFile(file);
        
        try (PDDocument document = PDDocument.load(tempFile)) {
            PDFRenderer renderer = new PDFRenderer(document);
            
            // Calculate combined image dimensions based on layout
            int totalHeight = 0;
            int maxWidth = 0;
            
            // First pass: calculate dimensions using SAMBox renderer
            for (int pageIndex = 0; pageIndex < document.getNumberOfPages(); pageIndex++) {
                BufferedImage pageImage = renderer.renderImageWithDPI(pageIndex, dpi);
                maxWidth = Math.max(maxWidth, pageImage.getWidth());
                totalHeight += pageImage.getHeight();
            }
            
            // Create combined image
            BufferedImage combinedImage = new BufferedImage(maxWidth, totalHeight, BufferedImage.TYPE_INT_RGB);
            Graphics2D g2d = combinedImage.createGraphics();
            g2d.setColor(Color.WHITE);
            g2d.fillRect(0, 0, maxWidth, totalHeight);
            
            // Second pass: draw all pages using SAMBox renderer
            int currentY = 0;
            for (int pageIndex = 0; pageIndex < document.getNumberOfPages(); pageIndex++) {
                BufferedImage pageImage = renderer.renderImageWithDPI(pageIndex, dpi);
                g2d.drawImage(pageImage, 0, currentY, null);
                currentY += pageImage.getHeight();
            }
            
            g2d.dispose();
            
            // Convert to byte array
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            ImageIO.write(combinedImage, format, outputStream);
            return outputStream.toByteArray();
        } finally {
            cleanupTempFile(tempFile);
        }
    }

    // Helper methods following your pattern
    
    private File createTempFile(MultipartFile file) throws IOException {
        File tempFile = File.createTempFile("sambox_pdf_" + UUID.randomUUID(), ".pdf");
        try (FileOutputStream fos = new FileOutputStream(tempFile)) {
            fos.write(file.getBytes());
        }
        return tempFile;
    }
    
    private File createTempImageFile(MultipartFile image) throws IOException {
        String originalFilename = image.getOriginalFilename();
        String extension = originalFilename != null ? 
            originalFilename.substring(originalFilename.lastIndexOf('.')) : ".tmp";
        
        File tempFile = File.createTempFile("sambox_image_" + UUID.randomUUID(), extension);
        try (FileOutputStream fos = new FileOutputStream(tempFile)) {
            fos.write(image.getBytes());
        }
        return tempFile;
    }
    
    private File createTempOutputFile() throws IOException {
        return File.createTempFile("sambox_output_" + UUID.randomUUID(), ".pdf");
    }
    
    private byte[] fileToByteArray(File file) throws IOException {
        return Files.readAllBytes(file.toPath());
    }
    
    private void cleanupTempFile(File file) {
        if (file != null && file.exists()) {
            file.delete();
        }
    }

    /**
     * Apply image compression with quality and DPI settings
     */
    private BufferedImage compressImage(BufferedImage originalImage, String quality, int maxDpi) {
        int originalWidth = originalImage.getWidth();
        int originalHeight = originalImage.getHeight();

        // Calculate scale factor based on maxDpi (assuming 72 DPI as default)
        double scaleFactor = Math.min(1.0, (double) maxDpi / 300.0); // 300 DPI as reference

        // Apply quality-based scaling using rule switch
        scaleFactor *= switch (quality.toLowerCase()) {
            case "low"    -> 0.5;  // 50% of original size
            case "medium" -> 0.75; // 75% of original size
            case "high"   -> 0.9;  // 90% of original size
            default       -> 0.75; // Default to medium quality
        };

        int newWidth = Math.max(1, (int) (originalWidth * scaleFactor));
        int newHeight = Math.max(1, (int) (originalHeight * scaleFactor));

        // Create compressed image
        BufferedImage compressedImage = new BufferedImage(newWidth, newHeight, BufferedImage.TYPE_INT_RGB);
        Graphics2D g2d = compressedImage.createGraphics();

        // Set high-quality rendering hints for better compression
        g2d.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
        g2d.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
        g2d.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);

        g2d.drawImage(originalImage, 0, 0, newWidth, newHeight, null);
        g2d.dispose();

        return compressedImage;
    }

    /**
     * Apply image filter based on type
     */
    private BufferedImage applyFilter(BufferedImage originalImage, String filterType) {
        int width = originalImage.getWidth();
        int height = originalImage.getHeight();
        BufferedImage filteredImage = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);

        switch (filterType.toLowerCase()) {
            case "grayscale" -> {
                for (int x = 0; x < width; x++) {
                    for (int y = 0; y < height; y++) {
                        Color originalColor = new Color(originalImage.getRGB(x, y));
                        int gray = (int) (originalColor.getRed() * 0.299 +
                                          originalColor.getGreen() * 0.587 +
                                          originalColor.getBlue() * 0.114);
                        Color grayColor = new Color(gray, gray, gray);
                        filteredImage.setRGB(x, y, grayColor.getRGB());
                    }
                }
            }
            case "sepia" -> {
                for (int x = 0; x < width; x++) {
                    for (int y = 0; y < height; y++) {
                        Color originalColor = new Color(originalImage.getRGB(x, y));
                        int r = originalColor.getRed();
                        int g = originalColor.getGreen();
                        int b = originalColor.getBlue();

                        int newR = Math.min(255, (int) (r * 0.393 + g * 0.769 + b * 0.189));
                        int newG = Math.min(255, (int) (r * 0.349 + g * 0.686 + b * 0.168));
                        int newB = Math.min(255, (int) (r * 0.272 + g * 0.534 + b * 0.131));

                        Color sepiaColor = new Color(newR, newG, newB);
                        filteredImage.setRGB(x, y, sepiaColor.getRGB());
                    }
                }
            }
            default -> {
                // Return original image if filter not recognized
                return originalImage;
            }
        }

        return filteredImage;
    }
}