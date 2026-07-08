package com.aifinancemanager.transaction;

import com.aifinancemanager.transaction.config.OutboxProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
@EnableConfigurationProperties(OutboxProperties.class)
public class TransactionApplication {

  public static void main(String[] args) {
    SpringApplication.run(TransactionApplication.class, args);
  }
}
