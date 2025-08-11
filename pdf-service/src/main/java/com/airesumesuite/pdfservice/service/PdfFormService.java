package com.airesumesuite.pdfservice.service;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.List;

import org.sejda.sambox.pdmodel.PDDocument;
import org.sejda.sambox.pdmodel.PDPage;
import org.sejda.sambox.pdmodel.common.PDRectangle;
import org.sejda.sambox.pdmodel.interactive.annotation.PDAnnotationWidget;
import org.sejda.sambox.pdmodel.interactive.form.PDAcroForm;
import org.sejda.sambox.pdmodel.interactive.form.PDCheckBox;
import org.sejda.sambox.pdmodel.interactive.form.PDComboBox;
import org.sejda.sambox.pdmodel.interactive.form.PDField;
import org.sejda.sambox.pdmodel.interactive.form.PDTextField;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

/**
 * Service for adding form fields to PDF documents
 */
@Service
public class PdfFormService {

    /**
     * Add text field to PDF
     */
    public byte[] addTextField(MultipartFile file, String fieldName, float x, float y, 
                              float width, float height, int pageNumber, 
                              String defaultValue, boolean required) throws IOException {
        
        File tempFile = createTempFile(file);
        File outputFile = createTempOutputFile();
        
        try (PDDocument document = PDDocument.load(tempFile)) {
            if (pageNumber > 0 && pageNumber <= document.getNumberOfPages()) {
                PDPage page = document.getPage(pageNumber - 1);
                
                // Get or create the form
                PDAcroForm acroForm = document.getDocumentCatalog().getAcroForm();
                if (acroForm == null) {
                    acroForm = new PDAcroForm(document);
                    document.getDocumentCatalog().setAcroForm(acroForm);
                }
                
                // Create text field
                PDTextField textField = new PDTextField(acroForm);
                textField.setPartialName(fieldName);
                textField.setDefaultValue(defaultValue);
                textField.setValue(defaultValue);
                textField.setRequired(required);
                
                // Create widget annotation
                PDAnnotationWidget widget = textField.getWidgets().get(0);
                widget.setRectangle(new PDRectangle(x, y, width, height));
                widget.setPage(page);
                
                // Add field to form and page
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

    /**
     * Add checkbox field to PDF
     */
    public byte[] addCheckbox(MultipartFile file, String fieldName, float x, float y, 
                             int pageNumber, boolean checked) throws IOException {
        
        File tempFile = createTempFile(file);
        File outputFile = createTempOutputFile();
        
        try (PDDocument document = PDDocument.load(tempFile)) {
            if (pageNumber > 0 && pageNumber <= document.getNumberOfPages()) {
                PDPage page = document.getPage(pageNumber - 1);
                
                // Get or create the form
                PDAcroForm acroForm = document.getDocumentCatalog().getAcroForm();
                if (acroForm == null) {
                    acroForm = new PDAcroForm(document);
                    document.getDocumentCatalog().setAcroForm(acroForm);
                }
                
                // Create checkbox field
                PDCheckBox checkBox = new PDCheckBox(acroForm);
                checkBox.setPartialName(fieldName);
                checkBox.setValue(checked ? "Yes" : "Off");
                
                // Create widget annotation
                PDAnnotationWidget widget = checkBox.getWidgets().get(0);
                widget.setRectangle(new PDRectangle(x, y, 20, 20)); // Standard checkbox size
                widget.setPage(page);
                
                // Add field to form and page
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

    /**
     * Add dropdown field to PDF
     */
    public byte[] addDropdown(MultipartFile file, String fieldName, float x, float y, 
                             float width, float height, int pageNumber, 
                             List<String> options) throws IOException {
        
        File tempFile = createTempFile(file);
        File outputFile = createTempOutputFile();
        
        try (PDDocument document = PDDocument.load(tempFile)) {
            if (pageNumber > 0 && pageNumber <= document.getNumberOfPages()) {
                PDPage page = document.getPage(pageNumber - 1);
                
                // Get or create the form
                PDAcroForm acroForm = document.getDocumentCatalog().getAcroForm();
                if (acroForm == null) {
                    acroForm = new PDAcroForm(document);
                    document.getDocumentCatalog().setAcroForm(acroForm);
                }
                
                // Create combo box (dropdown) field
                PDComboBox comboBox = new PDComboBox(acroForm);
                comboBox.setPartialName(fieldName);
                
                // Set options
                comboBox.setOptions(options);
                if (!options.isEmpty()) {
                    comboBox.setValue(options.get(0)); // Set first option as default
                }
                
                // Create widget annotation
                PDAnnotationWidget widget = comboBox.getWidgets().get(0);
                widget.setRectangle(new PDRectangle(x, y, width, height));
                widget.setPage(page);
                
                // Add field to form and page
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

    /**
     * Add radio button group to PDF
     */
    public byte[] addRadioButtonGroup(MultipartFile file, String groupName, List<RadioButtonOption> options,
                                     int pageNumber) throws IOException {
        
        File tempFile = createTempFile(file);
        File outputFile = createTempOutputFile();
        
        try (PDDocument document = PDDocument.load(tempFile)) {
            if (pageNumber > 0 && pageNumber <= document.getNumberOfPages()) {
                PDPage page = document.getPage(pageNumber - 1);
                
                // Get or create the form
                PDAcroForm acroForm = document.getDocumentCatalog().getAcroForm();
                if (acroForm == null) {
                    acroForm = new PDAcroForm(document);
                    document.getDocumentCatalog().setAcroForm(acroForm);
                }
                
                // Create radio button field group
                // Note: PDFBox radio button implementation is complex, this is a simplified version
                for (RadioButtonOption option : options) {
                    PDCheckBox radioButton = new PDCheckBox(acroForm);
                    radioButton.setPartialName(groupName + "_" + option.value);
                    radioButton.setValue(option.selected ? "Yes" : "Off");
                    
                    // Create widget annotation
                    PDAnnotationWidget widget = radioButton.getWidgets().get(0);
                    widget.setRectangle(new PDRectangle(option.x, option.y, 15, 15));
                    widget.setPage(page);
                    
                    // Add field to form and page
                    acroForm.getFields().add(radioButton);
                    page.getAnnotations().add(widget);
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
     * Get all form fields from PDF
     */
    public List<PDField> getFormFields(MultipartFile file) throws IOException {
        File tempFile = createTempFile(file);
        try (PDDocument document = PDDocument.load(tempFile)) {
            PDAcroForm acroForm = document.getDocumentCatalog().getAcroForm();
            if (acroForm != null) {
                return acroForm.getFields();
            }
            return null;
        } finally {
            cleanupTempFile(tempFile);
        }
    }

    /**
     * Fill form fields with data
     */
    public byte[] fillFormFields(MultipartFile file, java.util.Map<String, String> fieldData) throws IOException {
        File tempFile = createTempFile(file);
        File outputFile = createTempOutputFile();
        
        try (PDDocument document = PDDocument.load(tempFile)) {
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

    /**
     * Flatten form (make fields non-editable)
     */
    public byte[] flattenForm(MultipartFile file) throws IOException {
        File tempFile = createTempFile(file);
        File outputFile = createTempOutputFile();
        
        try (PDDocument document = PDDocument.load(tempFile)) {
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

    /**
     * Helper method to create temporary file from MultipartFile
     */
    private File createTempFile(MultipartFile file) throws IOException {
        Path tempFile = Files.createTempFile("pdf-form-input-", ".pdf");
        Files.copy(file.getInputStream(), tempFile, StandardCopyOption.REPLACE_EXISTING);
        File result = tempFile.toFile();
        result.deleteOnExit();
        return result;
    }

    /**
     * Helper method to create temporary output file
     */
    private File createTempOutputFile() throws IOException {
        Path tempFile = Files.createTempFile("pdf-form-output-", ".pdf");
        File result = tempFile.toFile();
        result.deleteOnExit();
        return result;
    }

    /**
     * Helper method to convert file to byte array
     */
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

    /**
     * Helper method to cleanup temporary file
     */
    private void cleanupTempFile(File tempFile) {
        if (tempFile != null && tempFile.exists()) {
            try {
                Files.delete(tempFile.toPath());
            } catch (IOException e) {
                // Log warning but don't fail - file will be deleted on JVM exit
                System.err.println("Warning: Could not delete temp file: " + tempFile.getAbsolutePath());
            }
        }
    }

    /**
     * Helper class for radio button options
     */
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