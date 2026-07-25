package com.aifinancemanager.transaction.web;

import com.aifinancemanager.transaction.application.AccountService;
import com.aifinancemanager.transaction.application.IdempotencyService;
import com.aifinancemanager.transaction.web.dto.AccountResponse;
import com.aifinancemanager.transaction.web.dto.CreateAccountRequest;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/accounts")
public class AccountController {

  private final AccountService accountService;
  private final IdempotencyService idempotencyService;

  public AccountController(
      AccountService accountService, IdempotencyService idempotencyService) {
    this.accountService = accountService;
    this.idempotencyService = idempotencyService;
  }

  @GetMapping
  public List<AccountResponse> list(
      @RequestParam(defaultValue = "50") int limit) {
    return accountService.list(UserIdResolver.requireUserId(), limit);
  }

  @PostMapping
  public ResponseEntity<AccountResponse> create(
      @RequestHeader("Idempotency-Key") String idempotencyKey,
      @Valid @RequestBody CreateAccountRequest request) {
    String userId = UserIdResolver.requireUserId();
    return idempotencyService.execute(
        userId,
        "accounts.create",
        idempotencyKey,
        request,
        AccountResponse.class,
        () -> accountService.create(userId, request));
  }
}
