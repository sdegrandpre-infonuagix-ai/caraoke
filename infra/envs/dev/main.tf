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
}
