package com.airesumesuite.pdfservice.service;
import org.sejda.io.SeekableSources;
import org.sejda.sambox.pdmodel.PDDocument;
import org.sejda.sambox.pdmodel.PDPage;
import org.sejda.sambox.pdmodel.PDPageContentStream;
import org.sejda.sambox.pdmodel.common.PDRectangle;
import org.sejda.sambox.pdmodel.encryption.AccessPermission;
import org.sejda.sambox.pdmodel.encryption.StandardProtectionPolicy;
import org.sejda.sambox.pdmodel.font.PDType1Font;
import org.sejda.sambox.pdmodel.interactive.annotation.PDAnnotationWidget;
import org.sejda.sambox.pdmodel.interactive.form.PDAcroForm;
import org.sejda.sambox.pdmodel.interactive.form.PDSignatureField;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.awt.*;
import java.io.*;
import java.nio.file.Files;

import java.nio.file.Path;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Calendar;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.locks.ReentrantLock;

import org.sejda.sambox.input.PDFParser;
import org.sejda.sambox.pdmodel.encryption.PDEncryption;

/**
 * Production-ready service for PDF security operations (password protection, permissions, signatures, redaction)
 * Compatible with Sambox 5.1.13
 */
@Service
public class PdfSecurityService {
    
    private static final Logger logger = LoggerFactory.getLogger(PdfSecurityService.class);
    private static final int DEFAULT_KEY_LENGTH = 256;
    private final ReentrantLock processingLock = new ReentrantLock();
    
    // Temporary directory for file operations
    private final Path tempDir;
    
    public PdfSecurityService() throws IOException {
        // Initialize temp directory for file operations
        this.tempDir = Files.createTempDirectory("pdf-security-");
        // Register shutdown hook to clean up temp directory
        Runtime.getRuntime().addShutdownHook(new Thread(this::cleanupTempDir));
    }

    /**
     * Add password protection to PDF with granular permissions
     */
    public byte[] secureWithPassword(MultipartFile file, String userPassword, String ownerPassword,
                                 boolean allowPrinting, boolean allowCopy, boolean allowEdit,
                                 boolean allowAnnotations) throws IOException {
    validateInputFile(file);
    validatePasswords(userPassword, ownerPassword);

    processingLock.lock();
    File tempInputFile = null;
    File tempOutputFile = null;

    try {
        tempInputFile = createTempFile(file);
        tempOutputFile = createTempOutputFile();

        // --- Use PDFBox here instead of Sambox ---
        try (org.apache.pdfbox.pdmodel.PDDocument document = 
                 org.apache.pdfbox.pdmodel.PDDocument.load(tempInputFile)) {

            logger.info("Applying password protection to PDF: {}", file.getOriginalFilename());

            // Create access permissions
            org.apache.pdfbox.pdmodel.encryption.AccessPermission ap =
                    new org.apache.pdfbox.pdmodel.encryption.AccessPermission();
            ap.setCanPrint(allowPrinting);
            ap.setCanExtractContent(allowCopy);
            ap.setCanModify(allowEdit);
            ap.setCanModifyAnnotations(allowAnnotations);

            // Create protection policy
            org.apache.pdfbox.pdmodel.encryption.StandardProtectionPolicy spp =
                    new org.apache.pdfbox.pdmodel.encryption.StandardProtectionPolicy(ownerPassword, userPassword, ap);
            spp.setEncryptionKeyLength(256); // AES-256 encryption
            spp.setPermissions(ap);

            // Apply encryption
            document.protect(spp);

            // Save the encrypted file
            document.save(tempOutputFile);
        }
        // ------------------------------------------

        logger.info("Successfully applied password protection to PDF");
        return Files.readAllBytes(tempOutputFile.toPath());

    } catch (IOException e) {
        logger.error("Failed to secure PDF with password: {}", e.getMessage(), e);
        throw new IOException("Failed to apply password protection: " + e.getMessage(), e);
    } finally {
        cleanupTempFiles(tempInputFile, tempOutputFile);
        processingLock.unlock();
    }
}


