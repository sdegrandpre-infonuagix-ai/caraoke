# ECS cluster + placeholder Fargate service for a Caraoke service (architecture: API topology).
# "Express Mode" placeholder: cluster, roles, log group, and a service scaffold whose real
# image/desired_count are wired by the deploy pipeline. Reused for the core API and the
# Spotify MCP server (Story 1.6) via var.service_name.

locals {
  service = "${var.name_prefix}-${var.service_name}"
}

resource "aws_ecs_cluster" "this" {
  name = local.service

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = var.tags
}

resource "aws_cloudwatch_log_group" "this" {
  name              = "/ecs/${local.service}"
  retention_in_days = var.log_retention_in_days
  tags              = var.tags
}

data "aws_iam_policy_document" "assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "execution" {
  name               = "${local.service}-exec"
  assume_role_policy = data.aws_iam_policy_document.assume.json
  tags               = var.tags
}

resource "aws_iam_role_policy_attachment" "execution" {
  role       = aws_iam_role.execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# The EXECUTION role (not the task role) fetches container_secrets at task start, so it needs
# GetSecretValue on those secret ARNs plus KMS Decrypt when they're CMK-encrypted.
data "aws_iam_policy_document" "execution_secrets" {
  count = length(var.execution_secret_arns) > 0 ? 1 : 0

  statement {
    actions   = ["secretsmanager:GetSecretValue"]
    resources = var.execution_secret_arns
  }

  dynamic "statement" {
    for_each = var.kms_key_arn == null ? [] : [var.kms_key_arn]
    content {
      actions   = ["kms:Decrypt"]
      resources = [statement.value]
    }
  }
}

resource "aws_iam_role_policy" "execution_secrets" {
  count  = length(var.execution_secret_arns) > 0 ? 1 : 0
  name   = "${local.service}-exec-secrets"
  role   = aws_iam_role.execution.id
  policy = data.aws_iam_policy_document.execution_secrets[0].json
}

resource "aws_iam_role" "task" {
  name               = "${local.service}-task"
  assume_role_policy = data.aws_iam_policy_document.assume.json
  tags               = var.tags
}

# Optional: let the running task read specific Secrets Manager secrets at runtime
# (e.g. the Spotify MCP reads its app credentials — never hard-coded, NFR7).
data "aws_iam_policy_document" "secrets" {
  count = length(var.readable_secret_arns) > 0 ? 1 : 0

  statement {
    actions   = ["secretsmanager:GetSecretValue"]
    resources = var.readable_secret_arns
  }

  dynamic "statement" {
    for_each = var.kms_key_arn == null ? [] : [var.kms_key_arn]
    content {
      actions   = ["kms:Decrypt"]
      resources = [statement.value]
    }
  }
}

resource "aws_iam_role_policy" "task_secrets" {
  count  = length(var.readable_secret_arns) > 0 ? 1 : 0
  name   = "${local.service}-secrets"
  role   = aws_iam_role.task.id
  policy = data.aws_iam_policy_document.secrets[0].json
}

resource "aws_security_group" "service" {
  name        = "${local.service}-sg"
  description = "${local.service} egress + in-VPC ingress."
  vpc_id      = var.vpc_id

  ingress {
    description = "HTTP from inside the VPC (ALB added later)"
    from_port   = var.container_port
    to_port     = var.container_port
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

  tags = merge(var.tags, { Name = "${local.service}-sg" })
}

resource "aws_ecs_task_definition" "this" {
  family                   = local.service
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.task_cpu
  memory                   = var.task_memory
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.task.arn

  container_definitions = jsonencode([
    {
      name      = var.service_name
      image     = coalesce(var.container_image_override, var.container_image)
      essential = true
      portMappings = [
        { containerPort = var.container_port, protocol = "tcp" }
      ]
      environment = concat(
        [{ name = "NODE_ENV", value = "production" }],
        var.extra_environment,
      )
      secrets = var.container_secrets
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.this.name
          "awslogs-region"        = var.region
          "awslogs-stream-prefix" = var.service_name
        }
      }
    }
  ])

  tags = var.tags
}

resource "aws_ecs_service" "this" {
  name            = local.service
  cluster         = aws_ecs_cluster.this.id
  task_definition = aws_ecs_task_definition.this.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  health_check_grace_period_seconds = var.target_group_arn == null ? null : var.health_check_grace_period

  network_configuration {
    subnets          = var.subnet_ids
    security_groups  = [aws_security_group.service.id]
    assign_public_ip = false
  }

  # Register with the ALB/NLB target group when one is provided (public ingress).
  dynamic "load_balancer" {
    for_each = var.target_group_arn == null ? [] : [var.target_group_arn]
    content {
      target_group_arn = load_balancer.value
      container_name   = var.service_name
      container_port   = var.container_port
    }
  }

  tags = var.tags
}
