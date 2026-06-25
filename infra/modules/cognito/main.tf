# Cognito user pool — authentication + RBAC via groups (architecture: Auth & Security).
# `user` (app) vs `admin` (ops/billing console, FR44-48) groups.
# Story 2.2: federated Apple/Google sign-in + hosted-UI OAuth (code flow).

locals {
  google_enabled = var.google_client_id != "" && var.google_client_secret != ""
  apple_enabled  = var.apple_services_id != "" && var.apple_private_key != ""

  supported_idps = compact([
    "COGNITO",
    local.google_enabled ? "Google" : "",
    local.apple_enabled ? "SignInWithApple" : "",
  ])
}

resource "aws_cognito_user_pool" "this" {
  name = "${var.name_prefix}-users"

  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  password_policy {
    minimum_length    = 12
    require_lowercase = true
    require_uppercase = true
    require_numbers   = true
    require_symbols   = true
  }

  admin_create_user_config {
    allow_admin_create_user_only = false
  }

  tags = var.tags
}

# Hosted-UI domain (required for the OAuth authorization-code flow).
resource "aws_cognito_user_pool_domain" "this" {
  domain       = var.hosted_ui_domain_prefix != "" ? var.hosted_ui_domain_prefix : "${var.name_prefix}-auth"
  user_pool_id = aws_cognito_user_pool.this.id
}

# --- Federated identity providers (credentials sourced out-of-band, never committed) ---

resource "aws_cognito_identity_provider" "google" {
  count         = local.google_enabled ? 1 : 0
  user_pool_id  = aws_cognito_user_pool.this.id
  provider_name = "Google"
  provider_type = "Google"

  provider_details = {
    client_id        = var.google_client_id
    client_secret    = var.google_client_secret
    authorize_scopes = "openid email profile"
  }

  attribute_mapping = {
    email    = "email"
    name     = "name"
    username = "sub"
  }
}

resource "aws_cognito_identity_provider" "apple" {
  count         = local.apple_enabled ? 1 : 0
  user_pool_id  = aws_cognito_user_pool.this.id
  provider_name = "SignInWithApple"
  provider_type = "SignInWithApple"

  provider_details = {
    client_id        = var.apple_services_id
    team_id          = var.apple_team_id
    key_id           = var.apple_key_id
    private_key      = var.apple_private_key
    authorize_scopes = "email name"
  }

  attribute_mapping = {
    email    = "email"
    username = "sub"
  }
}

resource "aws_cognito_user_pool_client" "this" {
  name         = "${var.name_prefix}-app-client"
  user_pool_id = aws_cognito_user_pool.this.id

  generate_secret = false

  explicit_auth_flows = [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
  ]

  # OAuth hosted-UI (authorization code flow) for federated Apple/Google sign-in.
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["code"]
  allowed_oauth_scopes                 = ["openid", "email", "profile"]
  supported_identity_providers         = local.supported_idps

  callback_urls = var.callback_urls
  logout_urls   = var.logout_urls

  # Ensure IdPs exist before the client references them.
  depends_on = [
    aws_cognito_identity_provider.google,
    aws_cognito_identity_provider.apple,
  ]
}

resource "aws_cognito_user_group" "user" {
  name         = "user"
  user_pool_id = aws_cognito_user_pool.this.id
  description  = "Standard app users."
  precedence   = 10
}

resource "aws_cognito_user_group" "admin" {
  name         = "admin"
  user_pool_id = aws_cognito_user_pool.this.id
  description  = "Operators with access to the admin/billing console (FR44-48)."
  precedence   = 1
}
