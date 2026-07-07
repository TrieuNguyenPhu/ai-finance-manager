package com.aifinancemanager.transaction.application;

import com.aifinancemanager.transaction.domain.Category;
import com.aifinancemanager.transaction.persistence.CategoryRepository;
import com.aifinancemanager.transaction.web.dto.CategoryResponse;
import com.aifinancemanager.transaction.web.dto.CreateCategoryRequest;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CategoryService {

  private final CategoryRepository categoryRepository;
  private final Clock clock;

  public CategoryService(CategoryRepository categoryRepository, Clock clock) {
    this.categoryRepository = categoryRepository;
    this.clock = clock;
  }

  @Transactional
  public CategoryResponse create(String userId, CreateCategoryRequest request) {
    Category category =
        new Category(
            UUID.randomUUID(),
            userId,
            request.name().trim(),
            request.kind(),
            Instant.now(clock));
    return CategoryResponse.from(categoryRepository.save(category));
  }

  @Transactional(readOnly = true)
  public List<CategoryResponse> list(String userId) {
    return categoryRepository.findByUserIdOrderByNameAsc(userId).stream()
        .map(CategoryResponse::from)
        .toList();
  }

  @Transactional(readOnly = true)
  public Category requireOwned(UUID categoryId, String userId) {
    return categoryRepository
        .findByIdAndUserId(categoryId, userId)
        .orElseThrow(() -> new DomainException("CATEGORY_NOT_FOUND", "Category not found", 404));
  }
}
