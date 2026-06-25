variable "name_prefix" {
  description = "Prefix for resource names, e.g. caraoke-dev."
  type        = string
}

variable "deletion_window_in_days" {
  description = "Waiting period before KMS key deletion."
  type        = number
  default     = 30
}

variable "tags" {
  description = "Tags applied to all resources in this module."
  type        = map(string)
  default     = {}
}
