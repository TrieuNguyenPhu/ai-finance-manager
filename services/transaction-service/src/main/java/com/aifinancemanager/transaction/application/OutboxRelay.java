package com.aifinancemanager.transaction.application;

import com.aifinancemanager.transaction.config.OutboxProperties;
import com.aifinancemanager.transaction.domain.OutboxMessage;
import com.aifinancemanager.transaction.persistence.OutboxRepository;
import java.net.http.HttpClient;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
@ConditionalOnProperty(
    prefix = "afm.outbox",
    name = "relay-enabled",
    havingValue = "true",
    matchIfMissing = true)
@ConditionalOnProperty(
    prefix = "afm.outbox", name = "transport", havingValue = "http", matchIfMissing = true)
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
    HttpClient httpClient =
        HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build();
    JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(httpClient);
    requestFactory.setReadTimeout(Duration.ofSeconds(10));
    this.restClient = RestClient.builder().requestFactory(requestFactory).build();
  }

  @Scheduled(fixedDelayString = "${afm.outbox.poll-ms:2000}")
  public void publishPending() {
    int batchSize = Math.min(1000, Math.max(1, properties.getBatchSize()));
    List<OutboxMessage> pending =
        outboxRepository.findUnpublished(PageRequest.of(0, batchSize));
    for (OutboxMessage message : pending) {
      boolean allDelivered =
          deliver(properties.getAnalyticsUrl() + "/internal/events", message)
              & deliver(properties.getBudgetUrl() + "/internal/events", message)
              & deliver(properties.getNotificationUrl() + "/internal/events", message);
      // Only mark published when every consumer accepted the event. Consumers
      // dedupe via processed_events, so re-delivery on the next poll is safe.
      if (allDelivered) {
        message.markPublished(Instant.now(clock));
        // Keep network calls outside a database transaction. The repository
        // save opens a short transaction for this single state transition.
        outboxRepository.save(message);
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
