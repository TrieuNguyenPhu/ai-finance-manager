package com.aifinancemanager.transaction.persistence;

import com.aifinancemanager.transaction.domain.Account;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AccountRepository extends JpaRepository<Account, UUID> {
  List<Account> findByUserIdOrderByCreatedAtAsc(String userId);

  Optional<Account> findByIdAndUserId(UUID id, String userId);
}
