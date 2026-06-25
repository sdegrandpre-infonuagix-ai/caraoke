output "cluster_arn" {
  description = "ECS cluster ARN."
  value       = aws_ecs_cluster.this.arn
}

output "cluster_name" {
  description = "ECS cluster name."
  value       = aws_ecs_cluster.this.name
}

output "service_name" {
  description = "ECS service name."
  value       = aws_ecs_service.this.name
}

output "service_security_group_id" {
  description = "Security group attached to the API service."
  value       = aws_security_group.service.id
}

output "task_role_arn" {
  description = "IAM role assumed by the running task."
  value       = aws_iam_role.task.arn
}
