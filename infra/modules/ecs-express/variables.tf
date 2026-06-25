variable "name_prefix" {
  description = "Prefix for resource names, e.g. caraoke-dev."
  type        = string
}

variable "region" {
  description = "AWS region (for the awslogs driver)."
  type        = string
}

variable "vpc_id" {
  description = "VPC ID the service runs in."
  type        = string
}

variable "vpc_cidr_block" {
  description = "VPC CIDR allowed to reach the service."
  type        = string
}

variable "subnet_ids" {
  description = "Private subnet IDs to place tasks in."
  type        = list(string)
}

variable "container_image" {
  description = "Container image. Defaults to a placeholder until the API image is published."
  type        = string
  default     = "public.ecr.aws/docker/library/busybox:latest"
}

variable "container_port" {
  description = "Container port the API listens on."
  type        = number
  default     = 3000
}

variable "task_cpu" {
  description = "Fargate task CPU units."
  type        = number
  default     = 256
}

variable "task_memory" {
  description = "Fargate task memory (MiB)."
  type        = number
  default     = 512
}

variable "desired_count" {
  description = "Desired task count (0 for placeholder until a real image is deployed)."
  type        = number
  default     = 0
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
