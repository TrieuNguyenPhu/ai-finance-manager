package com.aifinancemanager.transaction.persistence;

import com.aifinancemanager.transaction.domain.OutboxMessage;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface OutboxRepository extends JpaRepository<OutboxMessage, UUID> {
  @Query("select o from OutboxMessage o where o.publishedAt is null order by o.createdAt asc")
  List<OutboxMessage> findUnpublished(Pageable pageable);
}
