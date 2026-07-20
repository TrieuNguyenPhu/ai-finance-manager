package com.aifinancemanager.transaction.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "afm.outbox")
public class OutboxProperties {

  private boolean relayEnabled = true;
  private String transport = "http";
  private String analyticsUrl = "http://127.0.0.1:8083";
  private String budgetUrl = "http://127.0.0.1:8082";
  private String notificationUrl = "http://127.0.0.1:8084";
  private long pollMs = 2000;
  private int batchSize = 100;
  private String internalToken = "local-internal-events-token";
  private String awsRegion = "ap-southeast-1";
  private String endpointUrl = "";
  private String accessKey = "local";
  private String secretKey = "local";
  private String budgetQueueUrl = "http://127.0.0.1:4566/000000000000/budget-events";
  private String analyticsQueueUrl = "http://127.0.0.1:4566/000000000000/analytics-events";
  private String notificationQueueUrl = "http://127.0.0.1:4566/000000000000/notification-events";

  public boolean isRelayEnabled() {
    return relayEnabled;
  }

  public void setRelayEnabled(boolean relayEnabled) {
    this.relayEnabled = relayEnabled;
  }

  public String getTransport() {
    return transport;
  }

  public void setTransport(String transport) {
    this.transport = transport;
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

  public int getBatchSize() {
    return batchSize;
  }

  public void setBatchSize(int batchSize) {
    this.batchSize = batchSize;
  }

  public String getInternalToken() {
    return internalToken;
  }

  public void setInternalToken(String internalToken) {
    this.internalToken = internalToken;
  }

  public String getAwsRegion() {
    return awsRegion;
  }

  public void setAwsRegion(String awsRegion) {
    this.awsRegion = awsRegion;
  }

  public String getEndpointUrl() {
    return endpointUrl;
  }

  public void setEndpointUrl(String endpointUrl) {
    this.endpointUrl = endpointUrl;
  }

  public String getAccessKey() {
    return accessKey;
  }

  public void setAccessKey(String accessKey) {
    this.accessKey = accessKey;
  }

  public String getSecretKey() {
    return secretKey;
  }

  public void setSecretKey(String secretKey) {
    this.secretKey = secretKey;
  }

  public String getBudgetQueueUrl() {
    return budgetQueueUrl;
  }

  public void setBudgetQueueUrl(String budgetQueueUrl) {
    this.budgetQueueUrl = budgetQueueUrl;
  }

  public String getAnalyticsQueueUrl() {
    return analyticsQueueUrl;
  }

  public void setAnalyticsQueueUrl(String analyticsQueueUrl) {
    this.analyticsQueueUrl = analyticsQueueUrl;
  }

  public String getNotificationQueueUrl() {
    return notificationQueueUrl;
  }

  public void setNotificationQueueUrl(String notificationQueueUrl) {
    this.notificationQueueUrl = notificationQueueUrl;
  }
}
