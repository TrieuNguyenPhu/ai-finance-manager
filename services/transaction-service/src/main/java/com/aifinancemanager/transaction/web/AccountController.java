package com.aifinancemanager.transaction.web;

import com.aifinancemanager.transaction.application.AccountService;
import com.aifinancemanager.transaction.web.dto.AccountResponse;
import com.aifinancemanager.transaction.web.dto.CreateAccountRequest;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/accounts")
public class AccountController {

  private final AccountService accountService;

  public AccountController(AccountService accountService) {
    this.accountService = accountService;
  }

  @GetMapping
  public List<AccountResponse> list() {
    return accountService.list(UserIdResolver.requireUserId());
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public AccountResponse create(@Valid @RequestBody CreateAccountRequest request) {
    return accountService.create(UserIdResolver.requireUserId(), request);
  }
}
