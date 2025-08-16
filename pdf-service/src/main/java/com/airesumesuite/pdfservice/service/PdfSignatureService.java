package com.airesumesuite.pdfservice.service;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.apache.pdfbox.pdmodel.interactive.annotation.PDAnnotationWidget;
import org.apache.pdfbox.pdmodel.interactive.digitalsignature.PDSignature;
import org.apache.pdfbox.pdmodel.interactive.digitalsignature.SignatureInterface;
import org.apache.pdfbox.pdmodel.interactive.form.PDAcroForm;
import org.apache.pdfbox.pdmodel.interactive.form.PDField;
import org.apache.pdfbox.pdmodel.interactive.form.PDSignatureField;

import org.bouncycastle.cms.CMSProcessableByteArray;
import org.bouncycastle.cms.CMSSignedData;
import org.bouncycastle.cms.CMSSignedDataGenerator;
import org.bouncycastle.cms.CMSTypedData;
import org.bouncycastle.cms.jcajce.JcaSignerInfoGeneratorBuilder;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.bouncycastle.operator.ContentSigner;
import org.bouncycastle.operator.jcajce.JcaContentSignerBuilder;
import org.bouncycastle.operator.jcajce.JcaDigestCalculatorProviderBuilder;
import org.bouncycastle.cert.jcajce.JcaCertStore;
import org.bouncycastle.cms.jcajce.JcaSimpleSignerInfoVerifierBuilder;
import org.bouncycastle.cms.SignerInformationVerifier;
import org.bouncycastle.cms.SignerInformation;
import org.bouncycastle.cms.SignerInformationStore;
import org.bouncycastle.util.Store;
import org.bouncycastle.cert.X509CertificateHolder;
import org.bouncycastle.cert.jcajce.JcaX509CertificateConverter;
import org.apache.pdfbox.Loader;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;

import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.*;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.security.*;
import java.security.cert.*;
import java.security.cert.Certificate;
import java.util.*;
import java.util.List;
import java.util.stream.Collectors;

import org.bouncycastle.cms.CMSException;
import org.bouncycastle.operator.OperatorCreationException;
import org.bouncycastle.util.StoreException;


@Service
public class PdfSignatureService {

    static {
        Security.addProvider(new BouncyCastleProvider());
    }

