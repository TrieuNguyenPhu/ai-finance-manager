package com.aifinancemanager.transaction.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "afm.outbox")
public class OutboxProperties {

  private boolean relayEnabled = true;
  private String analyticsUrl = "http://127.0.0.1:8083";
  private String budgetUrl = "http://127.0.0.1:8082";
  private String notificationUrl = "http://127.0.0.1:8084";
  private long pollMs = 2000;
  private String internalToken = "local-internal-events-token";

  public boolean isRelayEnabled() {
    return relayEnabled;
  }

  public void setRelayEnabled(boolean relayEnabled) {
    this.relayEnabled = relayEnabled;
  }

  public String getAnalyticsUrl() {
    return analyticsUrl;
  }

  public void setAnalyticsUrl(String analyticsUrl) {
    this.analyticsUrl = analyticsUrl;
  }

  public String getBudgetUrl() {
    return budgetUrl;
  }

  public void setBudgetUrl(String budgetUrl) {
    this.budgetUrl = budgetUrl;
  }

  public String getNotificationUrl() {
    return notificationUrl;
  }

  public void setNotificationUrl(String notificationUrl) {
    this.notificationUrl = notificationUrl;
  }

  public long getPollMs() {
    return pollMs;
  }

  public void setPollMs(long pollMs) {
    this.pollMs = pollMs;
  }

  public String getInternalToken() {
    return internalToken;
  }

  public void setInternalToken(String internalToken) {
    this.internalToken = internalToken;
  }
}
