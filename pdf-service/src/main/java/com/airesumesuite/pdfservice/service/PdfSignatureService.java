package com.airesumesuite.pdfservice.service;


import org.bouncycastle.cms.CMSProcessableByteArray;
import org.bouncycastle.cms.CMSSignedData;
import org.bouncycastle.cms.CMSSignedDataGenerator;
import org.bouncycastle.cms.CMSTypedData;
import org.bouncycastle.cms.jcajce.JcaSignerInfoGeneratorBuilder;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.bouncycastle.operator.ContentSigner;
import org.bouncycastle.operator.jcajce.JcaContentSignerBuilder;
import org.bouncycastle.operator.jcajce.JcaDigestCalculatorProviderBuilder;
import org.sejda.sambox.pdmodel.PDDocument;
import org.sejda.sambox.pdmodel.PDPage;
import org.sejda.sambox.pdmodel.PDPageContentStream;
import org.sejda.sambox.pdmodel.common.PDRectangle;
import org.sejda.sambox.pdmodel.font.PDType1Font;
import org.sejda.sambox.pdmodel.graphics.image.PDImageXObject;
import org.sejda.sambox.pdmodel.interactive.annotation.PDAnnotationWidget;
import org.apache.pdfbox.pdmodel.interactive.digitalsignature.PDSignature;
import org.sejda.sambox.pdmodel.interactive.form.PDAcroForm;
import org.sejda.sambox.pdmodel.interactive.form.PDSignatureField;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;

import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.*;
import java.security.cert.CertPathValidatorException;
import java.security.cert.Certificate;
import java.security.cert.CertificateEncodingException;
import java.security.cert.CertificateException;
import java.security.cert.X509Certificate;
import java.util.Calendar;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.List;
import java.util.ArrayList;
import java.util.Arrays;

import org.bouncycastle.cms.CMSException;
import org.bouncycastle.cms.jcajce.JcaSimpleSignerInfoVerifierBuilder;
import org.bouncycastle.operator.OperatorCreationException;
import org.bouncycastle.util.StoreException;
import org.sejda.sambox.cos.COSBase;
import org.sejda.sambox.cos.COSDictionary;
import org.sejda.sambox.cos.COSName;
import org.sejda.sambox.pdmodel.interactive.form.PDField;

@Service
public class PdfSignatureService {

        private static final Logger logger = LoggerFactory.getLogger(PdfConversionService.class);


    static {
        Security.addProvider(new BouncyCastleProvider());
    }

    public byte[] addVisualSignature(MultipartFile pdfFile, MultipartFile signatureImage, 
                                   float x, float y, float width, float height, 
                                   int pageNumber, String signerName, String reason) throws IOException {
        
        File tempInputFile = null;
        File tempOutputFile = null;
        
        try {
            tempInputFile = createTempFile(pdfFile, "input");
            tempOutputFile = createTempFile(null, "output");
            
            try (PDDocument document = PDDocument.load(tempInputFile)) {
                
                if (pageNumber > document.getNumberOfPages()) {
                    throw new IllegalArgumentException("Page number exceeds document pages");
                }
                
                PDPage page = document.getPage(pageNumber - 1);
                
                if (signatureImage != null && !signatureImage.isEmpty()) {
                    // Create a temporary file for the image
                    File tempImageFile = File.createTempFile("signature_img", ".tmp");
                    try {
                        // Write image bytes to temporary file
                        try (FileOutputStream fos = new FileOutputStream(tempImageFile)) {
                            fos.write(signatureImage.getBytes());
                        }
                        
                        // Create PDImageXObject from file
                        PDImageXObject signatureImg = PDImageXObject.createFromFile(tempImageFile.getAbsolutePath());
                        
                        try (PDPageContentStream contentStream = new PDPageContentStream(
                                document, page, PDPageContentStream.AppendMode.APPEND, true, true)) {
                            
                            contentStream.drawImage(signatureImg, x, y, width, height);
                        }
                    } finally {
                        // Clean up temporary image file
                        if (tempImageFile.exists()) {
                            tempImageFile.delete();
                        }
                    }
                }
                
                try (PDPageContentStream contentStream = new PDPageContentStream(
                        document, page, PDPageContentStream.AppendMode.APPEND, true, true)) {
                    
                    contentStream.beginText();
                    contentStream.setFont(PDType1Font.HELVETICA(), 10);
                    contentStream.setNonStrokingColor(Color.BLACK);
                    
                    float textY = y - 15;
                    contentStream.newLineAtOffset(x, textY);
                    contentStream.showText("Signed by: " + signerName);
                    
                    contentStream.newLineAtOffset(0, -12);
                    contentStream.showText("Date: " + new Date().toString());
                    
                    if (reason != null && !reason.isEmpty()) {
                        contentStream.newLineAtOffset(0, -12);
                        contentStream.showText("Reason: " + reason);
                    }
                    
                    contentStream.endText();
                }
                
                document.save(tempOutputFile.getAbsolutePath());
            }
            
            return Files.readAllBytes(Paths.get(tempOutputFile.getAbsolutePath()));
            
        } finally {
            cleanupTempFiles(tempInputFile, tempOutputFile);
        }
    }


