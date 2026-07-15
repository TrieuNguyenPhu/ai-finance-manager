# Terraform (aws)

Modules under `modules/`:

- `cognito` — user pool + public web client
- `rds` — single-AZ Postgres 16 (`db.t4g.micro`)
- `lambda_placeholder` — Java SnapStart-capable Lambda scaffold

`envs/dev` keeps module wiring commented until VPC, secrets, and cost review are ready. Local development uses Compose Postgres only — do not apply AWS resources before local ledger acceptance.
