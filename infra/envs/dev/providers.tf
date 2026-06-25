provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Project       = var.project
      Environment   = var.environment
      ManagedBy     = "terraform"
      DataResidency = "canada"
    }
  }
}

# Guardrail (NFR10): fail the plan if credentials resolve to a non-Canadian region.
data "aws_region" "current" {}

check "data_residency" {
  assert {
    condition     = contains(["ca-central-1", "ca-west-1"], data.aws_region.current.name)
    error_message = "Active AWS region ${data.aws_region.current.name} is outside Canada (NFR10)."
  }
}
