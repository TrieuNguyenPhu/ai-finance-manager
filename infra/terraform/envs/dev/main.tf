# Dev environment wiring. Modules are defined but not applied until networking
# and secrets are provisioned (cost + security review).

terraform {
  required_version = ">= 1.7.0"
}

# Placeholder locals only — no resources created yet.
locals {
  name_prefix = "afm-dev"
  tags = {
    Project     = "ai-finance-manager"
    Environment = "dev"
  }
}

# Example module references (commented until VPC/secrets exist):
# module "cognito" {
#   source      = "../../modules/cognito"
#   name_prefix = local.name_prefix
#   tags        = local.tags
# }
#
# Cost note: single-AZ db.t4g.micro + Lambda-only compute; no NAT/EKS.
