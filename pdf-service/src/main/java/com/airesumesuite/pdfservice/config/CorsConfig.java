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

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        List<String> origins = getAllowedOriginsList();
        String[] methods = allowedMethods.split(",");
        
        registry.addMapping("/api/**")
                .allowedOrigins(origins.toArray(new String[0]))
                .allowedMethods(methods)
                .allowedHeaders("*")
                .exposedHeaders("*")
                .allowCredentials(false);
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        
        List<String> origins = getAllowedOriginsList();
        for (String origin : origins) {
            configuration.addAllowedOrigin(origin);
        }
        
        configuration.addAllowedMethod("*");
        configuration.addAllowedHeader("*");
        configuration.setAllowCredentials(false);
        
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