package com.aifinancemanager.transaction.persistence;

import com.aifinancemanager.transaction.domain.Category;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CategoryRepository extends JpaRepository<Category, UUID> {
  List<Category> findByUserIdOrderByNameAsc(String userId, Pageable pageable);

  Optional<Category> findByIdAndUserId(UUID id, String userId);
}
