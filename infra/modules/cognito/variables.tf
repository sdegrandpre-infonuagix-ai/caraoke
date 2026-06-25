variable "name_prefix" {
  description = "Prefix for resource names, e.g. caraoke-dev."
  type        = string
}

variable "callback_urls" {
  description = "OAuth callback URLs for the app client."
  type        = list(string)
  default     = ["caraoke://auth/callback"]
}

variable "logout_urls" {
  description = "OAuth logout URLs for the app client."
  type        = list(string)
  default     = ["caraoke://auth/logout"]
}

variable "tags" {
  description = "Tags applied to all resources in this module."
  type        = map(string)
  default     = {}
}
