variable "name_prefix" {
  description = "Prefix for secret names, e.g. caraoke-dev."
  type        = string
}

variable "kms_key_arn" {
  description = "KMS key ARN encrypting the secrets (NFR6)."
  type        = string
}

variable "secret_names" {
  description = "Logical secret names to provision (values set out-of-band)."
  type        = list(string)
  default     = ["spotify", "xai", "stripe"]
}

variable "tags" {
  description = "Tags applied to all resources in this module."
  type        = map(string)
  default     = {}
}
