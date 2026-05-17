package com.wheelcheck.config

import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Configuration
import org.springframework.web.servlet.config.annotation.CorsRegistry
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer

@Configuration
class WebConfig(
    @Value("\${wheelcheck.uploads.dir:uploads}") private val uploadsDir: String,
    @Value("\${wheelcheck.cors.origins:https://wheelcheck-swart.vercel.app,http://localhost:3000,http://localhost:3001}") 
    private val allowedOrigins: String
) : WebMvcConfigurer {
    
    override fun addCorsMappings(registry: CorsRegistry) {
        val origins = allowedOrigins.split(",").map { it.trim() }.toTypedArray()
        registry.addMapping("/api/**")
            .allowedOrigins(*origins)
            .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
            .allowedHeaders("*")
            .allowCredentials(true)
            .maxAge(3600)
        registry.addMapping("/uploads/**")
            .allowedOrigins(*origins)
            .allowedMethods("GET")
    }

    override fun addResourceHandlers(registry: ResourceHandlerRegistry) {
        registry.addResourceHandler("/uploads/**")
            .addResourceLocations("file:$uploadsDir/")
    }
}
