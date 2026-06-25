variable "name_prefix" {
  description = "Prefix for resource names, e.g. caraoke-dev."
  type        = string
}

variable "region" {
  description = "AWS region (for the awslogs driver)."
  type        = string
}

variable "vpc_id" {
  description = "VPC ID the SFU runs in."
  type        = string
}

variable "public_subnet_ids" {
  description = "Public subnet IDs for the internet-facing NLB."
  type        = list(string)
}

variable "private_subnet_ids" {
  description = "Private subnet IDs to place SFU tasks in."
  type        = list(string)
}

variable "redis_address" {
  description = "Existing Redis primary endpoint (distributed state, AR6). TLS assumed."
  type        = string
}

variable "kms_key_arn" {
  description = "KMS key ARN encrypting the LiveKit keys secret (NFR6)."
  type        = string
}

variable "container_image" {
  description = "LiveKit server image (pinned)."
  type        = string
  default     = "livekit/livekit-server:v1.8"
}

variable "signaling_port" {
  description = "TCP signaling/WebSocket port."
  type        = number
  default     = 7880
}

variable "tcp_port" {
  description = "ICE/TCP media fallback port."
  type        = number
  default     = 7881
}

variable "udp_port" {
  description = "WebRTC media UDP port (single-port mode)."
  type        = number
  default     = 7882
}

variable "internal" {
  description = "Make the NLB internal (true) or internet-facing (false)."
  type        = bool
  default     = false
}

variable "desired_count" {
  description = "Number of SFU tasks (scale horizontally via Redis)."
  type        = number
  default     = 1
}

variable "task_cpu" {
  description = "Fargate task CPU units."
  type        = number
  default     = 1024
}

variable "task_memory" {
  description = "Fargate task memory (MiB)."
  type        = number
  default     = 2048
}

variable "log_retention_in_days" {
  description = "CloudWatch log retention."
  type        = number
  default     = 30
}

variable "tags" {
  description = "Tags applied to all resources in this module."
  type        = map(string)
  default     = {}
}
