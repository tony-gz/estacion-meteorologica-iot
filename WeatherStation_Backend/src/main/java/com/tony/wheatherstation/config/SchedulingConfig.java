package com.tony.wheatherstation.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/** Habilita la ejecución programada (motor de alertas). */
@Configuration
@EnableScheduling
public class SchedulingConfig {
}
