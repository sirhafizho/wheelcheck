package com.wheelcheck

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication
import org.springframework.scheduling.annotation.EnableAsync

@SpringBootApplication
@EnableAsync
class WheelcheckApplication

fun main(args: Array<String>) {
    runApplication<WheelcheckApplication>(*args)
}