  public byte[] addDigitalSignature(MultipartFile pdfFile, byte[] certificateData, 
                                  String certificatePassword, String reason, 
                                  String location, String contactInfo) throws Exception {

    File tempInputFile = null;
    File tempOutputFile = null;

    try {
        tempInputFile = createTempFile(pdfFile, "input");
        tempOutputFile = createTempFile(null, "output");

        try (org.apache.pdfbox.pdmodel.PDDocument document = 
                 org.apache.pdfbox.pdmodel.PDDocument.load(tempInputFile)) {

            // Load the keystore
            KeyStore keystore = KeyStore.getInstance("PKCS12");
            keystore.load(new ByteArrayInputStream(certificateData), certificatePassword.toCharArray());

            String alias = keystore.aliases().nextElement();
            PrivateKey privateKey = (PrivateKey) keystore.getKey(alias, certificatePassword.toCharArray());
            Certificate[] certificateChain = keystore.getCertificateChain(alias);
            X509Certificate certificate = (X509Certificate) certificateChain[0];

            // Create PDFBox PDSignature
            org.apache.pdfbox.pdmodel.interactive.digitalsignature.PDSignature signature =
                    new org.apache.pdfbox.pdmodel.interactive.digitalsignature.PDSignature();
            signature.setFilter(org.apache.pdfbox.pdmodel.interactive.digitalsignature.PDSignature.FILTER_ADOBE_PPKLITE);
            signature.setSubFilter(org.apache.pdfbox.pdmodel.interactive.digitalsignature.PDSignature.SUBFILTER_ADBE_PKCS7_DETACHED);
            signature.setName(certificate.getSubjectX500Principal().getName());
            signature.setLocation(location);
            signature.setReason(reason);
            signature.setContactInfo(contactInfo);
            signature.setSignDate(Calendar.getInstance());

            // Signature interface
            org.apache.pdfbox.pdmodel.interactive.digitalsignature.SignatureInterface signatureInterface = 
                (InputStream content) -> {
                    try {
                        List<Certificate> certList = Arrays.asList(certificateChain);
                        org.bouncycastle.cert.jcajce.JcaCertStore certs = new org.bouncycastle.cert.jcajce.JcaCertStore(certList);

                        CMSSignedDataGenerator generator = new CMSSignedDataGenerator();
                        ContentSigner sha256Signer = new JcaContentSignerBuilder("SHA256WithRSA")
                                .setProvider(BouncyCastleProvider.PROVIDER_NAME)
                                .build(privateKey);

                        generator.addSignerInfoGenerator(
                                new JcaSignerInfoGeneratorBuilder(
                                        new JcaDigestCalculatorProviderBuilder()
                                                .setProvider(BouncyCastleProvider.PROVIDER_NAME)
                                                .build())
                                        .build(sha256Signer, certificate));
                        generator.addCertificates(certs);

                        byte[] contentBytes = content.readAllBytes();
                        CMSTypedData cmsData = new CMSProcessableByteArray(contentBytes);
                        CMSSignedData cmsSignedData = generator.generate(cmsData, false);

                        return cmsSignedData.getEncoded();
                    } catch (IOException | CertificateEncodingException | CMSException | OperatorCreationException e) {
                        throw new IOException("Error creating signature", e);
                    }
                };

            // Register the signature
            document.addSignature(signature, signatureInterface);

            // Save signed PDF
            try (FileOutputStream fos = new FileOutputStream(tempOutputFile)) {
                document.saveIncremental(fos);
            }
        }

        return Files.readAllBytes(Paths.get(tempOutputFile.getAbsolutePath()));

    } finally {
        cleanupTempFiles(tempInputFile, tempOutputFile);
    }
}


