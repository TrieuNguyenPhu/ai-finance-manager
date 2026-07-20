package com.aifinancemanager.transaction.persistence;

import com.aifinancemanager.transaction.domain.LedgerEntry;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface LedgerEntryRepository extends JpaRepository<LedgerEntry, UUID> {
  List<LedgerEntry> findByUserIdOrderByOccurredAtDesc(String userId, Pageable pageable);

  Optional<LedgerEntry> findByIdAndUserId(UUID id, String userId);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select e from LedgerEntry e where e.id = :id and e.userId = :userId")
  Optional<LedgerEntry> findByIdAndUserIdForUpdate(
      @Param("id") UUID id, @Param("userId") String userId);

  boolean existsByReversesEntryId(UUID reversesEntryId);
}
