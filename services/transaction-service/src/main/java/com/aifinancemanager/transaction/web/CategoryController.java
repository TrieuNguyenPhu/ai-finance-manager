package com.aifinancemanager.transaction.web;

import com.aifinancemanager.transaction.application.CategoryService;
import com.aifinancemanager.transaction.web.dto.CategoryResponse;
import com.aifinancemanager.transaction.web.dto.CreateCategoryRequest;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/categories")
public class CategoryController {

  private final CategoryService categoryService;

  public CategoryController(CategoryService categoryService) {
    this.categoryService = categoryService;
  }

  @GetMapping
  public List<CategoryResponse> list(
      @RequestParam(defaultValue = "50") int limit) {
    return categoryService.list(UserIdResolver.requireUserId(), limit);
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public CategoryResponse create(@Valid @RequestBody CreateCategoryRequest request) {
    return categoryService.create(UserIdResolver.requireUserId(), request);
  }
}