    // ---------------------------
    // Visual signature (image + text)
    // ---------------------------
    public byte[] addVisualSignature(MultipartFile pdfFile, MultipartFile signatureImage,
                                     float x, float y, float width, float height,
                                     int pageNumber, String signerName, String reason) throws IOException {

        File tempInputFile = null;
        File tempOutputFile = null;

        try {
            tempInputFile = createTempFile(pdfFile, "input");
            tempOutputFile = createTempFile(null, "output");

            try (PDDocument document = Loader.loadPDF(tempInputFile)) {
                if (pageNumber > document.getNumberOfPages()) {
                    throw new IllegalArgumentException("Page number exceeds document pages");
                }

                PDPage page = document.getPage(pageNumber - 1);

                // Add image if present
                if (signatureImage != null && !signatureImage.isEmpty()) {
                    File tempImageFile = File.createTempFile("signature_img", ".tmp");
                    try (FileOutputStream fos = new FileOutputStream(tempImageFile)) {
                        fos.write(signatureImage.getBytes());
                    }

                    // Use createFromFileByExtension so PDFBox chooses the right factory.
                    PDImageXObject signatureImg = PDImageXObject.createFromFileByExtension(tempImageFile, document);

                    try (PDPageContentStream contentStream = new PDPageContentStream(
                            document, page, PDPageContentStream.AppendMode.APPEND, true, true)) {
                        contentStream.drawImage(signatureImg, x, y, width, height);
                    } finally {
                        if (tempImageFile.exists()) tempImageFile.delete();
                    }
                }

                // add text below/near the image
                try (PDPageContentStream contentStream = new PDPageContentStream(
                        document, page, PDPageContentStream.AppendMode.APPEND, true, true)) {

                    contentStream.beginText();
                    // standard font via PDType1Font + Standard14Fonts
                    contentStream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 10);
                    contentStream.setNonStrokingColor(Color.BLACK);

                    float textY = y - 15;
                    contentStream.newLineAtOffset(x, textY);
                    contentStream.showText("Signed by: " + Optional.ofNullable(signerName).orElse(""));

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

    // ---------------------------
    // Digital PKCS#12 signature using PDFBox SignatureInterface
    // ---------------------------
    public byte[] addDigitalSignature(MultipartFile pdfFile, byte[] certificateData,
                                      String certificatePassword, String reason,
                                      String location, String contactInfo) throws Exception {

        File tempInputFile = null;
        File tempOutputFile = null;

        try {
            tempInputFile = createTempFile(pdfFile, "input");
            tempOutputFile = createTempFile(null, "output");

            try (PDDocument document = Loader.loadPDF(tempInputFile)) {

                // Load keystore (PKCS12)
                KeyStore keystore = KeyStore.getInstance("PKCS12");
                try (InputStream bis = new ByteArrayInputStream(certificateData)) {
                    keystore.load(bis, certificatePassword.toCharArray());
                }

                Enumeration<String> aliases = keystore.aliases();
                if (!aliases.hasMoreElements()) {
                    throw new KeyStoreException("No aliases in keystore");
                }
                String alias = aliases.nextElement();

                PrivateKey privateKey = (PrivateKey) keystore.getKey(alias, certificatePassword.toCharArray());
                Certificate[] certificateChain = keystore.getCertificateChain(alias);
                X509Certificate signingCert = (X509Certificate) certificateChain[0];

                PDSignature signature = new PDSignature();
                signature.setFilter(PDSignature.FILTER_ADOBE_PPKLITE);
                signature.setSubFilter(PDSignature.SUBFILTER_ADBE_PKCS7_DETACHED);
                signature.setName(signingCert.getSubjectX500Principal().getName());
                signature.setLocation(location);
                signature.setReason(reason);
                signature.setContactInfo(contactInfo);
                signature.setSignDate(Calendar.getInstance());

                // create SignatureInterface for PDFBox
                SignatureInterface signatureInterface = (InputStream content) -> {
                    try {
                        // read the bytes to be signed
                        byte[] contentBytes = content.readAllBytes();

                        // build CMS signed data
                        List<Certificate> certList = Arrays.asList(certificateChain);
                        JcaCertStore certs = new JcaCertStore(certList);

                        CMSSignedDataGenerator generator = new CMSSignedDataGenerator();

                        ContentSigner sha256Signer = new JcaContentSignerBuilder("SHA256WithRSA")
                                .setProvider(BouncyCastleProvider.PROVIDER_NAME)
                                .build(privateKey);

                        generator.addSignerInfoGenerator(
                                new JcaSignerInfoGeneratorBuilder(
                                        new JcaDigestCalculatorProviderBuilder()
                                                .setProvider(BouncyCastleProvider.PROVIDER_NAME).build()
                                ).build(sha256Signer, signingCert)
                        );

                        generator.addCertificates(certs);

                        CMSTypedData cmsData = new CMSProcessableByteArray(contentBytes);
                        CMSSignedData cmsSignedData = generator.generate(cmsData, false);
                        return cmsSignedData.getEncoded();
                    } catch (IOException | CertificateEncodingException | CMSException | OperatorCreationException e) {
                        throw new IOException("Error creating signature", e);
                    }
                };

                // add signature and sign
                document.addSignature(signature, signatureInterface);

                try (FileOutputStream fos = new FileOutputStream(tempOutputFile)) {
                    document.saveIncremental(fos);
                }
            }

            return Files.readAllBytes(Paths.get(tempOutputFile.getAbsolutePath()));

        } finally {
            cleanupTempFiles(tempInputFile, tempOutputFile);
        }
    }

    // ---------------------------
    // Add text "signature" (non-crypto)
    // ---------------------------
    public byte[] addTextSignature(MultipartFile pdfFile, String signatureText,
                                   float x, float y, int pageNumber,
                                   String fontName, float fontSize, String color) throws IOException {

        File tempInputFile = null;
        File tempOutputFile = null;

        try {
            tempInputFile = createTempFile(pdfFile, "input");
            tempOutputFile = createTempFile(null, "output");

            try (PDDocument document = Loader.loadPDF(tempInputFile)) {

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

                    // draw underline
                    contentStream.setStrokingColor(signatureColor);
                    contentStream.setLineWidth(1);
                    float underlineLength = signatureText.length() * fontSize * 0.6f;
                    contentStream.moveTo(x, y - 5);
                    contentStream.lineTo(x + underlineLength, y - 5);
                    contentStream.stroke();
                }

                document.save(tempOutputFile.getAbsolutePath());
            }

            return Files.readAllBytes(tempOutputFile.toPath());

        } finally {
            cleanupTempFiles(tempInputFile, tempOutputFile);
        }
    }

    // ---------------------------
    // Generate styled signature image
    // ---------------------------
    public byte[] generateStyledSignature(String text, String style, int width, int height) throws IOException {

        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g2d = image.createGraphics();

        g2d.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g2d.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);

        g2d.setComposite(AlphaComposite.Clear);
        g2d.fillRect(0, 0, width, height);
        g2d.setComposite(AlphaComposite.SrcOver);

        Font font = getSignatureFont(style, Math.max(10, (int) Math.min(width / Math.max(1, text.length()) * 2, height - 10)));
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

    // ---------------------------
    // Verify signatures (cryptographically) - returns a Map of info
    // ---------------------------
    public Map<String, Object> verifySignature(MultipartFile pdfFile) throws IOException {
        if (Security.getProvider("BC") == null) {
            Security.addProvider(new BouncyCastleProvider());
        }

        Map<String, Object> result = new HashMap<>();
        List<Map<String, Object>> signatureDetails = new ArrayList<>();

        File tempInputFile = null;
        try {
            tempInputFile = createTempFile(pdfFile, "input");

            try (PDDocument document = Loader.loadPDF(tempInputFile)) {
                List<PDSignature> signatures = document.getSignatureDictionaries();

                result.put("hasSignatures", !signatures.isEmpty());
                result.put("signatureCount", signatures.size());

                for (PDSignature signature : signatures) {
                    Map<String, Object> sigInfo = new HashMap<>();
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
                        try (InputStream fis1 = new FileInputStream(tempInputFile)) {
                            byte[] cmsBytes = signature.getContents(fis1);
                            if (cmsBytes == null || cmsBytes.length == 0) {
                                throw new IllegalStateException("No signature contents found");
                            }

                            byte[] signedContent;
                            try (InputStream fis2 = new FileInputStream(tempInputFile)) {
                                signedContent = signature.getSignedContent(fis2);
                            }

                            CMSSignedData cmsSignedData = new CMSSignedData(
                                    new CMSProcessableByteArray(signedContent),
                                    cmsBytes
                            );

                            Store<?> certStore = cmsSignedData.getCertificates();
                            SignerInformationStore signers = cmsSignedData.getSignerInfos();
                            Collection<SignerInformation> signerCollection = (Collection<SignerInformation>) signers.getSigners();

                            if (signerCollection.isEmpty()) {
                                throw new IllegalStateException("No signers found in CMS");
                            }

                            for (SignerInformation signerInfo : signerCollection) {
                                @SuppressWarnings("unchecked")
                                Collection<X509CertificateHolder> certCollection = (Collection<X509CertificateHolder>) certStore.getMatches(signerInfo.getSID());
                                if (certCollection.isEmpty()) {
                                    throw new IllegalStateException("No certificate matching signer found");
                                }

                                certificateCount = certCollection.size();
                                X509CertificateHolder certHolder = certCollection.iterator().next();
                                signerSubject = certHolder.getSubject().toString();

                                X509Certificate signingCert = new JcaX509CertificateConverter()
                                        .setProvider("BC")
                                        .getCertificate(certHolder);

                                // cryptographic verification
                                SignerInformationVerifier verifier =
                                        new JcaSimpleSignerInfoVerifierBuilder()
                                                .setProvider("BC")
                                                .build(certHolder);

                                cryptographicValidity = signerInfo.verify(verifier);

                                // check cert dates
                                try {
                                    signingCert.checkValidity();
                                    certValidDate = true;
                                } catch (CertificateExpiredException | CertificateNotYetValidException ex) {
                                    certValidDate = false;
                                }

                                // chain validation: attempt to validate cert path using embedded certs (heuristic)
                                try {
                                    @SuppressWarnings("unchecked")
                                    List<X509Certificate> certList = ((Collection<X509CertificateHolder>) certStore.getMatches(null))
                                            .stream()
                                            .map(h -> {
                                                try {
                                                    return new JcaX509CertificateConverter().setProvider("BC").getCertificate(h);
                                                } catch (CertificateException e) {
                                                    return null;
                                                }
                                            })
                                            .filter(Objects::nonNull)
                                            .collect(Collectors.toList());

                                    if (!certList.isEmpty()) {
                                        CertificateFactory cf = CertificateFactory.getInstance("X.509", "BC");
                                        CertPath certPath = cf.generateCertPath(new ArrayList<Certificate>(certList));

                                        // heuristically pick trust anchors as any self-signed cert in the list
                                        Set<TrustAnchor> trustAnchors = new HashSet<>();
                                        for (X509Certificate c : certList) {
                                            try {
                                                c.verify(c.getPublicKey());
                                                trustAnchors.add(new TrustAnchor(c, null));
                                            } catch (InvalidKeyException | NoSuchAlgorithmException | NoSuchProviderException | SignatureException | CertificateException ignore) {
                                            }
                                        }
                                        if (trustAnchors.isEmpty()) {
                                            trustAnchors.add(new TrustAnchor(certList.get(certList.size() - 1), null));
                                        }
                                        PKIXParameters params = new PKIXParameters(trustAnchors);
                                        params.setRevocationEnabled(false);
                                        CertPathValidator validator = CertPathValidator.getInstance("PKIX", "BC");
                                        validator.validate(certPath, params);
                                        chainValidated = true;
                                    }
                                } catch (InvalidAlgorithmParameterException | NoSuchAlgorithmException | NoSuchProviderException | CertPathValidatorException | CertificateException | StoreException chainEx) {
                                    chainValidated = false;
                                }
                            }

                            // check ByteRange to see whether signature covers whole file
                            int[] byteRange = signature.getByteRange();
                            if (byteRange != null && byteRange.length == 4) {
                                long fileLen = tempInputFile.length();
                                long covered = ((long) byteRange[1]) + ((long) byteRange[3]);
                                coversWholeDocument = (covered == fileLen);
                            } else {
                                coversWholeDocument = false;
                            }
                        }
                    } catch (IOException | IllegalStateException | CertificateException | CMSException | OperatorCreationException | StoreException e) {
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
                }

                result.put("signatures", signatureDetails);
                return result;
            }

        } finally {
            cleanupTempFiles(tempInputFile);
        }
    }

    // ---------------------------
    // Add signature field (empty), using PDFBox
    // ---------------------------
    public byte[] addSignatureField(MultipartFile pdfFile, float x, float y, float width,
                                    float height, int pageNumber, String fieldName) throws IOException {

        File tempInputFile = null;
        File tempOutputFile = null;

        try {
            tempInputFile = createTempFile(pdfFile, "input");
            tempOutputFile = createTempFile(null, "output");

            try (PDDocument document = Loader.loadPDF(tempInputFile)) {

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

    // ---------------------------
    // Get signature fields (PDFBox-based)
    // ---------------------------
   public Map<String, Object> getSignatureFields(MultipartFile pdfFile) throws IOException {
    Map<String, Object> result = new HashMap<>();
    List<Map<String, Object>> fields = new ArrayList<>();
    File tempInputFile = null;

    try {
        tempInputFile = createTempFile(pdfFile, "input_");

        try (PDDocument document = Loader.loadPDF(tempInputFile)) {
            PDAcroForm acroForm = document.getDocumentCatalog().getAcroForm();

            if (acroForm != null) {
                List<PDField> allFields = acroForm.getFields();

                if (allFields != null) {
                    for (PDField field : allFields) {
                        if (field instanceof PDSignatureField signatureField) {
                            Map<String, Object> fieldInfo = new HashMap<>();
                            fieldInfo.put("name", signatureField.getPartialName());
                            fieldInfo.put("fullyQualifiedName", signatureField.getFullyQualifiedName());

                            // Retrieve signature if present
                            PDSignature signature = signatureField.getSignature();
                            if (signature != null) {
                                fieldInfo.put("isSigned", true);

                                Map<String, Object> signatureInfo = new HashMap<>();
                                signatureInfo.put("name", signature.getName());
                                signatureInfo.put("reason", signature.getReason());
                                signatureInfo.put("location", signature.getLocation());
                                signatureInfo.put("signDate", signature.getSignDate());
                                signatureInfo.put("filter", signature.getFilter());
                                signatureInfo.put("subFilter", signature.getSubFilter());
                                fieldInfo.put("signatureDetails", signatureInfo);
                            } else {
                                fieldInfo.put("isSigned", false);
                            }

                            // Widgets
                            List<PDAnnotationWidget> widgets = signatureField.getWidgets();
                            if (widgets != null && !widgets.isEmpty()) {
                                PDAnnotationWidget widget = widgets.get(0);

                                PDRectangle rect = widget.getRectangle();
                                if (rect != null) {
                                    Map<String, Float> bounds = new HashMap<>();
                                    bounds.put("x", rect.getLowerLeftX());
                                    bounds.put("y", rect.getLowerLeftY());
                                    bounds.put("width", rect.getWidth());
                                    bounds.put("height", rect.getHeight());
                                    fieldInfo.put("bounds", bounds);
                                }

                                PDPage page = widget.getPage();
                                if (page != null) {
                                    fieldInfo.put("pageNumber", getPageNumber(document, page));
                                }
                            }

                            fields.add(fieldInfo);
                        }
                    }
                }
            }

            result.put("signatureFieldCount", fields.size());
            result.put("signatureFields", fields);
            result.put("totalPages", document.getNumberOfPages());
            return result;
        }

    } finally {
        cleanupTempFiles(tempInputFile);
    }
}


    // ---------------------------
    // Helpers
    // ---------------------------
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
                try {
                    file.delete();
                } catch (Exception ignored) {
                }
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
        if (fontName == null) return new PDType1Font(Standard14Fonts.FontName.HELVETICA);

        return switch (fontName.toLowerCase()) {
            case "times", "times-roman" -> new PDType1Font(Standard14Fonts.FontName.TIMES_ROMAN);
            case "times-bold" -> new PDType1Font(Standard14Fonts.FontName.TIMES_BOLD);
            case "times-italic" -> new PDType1Font(Standard14Fonts.FontName.TIMES_ITALIC);
            case "helvetica-bold" -> new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
            case "helvetica-italic" -> new PDType1Font(Standard14Fonts.FontName.HELVETICA_OBLIQUE);
            case "courier" -> new PDType1Font(Standard14Fonts.FontName.COURIER);
            default -> new PDType1Font(Standard14Fonts.FontName.HELVETICA);
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
        if (style == null) style = "elegant";
        return switch (style.toLowerCase()) {
            case "cursive" -> new Font("Serif", Font.ITALIC, (int) size);
            case "elegant" -> new Font("Serif", Font.BOLD | Font.ITALIC, (int) size);
            case "modern" -> new Font("SansSerif", Font.PLAIN, (int) size);
            case "bold" -> new Font("SansSerif", Font.BOLD, (int) size);
            default -> new Font("Serif", Font.ITALIC, (int) size);
        };
    }
}