    public byte[] addTextSignature(MultipartFile pdfFile, String signatureText, 
                                 float x, float y, int pageNumber, 
                                 String fontName, float fontSize, String color) throws IOException {
        
        File tempInputFile = null;
        File tempOutputFile = null;
        
        try {
            tempInputFile = createTempFile(pdfFile, "input");
            tempOutputFile = createTempFile(null, "output");
            
            try (PDDocument document = PDDocument.load(tempInputFile)) {
                
                if (pageNumber > document.getNumberOfPages()) {
                    throw new IllegalArgumentException("Page number exceeds document pages");
                }
                
                PDPage page = document.getPage(pageNumber - 1);
                
                try (PDPageContentStream contentStream = new PDPageContentStream(
                        document, page, PDPageContentStream.AppendMode.APPEND, true, true)) {
                    
                    PDType1Font font = parseFontToPDType1Font(fontName);
                    contentStream.setFont(font, fontSize);
                    
                    Color signatureColor = parseColor(color);
                    contentStream.setNonStrokingColor(signatureColor);
                    
                    contentStream.beginText();
                    contentStream.newLineAtOffset(x, y);
                    contentStream.showText(signatureText);
                    contentStream.endText();
                    
                    contentStream.setStrokingColor(signatureColor);
                    contentStream.setLineWidth(1);
                    contentStream.moveTo(x, y - 5);
                    contentStream.lineTo(x + (signatureText.length() * fontSize * 0.6f), y - 5);
                    contentStream.stroke();
                }
                
                document.save(tempOutputFile.getAbsolutePath());
            }
            
            return Files.readAllBytes(tempOutputFile.toPath());
            
        } finally {
            cleanupTempFiles(tempInputFile, tempOutputFile);
        }
    }

    public byte[] generateStyledSignature(String text, String style, int width, int height) throws IOException {
        
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g2d = image.createGraphics();
        
        g2d.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g2d.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
        
        g2d.setComposite(AlphaComposite.Clear);
        g2d.fillRect(0, 0, width, height);
        g2d.setComposite(AlphaComposite.SrcOver);
        
        Font font = getSignatureFont(style, Math.min(width / text.length() * 2, height - 10));
        g2d.setFont(font);
        g2d.setColor(Color.BLUE);
        
        FontMetrics fm = g2d.getFontMetrics();
        int textWidth = fm.stringWidth(text);
        int textHeight = fm.getAscent();
        
        int x = (width - textWidth) / 2;
        int y = (height + textHeight) / 2;
        
        g2d.drawString(text, x, y);
        g2d.dispose();
        
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageIO.write(image, "PNG", baos);
        return baos.toByteArray();
    }

