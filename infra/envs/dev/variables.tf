variable "region" {
  description = "AWS region. Canada-only to honor data residency (NFR10)."
  type        = string
  default     = "ca-central-1"

  validation {
    condition     = contains(["ca-central-1", "ca-west-1"], var.region)
    error_message = "Data residency (NFR10): region must be a Canadian region (ca-central-1 or ca-west-1)."
  }
}

variable "project" {
  description = "Project name used in name prefixes and tags."
  type        = string
  default     = "caraoke"
}

variable "environment" {
  description = "Environment name."
  type        = string
  default     = "dev"
}

variable "vpc_cidr" {
  description = "VPC CIDR block."
  type        = string
  default     = "10.10.0.0/16"
}

variable "azs" {
  description = "Availability zones (Canadian region — NFR10)."
  type        = list(string)
  default     = ["ca-central-1a", "ca-central-1b"]
}

variable "public_subnet_cidrs" {
  description = "Public subnet CIDRs (one per AZ)."
  type        = list(string)
  default     = ["10.10.0.0/24", "10.10.1.0/24"]
}

variable "private_subnet_cidrs" {
  description = "Private subnet CIDRs (one per AZ)."
  type        = list(string)
  default     = ["10.10.10.0/24", "10.10.11.0/24"]
}
