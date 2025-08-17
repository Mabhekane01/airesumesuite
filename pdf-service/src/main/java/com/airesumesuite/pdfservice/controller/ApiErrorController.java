package com.airesumesuite.pdfservice.controller;

import org.springframework.boot.web.servlet.error.ErrorController;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.http.HttpServletRequest;
import java.util.HashMap;
import java.util.Map;

/**
 * Custom error controller to handle errors as JSON responses instead of views
 */
@RestController
public class ApiErrorController implements ErrorController {

    @RequestMapping("/error")
    public ResponseEntity<Map<String, Object>> handleError(HttpServletRequest request) {
        Map<String, Object> errorResponse = new HashMap<>();
        
        // Get error details from request attributes
        Integer statusCode = (Integer) request.getAttribute("jakarta.servlet.error.status_code");
        String errorMessage = (String) request.getAttribute("jakarta.servlet.error.message");
        String requestUri = (String) request.getAttribute("jakarta.servlet.error.request_uri");
        
        // Default values if attributes are null
        if (statusCode == null) statusCode = 500;
        if (errorMessage == null) errorMessage = "Internal Server Error";
        if (requestUri == null) requestUri = "unknown";
        
        errorResponse.put("success", false);
        errorResponse.put("error", errorMessage);
        errorResponse.put("status", statusCode);
        errorResponse.put("path", requestUri);
        errorResponse.put("timestamp", System.currentTimeMillis());
        
        return ResponseEntity.status(HttpStatus.valueOf(statusCode)).body(errorResponse);
    }
}