output "cluster_endpoint" {
  description = "Writer endpoint for the Aurora cluster."
  value       = aws_rds_cluster.this.endpoint
}

output "reader_endpoint" {
  description = "Reader endpoint for the Aurora cluster."
  value       = aws_rds_cluster.this.reader_endpoint
}

output "port" {
  description = "Database port."
  value       = aws_rds_cluster.this.port
}

output "database_name" {
  description = "Initial database name."
  value       = aws_rds_cluster.this.database_name
}

output "security_group_id" {
  description = "Security group guarding the cluster."
  value       = aws_security_group.this.id
}

output "master_user_secret_arn" {
  description = "ARN of the RDS-managed master credentials secret."
  value       = try(aws_rds_cluster.this.master_user_secret[0].secret_arn, null)
}