    /**
     * Remove password protection from PDF
     */
    public byte[] removeSecurity(MultipartFile file, String ownerPassword, String userPassword)
        throws IOException, SecurityException {
    validateInputFile(file);
    if ((ownerPassword == null || ownerPassword.trim().isEmpty()) &&
        (userPassword == null || userPassword.trim().isEmpty())) {
        throw new SecurityException("At least one password (owner or user) is required to remove security");
    }
    processingLock.lock();
    File tempInputFile = null;
    File tempOutputFile = null;
    try {
        tempInputFile = createTempFile(file);
        tempOutputFile = createTempOutputFile();
        PDDocument document = null;
        
        // Try with owner password first
        if (ownerPassword != null && !ownerPassword.trim().isEmpty()) {
            try {
                document = PDFParser.parse(SeekableSources.seekableSourceFrom(tempInputFile), ownerPassword);
            } catch (IOException e) {
                logger.warn("Owner password failed: {}", e.getMessage());
            }
        }
        
        // If still null, try user password
        if (document == null && userPassword != null && !userPassword.trim().isEmpty()) {
            try {
                document = PDFParser.parse(SeekableSources.seekableSourceFrom(tempInputFile), userPassword);
            } catch (IOException e) {
                logger.warn("User password failed: {}", e.getMessage());
            }
        }
        
        // If no document was opened, throw error
        if (document == null) {
            throw new SecurityException("Unable to open PDF with provided passwords");
        }
        
        try (PDDocument doc = document) {
            if (!doc.isEncrypted()) {
                logger.info("PDF is not encrypted: {}", file.getOriginalFilename());
                return file.getBytes();
            }
            
            // Save decrypted PDF
            doc.writeTo(tempOutputFile);
        }
        
        logger.info("Successfully removed security from PDF");
        return Files.readAllBytes(tempOutputFile.toPath());
    } catch (IOException e) {
        logger.error("Failed to remove security from PDF: {}", e.getMessage(), e);
        throw new IOException("Failed to remove security: " + e.getMessage(), e);
    } finally {
        cleanupTempFiles(tempInputFile, tempOutputFile);
        processingLock.unlock();
    }
}

    /**
     * Check if PDF is password protected with enhanced detection
     */
    public boolean isPasswordProtected(MultipartFile file) throws IOException {
        validateInputFile(file);
        
        File tempFile = null;
        try {
            tempFile = createTempFile(file);
            
            try (PDDocument document = PDDocument.load(tempFile)) {
                boolean isEncrypted = document.isEncrypted();
                logger.debug("PDF encryption status for {}: {}", file.getOriginalFilename(), isEncrypted);
                return isEncrypted;
            } catch (Exception e) {
                logger.debug("Exception while checking encryption (likely password protected): {}", e.getMessage());
                // If we can't load it, it's likely password protected
                return true;
            }
        } finally {
            cleanupTempFiles(tempFile);
        }
    }

    /**
     * Get comprehensive PDF security information
     */
    public SecurityInfo getSecurityInfo(MultipartFile file, String password) throws IOException {
        validateInputFile(file);
        
        File tempFile = null;
        try {
            tempFile = createTempFile(file);
            
            try (PDDocument document = loadDocumentWithOptionalPassword(tempFile, password)) {
                logger.debug("Retrieving security info for PDF: {}", file.getOriginalFilename());
                
                SecurityInfo info = new SecurityInfo();
                info.isEncrypted = document.isEncrypted();
                info.fileName = file.getOriginalFilename();
                info.fileSize = file.getSize();
                
                if (document.isEncrypted()) {
                    populateSecurityPermissions(document, info);
                    detectEncryptionDetails(document, info);
                }
                
                // Check for digital signatures
                info.hasDigitalSignatures = hasDigitalSignatures(document);
                info.pageCount = document.getNumberOfPages();
                
                logger.debug("Security info retrieved successfully");
                return info;
            }
            
        } catch (IOException e) {
            logger.error("Failed to retrieve security info: {}", e.getMessage(), e);
            throw new IOException("Failed to get security information: " + e.getMessage(), e);
        } finally {
            cleanupTempFiles(tempFile);
        }
    }