    public Map<String, Object> verifySignature(MultipartFile pdfFile) throws IOException, OperatorCreationException {
    // ensure BouncyCastle provider is available for PDFBox/BC crypto ops
    if (java.security.Security.getProvider("BC") == null) {
        org.bouncycastle.jce.provider.BouncyCastleProvider bc = new org.bouncycastle.jce.provider.BouncyCastleProvider();
        java.security.Security.addProvider(bc);
    }

    Map<String, Object> result = new java.util.HashMap<>();
    java.util.List<Map<String, Object>> signatureDetails = new java.util.ArrayList<>();

    File tempInputFile = null;
    try {
        tempInputFile = createTempFile(pdfFile, "input");

        // Use PDFBox PDDocument (fully qualified to avoid Sambox import)
        try (org.apache.pdfbox.pdmodel.PDDocument document =
                     org.apache.pdfbox.pdmodel.PDDocument.load(tempInputFile)) {

            java.util.List<org.apache.pdfbox.pdmodel.interactive.digitalsignature.PDSignature> signatures =
                    document.getSignatureDictionaries();

            result.put("hasSignatures", !signatures.isEmpty());
            result.put("signatureCount", signatures.size());

            for (org.apache.pdfbox.pdmodel.interactive.digitalsignature.PDSignature signature : signatures) {
                java.util.Map<String, Object> sigInfo = new java.util.HashMap<>();
                sigInfo.put("name", signature.getName());
                sigInfo.put("signDate", signature.getSignDate());
                sigInfo.put("location", signature.getLocation());
                sigInfo.put("reason", signature.getReason());
                sigInfo.put("contactInfo", signature.getContactInfo());
                sigInfo.put("filter", signature.getFilter());
                sigInfo.put("subFilter", signature.getSubFilter());

                boolean cryptographicValidity = false;
                boolean certValidDate = false;
                boolean chainValidated = false;
                boolean coversWholeDocument = false;
                String signerSubject = null;
                String verificationError = null;
                int certificateCount = 0;

                try {
                    // read CMS bytes (the signature contents) and the signed content
                    try (java.io.InputStream fis1 = new java.io.FileInputStream(tempInputFile)) {
                        byte[] cmsBytes = signature.getContents(fis1);
                        certificateCount = 0;
                        if (cmsBytes == null || cmsBytes.length == 0) {
                            throw new IllegalStateException("No signature contents found");
                        }

                        // signed content (the data that was signed)
                        byte[] signedContent;
                        try (java.io.InputStream fis2 = new java.io.FileInputStream(tempInputFile)) {
                            signedContent = signature.getSignedContent(fis2);
                        }

                        CMSSignedData cmsSignedData =
                                new CMSSignedData(
                                        new CMSProcessableByteArray(signedContent),
                                        cmsBytes);

                        org.bouncycastle.util.Store<?> certStore = cmsSignedData.getCertificates();
                        org.bouncycastle.cms.SignerInformationStore signers = cmsSignedData.getSignerInfos();
                        java.util.Collection<?> signerCollection = signers.getSigners();

                        if (signerCollection.isEmpty()) {
                            throw new IllegalStateException("No signers found in CMS");
                        }

                        // iterate signers (usually one)
                        for (Object signerObj : signerCollection) {
                            org.bouncycastle.cms.SignerInformation signerInfo =
                                    (org.bouncycastle.cms.SignerInformation) signerObj;

                            // find matching cert(s)
                            @SuppressWarnings("unchecked")
                            java.util.Collection<org.bouncycastle.cert.X509CertificateHolder> certCollection =
                                    (java.util.Collection<org.bouncycastle.cert.X509CertificateHolder>)
                                            certStore.getMatches(signerInfo.getSID());

                            if (certCollection.isEmpty()) {
                                throw new IllegalStateException("No certificate matching signer found");
                            }

                            certificateCount = certCollection.size();

                            // take first certificate as signing certificate
                            org.bouncycastle.cert.X509CertificateHolder certHolder =
                                    certCollection.iterator().next();

                            signerSubject = certHolder.getSubject().toString();

                            // convert to java.security.cert.X509Certificate
                            java.security.cert.X509Certificate signingCert =
                                    new org.bouncycastle.cert.jcajce.JcaX509CertificateConverter()
                                            .setProvider("BC").getCertificate(certHolder);

                            // cryptographic signature verification
                          JcaSimpleSignerInfoVerifierBuilder verifierBuilder =
                                    new JcaSimpleSignerInfoVerifierBuilder()
                                            .setProvider("BC");
                            org.bouncycastle.cms.SignerInformationVerifier verifier =
                                    verifierBuilder.build(certHolder);

                            cryptographicValidity = signerInfo.verify(verifier);

                            // certificate validity (date)
                            try {
                                signingCert.checkValidity();
                                certValidDate = true;
                            } catch (java.security.cert.CertificateExpiredException | java.security.cert.CertificateNotYetValidException ex) {
                                certValidDate = false;
                            }

                            // attempt chain validation using certs embedded in the signature
                            try {
                                // collect provided certs into a CertStore
                                java.util.List<java.security.cert.X509Certificate> certList = new java.util.ArrayList<>();
                                @SuppressWarnings("unchecked")
                                java.util.Collection<org.bouncycastle.cert.X509CertificateHolder> allHolders =
                                        (java.util.Collection<org.bouncycastle.cert.X509CertificateHolder>)
                                                certStore.getMatches(null);
                                for (org.bouncycastle.cert.X509CertificateHolder h : allHolders) {
                                    certList.add(new org.bouncycastle.cert.jcajce.JcaX509CertificateConverter()
                                            .setProvider("BC").getCertificate(h));
                                }

                                // Build CertPath
                                java.security.cert.CertificateFactory cf =
                                        java.security.cert.CertificateFactory.getInstance("X.509", "BC");
                                java.util.List<java.security.cert.Certificate> pathList = new java.util.ArrayList<>(certList);
                                java.security.cert.CertPath certPath = cf.generateCertPath(pathList);

                                // determine trust anchors heuristically: use self-signed certs in the provided list
                                java.util.Set<java.security.cert.TrustAnchor> trustAnchors = new java.util.HashSet<>();
                                for (java.security.cert.X509Certificate c : certList) {
                                    try {
                                        c.verify(c.getPublicKey()); // self-signed check (may throw)
                                        trustAnchors.add(new java.security.cert.TrustAnchor(c, null));
                                    } catch (InvalidKeyException | NoSuchAlgorithmException | NoSuchProviderException | SignatureException | CertificateException ignore) {
                                        // not self-signed
                                    }
                                }
                                // if no self-signed certs, pick last cert as anchor (heuristic)
                                if (trustAnchors.isEmpty() && !certList.isEmpty()) {
                                    java.security.cert.X509Certificate last = certList.get(certList.size() - 1);
                                    trustAnchors.add(new java.security.cert.TrustAnchor(last, null));
                                }

                                java.security.cert.PKIXParameters params = new java.security.cert.PKIXParameters(trustAnchors);
                                params.setRevocationEnabled(false);

                                java.security.cert.CertPathValidator validator =
                                        java.security.cert.CertPathValidator.getInstance("PKIX", "BC");
                                validator.validate(certPath, params);
                                chainValidated = true;
                            } catch (InvalidAlgorithmParameterException | NoSuchAlgorithmException | NoSuchProviderException | CertPathValidatorException | CertificateException | StoreException chainEx) {
                                chainValidated = false;
                            }
                        } // end signer loop

                        // covers whole document? check ByteRange
                        int[] byteRange = signature.getByteRange();
                        if (byteRange != null && byteRange.length == 4) {
                            long fileLen = tempInputFile.length();
                            long covered = ((long) byteRange[1]) + ((long) byteRange[3]);
                            coversWholeDocument = (covered == fileLen);
                        } else {
                            coversWholeDocument = false;
                        }
                    }
                } catch (IOException | IllegalStateException | CertificateException | CMSException | StoreException e) {
                    verificationError = e.getMessage();
                }

                sigInfo.put("isCryptographicallyValid", cryptographicValidity);
                sigInfo.put("signerSubject", signerSubject);
                sigInfo.put("certificateCount", certificateCount);
                sigInfo.put("certificateDateValid", certValidDate);
                sigInfo.put("chainValidated", chainValidated);
                sigInfo.put("coversWholeDocument", coversWholeDocument);
                if (verificationError != null) {
                    sigInfo.put("error", verificationError);
                }

                signatureDetails.add(sigInfo);
            } // end for signatures

            result.put("signatures", signatureDetails);
            return result;
        }

    } finally {
        if (tempInputFile != null) {
            try { cleanupTempFiles(tempInputFile); } catch (Exception ignored) {}
        }
    }
}


