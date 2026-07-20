package com.aifinancemanager.transaction.application;

import com.aifinancemanager.transaction.config.OutboxProperties;
import com.aifinancemanager.transaction.domain.OutboxMessage;
import com.aifinancemanager.transaction.persistence.OutboxRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.sqs.model.SendMessageRequest;

@Component
@ConditionalOnProperty(
    prefix = "afm.outbox", name = "relay-enabled", havingValue = "true", matchIfMissing = true)
@ConditionalOnProperty(prefix = "afm.outbox", name = "transport", havingValue = "sqs")
public class SqsOutboxRelay {

  private static final Logger log = LoggerFactory.getLogger(SqsOutboxRelay.class);

  private final OutboxRepository outboxRepository;
  private final OutboxProperties properties;
  private final Clock clock;
  private final SqsClient sqsClient;
  private final ObjectMapper objectMapper;

  public SqsOutboxRelay(
      OutboxRepository outboxRepository,
      OutboxProperties properties,
      Clock clock,
      SqsClient sqsClient,
      ObjectMapper objectMapper) {
    this.outboxRepository = outboxRepository;
    this.properties = properties;
    this.clock = clock;
    this.sqsClient = sqsClient;
    this.objectMapper = objectMapper;
  }

  @Scheduled(fixedDelayString = "${afm.outbox.poll-ms:2000}")
  public void publishPending() {
    int batchSize = Math.min(1000, Math.max(1, properties.getBatchSize()));
    List<OutboxMessage> pending =
        outboxRepository.findUnpublished(PageRequest.of(0, batchSize));
    for (OutboxMessage message : pending) {
      if (deliver(properties.getBudgetQueueUrl(), message)
          && deliver(properties.getAnalyticsQueueUrl(), message)
          && deliver(properties.getNotificationQueueUrl(), message)) {
        message.markPublished(Instant.now(clock));
        outboxRepository.save(message);
      }
    }
  }

  private boolean deliver(String queueUrl, OutboxMessage message) {
    try {
      String body =
          objectMapper.writeValueAsString(
              Map.of(
                  "eventId", message.getId().toString(),
                  "eventType", message.getEventType(),
                  "aggregateType", message.getAggregateType(),
                  "aggregateId", message.getAggregateId().toString(),
                  "payload", message.getPayload()));
      sqsClient.sendMessage(SendMessageRequest.builder().queueUrl(queueUrl).messageBody(body).build());
      return true;
    } catch (Exception ex) {
      log.warn("Outbox SQS deliver to {} failed for {}: {}", queueUrl, message.getId(), ex.toString());
      return false;
    }
  }
}
