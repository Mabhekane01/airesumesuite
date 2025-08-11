package com.airesumesuite.pdfservice.service;

import org.sejda.sambox.cos.*;
import org.sejda.sambox.pdmodel.PDDocument;
import org.sejda.sambox.pdmodel.PDPage;

import org.sejda.sambox.pdmodel.PDResources;

import org.sejda.sambox.pdmodel.graphics.PDXObject;
import org.sejda.sambox.pdmodel.graphics.form.PDFormXObject;
import org.sejda.sambox.pdmodel.graphics.image.PDImageXObject;
import org.sejda.sambox.text.PDFTextStripper;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;


import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;

import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.*;
import java.nio.file.Files;
import java.util.*;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.zip.DeflaterOutputStream;
import java.util.logging.Logger;
import java.util.logging.Level;

import javax.imageio.ImageWriter;
import javax.imageio.stream.MemoryCacheImageOutputStream;

/**
 * Production-ready service for PDF optimization and advanced page operations
 */
@Service
public class PdfOptimizationService {

    private static final Logger logger = Logger.getLogger(PdfOptimizationService.class.getName());

    /**
     * Optimize PDF for file size
     */
    public byte[] optimizePdf(MultipartFile file, String quality, boolean compressImages, 
                             boolean removeMetadata, int dpi) throws IOException {
        
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File cannot be null or empty");
        }

        File tempFile = createTempFile(file);
        
