package com.wheelcheck

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication
class WheelcheckApplication

fun main(args: Array<String>) {
    runApplication<WheelcheckApplication>(*args)
}
