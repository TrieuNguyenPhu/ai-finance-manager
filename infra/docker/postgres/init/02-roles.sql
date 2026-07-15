-- Local-only DB roles (passwords match .env.example). Not for production.

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'identity_app') THEN
    CREATE ROLE identity_app LOGIN PASSWORD 'identity_local';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'transaction_app') THEN
    CREATE ROLE transaction_app LOGIN PASSWORD 'transaction_local';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'budget_app') THEN
    CREATE ROLE budget_app LOGIN PASSWORD 'budget_local';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'analytics_app') THEN
    CREATE ROLE analytics_app LOGIN PASSWORD 'analytics_local';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'notification_app') THEN
    CREATE ROLE notification_app LOGIN PASSWORD 'notification_local';
  END IF;
END
$$;

GRANT USAGE, CREATE ON SCHEMA identity TO identity_app;
GRANT USAGE, CREATE ON SCHEMA transaction TO transaction_app;
GRANT USAGE, CREATE ON SCHEMA budget TO budget_app;
GRANT USAGE, CREATE ON SCHEMA analytics TO analytics_app;
GRANT USAGE, CREATE ON SCHEMA notification TO notification_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA identity GRANT ALL ON TABLES TO identity_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA transaction GRANT ALL ON TABLES TO transaction_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA budget GRANT ALL ON TABLES TO budget_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA analytics GRANT ALL ON TABLES TO analytics_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA notification GRANT ALL ON TABLES TO notification_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA identity GRANT ALL ON SEQUENCES TO identity_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA transaction GRANT ALL ON SEQUENCES TO transaction_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA budget GRANT ALL ON SEQUENCES TO budget_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA analytics GRANT ALL ON SEQUENCES TO analytics_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA notification GRANT ALL ON SEQUENCES TO notification_app;
