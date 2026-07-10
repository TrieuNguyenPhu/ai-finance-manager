package com.aifinancemanager.transaction.application;

/**
 * Serializes requests that share an idempotency identity for the duration of
 * the caller's database transaction.
 */
public interface IdempotencyLock {

  void acquire(String userId, String scopedKey);
}
