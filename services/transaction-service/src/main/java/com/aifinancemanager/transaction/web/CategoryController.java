package com.aifinancemanager.transaction.web;

import com.aifinancemanager.transaction.application.CategoryService;
import com.aifinancemanager.transaction.application.IdempotencyService;
import com.aifinancemanager.transaction.web.dto.CategoryResponse;
import com.aifinancemanager.transaction.web.dto.CreateCategoryRequest;
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
@RequestMapping("/categories")
public class CategoryController {

  private final CategoryService categoryService;
  private final IdempotencyService idempotencyService;

  public CategoryController(
      CategoryService categoryService, IdempotencyService idempotencyService) {
    this.categoryService = categoryService;
    this.idempotencyService = idempotencyService;
  }

  @GetMapping
  public List<CategoryResponse> list(
      @RequestParam(defaultValue = "50") int limit) {
    return categoryService.list(UserIdResolver.requireUserId(), limit);
  }

  @PostMapping
  public ResponseEntity<CategoryResponse> create(
      @RequestHeader("Idempotency-Key") String idempotencyKey,
      @Valid @RequestBody CreateCategoryRequest request) {
    String userId = UserIdResolver.requireUserId();
    return idempotencyService.execute(
        userId,
        "categories.create",
        idempotencyKey,
        request,
        CategoryResponse.class,
        () -> categoryService.create(userId, request));
  }
}
