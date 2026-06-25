output "region" {
  description = "Deployment region."
  value       = var.region
}

output "kms_key_arn" {
  description = "Encryption-at-rest KMS key ARN."
  value       = module.kms.key_arn
}

output "vpc_id" {
  description = "VPC ID."
  value       = module.vpc.vpc_id
}

output "aurora_cluster_endpoint" {
  description = "Aurora writer endpoint."
  value       = module.aurora.cluster_endpoint
}

output "aurora_master_user_secret_arn" {
  description = "ARN of the RDS-managed Aurora master credentials secret."
  value       = module.aurora.master_user_secret_arn
}

output "redis_primary_endpoint" {
  description = "Redis primary endpoint."
  value       = module.redis.primary_endpoint
}

output "cognito_user_pool_id" {
  description = "Cognito user pool ID."
  value       = module.cognito.user_pool_id
}

output "cognito_app_client_id" {
  description = "Cognito app client ID."
  value       = module.cognito.app_client_id
}

output "secret_arns" {
  description = "Map of integration secret ARNs."
  value       = module.secrets.secret_arns
}

output "ecs_cluster_name" {
  description = "ECS cluster name for the core API."
  value       = module.api.cluster_name
}