    public byte[] addSignatureField(MultipartFile pdfFile, float x, float y, float width, 
                                  float height, int pageNumber, String fieldName) throws IOException {
        
        File tempInputFile = null;
        File tempOutputFile = null;
        
        try {
            tempInputFile = createTempFile(pdfFile, "input");
            tempOutputFile = createTempFile(null, "output");
            
            try (PDDocument document = PDDocument.load(tempInputFile)) {
                
                if (pageNumber > document.getNumberOfPages()) {
                    throw new IllegalArgumentException("Page number exceeds document pages");
                }
                
                PDPage page = document.getPage(pageNumber - 1);
                
                PDAcroForm acroForm = document.getDocumentCatalog().getAcroForm();
                if (acroForm == null) {
                    acroForm = new PDAcroForm(document);
                    document.getDocumentCatalog().setAcroForm(acroForm);
                }
                
                PDSignatureField signatureField = new PDSignatureField(acroForm);
                signatureField.setPartialName(fieldName);
                
                PDAnnotationWidget widget = signatureField.getWidgets().get(0);
                PDRectangle rect = new PDRectangle(x, y, width, height);
                widget.setRectangle(rect);
                widget.setPage(page);
                
                page.getAnnotations().add(widget);
                acroForm.getFields().add(signatureField);
                
                document.save(tempOutputFile.getAbsolutePath());
            }
            
            return Files.readAllBytes(tempOutputFile.toPath());
            
        } finally {
            cleanupTempFiles(tempInputFile, tempOutputFile);
        }
    }

