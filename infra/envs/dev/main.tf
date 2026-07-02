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

  # Deploy #1 uses mock integrations so the app boots without AppSync/LiveKit/Spotify config;
  # this proves the reachable pipeline (ALB -> ECS -> /health). Flip to "live" + inject the
  # LiveKit/Spotify secrets once those creds are populated.
  extra_environment = [
    { name = "CARAOKE_INTEGRATIONS", value = "mock" },
    { name = "AWS_REGION", value = var.region },
    { name = "API_PORT", value = "3000" },
    { name = "COGNITO_USER_POOL_ID", value = module.cognito.user_pool_id },
    { name = "COGNITO_CLIENT_ID", value = module.cognito.app_client_id },
    { name = "REDIS_URL", value = "rediss://${module.redis.primary_endpoint}:6379" },
    { name = "APP_SCHEME", value = "caraoke" },
    { name = "INVITE_BASE_URL", value = "https://caraoke.app" },
  ]
  container_secrets = [
    { name = "DATABASE_URL", valueFrom = data.aws_secretsmanager_secret.database_url.arn },
  ]
  execution_secret_arns = [data.aws_secretsmanager_secret.database_url.arn]
}

# LiveKit self-host + Spotify MCP are intentionally NOT applied for the road test:
# voice runs on LiveKit Cloud (creds injected into the API), and the MCP isn't needed yet.
# Re-enable these modules when moving to the self-hosted architecture.
# module "livekit" { ... }        # see git history / modules/livekit
# module "spotify_mcp" { ... }    # see git history / modules/ecs-express
