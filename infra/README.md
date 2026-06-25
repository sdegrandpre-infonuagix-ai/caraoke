# infra — Terraform

Base AWS infrastructure for Caraoke (Story 1.2). Everything lives in a Canadian region
(`ca-central-1`) to honor data residency (**NFR10**) and all data stores are encrypted at
rest with a customer-managed KMS key (**NFR6**).

## Layout

```
infra/
├── modules/
│   ├── kms/          # customer-managed encryption-at-rest key (+ rotation)
│   ├── vpc/          # VPC, public/private subnets, IGW, NAT, routes
│   ├── aurora/       # Aurora Serverless v2 — PostgreSQL 17.9 (system of record)
│   ├── redis/        # ElastiCache Redis (ephemeral state + LiveKit backend)
│   ├── cognito/      # user pool + app client + user/admin RBAC groups
│   ├── secrets/      # Secrets Manager containers (spotify/xai/stripe)
│   └── ecs-express/  # ECS cluster + placeholder Fargate API service
└── envs/
    ├── dev/          # composition root for the dev environment
    └── prod/         # placeholder (mirrors dev, hardened — later story)
```

## Provisioned in dev (Story 1.2 AC)

| Resource            | Module        | Encryption at rest (NFR6) |
| ------------------- | ------------- | ------------------------- |
| VPC + subnets       | `vpc`         | n/a                       |
| ECS service (stub)  | `ecs-express` | n/a                       |
| Aurora PG 17.9      | `aurora`      | KMS (CMK)                 |
| Redis               | `redis`       | KMS (CMK) + TLS in transit |
| Cognito user pool   | `cognito`     | AWS-managed               |
| Secrets Manager     | `secrets`     | KMS (CMK)                 |

## Usage

```bash
cd infra/envs/dev
terraform init          # add -backend-config=... to use the S3 backend (see backend.tf)
terraform fmt -recursive ../..
terraform validate
terraform plan
terraform apply         # requires AWS credentials with a Canadian default region
```

## Residency & encryption guarantees

- `region` variable is validated to a Canadian region; a `check` block also fails the plan
  if the active credentials resolve outside Canada (NFR10).
- Aurora: `storage_encrypted = true`, `kms_key_id` set; master password is RDS-managed in
  Secrets Manager and encrypted with the same CMK.
- Redis: `at_rest_encryption_enabled = true` + `kms_key_id`, `transit_encryption_enabled = true`.
- Secrets Manager: every secret sets `kms_key_id`. Secret *values* are populated out-of-band
  (console/CI) — never committed (NFR7).
