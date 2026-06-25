output "secret_arns" {
  description = "Map of logical secret name to its ARN."
  value       = { for k, s in aws_secretsmanager_secret.this : k => s.arn }
}
