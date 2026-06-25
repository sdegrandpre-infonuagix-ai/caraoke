variable "name_prefix" {
  description = "Prefix for resource names, e.g. caraoke-dev."
  type        = string
}

variable "vpc_id" {
  description = "VPC ID the cluster lives in."
  type        = string
}

variable "vpc_cidr_block" {
  description = "VPC CIDR allowed to reach Redis."
  type        = string
}

variable "subnet_ids" {
  description = "Private subnet IDs for the cache subnet group."
  type        = list(string)
}

variable "kms_key_arn" {
  description = "KMS key ARN for at-rest encryption (NFR6)."
  type        = string
}

variable "engine_version" {
  description = "Redis engine version."
  type        = string
  default     = "7.1"
}

variable "node_type" {
  description = "ElastiCache node type."
  type        = string
  default     = "cache.t4g.micro"
}

variable "replicas_per_node_group" {
  description = "Read replicas per shard (0 for dev, >=1 for HA)."
  type        = number
  default     = 0
}

variable "tags" {
  description = "Tags applied to all resources in this module."
  type        = map(string)
  default     = {}
}