    /**
     * Add digital signature field with proper implementation
     */
   public byte[] addSignatureFieldUsingPDFBox(
        MultipartFile file, String fieldName, String signerName,
        String reason, String location, int pageNumber,
        float x, float y, float width, float height) throws IOException {

    validateInputFile(file);
    validateSignatureParameters(fieldName, pageNumber);

    // Load with PDFBox instead of Sambox
    try (org.apache.pdfbox.pdmodel.PDDocument document =
            org.apache.pdfbox.pdmodel.PDDocument.load(file.getInputStream())) {

        // Get or create AcroForm
        org.apache.pdfbox.pdmodel.interactive.form.PDAcroForm acroForm =
                document.getDocumentCatalog().getAcroForm();
        if (acroForm == null) {
            acroForm = new org.apache.pdfbox.pdmodel.interactive.form.PDAcroForm(document);
            document.getDocumentCatalog().setAcroForm(acroForm);
        }

        // Create signature field
        org.apache.pdfbox.pdmodel.interactive.form.PDSignatureField signatureField =
                new org.apache.pdfbox.pdmodel.interactive.form.PDSignatureField(acroForm);
        signatureField.setPartialName(fieldName);

        // Create signature dictionary
        org.apache.pdfbox.pdmodel.interactive.digitalsignature.PDSignature signature =
                new org.apache.pdfbox.pdmodel.interactive.digitalsignature.PDSignature();
        signature.setFilter(org.apache.pdfbox.cos.COSName.getPDFName("Adobe.PPKLite"));
        signature.setSubFilter(org.apache.pdfbox.cos.COSName.getPDFName("adbe.pkcs7.detached"));

        if (signerName != null && !signerName.trim().isEmpty()) {
            signature.setName(signerName);
        }
        if (reason != null && !reason.trim().isEmpty()) {
            signature.setReason(reason);
        }
        if (location != null && !location.trim().isEmpty()) {
            signature.setLocation(location);
        }

        signature.setSignDate(Calendar.getInstance());
        signatureField.setValue(signature);

        // Create widget annotation
        org.apache.pdfbox.pdmodel.PDPage page = document.getPage(pageNumber);
        org.apache.pdfbox.pdmodel.common.PDRectangle rect =
                new org.apache.pdfbox.pdmodel.common.PDRectangle(x, y, width, height);

        org.apache.pdfbox.pdmodel.interactive.annotation.PDAnnotationWidget widget =
                signatureField.getWidgets().get(0);
        widget.setRectangle(rect);
        widget.setPage(page);
        page.getAnnotations().add(widget);

        acroForm.getFields().add(signatureField);

        // Save to byte array
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        document.save(baos);
        return baos.toByteArray();
    }
}


    /**
     * Redact sensitive content with black boxes
     */
   public byte[] redactContent(MultipartFile file, List<RedactionArea> areas) throws IOException {
    
    validateInputFile(file);
    if (areas == null || areas.isEmpty()) {
        throw new IllegalArgumentException("Redaction areas cannot be empty");
    }
    
    processingLock.lock();
    File tempInputFile = null;
    File tempOutputFile = null;
    
    try {
        // Create temporary files
        tempInputFile = createTempFile(file);
        tempOutputFile = createTempOutputFile();
        
        try (PDDocument document = PDDocument.load(tempInputFile.getAbsolutePath())) {
            logger.info("Applying {} redaction(s) to PDF: {}", areas.size(), file.getOriginalFilename());
            
            for (RedactionArea area : areas) {
                validateRedactionArea(area, document.getNumberOfPages());
                applyRedaction(document, area);
            }
            
            // Save using String path (Sambox requirement)
            document.save(tempOutputFile.getAbsolutePath());
            
            logger.info("Successfully applied all redactions");
            return Files.readAllBytes(tempOutputFile.toPath());
        }
        
    } catch (IOException e) {
        logger.error("Failed to redact content: {}", e.getMessage(), e);
        throw new IOException("Failed to redact content: " + e.getMessage(), e);
    } finally {
        cleanupTempFiles(tempInputFile, tempOutputFile);
        processingLock.unlock();
    }
}

