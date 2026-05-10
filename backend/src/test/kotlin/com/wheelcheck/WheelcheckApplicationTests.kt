package com.wheelcheck

import org.junit.jupiter.api.Test
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.ActiveProfiles

@SpringBootTest
@ActiveProfiles("test")
@EnabledIfEnvironmentVariable(named = "INTEGRATION_TESTS", matches = "true")
class WheelcheckApplicationTests {

    @Test
    fun contextLoads() {
        // Application context loads successfully
    }
}
