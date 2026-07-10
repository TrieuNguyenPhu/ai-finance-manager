package com.aifinancemanager.transaction.persistence;

import com.aifinancemanager.transaction.application.IdempotencyLock;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.PreparedStatementCreator;
import org.springframework.stereotype.Repository;

@Repository
public class PostgresIdempotencyLock implements IdempotencyLock {

  private final JdbcTemplate jdbcTemplate;

  public PostgresIdempotencyLock(JdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }

  @Override
  public void acquire(String userId, String scopedKey) {
    PreparedStatementCreator statementCreator =
        connection -> {
          var statement =
              connection.prepareStatement("SELECT pg_advisory_xact_lock(hashtext(?), hashtext(?))");
          statement.setString(1, userId);
          statement.setString(2, scopedKey);
          return statement;
        };
    jdbcTemplate.execute(
        statementCreator,
        statement -> {
          statement.execute();
          return null;
        });
  }
}