    /**
     * Batch redact multiple areas efficiently
     */
   public byte[] batchRedactContent(MultipartFile file, List<List<RedactionArea>> pageRedactions) throws IOException {
    
    validateInputFile(file);
    if (pageRedactions == null || pageRedactions.isEmpty()) {
        throw new IllegalArgumentException("Page redactions cannot be empty");
    }
    
    processingLock.lock();
    File tempInputFile = null;
    File tempOutputFile = null;
    
    try {
        // Create temporary files
        tempInputFile = createTempFile(file);
        tempOutputFile = createTempOutputFile();
        
        try (PDDocument document = PDDocument.load(tempInputFile.getAbsolutePath())) {
            logger.info("Applying batch redactions to PDF: {}", file.getOriginalFilename());
            
            int totalRedactions = 0;
            for (int pageIndex = 0; pageIndex < pageRedactions.size(); pageIndex++) {
                List<RedactionArea> areas = pageRedactions.get(pageIndex);
                if (areas != null && !areas.isEmpty()) {
                    for (RedactionArea area : areas) {
                        validateRedactionArea(area, document.getNumberOfPages());
                        applyRedaction(document, area);
                        totalRedactions++;
                    }
                }
            }
            
            // Save using String path (Sambox requirement)
            document.save(tempOutputFile.getAbsolutePath());
            
            logger.info("Successfully applied {} total redactions", totalRedactions);
            return Files.readAllBytes(tempOutputFile.toPath());
        }
        
    } catch (IOException e) {
        logger.error("Failed to batch redact content: {}", e.getMessage(), e);
        throw new IOException("Failed to batch redact content: " + e.getMessage(), e);
    } finally {
        cleanupTempFiles(tempInputFile, tempOutputFile);
        processingLock.unlock();
    }
}


    // Private helper methods

    private void validateInputFile(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File cannot be null or empty");
        }
        if (file.getSize() > 100 * 1024 * 1024) { // 100MB limit
            throw new IllegalArgumentException("File size exceeds maximum limit of 100MB");
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.equals("application/pdf")) {
            throw new IllegalArgumentException("File must be a PDF");
        }
    }

 private void validatePasswords(String userPassword, String ownerPassword) {
    // Validate user password
    if (userPassword == null || userPassword.trim().isEmpty()) {
        throw new IllegalArgumentException("User password cannot be null or empty");
    }
    if (userPassword.length() < 4) {
        throw new IllegalArgumentException("User password must be at least 4 characters long");
    }

    // Validate owner password
    if (ownerPassword == null || ownerPassword.trim().isEmpty()) {
        throw new IllegalArgumentException("Owner password cannot be null or empty");
    }
    if (ownerPassword.length() < 4) {
        throw new IllegalArgumentException("Owner password must be at least 4 characters long");
    }

    // Ensure they are not the same (optional security best practice)
    if (userPassword.equals(ownerPassword)) {
        throw new IllegalArgumentException("Owner password must be different from user password");
    }
}


    private void validateSignatureParameters(String fieldName, int pageNumber) {
        if (fieldName == null || fieldName.trim().isEmpty()) {
            throw new IllegalArgumentException("Signature field name cannot be null or empty");
        }
        if (pageNumber < 0) {
            throw new IllegalArgumentException("Page number cannot be negative");
        }
    }

    private void validateRedactionArea(RedactionArea area, int totalPages) {
        if (area == null) {
            throw new IllegalArgumentException("Redaction area cannot be null");
        }
        if (area.pageNumber < 0 || area.pageNumber >= totalPages) {
            throw new IllegalArgumentException("Invalid page number for redaction: " + area.pageNumber);
        }
        if (area.width <= 0 || area.height <= 0) {
            throw new IllegalArgumentException("Redaction area dimensions must be positive");
        }
    }

    private File createTempFile(MultipartFile file) throws IOException {
        String fileName = "pdf_" + UUID.randomUUID().toString() + ".pdf";
        Path tempFilePath = tempDir.resolve(fileName);
        file.transferTo(tempFilePath.toFile());
        return tempFilePath.toFile();
    }
    
    private File createTempOutputFile() throws IOException {
        String fileName = "output_" + UUID.randomUUID().toString() + ".pdf";
        Path tempFilePath = tempDir.resolve(fileName);
        return tempFilePath.toFile();
    }
    
    private void cleanupTempFiles(File... files) {
        for (File file : files) {
            if (file != null && file.exists()) {
                try {
                    Files.deleteIfExists(file.toPath());
                } catch (IOException e) {
                    logger.warn("Failed to delete temp file: {}", file.getAbsolutePath(), e);
                }
            }
        }
    }
    
    private void cleanupTempDir() {
        try {
            Files.walk(tempDir)
                .sorted((path1, path2) -> path2.compareTo(path1)) // Delete files before directories
                .forEach(path -> {
                    try {
                        Files.deleteIfExists(path);
                    } catch (IOException e) {
                        logger.warn("Failed to delete temp path: {}", path, e);
                    }
                });
        } catch (IOException e) {
            logger.warn("Failed to cleanup temp directory: {}", tempDir, e);
        }
    }



