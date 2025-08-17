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

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.cos.COSName;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.PDResources;
import org.apache.pdfbox.pdmodel.common.PDStream;
import org.apache.pdfbox.pdmodel.graphics.PDXObject;
import org.apache.pdfbox.pdmodel.graphics.image.JPEGFactory;
import org.apache.pdfbox.pdmodel.graphics.image.LosslessFactory;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.apache.pdfbox.pdmodel.graphics.state.PDExtendedGraphicsState;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

/**
 * Service for PDF image operations migrated to Apache PDFBox 3.0.5
 *
 * This is a full class conversion of the original SAMBox-based implementation.
 * Methods:
 *  - addImage
 *  - extractImages
 *  - convertPagesToImages
 *  - resizeImage
 *  - applyImageFilter
 *  - replaceImage
 *  - getImageInfo
 *  - compressImages
 *  - convertToSingleImage
 *
 * Helper methods included for temp file management and image transforms.
 */
@Service
public class PdfImageService {

    private static final Logger log = LoggerFactory.getLogger(PdfImageService.class);

    /**
     * Add image to PDF at specified location
     */
    public byte[] addImage(MultipartFile file, MultipartFile image, float x, float y,
                           float width, float height, int pageNumber, float opacity) throws IOException {

        File tempPdfFile = createTempFile(file);
        File tempImageFile = createTempImageFile(image);
        File outputFile = createTempOutputFile();

        try (PDDocument document = Loader.loadPDF(tempPdfFile, (String) null)) {
            if (pageNumber > 0 && pageNumber <= document.getNumberOfPages()) {
                PDPage page = document.getPage(pageNumber - 1);

                // Create image XObject using PDFBox API
                PDImageXObject imageObject = createPDImageFromFile(tempImageFile, document);

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

            // Save document
            document.save(outputFile);
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

        try (PDDocument document = Loader.loadPDF(tempFile, (String) null)) {
            Map<String, Object> result = new HashMap<>();
            Map<String, byte[]> images = new HashMap<>();

            int imageCount = 0;

            // Extract images from all pages
            for (int pageIndex = 0; pageIndex < document.getNumberOfPages(); pageIndex++) {
                PDPage page = document.getPage(pageIndex);
                PDResources resources = page.getResources();

                if (resources != null) {
                    for (COSName name : resources.getXObjectNames()) {
                        try {
                            PDXObject xobject = resources.getXObject(name);
                            if (xobject instanceof PDImageXObject imageXObject) {
                                BufferedImage image = imageXObject.getImage();

                                // Convert to byte array
                                ByteArrayOutputStream baos = new ByteArrayOutputStream();
                                ImageIO.write(image, "PNG", baos);

                                String imageName = String.format("page_%d_image_%d.png", pageIndex + 1, imageCount + 1);
                                images.put(imageName, baos.toByteArray());
                                imageCount++;
                            }
                        } catch (IOException ioEx) {
                            // log and continue - do not fail entire extraction
                            log.error("IO error extracting image on page {}: {}", pageIndex + 1, ioEx.getMessage(), ioEx);
                        } catch (RuntimeException rEx) {
                            log.error("Runtime error extracting image on page {}: {}", pageIndex + 1, rEx.getMessage(), rEx);
                        }
                    }
                }
            }

            result.put("success", true);
            result.put("imageCount", imageCount);
            result.put("message", "Image extraction completed using PDFBox 3.0.5");
            result.put("images", images);

            return result;
        } finally {
            cleanupTempFile(tempFile);
        }
    }

    /**
     * Convert PDF pages to images using PDFBox renderer
     */
    public Map<String, byte[]> convertPagesToImages(MultipartFile file, String format, int dpi) throws IOException {
        File tempFile = createTempFile(file);

        try (PDDocument document = Loader.loadPDF(tempFile, (String) null)) {
            PDFRenderer renderer = new PDFRenderer(document);
            Map<String, byte[]> images = new HashMap<>();

            for (int pageIndex = 0; pageIndex < document.getNumberOfPages(); pageIndex++) {
                // Render page as image using PDFBox renderer
                BufferedImage pageImage = renderer.renderImageWithDPI(pageIndex, dpi);

                // Convert to byte array
                ByteArrayOutputStream imageStream = new ByteArrayOutputStream();
                ImageIO.write(pageImage, format.toLowerCase(), imageStream);

                String imageName = String.format("page_%d.%s", pageIndex + 1, format.toLowerCase());
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

        try (PDDocument document = Loader.loadPDF(tempFile, (String) null)) {
            if (pageNumber > 0 && pageNumber <= document.getNumberOfPages()) {
                PDPage page = document.getPage(pageNumber - 1);
                PDResources resources = page.getResources();

                if (resources != null) {
                    PDImageXObject targetImage = null;
                    COSName targetName = null;

                    // Locate the first image
                    for (COSName name : resources.getXObjectNames()) {
                        try {
                            PDXObject xobj = resources.getXObject(name);
                            if (xobj instanceof PDImageXObject pDImageXObject) {
                                targetImage = pDImageXObject;
                                targetName = name;
                                break;
                            }
                        } catch (IOException ioEx) {
                            System.err.println("Could not access image resource: " + ioEx.getMessage());
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

                        // Create PDImageXObject from resized BufferedImage
                        PDImageXObject newImageObject = LosslessFactory.createFromImage(document, resizedImage);

                        // If the goal is to replace the image resource (so all usages update),
                        // we can put the new image into the resources under the same COSName.
                        // Otherwise, we overlay the resized image on the page at x,y.
                        if (targetName != null) {
                            resources.put(targetName, newImageObject);
                        }

                        // Append the resized image visually (in case original placement differs)
                        try (PDPageContentStream contentStream = new PDPageContentStream(document, page,
                                PDPageContentStream.AppendMode.APPEND, true, true)) {
                            contentStream.drawImage(newImageObject, x, y, newWidth, newHeight);
                        }
                    }
                }
            }

            document.save(outputFile);
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

        try (PDDocument document = Loader.loadPDF(tempFile, (String) null)) {
            if (pageNumber > 0 && pageNumber <= document.getNumberOfPages()) {
                PDPage page = document.getPage(pageNumber - 1);
                PDResources resources = page.getResources();

                if (resources != null) {
                    // Extract, filter, and replace images
                    List<FilteredImageInfo> filteredImages = new ArrayList<>();

                    for (COSName name : resources.getXObjectNames()) {
                        try {
                            PDXObject xobj = resources.getXObject(name);
                            if (xobj instanceof PDImageXObject imageXObject) {
                                BufferedImage originalImage = imageXObject.getImage();

                                // Apply filter based on filterType
                                BufferedImage filteredImage = applyFilter(originalImage, filterType);

                                // Save filtered image to temp file
                                File filteredImageFile = File.createTempFile("filtered_image_", ".png");
                                ImageIO.write(filteredImage, "PNG", filteredImageFile);

                                filteredImages.add(new FilteredImageInfo(filteredImageFile, originalImage.getWidth(), originalImage.getHeight()));
                            }
                        } catch (IOException ioEx) {
                            log.error("IO error filtering image: {}", ioEx.getMessage(), ioEx);
                        } catch (RuntimeException rEx) {
                            log.error("Runtime error filtering image: {}", rEx.getMessage(), rEx);
                        }
                    }

                    // Add filtered images to the page (overlay)
                    if (!filteredImages.isEmpty()) {
                        try (PDPageContentStream contentStream = new PDPageContentStream(document, page,
                                PDPageContentStream.AppendMode.APPEND, true, true)) {

                            float currentX = 50; // Starting X position
                            float currentY = 700; // Starting Y position

                            for (FilteredImageInfo info : filteredImages) {
                                try {
                                    PDImageXObject filteredImageObject = createPDImageFromFile(info.file, document);

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

            document.save(outputFile);
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

        try (PDDocument document = Loader.loadPDF(tempPdfFile, (String) null)) {
            if (pageNumber > 0 && pageNumber <= document.getNumberOfPages()) {
                PDPage page = document.getPage(pageNumber - 1);
                PDResources resources = page.getResources();

                // Create new image object using PDFBox API
                PDImageXObject imageObject = createPDImageFromFile(tempImageFile, document);

                // Strategy: attempt to replace first image resource encountered, else append.
                boolean replaced = false;

                if (resources != null) {
                    for (COSName name : resources.getXObjectNames()) {
                        try {
                            PDXObject xobj = resources.getXObject(name);
                            if (xobj instanceof PDImageXObject) {
                                // Overwrite resource so other appearances update
                                resources.put(name, imageObject);
                                replaced = true;
                                break;
                            }
                        } catch (IOException ioEx) {
                            log.error("Error accessing resource while replacing: {}", ioEx.getMessage(), ioEx);
                        }
                    }
                }

                // If not replaced (no image resources), just append the new image (overlay)
                if (!replaced) {
                    try (PDPageContentStream contentStream = new PDPageContentStream(document, page,
                            PDPageContentStream.AppendMode.APPEND, true, true)) {
                        contentStream.drawImage(imageObject, x, y, width, height);
                    }
                }
            }

            document.save(outputFile);
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

        try (PDDocument document = Loader.loadPDF(tempFile, (String) null)) {
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
                        try {
                            PDXObject xobj = resources.getXObject(name);
                            if (xobj instanceof PDImageXObject imageXObject) {
                                totalImages++;

                                // Determine basic format using an educated guess:
                                String format = determineImageFormat(imageXObject);
                                if (!formats.contains(format)) {
                                    formats.add(format);
                                }

                                // Estimate size (approximate RGBA bytes)
                                BufferedImage image = imageXObject.getImage();
                                if (image != null) {
                                    totalSize += (long) image.getWidth() * image.getHeight() * 4;
                                }
                            }
                        } catch (IOException ioEx) {
                            System.err.println("IO error analyzing image: " + ioEx.getMessage());
                        } catch (RuntimeException rEx) {
                            System.err.println("Runtime error analyzing image: " + rEx.getMessage());
                        }
                    }
                }
            }

            imageInfo.put("totalImages", totalImages);
            imageInfo.put("totalSize", totalSize);
            imageInfo.put("formats", formats.toArray(String[]::new));
            imageInfo.put("renderer", "PDFBox 3.0.5");

            return imageInfo;
        } finally {
            cleanupTempFile(tempFile);
        }
    }

    /**
     * Compress images in PDF using PDFBox: extracts images, compresses them (JPEG),
     * and places compressed versions on pages as overlays. This is a simple approach
     * (overlay) and not a full in-place stream replacement for arbitrary XObjects.
     *
     * quality -> "low", "medium", "high" (maps to JPEG quality approx.)
     * maxDpi -> used to scale images down if they exceed effective DPI threshold.
     */
    public byte[] compressImages(MultipartFile file, String quality, int maxDpi) throws IOException {
        File tempFile = createTempFile(file);
        File outputFile = createTempOutputFile();

        try (PDDocument document = Loader.loadPDF(tempFile, (String) null)) {
            List<CompressedImageInfo> compressedImages = new ArrayList<>();

            // Process all pages: extract images, compress and store as temporary files
            for (int pageIndex = 0; pageIndex < document.getNumberOfPages(); pageIndex++) {
                PDPage page = document.getPage(pageIndex);
                PDResources resources = page.getResources();

                if (resources != null) {
                    for (COSName name : resources.getXObjectNames()) {
                        try {
                            PDXObject xobj = resources.getXObject(name);
                            if (xobj instanceof PDImageXObject imageXObject) {
                                BufferedImage originalImage = imageXObject.getImage();

                                // Apply compression logic
                                BufferedImage compressedImage = compressImage(originalImage, quality, maxDpi);

                                // Save compressed image to temp file as JPEG
                                File compressedImageFile = File.createTempFile("compressed_image_", ".jpg");
                                try (FileOutputStream fos = new FileOutputStream(compressedImageFile)) {
                                    // Use ImageIO to write JPEG (control quality via params if needed)
                                    ImageIO.write(compressedImage, "JPEG", fos);
                                }

                                // Store info for later placement
                                compressedImages.add(new CompressedImageInfo(compressedImageFile, pageIndex, originalImage.getWidth(), originalImage.getHeight()));
                            }
                        } catch (IOException ioEx) {
                            System.err.println("IO error compressing image: " + ioEx.getMessage());
                        } catch (RuntimeException rEx) {
                            System.err.println("Runtime error compressing image: " + rEx.getMessage());
                        }
                    }
                }
            }

            // Add compressed images back to their respective pages (overlay placement)
            for (CompressedImageInfo info : compressedImages) {
                PDPage page = document.getPage(info.pageIndex);

                try (PDPageContentStream contentStream = new PDPageContentStream(document, page,
                        PDPageContentStream.AppendMode.APPEND, true, true)) {

                    PDImageXObject compressedImageObject = createPDImageFromFile(info.file, document);

                    // Position the compressed image (simple placement logic)
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

            document.save(outputFile);
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
     * Convert PDF to single image (all pages combined) using PDFBox renderer
     */
    public byte[] convertToSingleImage(MultipartFile file, String format, int dpi,
                                       String layout) throws IOException {

        File tempFile = createTempFile(file);

        try (PDDocument document = Loader.loadPDF(tempFile, (String) null)) {
            PDFRenderer renderer = new PDFRenderer(document);

            // Calculate combined image dimensions based on layout
            int totalHeight = 0;
            int maxWidth = 0;

            // First pass: calculate dimensions
            List<BufferedImage> pageImages = new ArrayList<>(document.getNumberOfPages());
            for (int pageIndex = 0; pageIndex < document.getNumberOfPages(); pageIndex++) {
                BufferedImage pageImage = renderer.renderImageWithDPI(pageIndex, dpi);
                pageImages.add(pageImage);
                maxWidth = Math.max(maxWidth, pageImage.getWidth());
                totalHeight += pageImage.getHeight();
            }

            // Create combined image (single column stacked vertically)
            BufferedImage combinedImage = new BufferedImage(maxWidth, totalHeight, BufferedImage.TYPE_INT_RGB);
            Graphics2D g2d = combinedImage.createGraphics();
            g2d.setColor(Color.WHITE);
            g2d.fillRect(0, 0, maxWidth, totalHeight);

            // Draw all pages
            int currentY = 0;
            for (BufferedImage pageImage : pageImages) {
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

    // ----------------------- Helper methods -----------------------

    private File createTempFile(MultipartFile file) throws IOException {
        File tempFile = File.createTempFile("pdfbox_pdf_" + UUID.randomUUID(), ".pdf");
        try (FileOutputStream fos = new FileOutputStream(tempFile)) {
            fos.write(file.getBytes());
        }
        return tempFile;
    }

    private File createTempImageFile(MultipartFile image) throws IOException {
        String originalFilename = image.getOriginalFilename();
        String extension = ".tmp";
        if (originalFilename != null && originalFilename.lastIndexOf('.') >= 0) {
            extension = originalFilename.substring(originalFilename.lastIndexOf('.'));
        }
        File tempFile = File.createTempFile("pdfbox_image_" + UUID.randomUUID(), extension);
        try (FileOutputStream fos = new FileOutputStream(tempFile)) {
            fos.write(image.getBytes());
        }
        return tempFile;
    }

    private File createTempOutputFile() throws IOException {
        return File.createTempFile("pdfbox_output_" + UUID.randomUUID(), ".pdf");
    }

    private byte[] fileToByteArray(File file) throws IOException {
        return Files.readAllBytes(file.toPath());
    }

    private void cleanupTempFile(File file) {
        if (file != null && file.exists()) {
            try {
                file.delete();
            } catch (Exception ignored) {
            }
        }
    }

    /**
     * Apply image compression with quality and DPI settings
     */
    private BufferedImage compressImage(BufferedImage originalImage, String quality, int maxDpi) {
        if (originalImage == null) return originalImage;

        int originalWidth = originalImage.getWidth();
        int originalHeight = originalImage.getHeight();

        // Basic heuristics: scale down if requested maxDpi is lower than some baseline
        // Assume baseline 300 DPI for original images (if not known).
        double dpiScale = 1.0;
        if (maxDpi > 0) {
            dpiScale = Math.min(1.0, (double) maxDpi / 300.0);
        }

        double qualityScale;
        switch (quality == null ? "" : quality.toLowerCase()) {
            case "low" -> qualityScale = 0.5;
            case "medium" -> qualityScale = 0.75;
            case "high" -> qualityScale = 0.9;
            default -> qualityScale = 0.75;
        }

        double finalScale = dpiScale * qualityScale;
        int newWidth = Math.max(1, (int) (originalWidth * finalScale));
        int newHeight = Math.max(1, (int) (originalHeight * finalScale));

        BufferedImage compressedImage = new BufferedImage(newWidth, newHeight, BufferedImage.TYPE_INT_RGB);
        Graphics2D g2d = compressedImage.createGraphics();

        // Set rendering hints for quality
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
        if (originalImage == null) return null;

        int width = originalImage.getWidth();
        int height = originalImage.getHeight();
        BufferedImage filteredImage = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);

        if (filterType == null) {
            return originalImage;
        }

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
                // Unknown filter: return original
                return originalImage;
            }
        }

        return filteredImage;
    }

    /**
     * Helper: create PDImageXObject from a file in a way that supports many image types.
     * Uses createFromFileByExtension when possible, and falls back to reading the image and
     * using LosslessFactory (for formats that need BufferedImage).
     */
    private PDImageXObject createPDImageFromFile(File imageFile, PDDocument document) throws IOException {
        if (imageFile == null || !imageFile.exists()) {
            throw new IOException("Image file does not exist: " + imageFile);
        }

        // Try createFromFileByExtension (handles typical formats)
        try {
            return PDImageXObject.createFromFileByExtension(imageFile, document);
        } catch (IOException e) {
            // Fallback: read into BufferedImage and use LosslessFactory or JPEGFactory
            BufferedImage img = ImageIO.read(imageFile);
            if (img == null) {
                throw new IOException("Could not decode image: " + imageFile.getAbsolutePath(), e);
            }

            // If image has alpha channel, use LosslessFactory to preserve alpha.
            if (img.getColorModel().hasAlpha()) {
                return LosslessFactory.createFromImage(document, img);
            } else {
                // For non-alpha images we can use JPEGFactory to produce a JPEG-based XObject which is smaller.
                try {
                    return JPEGFactory.createFromImage(document, img);
                } catch (IOException jpegEx) {
                    // If JPEGFactory fails, fall back to lossless
                    return LosslessFactory.createFromImage(document, img);
                }
            }
        }
    }

    /**
     * Determine a best-effort image format label for a PDImageXObject.
     * PDFBox doesn't always report a 'suffix'; so we rely on color/filters hints.
     */
    private String determineImageFormat(PDImageXObject imageXObject) throws IOException {
        if (imageXObject == null) return "unknown";
        // If we have a name or suffix via PDStream / filters, attempt to guess.
        PDStream stream = imageXObject.getStream();
        if (stream != null && stream.getFilters() != null && !stream.getFilters().isEmpty()) {
            // If contains DCTDecode -> JPEG
            if (stream.getFilters().contains(COSName.DCT_DECODE)) {
                return "jpeg";
            }
            if (stream.getFilters().contains(COSName.FLATE_DECODE)) {
                return "png"; // approximate
            }
        }

        // Fallback: check color space / components
        try {
            var cs = imageXObject.getColorSpace();
            if (cs != null) {
                String name = cs.getName();
                if (name != null && name.toLowerCase().contains("rgb")) return "jpeg";
                if (name != null && name.toLowerCase().contains("gray")) return "png";
            }
        } catch (IOException ignored) {
            // If we can't determine color space, fallback to generic
            System.err.println("Could not determine color space for image: " + imageXObject);
        }

        // Last resort:
        return "unknown";
    }
}
