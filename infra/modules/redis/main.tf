# Redis (ElastiCache) — ephemeral/real-time state + LiveKit distributed backend
# (architecture: Data Architecture). Encrypted at rest (KMS) and in transit (NFR6).

resource "aws_elasticache_subnet_group" "this" {
  name       = "${var.name_prefix}-redis"
  subnet_ids = var.subnet_ids
  tags       = var.tags
}

resource "aws_security_group" "this" {
  name        = "${var.name_prefix}-redis-sg"
  description = "Redis access from within the VPC only."
  vpc_id      = var.vpc_id

  ingress {
    description = "Redis from inside the VPC"
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr_block]
  }

  egress {
    description = "Allow all egress"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, { Name = "${var.name_prefix}-redis-sg" })
}

resource "aws_elasticache_replication_group" "this" {
  replication_group_id = "${var.name_prefix}-redis"
  description          = "${var.name_prefix} ephemeral session/presence + LiveKit state"
  engine               = "redis"
  engine_version       = var.engine_version
  node_type            = var.node_type
  port                 = 6379

  num_node_groups         = 1
  replicas_per_node_group = var.replicas_per_node_group

  subnet_group_name  = aws_elasticache_subnet_group.this.name
  security_group_ids = [aws_security_group.this.id]

  # Encryption (NFR6).
  at_rest_encryption_enabled = true
  kms_key_id                 = var.kms_key_arn
  transit_encryption_enabled = true

  automatic_failover_enabled = var.replicas_per_node_group > 0
  apply_immediately          = true

  tags = var.tags
}
