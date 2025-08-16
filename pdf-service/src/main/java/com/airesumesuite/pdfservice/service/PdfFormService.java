package com.airesumesuite.pdfservice.service;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.List;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.cos.COSName;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDResources;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.pdfbox.pdmodel.interactive.annotation.PDAnnotationWidget;
import org.apache.pdfbox.pdmodel.interactive.form.PDAcroForm;
import org.apache.pdfbox.pdmodel.interactive.form.PDCheckBox;
import org.apache.pdfbox.pdmodel.interactive.form.PDComboBox;
import org.apache.pdfbox.pdmodel.interactive.form.PDField;
import org.apache.pdfbox.pdmodel.interactive.form.PDTextField;
import org.apache.pdfbox.pdmodel.interactive.form.PDRadioButton;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class PdfFormService {

    public byte[] addTextField(MultipartFile file, String fieldName, float x, float y,
                               float width, float height, int pageNumber,
                               String defaultValue, boolean required) throws IOException {

        File tempFile = createTempFile(file);
        File outputFile = createTempOutputFile();

        try (PDDocument document = Loader.loadPDF(tempFile)) {
            if (pageNumber > 0 && pageNumber <= document.getNumberOfPages()) {
                PDPage page = document.getPage(pageNumber - 1);

                PDAcroForm acroForm = ensureAcroFormWithDefaultAppearance(document);

                PDTextField textField = new PDTextField(acroForm);
                textField.setPartialName(fieldName);
                textField.setDefaultValue(defaultValue);
                textField.setValue(defaultValue);
                textField.setRequired(required);

                PDAnnotationWidget widget = textField.getWidgets().get(0);
                widget.setRectangle(new PDRectangle(x, y, width, height));
                widget.setPage(page);

                acroForm.getFields().add(textField);
                page.getAnnotations().add(widget);
            }

            document.save(outputFile.getAbsolutePath());
            return fileToByteArray(outputFile);
        } finally {
            cleanupTempFile(tempFile);
            cleanupTempFile(outputFile);
        }
    }

    public byte[] addCheckbox(MultipartFile file, String fieldName, float x, float y,
                              int pageNumber, boolean checked) throws IOException {

        File tempFile = createTempFile(file);
        File outputFile = createTempOutputFile();

        try (PDDocument document = Loader.loadPDF(tempFile)) {
            if (pageNumber > 0 && pageNumber <= document.getNumberOfPages()) {
                PDPage page = document.getPage(pageNumber - 1);

                PDAcroForm acroForm = ensureAcroFormWithDefaultAppearance(document);

                PDCheckBox checkBox = new PDCheckBox(acroForm);
                checkBox.setPartialName(fieldName);
                checkBox.setValue(checked ? "Yes" : "Off");

                PDAnnotationWidget widget = checkBox.getWidgets().get(0);
                widget.setRectangle(new PDRectangle(x, y, 20, 20));
                widget.setPage(page);

                acroForm.getFields().add(checkBox);
                page.getAnnotations().add(widget);
            }

            document.save(outputFile.getAbsolutePath());
            return fileToByteArray(outputFile);
        } finally {
            cleanupTempFile(tempFile);
            cleanupTempFile(outputFile);
        }
    }

    public byte[] addDropdown(MultipartFile file, String fieldName, float x, float y,
                              float width, float height, int pageNumber,
                              List<String> options) throws IOException {

        File tempFile = createTempFile(file);
        File outputFile = createTempOutputFile();

        try (PDDocument document = Loader.loadPDF(tempFile)) {
            if (pageNumber > 0 && pageNumber <= document.getNumberOfPages()) {
                PDPage page = document.getPage(pageNumber - 1);

                PDAcroForm acroForm = ensureAcroFormWithDefaultAppearance(document);

                PDComboBox comboBox = new PDComboBox(acroForm);
                comboBox.setPartialName(fieldName);

                List<String> opts = new ArrayList<>(options);
                comboBox.setOptions(opts);
                if (!opts.isEmpty()) {
                    comboBox.setValue(opts.get(0));
                }

                PDAnnotationWidget widget = comboBox.getWidgets().get(0);
                widget.setRectangle(new PDRectangle(x, y, width, height));
                widget.setPage(page);

                acroForm.getFields().add(comboBox);
                page.getAnnotations().add(widget);
            }

            document.save(outputFile.getAbsolutePath());
            return fileToByteArray(outputFile);
        } finally {
            cleanupTempFile(tempFile);
            cleanupTempFile(outputFile);
        }
    }

    public byte[] addRadioButtonGroup(MultipartFile file, String groupName, List<RadioButtonOption> options,
                                      int pageNumber) throws IOException {

        File tempFile = createTempFile(file);
        File outputFile = createTempOutputFile();

        try (PDDocument document = Loader.loadPDF(tempFile)) {
            if (pageNumber > 0 && pageNumber <= document.getNumberOfPages()) {
                PDPage page = document.getPage(pageNumber - 1);

                PDAcroForm acroForm = ensureAcroFormWithDefaultAppearance(document);

                PDRadioButton radio = new PDRadioButton(acroForm);
                radio.setPartialName(groupName);

                List<String> exportValues = new ArrayList<>();
                for (RadioButtonOption opt : options) {
                    exportValues.add(opt.value);
                }
                radio.setExportValues(exportValues);

                for (RadioButtonOption opt : options) {
                    PDAnnotationWidget widget = new PDAnnotationWidget();
                    widget.setRectangle(new PDRectangle(opt.x, opt.y, 15, 15));
                    widget.setPage(page);
                    radio.getWidgets().add(widget);
                    page.getAnnotations().add(widget);
                }

                String selectedValue = null;
                for (RadioButtonOption opt : options) {
                    if (opt.selected) {
                        selectedValue = opt.value;
                        break;
                    }
                }
                if (selectedValue != null) {
                    radio.setValue(selectedValue);
                } else {
                    radio.setValue("Off");
                }

                acroForm.getFields().add(radio);
            }

            document.save(outputFile.getAbsolutePath());
            return fileToByteArray(outputFile);
        } finally {
            cleanupTempFile(tempFile);
            cleanupTempFile(outputFile);
        }
    }

    public List<PDField> getFormFields(MultipartFile file) throws IOException {
        File tempFile = createTempFile(file);
        try (PDDocument document = Loader.loadPDF(tempFile)) {
            PDAcroForm acroForm = document.getDocumentCatalog().getAcroForm();
            if (acroForm != null) {
                return acroForm.getFields();
            }
            return null;
        } finally {
            cleanupTempFile(tempFile);
        }
    }

    public byte[] fillFormFields(MultipartFile file, java.util.Map<String, String> fieldData) throws IOException {
        File tempFile = createTempFile(file);
        File outputFile = createTempOutputFile();

        try (PDDocument document = Loader.loadPDF(tempFile)) {
            PDAcroForm acroForm = document.getDocumentCatalog().getAcroForm();

            if (acroForm != null) {
                for (java.util.Map.Entry<String, String> entry : fieldData.entrySet()) {
                    PDField field = acroForm.getField(entry.getKey());
                    if (field != null) {
                        field.setValue(entry.getValue());
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

    public byte[] flattenForm(MultipartFile file) throws IOException {
        File tempFile = createTempFile(file);
        File outputFile = createTempOutputFile();

        try (PDDocument document = Loader.loadPDF(tempFile)) {
            PDAcroForm acroForm = document.getDocumentCatalog().getAcroForm();

            if (acroForm != null) {
                acroForm.flatten();
            }

            document.save(outputFile.getAbsolutePath());
            return fileToByteArray(outputFile);
        } finally {
            cleanupTempFile(tempFile);
            cleanupTempFile(outputFile);
        }
    }

    private File createTempFile(MultipartFile file) throws IOException {
        Path tempFile = Files.createTempFile("pdf-form-input-", ".pdf");
        Files.copy(file.getInputStream(), tempFile, StandardCopyOption.REPLACE_EXISTING);
        File result = tempFile.toFile();
        result.deleteOnExit();
        return result;
    }

    private File createTempOutputFile() throws IOException {
        Path tempFile = Files.createTempFile("pdf-form-output-", ".pdf");
        File result = tempFile.toFile();
        result.deleteOnExit();
        return result;
    }

    private byte[] fileToByteArray(File file) throws IOException {
        try (FileInputStream fis = new FileInputStream(file);
             ByteArrayOutputStream baos = new ByteArrayOutputStream()) {

            byte[] buffer = new byte[8192];
            int bytesRead;
            while ((bytesRead = fis.read(buffer)) != -1) {
                baos.write(buffer, 0, bytesRead);
            }
            return baos.toByteArray();
        }
    }

    private void cleanupTempFile(File tempFile) {
        if (tempFile != null && tempFile.exists()) {
            try {
                Files.delete(tempFile.toPath());
            } catch (IOException e) {
                System.err.println("Warning: Could not delete temp file: " + tempFile.getAbsolutePath());
            }
        }
    }

    private PDAcroForm ensureAcroFormWithDefaultAppearance(PDDocument document) {
        PDAcroForm acroForm = document.getDocumentCatalog().getAcroForm();
        if (acroForm == null) {
            acroForm = new PDAcroForm(document);
            document.getDocumentCatalog().setAcroForm(acroForm);
        }

        if (acroForm.getDefaultResources() == null) {
            PDResources resources = new PDResources();
            PDFont font = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            resources.put(COSName.getPDFName("Helv"), font);
            acroForm.setDefaultResources(resources);
        }

        if (acroForm.getDefaultAppearance() == null || acroForm.getDefaultAppearance().isEmpty()) {
            acroForm.setDefaultAppearance("/Helv 12 Tf 0 g");
        }

        return acroForm;
    }

    public static class RadioButtonOption {
        public String value;
        public float x;
        public float y;
        public boolean selected;

        public RadioButtonOption(String value, float x, float y, boolean selected) {
            this.value = value;
            this.x = x;
            this.y = y;
            this.selected = selected;
        }
    }
}
