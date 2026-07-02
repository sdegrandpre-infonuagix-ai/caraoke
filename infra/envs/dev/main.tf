# Caraoke dev environment (Story 1.2) — wires the base infrastructure modules.
# All resources are in-region (Canada, NFR10) and KMS-encrypted at rest (NFR6).

locals {
  name_prefix = "${var.project}-${var.environment}"
}

module "kms" {
  source      = "../../modules/kms"
  name_prefix = local.name_prefix
}

module "vpc" {
  source               = "../../modules/vpc"
  name_prefix          = local.name_prefix
  cidr_block           = var.vpc_cidr
  azs                  = var.azs
  public_subnet_cidrs  = var.public_subnet_cidrs
  private_subnet_cidrs = var.private_subnet_cidrs
}

module "aurora" {
  source         = "../../modules/aurora"
  name_prefix    = local.name_prefix
  vpc_id         = module.vpc.vpc_id
  vpc_cidr_block = module.vpc.vpc_cidr_block
  subnet_ids     = module.vpc.private_subnet_ids
  kms_key_arn    = module.kms.key_arn
  engine_version = "17.9"

  # Scale to zero when idle (architecture: "Aurora Serverless ... scales to zero").
  # Trims dev cost to ~$0 for the DB when there's no traffic.
  min_capacity = 0
}

module "redis" {
  source         = "../../modules/redis"
  name_prefix    = local.name_prefix
  vpc_id         = module.vpc.vpc_id
  vpc_cidr_block = module.vpc.vpc_cidr_block
  subnet_ids     = module.vpc.private_subnet_ids
  kms_key_arn    = module.kms.key_arn
}

module "cognito" {
  source      = "../../modules/cognito"
  name_prefix = local.name_prefix
}

module "secrets" {
  source      = "../../modules/secrets"
  name_prefix = local.name_prefix
  kms_key_arn = module.kms.key_arn
}

module "api" {
  source         = "../../modules/ecs-express"
  name_prefix    = local.name_prefix
  region         = var.region
  vpc_id         = module.vpc.vpc_id
  vpc_cidr_block = module.vpc.vpc_cidr_block
  subnet_ids     = module.vpc.private_subnet_ids

  # Run the published API image behind the public ALB (api_ingress.tf).
  container_image_override = "006619322178.dkr.ecr.ca-central-1.amazonaws.com/caraoke-dev-api:latest"
  desired_count            = 1
  task_cpu                 = 512
  task_memory              = 1024
  target_group_arn         = aws_lb_target_group.api.arn
  kms_key_arn              = module.kms.key_arn

  # Live integrations: real Cognito/Redis/Spotify/LiveKit. AppSync Events isn't deployed yet
  # (APPSYNC_EVENTS_HTTP_URL unset) — the publisher is lazy, so the app boots; only the
  # synchronized-start publish fails until the Events plane is built.
  extra_environment = [
    { name = "CARAOKE_INTEGRATIONS", value = "live" },
    { name = "AWS_REGION", value = var.region },
    { name = "API_PORT", value = "3000" },
    { name = "COGNITO_USER_POOL_ID", value = module.cognito.user_pool_id },
    { name = "COGNITO_CLIENT_ID", value = module.cognito.app_client_id },
    { name = "REDIS_URL", value = "rediss://${module.redis.primary_endpoint}:6379" },
    { name = "APP_SCHEME", value = "caraoke" },
    { name = "INVITE_BASE_URL", value = "https://caraoke.app" },
    # AppSync Events (real-time delivery of playback.scheduled etc.).
    { name = "APPSYNC_EVENTS_HTTP_URL", value = "https://${aws_appsync_api.events.dns["HTTP"]}/event" },
    { name = "APPSYNC_EVENTS_API_KEY", value = aws_appsync_api_key.events.key },
  ]
  container_secrets = [
    { name = "DATABASE_URL", valueFrom = data.aws_secretsmanager_secret.database_url.arn },
    { name = "LIVEKIT_URL", valueFrom = "${data.aws_secretsmanager_secret.livekit.arn}:url::" },
    { name = "LIVEKIT_API_KEY", valueFrom = "${data.aws_secretsmanager_secret.livekit.arn}:api_key::" },
    { name = "LIVEKIT_API_SECRET", valueFrom = "${data.aws_secretsmanager_secret.livekit.arn}:api_secret::" },
    { name = "SPOTIFY_CLIENT_ID", valueFrom = "${module.secrets.secret_arns["spotify"]}:client_id::" },
    { name = "SPOTIFY_CLIENT_SECRET", valueFrom = "${module.secrets.secret_arns["spotify"]}:client_secret::" },
  ]
  execution_secret_arns = [
    data.aws_secretsmanager_secret.database_url.arn,
    data.aws_secretsmanager_secret.livekit.arn,
    module.secrets.secret_arns["spotify"],
  ]

  # The live Stripe providers fetch this secret at boot via the TASK role (SDK call, not ECS
  # injection) — grant read so live mode doesn't crash. KMS not needed (aws-managed key).
  readable_secret_arns = [data.aws_secretsmanager_secret.stripe_key.arn]
}

# LiveKit self-host + Spotify MCP are intentionally NOT applied for the road test:
# voice runs on LiveKit Cloud (creds injected into the API), and the MCP isn't needed yet.
# Re-enable these modules when moving to the self-hosted architecture.
# module "livekit" { ... }        # see git history / modules/livekit
# module "spotify_mcp" { ... }    # see git history / modules/ecs-express
