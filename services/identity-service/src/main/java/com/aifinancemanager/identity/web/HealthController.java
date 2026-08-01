package com.aifinancemanager.identity.web;

import java.util.Map;
import javax.sql.DataSource;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {

  private final DataSource dataSource;

  public HealthController(DataSource dataSource) {
    this.dataSource = dataSource;
  }

  @GetMapping("/health")
  public Map<String, String> health() {
    return Map.of("status", "ok", "service", "identity-service");
  }

  @GetMapping("/ready")
  public ResponseEntity<Map<String, String>> ready() {
    try (var connection = dataSource.getConnection()) {
      if (connection.isValid(2)) {
        return ResponseEntity.ok(Map.of("status", "ready", "service", "identity-service"));
      }
    } catch (Exception ignored) {
      // Do not leak database details through the readiness endpoint.
    }
    return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
        .body(Map.of("status", "not_ready", "service", "identity-service"));
  }
}