private PDDocument loadDocumentWithOptionalPassword(File file, String password) throws IOException {
    if (password != null && !password.trim().isEmpty()) {
        return PDFParser.parse(SeekableSources.seekableSourceFrom(file), password);
    } else {
        return PDFParser.parse(SeekableSources.seekableSourceFrom(file));
    }
}


    private AccessPermission createAccessPermissions(boolean allowPrinting, boolean allowCopy, 
                                                   boolean allowEdit, boolean allowAnnotations) {
        AccessPermission permissions = new AccessPermission();
        permissions.setCanPrint(allowPrinting);
        permissions.setCanExtractContent(allowCopy);
        permissions.setCanModify(allowEdit);
        permissions.setCanModifyAnnotations(allowAnnotations);
        permissions.setCanFillInForm(allowAnnotations);
        permissions.setCanExtractForAccessibility(true); // Always allow for accessibility
        permissions.setCanAssembleDocument(allowEdit);
        permissions.setCanPrintDegraded(allowPrinting);
        
        return permissions;
    }

   private StandardProtectionPolicy createProtectionPolicy(
        String userPassword,
        String ownerPassword,
        AccessPermission permissions) {

    String effectiveOwnerPassword =
            (ownerPassword != null && !ownerPassword.trim().isEmpty())
                    ? ownerPassword
                    : userPassword;

    StandardProtectionPolicy policy =
            new StandardProtectionPolicy(effectiveOwnerPassword, userPassword, permissions);

    // 128 or 256 will automatically use AES in SamBox
    policy.setEncryptionKeyLength(DEFAULT_KEY_LENGTH); // e.g., 256 for AES-256

    return policy;
}


    private void populateSecurityPermissions(PDDocument document, SecurityInfo info) {
        AccessPermission permissions = document.getCurrentAccessPermission();
        if (permissions != null) {
            info.canPrint = permissions.canPrint();
            info.canCopy = permissions.canExtractContent();
            info.canEdit = permissions.canModify();
            info.canAnnotate = permissions.canModifyAnnotations();
            info.canFillForms = permissions.canFillInForm();
            info.canExtractForAccessibility = permissions.canExtractForAccessibility();
            info.canAssemble = permissions.canAssembleDocument();
            info.canPrintDegraded = permissions.canPrintDegraded();
        }
    }

   private void detectEncryptionDetails(PDDocument document, SecurityInfo info) {
    try {
        if (document.isEncrypted()) {
            PDEncryption encryption = document.getEncryption();
            if (encryption != null) {
                int length = encryption.getLength();
                String filter = encryption.getFilter();
                String subFilter = encryption.getSubFilter();

                // Determine strength
                if (length >= 256) {
                    info.encryptionStrength = "256-bit AES";
                } else if (length >= 128) {
                    info.encryptionStrength = "128-bit AES";
                } else {
                    info.encryptionStrength = length + "-bit";
                }

                // Version info
                info.encryptionVersion = "Filter: %s, SubFilter: %s".formatted(
                        filter != null ? filter : "Unknown",
                        subFilter != null ? subFilter : "Unknown");
            } else {
                info.encryptionStrength = "Unknown";
                info.encryptionVersion = "Unknown";
            }
        } else {
            info.encryptionStrength = "None";
            info.encryptionVersion = "Not Encrypted";
        }
    } catch (Exception e) {
        logger.warn("Could not determine encryption details: {}", e.getMessage());
        info.encryptionStrength = "Unknown";
        info.encryptionVersion = "Unknown";
    }
}


    private boolean hasDigitalSignatures(PDDocument document) {
        try {
            PDAcroForm acroForm = document.getDocumentCatalog().getAcroForm();
            if (acroForm != null) {
                return acroForm.getFields().stream()
                    .anyMatch(field -> field instanceof PDSignatureField);
            }
        } catch (Exception e) {
            logger.debug("Error checking for digital signatures: {}", e.getMessage());
        }
        return false;
    }

   private void addSignatureAppearance(
        PDDocument document,
        PDSignatureField signatureField,
        PDPage page,
        PDRectangle rect,
        String signerName,
        String reason
) throws IOException {

    // Attach signature field to page
    PDAnnotationWidget widget = signatureField.getWidgets().get(0);
    widget.setRectangle(rect);
    widget.setPage(page);
    page.getAnnotations().add(widget);

    // Draw appearance inside the widget rectangle
    try (PDPageContentStream contentStream = new PDPageContentStream(
            document,
            page,
            PDPageContentStream.AppendMode.APPEND,
            true,
            true)) {

        // Background
        contentStream.setNonStrokingColor(Color.WHITE);
        contentStream.addRect(rect.getLowerLeftX(), rect.getLowerLeftY(), rect.getWidth(), rect.getHeight());
        contentStream.fill();

        // Border
        contentStream.setStrokingColor(Color.BLACK);
        contentStream.addRect(rect.getLowerLeftX(), rect.getLowerLeftY(), rect.getWidth(), rect.getHeight());
        contentStream.stroke();

        // Text
        contentStream.beginText();
        contentStream.setFont(PDType1Font.HELVETICA(), 10);
        contentStream.setNonStrokingColor(Color.BLACK);

        float textX = rect.getLowerLeftX() + 5;
        float textY = rect.getLowerLeftY() + rect.getHeight() - 12;
        contentStream.newLineAtOffset(textX, textY);

        contentStream.showText("Digital Signature");

        if (signerName != null && !signerName.trim().isEmpty()) {
            contentStream.newLineAtOffset(0, -12);
            contentStream.showText("Signer: " + signerName);
        }

        if (reason != null && !reason.trim().isEmpty()) {
            contentStream.newLineAtOffset(0, -12);
            contentStream.showText("Reason: " + reason);
        }

        contentStream.newLineAtOffset(0, -12);
        contentStream.showText("Date: " +
                LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")));

        contentStream.endText();
    }
}


    private void applyRedaction(PDDocument document, RedactionArea area) throws IOException {
        PDPage page = document.getPage(area.pageNumber);
        
        try (PDPageContentStream contentStream = new PDPageContentStream(document, page, 
                PDPageContentStream.AppendMode.APPEND, true, true)) {
            
            // Create opaque black rectangle for redaction
            contentStream.setNonStrokingColor(Color.BLACK);
            contentStream.addRect(area.x, area.y, area.width, area.height);
            contentStream.fill();
            
            // Add optional "REDACTED" text
            if (area.width > 60 && area.height > 20) {
                contentStream.beginText();
                contentStream.setFont(PDType1Font.HELVETICA_BOLD(), Math.min(12, area.height / 3));
                contentStream.setNonStrokingColor(Color.WHITE);
                
                float textX = area.x + (area.width / 2) - 25;
                float textY = area.y + (area.height / 2) - 6;
                
                contentStream.newLineAtOffset(textX, textY);
                contentStream.showText("REDACTED");
                contentStream.endText();
            }
        }
    }



    /**
     * Enhanced security information class
     */
    public static class SecurityInfo {
        public boolean isEncrypted = false;
        public boolean canPrint = true;
        public boolean canCopy = true;
        public boolean canEdit = true;
        public boolean canAnnotate = true;
        public boolean canFillForms = true;
        public boolean canExtractForAccessibility = true;
        public boolean canAssemble = true;
        public boolean canPrintDegraded = true;
        public String encryptionStrength = "None";
        public String encryptionVersion = "None";
        public boolean hasDigitalSignatures = false;
        public String fileName;
        public long fileSize;
        public int pageCount;
        public String lastModified = LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);
    }

    /**
     * Enhanced redaction area class
     */
    public static class RedactionArea {
        public int pageNumber;
        public float x;
        public float y;
        public float width;
        public float height;
        public String reason; // Optional reason for redaction
        public boolean addRedactedText = true; // Whether to add "REDACTED" text
        
        public RedactionArea(int pageNumber, float x, float y, float width, float height) {
            this.pageNumber = pageNumber;
            this.x = x;
            this.y = y;
            this.width = width;
            this.height = height;
        }
        
        public RedactionArea(int pageNumber, float x, float y, float width, float height, 
                           String reason, boolean addRedactedText) {
            this(pageNumber, x, y, width, height);
            this.reason = reason;
            this.addRedactedText = addRedactedText;
        }
    }

    /**
     * Exception for security-related errors
     */
    public static class SecurityException extends Exception {
        public SecurityException(String message) {
            super(message);
        }
        
        public SecurityException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}