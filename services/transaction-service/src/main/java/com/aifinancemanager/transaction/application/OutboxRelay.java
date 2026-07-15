package com.aifinancemanager.transaction.application;

import com.aifinancemanager.transaction.config.OutboxProperties;
import com.aifinancemanager.transaction.domain.OutboxMessage;
import com.aifinancemanager.transaction.persistence.OutboxRepository;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

@Component
@ConditionalOnProperty(
    prefix = "afm.outbox",
    name = "relay-enabled",
    havingValue = "true",
    matchIfMissing = true)
public class OutboxRelay {

  private static final Logger log = LoggerFactory.getLogger(OutboxRelay.class);

  private final OutboxRepository outboxRepository;
  private final OutboxProperties properties;
  private final Clock clock;
  private final RestClient restClient;

  public OutboxRelay(OutboxRepository outboxRepository, OutboxProperties properties, Clock clock) {
    this.outboxRepository = outboxRepository;
    this.properties = properties;
    this.clock = clock;
    this.restClient = RestClient.create();
  }

  @Scheduled(fixedDelayString = "${afm.outbox.poll-ms:2000}")
  @Transactional
  public void publishPending() {
    List<OutboxMessage> pending = outboxRepository.findUnpublished();
    for (OutboxMessage message : pending) {
      boolean allDelivered =
          deliver(properties.getAnalyticsUrl() + "/internal/events", message)
              & deliver(properties.getBudgetUrl() + "/internal/events", message)
              & deliver(properties.getNotificationUrl() + "/internal/events", message);
      // Only mark published when every consumer accepted the event. Consumers
      // dedupe via processed_events, so re-delivery on the next poll is safe.
      if (allDelivered) {
        message.markPublished(Instant.now(clock));
      }
    }
  }

  private boolean deliver(String url, OutboxMessage message) {
    try {
      restClient
          .post()
          .uri(url)
          .contentType(MediaType.APPLICATION_JSON)
          .header("X-Internal-Token", properties.getInternalToken())
          .body(
              Map.of(
                  "eventId", message.getId().toString(),
                  "eventType", message.getEventType(),
                  "aggregateType", message.getAggregateType(),
                  "aggregateId", message.getAggregateId().toString(),
                  "payload", message.getPayload()))
          .retrieve()
          .toBodilessEntity();
      return true;
    } catch (Exception ex) {
      log.warn("Outbox deliver to {} failed for {}: {}", url, message.getId(), ex.toString());
      return false;
    }
  }
}