    public Map<String, Object> getSignatureFields(MultipartFile pdfFile) throws IOException {
    Map<String, Object> result = new HashMap<>();
    List<Map<String, Object>> fields = new ArrayList<>();
    Path tempInputFile = null;

    try {
        tempInputFile = createTempFile(pdfFile, "input_").toPath();

        try (org.sejda.sambox.pdmodel.PDDocument document =
                     org.sejda.sambox.pdmodel.PDDocument.load(tempInputFile.toFile())) {

            org.sejda.sambox.pdmodel.interactive.form.PDAcroForm acroForm =
                    document.getDocumentCatalog().getAcroForm();

            if (acroForm != null) {
                List<PDField> allFields = acroForm.getFields();

                for (PDField field : allFields) {
                    if (field instanceof PDSignatureField signatureField) {

                        Map<String, Object> fieldInfo = new HashMap<>();
                        fieldInfo.put("name", signatureField.getPartialName());
                        fieldInfo.put("fullyQualifiedName", signatureField.getFullyQualifiedName());

                        // Retrieve the raw value dictionary
                        COSBase value = signatureField.getCOSObject().getDictionaryObject(COSName.V);
                        PDSignature signature = null;
                        if (value instanceof COSDictionary) {
                            signature = new PDSignature();
                        }

                        fieldInfo.put("isSigned", signature != null);

                        if (signature != null) {
                            Map<String, Object> signatureInfo = new HashMap<>();
                            signatureInfo.put("name", signature.getName());
                            signatureInfo.put("reason", signature.getReason());
                            signatureInfo.put("location", signature.getLocation());
                            signatureInfo.put("signDate", signature.getSignDate());
                            signatureInfo.put("filter", signature.getFilter());
                            signatureInfo.put("subFilter", signature.getSubFilter());
                            fieldInfo.put("signatureDetails", signatureInfo);
                        }

                        // Widget info
                        List<org.sejda.sambox.pdmodel.interactive.annotation.PDAnnotationWidget> widgets =
                                signatureField.getWidgets();

                        if (!widgets.isEmpty()) {
                            org.sejda.sambox.pdmodel.interactive.annotation.PDAnnotationWidget widget =
                                    widgets.get(0);
                            org.sejda.sambox.pdmodel.common.PDRectangle rect = widget.getRectangle();

                            if (rect != null) {
                                Map<String, Float> bounds = new HashMap<>();
                                bounds.put("x", rect.getLowerLeftX());
                                bounds.put("y", rect.getLowerLeftY());
                                bounds.put("width", rect.getWidth());
                                bounds.put("height", rect.getHeight());
                                fieldInfo.put("bounds", bounds);
                            }

                            // Page number
                            org.sejda.sambox.pdmodel.PDPage page = widget.getPage();
                            if (page != null) {
                                fieldInfo.put("pageNumber", getPageNumber(document, page));
                            }
                        }

                        fields.add(fieldInfo);
                    }
                }
            }

            result.put("signatureFieldCount", fields.size());
            result.put("signatureFields", fields);
            result.put("totalPages", document.getNumberOfPages());
            return result;
        }

    } catch (IOException e) {
        logger.error("Error retrieving signature fields: {}", e.getMessage(), e);
        throw new IOException("Failed to retrieve signature fields: " + e.getMessage(), e);
    } finally {
        cleanupTempFiles(tempInputFile != null ? tempInputFile.toFile() : null);
    }
}




