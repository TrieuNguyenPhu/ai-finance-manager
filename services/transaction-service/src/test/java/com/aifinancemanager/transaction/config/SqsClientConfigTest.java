package com.aifinancemanager.transaction.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URI;
import org.junit.jupiter.api.Test;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;

class SqsClientConfigTest {

  private final SqsClientConfig config = new SqsClientConfig();

  @Test
  void usesDefaultCredentialChainWithoutLocalEndpoint() {
    var properties = new OutboxProperties();
    properties.setEndpointUrl("");
    properties.setAccessKey("must-not-be-used");
    properties.setSecretKey("must-not-be-used");

    try (var client = config.sqsClient(properties)) {
      assertThat(client.serviceClientConfiguration().credentialsProvider())
          .isInstanceOf(DefaultCredentialsProvider.class);
      assertThat(client.serviceClientConfiguration().endpointOverride()).isEmpty();
    }
  }

  @Test
  void usesStaticCredentialsOnlyWithExplicitLocalEndpoint() {
    var properties = new OutboxProperties();
    properties.setEndpointUrl("http://127.0.0.1:4566");
    properties.setAccessKey("local");
    properties.setSecretKey("local");

    try (var client = config.sqsClient(properties)) {
      assertThat(client.serviceClientConfiguration().credentialsProvider())
          .isInstanceOf(StaticCredentialsProvider.class);
      assertThat(client.serviceClientConfiguration().endpointOverride())
          .contains(URI.create("http://127.0.0.1:4566"));
    }
  }
}
