# prod environment (placeholder)

The `prod` environment mirrors `envs/dev` with hardened settings and is stood up in a
later story. When created it will reuse the same `../../modules/*` and differ only in
`terraform.tfvars` and a few flags:

- `deletion_protection = true` and `skip_final_snapshot = false` on Aurora
- Aurora `instance_count = 2`, larger `min_capacity` / `max_capacity`
- Redis `replicas_per_node_group >= 1` (automatic failover)
- NAT gateway per AZ (high availability)
- `desired_count >= 2` for the API service
- Remote S3 state backend enabled (see `envs/dev/backend.tf`)

Region remains a Canadian region only (`ca-central-1`) per NFR10.