    private File createTempFile(MultipartFile file, String prefix) throws IOException {
        File tempFile = File.createTempFile(prefix + "_", ".pdf");
        if (file != null) {
            file.transferTo(tempFile);
        }
        return tempFile;
    }

    private void cleanupTempFiles(File... files) {
        for (File file : files) {
            if (file != null && file.exists()) {
                file.delete();
            }
        }
    }

    private int getPageNumber(PDDocument document, PDPage targetPage) {
        for (int i = 0; i < document.getNumberOfPages(); i++) {
            if (document.getPage(i).equals(targetPage)) {
                return i + 1;
            }
        }
        return -1;
    }

    private PDType1Font parseFontToPDType1Font(String fontName) {
    if (fontName == null) return PDType1Font.HELVETICA();
    
        return switch (fontName.toLowerCase()) {
            case "times", "times-roman" -> PDType1Font.TIMES_ROMAN();
            case "times-bold" -> PDType1Font.TIMES_BOLD();
            case "times-italic" -> PDType1Font.TIMES_ITALIC();
            case "helvetica-bold" -> PDType1Font.HELVETICA_BOLD();
            case "helvetica-italic" -> PDType1Font.HELVETICA_OBLIQUE();
            case "courier" -> PDType1Font.COURIER();
            default -> PDType1Font.HELVETICA();
        };
}

    private Color parseColor(String colorString) {
    if (colorString == null) return Color.BLUE;
    
    try {
        if (colorString.startsWith("#")) {
            return Color.decode(colorString);
        }
        
        return switch (colorString.toLowerCase()) {
            case "red" -> Color.RED;
            case "blue" -> Color.BLUE;
            case "green" -> Color.GREEN;
            case "black" -> Color.BLACK;
            case "purple" -> Color.MAGENTA;
            default -> Color.BLUE;
        };
    } catch (NumberFormatException e) {
        return Color.BLUE;
    }
}

private Font getSignatureFont(String style, float size) {
        return switch (style.toLowerCase()) {
            case "cursive" -> new Font("Serif", Font.ITALIC, (int) size);
            case "elegant" -> new Font("Serif", Font.BOLD | Font.ITALIC, (int) size);
            case "modern" -> new Font("SansSerif", Font.PLAIN, (int) size);
            case "bold" -> new Font("SansSerif", Font.BOLD, (int) size);
            default -> new Font("Serif", Font.ITALIC, (int) size);
        };
}
}