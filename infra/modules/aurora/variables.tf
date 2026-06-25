variable "name_prefix" {
  description = "Prefix for resource names, e.g. caraoke-dev."
  type        = string
}

variable "vpc_id" {
  description = "VPC ID the cluster lives in."
  type        = string
}

variable "vpc_cidr_block" {
  description = "VPC CIDR allowed to reach the database."
  type        = string
}

variable "subnet_ids" {
  description = "Private subnet IDs (>=2 AZs) for the DB subnet group."
  type        = list(string)
}

variable "kms_key_arn" {
  description = "KMS key ARN for storage + master-secret encryption (NFR6)."
  type        = string
}

variable "engine_version" {
  description = "Aurora PostgreSQL engine version."
  type        = string
  default     = "17.9"
}

variable "database_name" {
  description = "Initial database name."
  type        = string
  default     = "caraoke"
}

variable "master_username" {
  description = "Master username (password is RDS-managed in Secrets Manager)."
  type        = string
  default     = "caraoke_admin"
}

variable "min_capacity" {
  description = "Serverless v2 minimum ACUs."
  type        = number
  default     = 0.5
}

variable "max_capacity" {
  description = "Serverless v2 maximum ACUs."
  type        = number
  default     = 4
}

variable "instance_count" {
  description = "Number of cluster instances (1 for dev, 2+ for HA)."
  type        = number
  default     = 1
}

variable "backup_retention_period" {
  description = "Days to retain automated backups."
  type        = number
  default     = 7
}

variable "skip_final_snapshot" {
  description = "Skip the final snapshot on destroy (true for dev)."
  type        = bool
  default     = true
}

variable "deletion_protection" {
  description = "Protect the cluster from deletion (true for prod)."
  type        = bool
  default     = false
}

variable "tags" {
  description = "Tags applied to all resources in this module."
  type        = map(string)
  default     = {}
}
