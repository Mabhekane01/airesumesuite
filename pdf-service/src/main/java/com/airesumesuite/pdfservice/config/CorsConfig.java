package com.airesumesuite.pdfservice.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.Arrays;
import java.util.List;

@Configuration
public class CorsConfig implements WebMvcConfigurer {

    @Value("${cors.allowed.origins:*}")
    private String allowedOrigins;

    @Value("${cors.allowed.methods:GET,POST,PUT,DELETE,OPTIONS}")
    private String allowedMethods;
    
    @Value("${cors.allowed.headers:*}")
    private String allowedHeaders;
    
    @Value("${cors.allow.credentials:false}")
    private boolean allowCredentials;
    
    @Value("${cors.max.age:3600}")
    private long maxAge;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        List<String> origins = getAllowedOriginsList();
        String[] methods = allowedMethods.split(",");
        String[] headers = allowedHeaders.split(",");
        
        registry.addMapping("/api/**")
                .allowedOrigins(origins.toArray(new String[0]))
                .allowedMethods(methods)
                .allowedHeaders(headers)
                .exposedHeaders("*")
                .allowCredentials(allowCredentials)
                .maxAge(maxAge);
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        
        List<String> origins = getAllowedOriginsList();
        for (String origin : origins) {
            configuration.addAllowedOrigin(origin);
        }
        
        String[] methods = allowedMethods.split(",");
        for (String method : methods) {
            configuration.addAllowedMethod(method.trim());
        }
        
        String[] headers = allowedHeaders.split(",");
        for (String header : headers) {
            configuration.addAllowedHeader(header.trim());
        }
        
        configuration.setAllowCredentials(allowCredentials);
        configuration.setMaxAge(maxAge);
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", configuration);
        return source;
    }
    
    private List<String> getAllowedOriginsList() {
        if ("*".equals(allowedOrigins)) {
            return Arrays.asList("*");
        }
        return Arrays.asList(allowedOrigins.split(","));
    }
}