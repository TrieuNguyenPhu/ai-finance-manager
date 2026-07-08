variable "name_prefix" {
  type = string
}

variable "vpc_subnet_ids" {
  type        = list(string)
  description = "Private subnet IDs for RDS"
}

variable "vpc_security_group_ids" {
  type = list(string)
}

variable "db_username" {
  type = string
}

variable "db_password" {
  type      = string
  sensitive = true
}

variable "tags" {
  type    = map(string)
  default = {}
}

resource "aws_db_subnet_group" "main" {
  name       = "${var.name_prefix}-db"
  subnet_ids = var.vpc_subnet_ids
  tags       = var.tags
}

resource "aws_db_instance" "main" {
  identifier                 = "${var.name_prefix}-postgres"
  engine                     = "postgres"
  engine_version             = "16"
  instance_class             = "db.t4g.micro"
  allocated_storage          = 20
  max_allocated_storage      = 50
  db_subnet_group_name       = aws_db_subnet_group.main.name
  vpc_security_group_ids     = var.vpc_security_group_ids
  username                   = var.db_username
  password                   = var.db_password
  db_name                    = "afm"
  publicly_accessible        = false
  multi_az                   = false
  backup_retention_period    = 7
  deletion_protection        = true
  skip_final_snapshot        = false
  auto_minor_version_upgrade = true
  storage_encrypted          = true
  tags                       = var.tags
}

output "endpoint" {
  value = aws_db_instance.main.address
}

output "port" {
  value = aws_db_instance.main.port
}
