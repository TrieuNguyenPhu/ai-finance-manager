package com.aifinancemanager.transaction.persistence;

import com.aifinancemanager.transaction.domain.LedgerEntry;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LedgerEntryRepository extends JpaRepository<LedgerEntry, UUID> {
  List<LedgerEntry> findByUserIdOrderByOccurredAtDesc(String userId);

  Optional<LedgerEntry> findByIdAndUserId(UUID id, String userId);

  boolean existsByReversesEntryId(UUID reversesEntryId);
}
