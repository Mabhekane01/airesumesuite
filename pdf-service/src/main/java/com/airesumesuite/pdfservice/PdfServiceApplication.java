package com.airesumesuite.pdfservice;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(scanBasePackages = "com.airesumesuite.pdfservice")
public class PdfServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(PdfServiceApplication.class, args);
    }
}