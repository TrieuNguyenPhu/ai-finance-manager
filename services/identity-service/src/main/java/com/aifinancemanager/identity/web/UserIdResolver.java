package com.aifinancemanager.identity.web;

import com.aifinancemanager.identity.application.DomainException;
import org.springframework.util.StringUtils;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

public final class UserIdResolver {

  public static final String USER_ID_HEADER = "X-User-Id";

  private UserIdResolver() {}

  public static String requireUserId() {
    RequestAttributes attrs = RequestContextHolder.getRequestAttributes();
    if (!(attrs instanceof ServletRequestAttributes servletAttrs)) {
      throw new DomainException("UNAUTHORIZED", "Missing authenticated user", 401);
    }
    String userId = servletAttrs.getRequest().getHeader(USER_ID_HEADER);
    if (!StringUtils.hasText(userId)) {
      throw new DomainException("UNAUTHORIZED", "X-User-Id header is required", 401);
    }
    return userId.trim();
  }
}
