# Remote state backend (recommended for shared/CI use).
#
# Uncomment the block below, then configure with a partial backend at init:
#   terraform init \
#     -backend-config="bucket=caraoke-tfstate-dev" \
#     -backend-config="key=dev/terraform.tfstate" \
#     -backend-config="region=ca-central-1" \
#     -backend-config="dynamodb_table=caraoke-tflock-dev" \
#     -backend-config="encrypt=true"
#
# The state bucket itself must live in Canada (NFR10) and be KMS-encrypted (NFR6).
# Left commented so local state works out-of-the-box for first `terraform validate`.
#
# terraform {
#   backend "s3" {}
# }
