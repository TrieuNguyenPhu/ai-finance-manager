package com.aifinancemanager.transaction.application;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;

import com.aifinancemanager.transaction.config.OutboxProperties;
import com.aifinancemanager.transaction.persistence.OutboxRepository;
import java.time.Clock;
import org.junit.jupiter.api.Test;

class OutboxRelayTest {

  @Test
  void failsFastWhenInternalAuthenticationIsMissing() {
    var properties = new OutboxProperties();
    properties.setInternalToken("");

    assertThrows(
        IllegalStateException.class,
        () -> new OutboxRelay(mock(OutboxRepository.class), properties, Clock.systemUTC()));
  }
}
