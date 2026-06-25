# Secrets Manager containers for third-party credentials (NFR7, architecture: Auth).
# Values are populated out-of-band (console/CI), never committed. KMS-encrypted (NFR6).

resource "aws_secretsmanager_secret" "this" {
  for_each = toset(var.secret_names)

  name        = "${var.name_prefix}/${each.value}"
  description = "${each.value} credentials for ${var.name_prefix}"
  kms_key_id  = var.kms_key_arn
  tags        = var.tags
}
