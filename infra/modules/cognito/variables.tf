variable "name_prefix" {
  description = "Prefix for resource names, e.g. caraoke-dev."
  type        = string
}

variable "hosted_ui_domain_prefix" {
  description = "Cognito hosted-UI domain prefix (defaults to <name_prefix>-auth)."
  type        = string
  default     = ""
}

variable "google_client_id" {
  description = "Google OAuth client ID (set out-of-band; empty disables Google)."
  type        = string
  default     = ""
}

variable "google_client_secret" {
  description = "Google OAuth client secret."
  type        = string
  default     = ""
  sensitive   = true
}

variable "apple_services_id" {
  description = "Apple Services ID (client_id; empty disables Apple)."
  type        = string
  default     = ""
}

variable "apple_team_id" {
  description = "Apple Developer Team ID."
  type        = string
  default     = ""
}

variable "apple_key_id" {
  description = "Apple Sign in with Apple key ID."
  type        = string
  default     = ""
}

variable "apple_private_key" {
  description = "Apple private key (.p8 contents)."
  type        = string
  default     = ""
  sensitive   = true
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
