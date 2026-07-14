# Terraform

Infrastructure skeleton only. **No production AWS resources are defined or applied yet.**

## Layout

- `envs/dev` — eventual development environment root
- `modules/` — reusable modules (empty until needed)

## Local checks (when modules exist)

```bash
cd infra/terraform/envs/dev
terraform init -backend=false
terraform fmt -check -recursive
terraform validate
```

Do not apply against a real AWS account until modules and a review are ready.
