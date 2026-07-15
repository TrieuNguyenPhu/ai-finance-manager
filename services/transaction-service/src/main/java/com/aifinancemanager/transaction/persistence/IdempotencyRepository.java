package com.aifinancemanager.transaction.persistence;

import com.aifinancemanager.transaction.domain.IdempotencyRecord;
import org.springframework.data.jpa.repository.JpaRepository;

public interface IdempotencyRepository extends JpaRepository<IdempotencyRecord, IdempotencyRecord.Pk> {}
