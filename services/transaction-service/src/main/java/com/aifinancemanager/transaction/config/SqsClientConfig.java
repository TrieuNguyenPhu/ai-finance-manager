package com.aifinancemanager.transaction.config;

import java.net.URI;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.sqs.SqsClient;

@Configuration
@ConditionalOnProperty(prefix = "afm.outbox", name = "transport", havingValue = "sqs")
public class SqsClientConfig {

  @Bean(destroyMethod = "close")
  SqsClient sqsClient(OutboxProperties properties) {
    var builder =
        SqsClient.builder()
            .region(Region.of(properties.getAwsRegion()))
            .credentialsProvider(
                StaticCredentialsProvider.create(
                    AwsBasicCredentials.create(properties.getAccessKey(), properties.getSecretKey())));
    if (properties.getEndpointUrl() != null && !properties.getEndpointUrl().isBlank()) {
      builder.endpointOverride(URI.create(properties.getEndpointUrl()));
    }
    return builder.build();
  }
}
