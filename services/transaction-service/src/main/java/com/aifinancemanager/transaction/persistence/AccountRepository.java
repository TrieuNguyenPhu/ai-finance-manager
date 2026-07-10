package com.aifinancemanager.transaction.persistence;

import com.aifinancemanager.transaction.domain.Account;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.JpaRepository;
import jakarta.persistence.LockModeType;

public interface AccountRepository extends JpaRepository<Account, UUID> {
  List<Account> findByUserIdOrderByCreatedAtAsc(String userId, Pageable pageable);

  Optional<Account> findByIdAndUserId(UUID id, String userId);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select a from Account a where a.id = :id and a.userId = :userId")
  Optional<Account> findByIdAndUserIdForUpdate(
      @Param("id") UUID id, @Param("userId") String userId);
}
