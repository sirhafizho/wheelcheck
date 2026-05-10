package com.wheelcheck.integration

import org.springframework.boot.test.context.TestConfiguration
import org.springframework.context.annotation.Bean
import org.testcontainers.containers.PostgreSQLContainer
import org.testcontainers.utility.DockerImageName

@TestConfiguration
class TestContainersConfig {
    
    @Bean
    fun postgresContainer(): PostgreSQLContainer<*> {
        val container = PostgreSQLContainer(DockerImageName.parse("postgis/postgis:15-3.4"))
            .withDatabaseName("wheelcheck_test")
            .withUsername("test")
            .withPassword("test")
        
        container.start()
        
        System.setProperty("spring.datasource.url", container.jdbcUrl)
        System.setProperty("spring.datasource.username", container.username)
        System.setProperty("spring.datasource.password", container.password)
        
        return container
    }
}
