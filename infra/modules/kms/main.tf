# KMS customer-managed key for encryption at rest (NFR6).
# One key per environment encrypts Aurora, Redis, and Secrets Manager.

resource "aws_kms_key" "this" {
  description             = "${var.name_prefix} encryption-at-rest key (Aurora, Redis, Secrets)"
  deletion_window_in_days = var.deletion_window_in_days
  enable_key_rotation     = true
  tags                    = var.tags
}

resource "aws_kms_alias" "this" {
  name          = "alias/${var.name_prefix}"
  target_key_id = aws_kms_key.this.key_id
}
