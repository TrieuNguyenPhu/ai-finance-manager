package com.aifinancemanager.transaction.application;

public final class PageSize {

  public static final int DEFAULT = 50;
  public static final int MAX = 100;

  private PageSize() {}

  public static int normalize(int requested) {
    if (requested < 1 || requested > MAX) {
      throw new DomainException(
          "INVALID_LIMIT", "limit must be between 1 and " + MAX, 400);
    }
    return requested;
  }
}
