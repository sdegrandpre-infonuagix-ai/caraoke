output "nlb_dns_name" {
  description = "DNS name of the LiveKit NLB — clients connect to wss://<dns>:7880."
  value       = aws_lb.this.dns_name
}

output "signaling_url" {
  description = "WebSocket signaling URL for the LiveKit client SDK."
  value       = "ws://${aws_lb.this.dns_name}:${var.signaling_port}"
}

output "keys_secret_arn" {
  description = "ARN of the LiveKit API keys secret (value set out-of-band)."
  value       = aws_secretsmanager_secret.keys.arn
}

output "cluster_name" {
  description = "ECS cluster name running the SFU."
  value       = aws_ecs_cluster.this.name
}

output "security_group_id" {
  description = "Security group attached to the SFU tasks."
  value       = aws_security_group.service.id
}
