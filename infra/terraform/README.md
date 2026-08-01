# Terraform (aws)

Modules under `modules/`:

- `cognito` — user pool + public web client
- `rds` — single-AZ Postgres 16 (`db.t4g.micro`)
- `lambda_placeholder` — Java SnapStart-capable Lambda scaffold

`envs/dev` keeps module wiring commented until VPC, secrets, and cost review are ready. Local development uses Compose Postgres only — do not apply AWS resources before local ledger acceptance.

Terraform and the AWS provider are version-constrained and locked for Windows
and Linux CI. `make lint-terraform` validates the empty environment plus every
module, but it does not make this a deployable stack: runtime adapters,
artifacts, IAM, networking, secret management, queue mappings/DLQs, alarms, and
cost controls remain release work.
