variable "function_name" {
  type = string
}

variable "runtime" {
  type        = string
  description = "e.g. java25, provided.al2023, python3.13"
}

variable "handler" {
  type = string
}

variable "role_arn" {
  type = string
}

variable "filename" {
  type        = string
  description = "Placeholder zip path for foundation scaffolding"
}

variable "snap_start" {
  type    = bool
  default = false
}

variable "tags" {
  type    = map(string)
  default = {}
}

resource "aws_lambda_function" "this" {
  function_name = var.function_name
  role          = var.role_arn
  handler       = var.handler
  runtime       = var.runtime
  filename      = var.filename
  timeout       = 30
  memory_size   = 512
  tags          = var.tags

  dynamic "snap_start" {
    for_each = var.snap_start ? [1] : []
    content {
      apply_on = "PublishedVersions"
    }
  }
}

output "function_name" {
  value = aws_lambda_function.this.function_name
}

output "arn" {
  value = aws_lambda_function.this.arn
}