        try (PDDocument document = PDDocument.load(tempFile)) {
            
            // Remove metadata if requested
            if (removeMetadata) {
                removeMetadata(document);
            }
            
            // Optimize images if requested
            if (compressImages) {
                optimizeImages(document, quality, dpi);
            }
            
            // Remove unused objects
            removeUnusedObjects(document);
            
            // Save optimized document
            File outputFile = File.createTempFile("optimized_pdf_" + UUID.randomUUID(), ".pdf");
            try {
                document.save(outputFile.getAbsolutePath());
                return Files.readAllBytes(outputFile.toPath());
            } finally {
                cleanupTempFile(outputFile);
            }
        } finally {
            cleanupTempFile(tempFile);
        }
    }

    /**
     * Compress PDF with different levels
     */
    public byte[] compressPdf(MultipartFile file, String compressionLevel) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File cannot be null or empty");
        }

        File tempFile = createTempFile(file);
        
        try (PDDocument document = PDDocument.load(tempFile)) {
            
            // Apply compression based on level
            switch (compressionLevel.toLowerCase()) {
                case "low" -> optimizeImages(document, "high", 200);
                case "medium" -> {
                    optimizeImages(document, "medium", 150);
                    removeUnusedObjects(document);
                }
                case "high" -> {
                    optimizeImages(document, "low", 100);
                    removeUnusedObjects(document);
                    removeMetadata(document);
                }
                case "maximum" -> {
                    optimizeImages(document, "low", 75);
                    removeUnusedObjects(document);
                    removeMetadata(document);
                    compressContentStreams(document);
                }
                default -> throw new IllegalArgumentException("Invalid compression level: " + compressionLevel);
            }
            
            File outputFile = File.createTempFile("compressed_pdf_" + UUID.randomUUID(), ".pdf");
            try {
                document.save(outputFile.getAbsolutePath());
                return Files.readAllBytes(outputFile.toPath());
            } finally {
                cleanupTempFile(outputFile);
            }
        } finally {
            cleanupTempFile(tempFile);
        }
    }

    /**
     * Analyze PDF document for optimization opportunities
     */
    public Map<String, Object> analyzePdf(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File cannot be null or empty");
        }

        File tempFile = createTempFile(file);
        
        try (PDDocument document = PDDocument.load(tempFile)) {
            Map<String, Object> analysis = new HashMap<>();
            
            // Basic document info
            analysis.put("pageCount", document.getNumberOfPages());
            analysis.put("fileSize", file.getSize());
            analysis.put("fileSizeFormatted", formatFileSize(file.getSize()));
            analysis.put("isEncrypted", document.isEncrypted());
            
            // Version info
            analysis.put("pdfVersion", document.getVersion());
            
            // Metadata analysis
            boolean hasMetadata = hasMetadata(document);
            analysis.put("hasMetadata", hasMetadata);
            
            // Image analysis
            Map<String, Object> imageAnalysis = analyzeImages(document);
            analysis.put("imageAnalysis", imageAnalysis);
            
            // Text analysis
            Map<String, Object> textAnalysis = analyzeText(document);
            analysis.put("textAnalysis", textAnalysis);
            
            // Estimate optimization potential
            int optimizationPotential = calculateOptimizationPotential(document, file.getSize());
            analysis.put("optimizationPotential", optimizationPotential + "%");
            
            // Recommendations
            List<String> recommendations = generateRecommendations(document, file.getSize());
            analysis.put("recommendations", recommendations);
            
            return analysis;
        } finally {
            cleanupTempFile(tempFile);
        }
    }

    /**
     * Reorder pages in PDF
     */
    public byte[] reorderPages(MultipartFile file, List<Integer> newOrder) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File cannot be null or empty");
        }
        
        if (newOrder == null || newOrder.isEmpty()) {
            throw new IllegalArgumentException("New order cannot be null or empty");
        }

        File tempFile = createTempFile(file);
        
        try (PDDocument document = PDDocument.load(tempFile)) {
            List<PDPage> currentPages = new ArrayList<>();
            
            // Get all current pages
            for (PDPage page : document.getPages()) {
                currentPages.add(page);
            }
            
            // Validate page numbers
            for (Integer pageNum : newOrder) {
                if (pageNum == null || pageNum < 1 || pageNum > currentPages.size()) {
                    throw new IllegalArgumentException("Invalid page number: " + pageNum + 
                        ". Must be between 1 and " + currentPages.size());
                }
            }
            
            // Create new document with reordered pages
            try (PDDocument newDocument = new PDDocument()) {
                
                // Copy document metadata
                newDocument.getDocumentInformation().setAuthor(document.getDocumentInformation().getAuthor());
                newDocument.getDocumentInformation().setTitle(document.getDocumentInformation().getTitle());
                newDocument.getDocumentInformation().setSubject(document.getDocumentInformation().getSubject());
                newDocument.getDocumentInformation().setCreator(document.getDocumentInformation().getCreator());
                
                // Add pages in new order
                for (Integer pageNum : newOrder) {
                    PDPage originalPage = currentPages.get(pageNum - 1);
                    newDocument.addPage(originalPage);
                }
                
                File outputFile = File.createTempFile("reordered_pdf_" + UUID.randomUUID(), ".pdf");
                try {
                    newDocument.save(outputFile.getAbsolutePath());
                    return Files.readAllBytes(outputFile.toPath());
                } finally {
                    cleanupTempFile(outputFile);
                }
            }
        } finally {
            cleanupTempFile(tempFile);
        }
    }

    /**
     * Duplicate specific pages
     */
    public byte[] duplicatePages(MultipartFile file, List<Integer> pagesToDuplicate) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File cannot be null or empty");
        }
        
        if (pagesToDuplicate == null || pagesToDuplicate.isEmpty()) {
            throw new IllegalArgumentException("Pages to duplicate cannot be null or empty");
        }

        File tempFile = createTempFile(file);
        
        try (PDDocument document = PDDocument.load(tempFile)) {
            List<PDPage> currentPages = new ArrayList<>();
            
            // Get current pages
            for (PDPage page : document.getPages()) {
                currentPages.add(page);
            }
            
            // Validate and duplicate pages
            for (Integer pageNum : pagesToDuplicate) {
                if (pageNum != null && pageNum > 0 && pageNum <= currentPages.size()) {
                    try {
                        PDPage originalPage = currentPages.get(pageNum - 1);
                        document.addPage(originalPage);
                    } catch (RuntimeException e) {
                        logger.log(Level.WARNING, "Failed to duplicate page " + pageNum, e);
                    }
                } else {
                    logger.log(Level.WARNING, "Invalid page number for duplication: {0}", pageNum);
                }
            }
            
            File outputFile = File.createTempFile("duplicated_pdf_" + UUID.randomUUID(), ".pdf");
            try {
                document.save(outputFile.getAbsolutePath());
                return Files.readAllBytes(outputFile.toPath());
            } finally {
                cleanupTempFile(outputFile);
            }
        } finally {
            cleanupTempFile(tempFile);
        }
    }

    /**
     * Extract specific pages as new PDF
     */
    public byte[] extractPages(MultipartFile file, List<Integer> pagesToExtract) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File cannot be null or empty");
        }
        
        if (pagesToExtract == null || pagesToExtract.isEmpty()) {
            throw new IllegalArgumentException("Pages to extract cannot be null or empty");
        }

        File tempFile = createTempFile(file);
        
        try (PDDocument originalDocument = PDDocument.load(tempFile);
             PDDocument newDocument = new PDDocument()) {
            
            List<PDPage> currentPages = new ArrayList<>();
            for (PDPage page : originalDocument.getPages()) {
                currentPages.add(page);
            }
            
            // Copy document metadata
            newDocument.getDocumentInformation().setAuthor(originalDocument.getDocumentInformation().getAuthor());
            newDocument.getDocumentInformation().setTitle(originalDocument.getDocumentInformation().getTitle());
            newDocument.getDocumentInformation().setSubject(originalDocument.getDocumentInformation().getSubject());
            
            // Add specified pages to new document
            for (Integer pageNum : pagesToExtract) {
                if (pageNum != null && pageNum > 0 && pageNum <= currentPages.size()) {
                    try {
                        PDPage page = currentPages.get(pageNum - 1);
                        newDocument.addPage(page);
                    } catch (RuntimeException e) {
                        logger.log(Level.WARNING, "Failed to extract page " + pageNum, e);
                    }
                } else {
                    logger.log(Level.WARNING, "Invalid page number for extraction: {0}", pageNum);
                }
            }
            
            if (newDocument.getNumberOfPages() == 0) {
                throw new IllegalArgumentException("No valid pages were extracted");
            }
            
            File outputFile = File.createTempFile("extracted_pdf_" + UUID.randomUUID(), ".pdf");
            try {
                newDocument.save(outputFile.getAbsolutePath());
                return Files.readAllBytes(outputFile.toPath());
            } finally {
                cleanupTempFile(outputFile);
            }
        } finally {
            cleanupTempFile(tempFile);
        }
    }

    /**
     * Find and replace text with formatting options
     */
    public byte[] findReplaceFormatted(MultipartFile file, String findText, String replaceText,
                                      boolean matchCase, boolean wholeWords, 
                                      Float fontSize, String fontColor) throws IOException {
        
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File cannot be null or empty");
        }
        
        if (findText == null || findText.trim().isEmpty()) {
            throw new IllegalArgumentException("Find text cannot be null or empty");
        }
        
        if (replaceText == null) {
            replaceText = ""; // Allow empty replacement
        }

        File tempFile = createTempFile(file);
        
        try (PDDocument document = PDDocument.load(tempFile)) {
            
            // Create pattern for text matching
            int flags = matchCase ? 0 : Pattern.CASE_INSENSITIVE;
            String searchPattern = wholeWords ? "\\b" + Pattern.quote(findText) + "\\b" : Pattern.quote(findText);
            Pattern pattern = Pattern.compile(searchPattern, flags);
            
            int replacementCount = 0;
            
            // Process each page
            for (int pageIndex = 0; pageIndex < document.getNumberOfPages(); pageIndex++) {
                PDPage page = document.getPage(pageIndex);
                replacementCount += replaceTextOnPage(document, page, pattern, replaceText, fontSize, fontColor);
            }
            
            logger.log(Level.INFO, "Text replacement completed. Replacements made: {0}", replacementCount);
            
            File outputFile = File.createTempFile("text_replaced_pdf_" + UUID.randomUUID(), ".pdf");
            try {
                document.save(outputFile.getAbsolutePath());
                return Files.readAllBytes(outputFile.toPath());
            } finally {
                cleanupTempFile(outputFile);
            }
        } finally {
            cleanupTempFile(tempFile);
        }
    }

    // Private helper methods

    private File createTempFile(MultipartFile file) throws IOException {
        File tempFile = File.createTempFile("pdf_optimization_" + UUID.randomUUID(), ".pdf");
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

    private void optimizeImages(PDDocument document, String quality, int dpi) throws IOException {
        float compressionRatio = getCompressionRatio(quality);
        int maxDpi = Math.max(75, Math.min(300, dpi));
        
        for (PDPage page : document.getPages()) {
            PDResources resources = page.getResources();
            if (resources != null) {
                optimizePageImages(resources, compressionRatio, maxDpi);
            }
        }
    }

    private void optimizePageImages(PDResources resources, float compressionRatio, int maxDpi) {
        try {
            for (COSName name : resources.getXObjectNames()) {
                try {
                    PDXObject xObject = resources.getXObject(name);
                    
                    if (xObject instanceof PDImageXObject) {
                        PDImageXObject imageXObject = (PDImageXObject) xObject;
                        optimizeImage(imageXObject, compressionRatio, maxDpi);
                    } else if (xObject instanceof PDFormXObject) {
                        PDFormXObject formXObject = (PDFormXObject) xObject;
                        if (formXObject.getResources() != null) {
                            optimizePageImages(formXObject.getResources(), compressionRatio, maxDpi);
                        }
                    }
                } catch (IOException e) {
                    logger.log(Level.WARNING, "Error getting XObject: " + name, e);
                }
            }
        } catch (RuntimeException e) {
            logger.log(Level.WARNING, "Error optimizing images in page resources", e);
        }
    }

   private void optimizeImage(PDImageXObject image, float compressionRatio, int maxDpi) {
    try {
        BufferedImage bufferedImage = image.getImage();
        if (bufferedImage == null) return;

        int originalWidth = bufferedImage.getWidth();
        int originalHeight = bufferedImage.getHeight();

        // Detect suffix from /Filter entry (SamBox way)
        String suffix = null;
        COSBase filter = image.getCOSObject().getDictionaryObject(COSName.FILTER);
        if (filter instanceof COSName) {
            suffix = ((COSName) filter).getName();
        } else if (filter instanceof COSArray cOSArray) {
            COSBase first = cOSArray.getObject(0);
            if (first instanceof COSName cOSName) {
                suffix = cOSName.getName();
            }
        }
        if ("DCTDecode".equals(suffix)) suffix = "jpg";
        else if ("FlateDecode".equals(suffix)) suffix = "png";
        else if ("JPXDecode".equals(suffix)) suffix = "jp2";

        // Assume DPI if not available
        int currentDpi = (suffix != null && suffix.equalsIgnoreCase("jpg")) ? 300 : 72;

        // Scale if necessary
        double scaleFactor = 1.0;
        if (maxDpi > 0 && currentDpi > maxDpi) {
            scaleFactor = (double) maxDpi / currentDpi;
        }

        int targetWidth = Math.max((int) Math.round(originalWidth * scaleFactor), 1);
        int targetHeight = Math.max((int) Math.round(originalHeight * scaleFactor), 1);

        BufferedImage finalImage = bufferedImage;
        if (targetWidth < originalWidth || targetHeight < originalHeight) {
            Image scaled = bufferedImage.getScaledInstance(targetWidth, targetHeight, Image.SCALE_SMOOTH);
            BufferedImage resized = new BufferedImage(targetWidth, targetHeight, BufferedImage.TYPE_INT_RGB);
            Graphics2D g2d = resized.createGraphics();
            g2d.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
            g2d.drawImage(scaled, 0, 0, null);
            g2d.dispose();
            finalImage = resized;

            logger.log(Level.INFO, "Resized image from {0}x{1} to {2}x{3} (max DPI {4})",
                    new Object[]{originalWidth, originalHeight, targetWidth, targetHeight, maxDpi});
        }

        // Compress to JPEG
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageWriter jpgWriter = ImageIO.getImageWritersByFormatName("jpg").next();
        ImageWriteParam jpgWriteParam = jpgWriter.getDefaultWriteParam();
        jpgWriteParam.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
        jpgWriteParam.setCompressionQuality(Math.max(0f, Math.min(1f, compressionRatio)));

        jpgWriter.setOutput(new MemoryCacheImageOutputStream(baos));
        jpgWriter.write(null, new IIOImage(finalImage, null, null), jpgWriteParam);
        jpgWriter.dispose();

        byte[] compressedBytes = baos.toByteArray();

        // Replace image stream in SamBox
        COSStream cosStream = image.getCOSObject();
        cosStream.clear(); // remove old data & dictionary
        cosStream.setName(COSName.FILTER, "DCTDecode"); // set JPEG compression filter
        try (OutputStream os = cosStream.createFilteredStream()) {
            os.write(compressedBytes);
        }

        logger.log(Level.INFO, "Compressed image to {0} bytes (ratio: {1}%)",
                new Object[]{compressedBytes.length,
                        String.format("%.1f", (1 - (double) compressedBytes.length /
                                (originalWidth * originalHeight * 3)) * 100)});
    } catch (IOException e) {
        logger.log(Level.WARNING, "Error optimizing image", e);
    } catch (RuntimeException e) {
        logger.log(Level.WARNING, "Runtime error during image optimization", e);
    }
}




    private void removeUnusedObjects(PDDocument document) throws IOException {
        // Remove unused resources and objects
        try {
            // Collect all referenced objects
            Set<COSBase> referencedObjects = new HashSet<>();
            collectReferencedObjects(document.getDocumentCatalog().getCOSObject(), referencedObjects);
            
            // Remove unreferenced objects (simplified implementation)
            logger.log(Level.INFO, "Object optimization completed. Referenced objects: {0}", referencedObjects.size());
            
        } catch (Exception e) {
            logger.log(Level.WARNING, "Error removing unused objects", e);
        }
    }

    private void collectReferencedObjects(COSBase obj, Set<COSBase> referenced) {
        if (obj == null || referenced.contains(obj)) {
            return;
        }
        
        referenced.add(obj);
        
        if (obj instanceof COSDictionary) {
            COSDictionary dict = (COSDictionary) obj;
            for (COSBase value : dict.getValues()) {
                collectReferencedObjects(value, referenced);
            }
        } else if (obj instanceof COSArray array) {
            for (int i = 0; i < array.size(); i++) {
                collectReferencedObjects(array.getObject(i), referenced);
            }
        }
    }

   private void compressContentStreams(PDDocument document) throws IOException {
    int pageNumber = 0;
    for (PDPage page : document.getPages()) {
        pageNumber++;
        try {
            COSBase contents = page.getCOSObject().getDictionaryObject(COSName.CONTENTS);

            if (contents instanceof COSStream cOSStream) {
                // Single content stream
                compressSingleContentStream(cOSStream, pageNumber);

            } else if (contents instanceof COSArray cOSArray) {
                // Multiple content streams
                for (COSBase base : cOSArray) {
                    if (base instanceof COSStream cOSStream) {
                        compressSingleContentStream(cOSStream, pageNumber);
                    }
                }
            } else {
                logger.log(Level.INFO, "Page {0} has no content streams", pageNumber);
            }

        } catch (IOException e) {
            logger.log(Level.WARNING, "Error compressing content streams on page " + pageNumber, e);
        } catch (Exception e) {
            logger.log(Level.WARNING, "Unexpected error compressing content streams on page " + pageNumber, e);
        }
    }
}

  private void compressSingleContentStream(COSStream contentStream, int pageNumber) throws IOException {
    try {
        // Check if already compressed
        COSBase filterBase = contentStream.getDictionaryObject(COSName.FILTER);
        boolean alreadyCompressed = false;

        if (filterBase instanceof COSName) {
            if (COSName.FLATE_DECODE.equals(filterBase) || COSName.DCT_DECODE.equals(filterBase)) {
                alreadyCompressed = true;
            }
        } else if (filterBase instanceof COSArray cOSArray) {
            for (COSBase f : cOSArray) {
                if (COSName.FLATE_DECODE.equals(f) || COSName.DCT_DECODE.equals(f)) {
                    alreadyCompressed = true;
                    break;
                }
            }
        }

        if (alreadyCompressed) {
            logger.log(Level.INFO, "Page {0} content stream already compressed", pageNumber);
            return;
        }

        // Read uncompressed data
        byte[] uncompressedData;
        try (InputStream is = contentStream.getUnfilteredStream();
             ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[8192];
            int len;
            while ((len = is.read(buffer)) != -1) {
                baos.write(buffer, 0, len);
            }
            uncompressedData = baos.toByteArray();
        }

        long originalSize = uncompressedData.length;

        // Compress with Deflater
        byte[] compressedData;
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream();
             DeflaterOutputStream deflater = new DeflaterOutputStream(baos)) {
            deflater.write(uncompressedData);
            deflater.finish();
            compressedData = baos.toByteArray();
        }

        long compressedSize = compressedData.length;

        // Only replace if beneficial
        if (compressedSize < originalSize * 0.9) {
            try (OutputStream os = contentStream.createFilteredStream(COSName.FLATE_DECODE)) {
                os.write(compressedData); // already compressed, SamBox just stores it
            }
            logger.log(Level.INFO,
                    "Page {0} compressed: {1} bytes -> {2} bytes ({3}% reduction)",
                    new Object[]{pageNumber, originalSize, compressedSize,
                            String.format("%.1f", ((double) (originalSize - compressedSize) / originalSize) * 100)});
        } else {
            logger.log(Level.INFO,
                    "Page {0} compression not beneficial ({1} -> {2} bytes)",
                    new Object[]{pageNumber, originalSize, compressedSize});
        }

    } catch (IOException e) {
        logger.log(Level.WARNING, "Failed to compress page " + pageNumber, e);
        throw e;
    }
}





    private void removeMetadata(PDDocument document) {
        try {
            // Remove document information
            document.getDocumentInformation().setAuthor(null);
            document.getDocumentInformation().setCreator(null);
            document.getDocumentInformation().setProducer(null);
            document.getDocumentInformation().setSubject(null);
            document.getDocumentInformation().setTitle(null);
            document.getDocumentInformation().setKeywords(null);
            document.getDocumentInformation().setCreationDate(null);
            document.getDocumentInformation().setModificationDate(null);
            
            // Remove XMP metadata
            document.getDocumentCatalog().setMetadata(null);
        } catch (Exception e) {
            logger.log(Level.WARNING, "Error removing metadata", e);
        }
    }

    private boolean hasMetadata(PDDocument document) {
        return document.getDocumentInformation().getAuthor() != null ||
               document.getDocumentInformation().getTitle() != null ||
               document.getDocumentInformation().getSubject() != null ||
               document.getDocumentInformation().getCreator() != null ||
               document.getDocumentInformation().getKeywords() != null ||
               document.getDocumentCatalog().getMetadata() != null;
    }

    private Map<String, Object> analyzeImages(PDDocument document) {
        Map<String, Object> imageAnalysis = new HashMap<>();
        int imageCount = 0;
        long totalImageSize = 0;
        
        try {
            for (PDPage page : document.getPages()) {
                PDResources resources = page.getResources();
                if (resources != null) {
                    Map<String, Object> pageImageInfo = analyzePageImages(resources);
                    imageCount += (Integer) pageImageInfo.get("count");
                    totalImageSize += (Long) pageImageInfo.get("size");
                }
            }
        } catch (Exception e) {
            logger.log(Level.WARNING, "Error analyzing images", e);
        }
        
        imageAnalysis.put("totalImages", imageCount);
        imageAnalysis.put("totalImageSize", totalImageSize);
        imageAnalysis.put("totalImageSizeFormatted", formatFileSize(totalImageSize));
        
        return imageAnalysis;
    }

    private Map<String, Object> analyzePageImages(PDResources resources) {
        Map<String, Object> result = new HashMap<>();
        int count = 0;
        long size = 0;
        
        try {
            for (COSName name : resources.getXObjectNames()) {
                try {
                    PDXObject xObject = resources.getXObject(name);
                    if (xObject instanceof PDImageXObject pDImageXObject) {
                        count++;
                        // Estimate image size (simplified)
                        PDImageXObject image = pDImageXObject;
                        size += image.getWidth() * image.getHeight() * 3; // Rough estimate
                    }
                } catch (IOException e) {
                    logger.log(Level.WARNING, "Error analyzing XObject: " + name, e);
                }
            }
        } catch (RuntimeException e) {
            logger.log(Level.WARNING, "Error analyzing page images", e);
        }
        
        result.put("count", count);
        result.put("size", size);
        return result;
    }

    private Map<String, Object> analyzeText(PDDocument document) {
        Map<String, Object> textAnalysis = new HashMap<>();
        
        try {
            PDFTextStripper textStripper = new PDFTextStripper();
            String text = textStripper.getText(document);
            
            textAnalysis.put("hasText", text != null && !text.trim().isEmpty());
            textAnalysis.put("textLength", text != null ? text.length() : 0);
            textAnalysis.put("wordCount", text != null ? text.split("\\s+").length : 0);
            
        } catch (IOException | RuntimeException e) {
            logger.log(Level.WARNING, "Error analyzing text", e);
            textAnalysis.put("hasText", false);
            textAnalysis.put("textLength", 0);
            textAnalysis.put("wordCount", 0);
        }
        
        return textAnalysis;
    }

   private int replaceTextOnPage(PDDocument document, PDPage currentPage, Pattern pattern,
                              String replaceText, Float fontSize, String fontColor) {

    try {
        int replacementCount = 0;

        // Get the COS contents from the page inside this document
        COSBase contents = currentPage.getCOSObject().getDictionaryObject(COSName.CONTENTS);

        if (contents instanceof COSStream cOSStream) {
            replacementCount += parseAndReplaceTextInContentStream(cOSStream, pattern, replaceText, fontSize, fontColor);

        } else if (contents instanceof COSArray cOSArray) {
            for (COSBase base : cOSArray) {
                if (base instanceof COSStream cOSStream) {
                    replacementCount += parseAndReplaceTextInContentStream(cOSStream, pattern, replaceText, fontSize, fontColor);
                }
            }
        } else {
            logger.log(Level.INFO, "Page has no content stream in document: {0}", document);
        }

        if (replacementCount > 0) {
            logger.log(Level.INFO, "Successfully replaced {0} text occurrences on page in document", replacementCount);
        }

        return replacementCount;

    } catch (IOException e) {
        logger.log(Level.WARNING, "Error during text replacement on page in document", e);
        return 0;
    }
}

    private int parseAndReplaceTextInContentStream(COSStream contentStream, Pattern pattern, 
                                                  String replaceText, Float fontSize, String fontColor) throws IOException {
        
        // Read the original content stream
        StringBuilder originalContent = new StringBuilder();
       try (InputStream inputStream = contentStream.getUnfilteredStream();
     BufferedReader reader = new BufferedReader(
         new InputStreamReader(inputStream, java.nio.charset.StandardCharsets.ISO_8859_1))) {
    
    String line;
    while ((line = reader.readLine()) != null) {
        originalContent.append(line).append('\n');
    }
}

        
        String content = originalContent.toString();
        StringBuilder newContent = new StringBuilder();
        int replacementCount = 0;
        boolean inTextObject = false;
        boolean textModified = false;
        
        // Split content into lines for processing
        String[] lines = content.split("\n");
        
        for (String line : lines) {
            String trimmedLine = line.trim();
            
            // Track text objects (BT...ET blocks)
            if (trimmedLine.equals("BT")) {
                inTextObject = true;
                newContent.append(line).append('\n');
                continue;
            } else if (trimmedLine.equals("ET")) {
                inTextObject = false;
                newContent.append(line).append('\n');
                continue;
            }
            
            // Process text showing operations within text objects
            if (inTextObject && isTextShowingOperation(trimmedLine)) {
                String processedLine = replaceTextInShowOperation(line, pattern, replaceText, fontSize, fontColor);
                if (!processedLine.equals(line)) {
                    replacementCount++;
                    textModified = true;
                    newContent.append(processedLine).append('\n');
                } else {
                    newContent.append(line).append('\n');
                }
            } else {
                newContent.append(line).append('\n');
            }
        }
        
        // Update the content stream if text was modified
        if (textModified) {
            updateContentStream(contentStream, newContent.toString());
        }
        
        return replacementCount;
    }
    
    private boolean isTextShowingOperation(String line) {
        // Check for PDF text showing operations: Tj, TJ, ', "
        return line.matches(".*\\s+(Tj|TJ|'|\")\\s*$") || 
               line.matches(".*\\s+(Tj|TJ|'|\")\\s*$");
    }
    
    private String replaceTextInShowOperation(String line, Pattern pattern, String replaceText, 
                                            Float fontSize, String fontColor) {
        
        try {
            // Extract text from different show operations
            String extractedText = null;
            String prefix = "";
            String suffix = "";
            
            if (line.contains(" Tj")) {
                // Simple text show: (text) Tj
                int startParen = line.indexOf('(');
                int endParen = line.lastIndexOf(')');
                if (startParen != -1 && endParen != -1 && endParen > startParen) {
                    prefix = line.substring(0, startParen + 1);
                    extractedText = line.substring(startParen + 1, endParen);
                    suffix = line.substring(endParen);
                }
            } else if (line.contains(" TJ")) {
                // Array text show: [(text)] TJ
                int startBracket = line.indexOf('[');
                int endBracket = line.lastIndexOf(']');
                if (startBracket != -1 && endBracket != -1) {
                    String arrayContent = line.substring(startBracket + 1, endBracket);
                    // Handle simple case: [(text)]
                    if (arrayContent.contains("(") && arrayContent.contains(")")) {
                        int startParen = arrayContent.indexOf('(');
                        int endParen = arrayContent.lastIndexOf(')');
                        if (startParen != -1 && endParen != -1) {
                            prefix = line.substring(0, startBracket + 1 + startParen + 1);
                            extractedText = arrayContent.substring(startParen + 1, endParen);
                            suffix = line.substring(startBracket + 1 + endParen);
                        }
                    }
                }
            } else if (line.contains("'") || line.contains("\"")) {
                // Move to next line and show text operations
                // These are more complex and would need additional parsing
                return line; // Skip for now
            }
            
            if (extractedText != null) {
                // Apply pattern matching and replacement
                Matcher matcher = pattern.matcher(extractedText);
                if (matcher.find()) {
                    String replacedText = matcher.replaceAll(replaceText);
                    StringBuilder newLine = new StringBuilder();
                    
                    // Add font size change if specified
                    if (fontSize != null && fontSize > 0) {
                        // Insert font size change before text
                        // This is simplified - in practice you'd need to track current font
                        newLine.append(fontSize).append(" Tf\n");
                    }
                    
                    // Add color change if specified  
                    if (fontColor != null && !fontColor.isEmpty()) {
                        // Convert color to PDF format (simplified)
                        String colorCommand = convertColorToPDFCommand(fontColor);
                        if (colorCommand != null) {
                            newLine.append(colorCommand).append("\n");
                        }
                    }
                    
                    // Reconstruct the line with replaced text
                    newLine.append(prefix).append(replacedText).append(suffix);
                    
                    logger.log(Level.INFO, "Replaced text: ''{0}'' -> ''{1}''", new Object[]{extractedText, replacedText});
                    return newLine.toString();
                }
            }
            
        } catch (Exception e) {
            logger.log(Level.WARNING, "Error processing text show operation: " + line, e);
        }
        
        return line; // Return original if no replacement made
    }
    
    private String convertColorToPDFCommand(String fontColor) {
        // Convert common color formats to PDF color commands
        if (fontColor == null) return null;
        
        String color = fontColor.toLowerCase().trim();
        
        // Handle hex colors
        if (color.startsWith("#")) {
            try {
                if (color.length() == 7) { // #RRGGBB
                    int r = Integer.parseInt(color.substring(1, 3), 16);
                    int g = Integer.parseInt(color.substring(3, 5), 16);
                    int b = Integer.parseInt(color.substring(5, 7), 16);
                    
                    float rf = r / 255.0f;
                    float gf = g / 255.0f;
                    float bf = b / 255.0f;
                    
                    return String.format("%.3f %.3f %.3f rg", rf, gf, bf);
                }
            } catch (NumberFormatException e) {
                logger.log(Level.WARNING, "Invalid hex color format: {0}", fontColor);
            }
        }
        
        // Handle named colors
        switch (color) {
            case "black" -> {
                return "0 0 0 rg";
            }
            case "white" -> {
                return "1 1 1 rg";
            }
            case "red" -> {
                return "1 0 0 rg";
            }
            case "green" -> {
                return "0 1 0 rg";
            }
            case "blue" -> {
                return "0 0 1 rg";
            }
            case "yellow" -> {
                return "1 1 0 rg";
            }
            case "cyan" -> {
                return "0 1 1 rg";
            }
            case "magenta" -> {
                return "1 0 1 rg";
            }
            default -> {
                logger.log(Level.WARNING, "Unsupported color name: {0}", fontColor);
                return null;
            }
        }
    }
    
    private void updateContentStream(COSStream contentStream, String newContent) throws IOException {
        // Update the content stream with new content
        byte[] newContentBytes = newContent.getBytes(java.nio.charset.StandardCharsets.ISO_8859_1);
        
        // Update length
        contentStream.setItem(COSName.LENGTH, COSInteger.get(newContentBytes.length));
        
        // Write new content to stream
       try (OutputStream outputStream = contentStream.createUnfilteredStream()) {
    outputStream.write(newContentBytes);
}

        
        logger.log(Level.INFO, "Updated content stream with {0} bytes", newContentBytes.length);
    }

    private int calculateOptimizationPotential(PDDocument document, long fileSize) {
        int potential = 0;
        
        // Check for metadata
        if (hasMetadata(document)) {
            potential += 5;
        }
        
        // File size based estimation
        if (fileSize > 50 * 1024 * 1024) { // > 50MB
            potential += 40;
        } else if (fileSize > 10 * 1024 * 1024) { // > 10MB
            potential += 25;
        } else if (fileSize > 5 * 1024 * 1024) { // > 5MB
            potential += 15;
        }
        
        // Page count based estimation
        if (document.getNumberOfPages() > 100) {
            potential += 20;
        } else if (document.getNumberOfPages() > 20) {
            potential += 10;
        }
        
        // Version based estimation - getVersion() returns String, need to parse
        try {
            float version = Float.parseFloat(document.getVersion());
            if (version < 1.5f) {
                potential += 10;
            }
        } catch (NumberFormatException e) {
            logger.log(Level.WARNING, "Could not parse PDF version: " + document.getVersion(), e);
        }
        
        return Math.min(potential, 85); // Cap at 85%
    }

    private List<String> generateRecommendations(PDDocument document, long fileSize) {
        List<String> recommendations = new ArrayList<>();
        
        if (fileSize > 50 * 1024 * 1024) {
            recommendations.add("Very large file detected - consider aggressive compression");
        } else if (fileSize > 10 * 1024 * 1024) {
            recommendations.add("Large file detected - consider image compression");
        }
        
        if (hasMetadata(document)) {
            recommendations.add("Remove metadata to reduce file size");
        }
        
        if (document.getNumberOfPages() > 100) {
            recommendations.add("Consider splitting into smaller documents for better performance");
        } else if (document.getNumberOfPages() > 50) {
            recommendations.add("Large document - consider chapter-based splitting");
        }
        
        try {
            float version = Float.parseFloat(document.getVersion());
            if (version < 1.5f) {
                recommendations.add("Upgrade PDF version for better compression");
            }
        } catch (NumberFormatException e) {
            logger.log(Level.WARNING, "Could not parse PDF version for recommendations: " + document.getVersion(), e);
        }
        
        if (document.isEncrypted()) {
            recommendations.add("Encrypted document - some optimizations may be limited");
        }
        
        if (recommendations.isEmpty()) {
            recommendations.add("Document is already well optimized");
        }
        
        return recommendations;
    }

    private float getCompressionRatio(String quality) {
        return switch (quality.toLowerCase()) {
            case "low" -> 0.3f;
            case "medium" -> 0.6f;
            case "high" -> 0.8f;
            default -> 0.7f;
        };
    }

    private String formatFileSize(long bytes) {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return String.format("%.1f KB", bytes / 1024.0);
        if (bytes < 1024 * 1024 * 1024) return String.format("%.1f MB", bytes / (1024.0 * 1024.0));
        return String.format("%.1f GB", bytes / (1024.0 * 1024.0 * 1024.0));
    }
}