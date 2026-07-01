# Self-hosted LiveKit SFU (Story 1.5) — the production live-voice plane for Epic 4.
# Runs on ECS Fargate in ca-central-1 (NFR10), behind a Network Load Balancer for
# TCP signaling + UDP media, using the existing Redis for distributed state (AR6).
#
# Encryption (NFR6): WebRTC media is SRTP/DTLS end-to-end by construction (LiveKit), and
# Redis is reached over TLS. API keys live in KMS-encrypted Secrets Manager — never inline.
#
# This SFU is entirely independent of the throwaway WebRTC in tools/phase0-harness (Story 1.3).

locals {
  # Non-secret LiveKit config. API keys are injected separately via LIVEKIT_KEYS (secret).
  # use_external_ip lets the SFU advertise the address clients reach it on (the NLB).
  config_body = <<-YAML
    port: ${var.signaling_port}
    log_level: info
    rtc:
      tcp_port: ${var.tcp_port}
      udp_port: ${var.udp_port}
      use_external_ip: true
    redis:
      address: ${var.redis_address}:6379
      use_tls: true
    turn:
      enabled: false
  YAML
}

resource "aws_secretsmanager_secret" "keys" {
  name        = "${var.name_prefix}/livekit"
  description = "LiveKit API keys (apikey: secret map). Value set out-of-band."
  kms_key_id  = var.kms_key_arn
  tags        = var.tags
}

resource "aws_ecs_cluster" "this" {
  name = "${var.name_prefix}-livekit"
  setting {
    name  = "containerInsights"
    value = "enabled"
  }
  tags = var.tags
}

resource "aws_cloudwatch_log_group" "this" {
  name              = "/ecs/${var.name_prefix}-livekit"
  retention_in_days = var.log_retention_in_days
  tags              = var.tags
}

# --- IAM ---------------------------------------------------------------------

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
  name               = "${var.name_prefix}-livekit-exec"
  assume_role_policy = data.aws_iam_policy_document.assume.json
  tags               = var.tags
}

resource "aws_iam_role_policy_attachment" "execution" {
  role       = aws_iam_role.execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Allow the task to read the LiveKit keys secret (and decrypt it with the CMK).
data "aws_iam_policy_document" "secrets" {
  statement {
    actions   = ["secretsmanager:GetSecretValue"]
    resources = [aws_secretsmanager_secret.keys.arn]
  }
  statement {
    actions   = ["kms:Decrypt"]
    resources = [var.kms_key_arn]
  }
}

resource "aws_iam_role_policy" "execution_secrets" {
  name   = "${var.name_prefix}-livekit-secrets"
  role   = aws_iam_role.execution.id
  policy = data.aws_iam_policy_document.secrets.json
}

resource "aws_iam_role" "task" {
  name               = "${var.name_prefix}-livekit-task"
  assume_role_policy = data.aws_iam_policy_document.assume.json
  tags               = var.tags
}

# --- Networking --------------------------------------------------------------

resource "aws_security_group" "service" {
  name        = "${var.name_prefix}-livekit-sg"
  description = "LiveKit SFU — signaling (TCP) + media (UDP) from clients."
  vpc_id      = var.vpc_id

  ingress {
    description = "Signaling / WebSocket"
    from_port   = var.signaling_port
    to_port     = var.signaling_port
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "ICE/TCP media fallback"
    from_port   = var.tcp_port
    to_port     = var.tcp_port
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "WebRTC media (UDP)"
    from_port   = var.udp_port
    to_port     = var.udp_port
    protocol    = "udp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "Allow all egress"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, { Name = "${var.name_prefix}-livekit-sg" })
}

resource "aws_lb" "this" {
  name                             = "${var.name_prefix}-livekit"
  load_balancer_type               = "network"
  internal                         = var.internal
  subnets                          = var.public_subnet_ids
  enable_cross_zone_load_balancing = true
  tags                             = var.tags
}

resource "aws_lb_target_group" "signaling" {
  name        = "${var.name_prefix}-lk-sig"
  port        = var.signaling_port
  protocol    = "TCP"
  target_type = "ip"
  vpc_id      = var.vpc_id

  health_check {
    protocol            = "TCP"
    port                = tostring(var.signaling_port)
    healthy_threshold   = 2
    unhealthy_threshold = 2
    interval            = 10
  }

  tags = var.tags
}

resource "aws_lb_target_group" "tcp" {
  name        = "${var.name_prefix}-lk-tcp"
  port        = var.tcp_port
  protocol    = "TCP"
  target_type = "ip"
  vpc_id      = var.vpc_id

  health_check {
    protocol = "TCP"
    port     = tostring(var.signaling_port)
  }

  tags = var.tags
}

resource "aws_lb_target_group" "udp" {
  name        = "${var.name_prefix}-lk-udp"
  port        = var.udp_port
  protocol    = "UDP"
  target_type = "ip"
  vpc_id      = var.vpc_id

  # UDP target groups require a non-UDP health check; probe the signaling TCP port.
  health_check {
    protocol = "TCP"
    port     = tostring(var.signaling_port)
  }

  tags = var.tags
}

resource "aws_lb_listener" "signaling" {
  load_balancer_arn = aws_lb.this.arn
  port              = var.signaling_port
  protocol          = "TCP"
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.signaling.arn
  }
}

resource "aws_lb_listener" "tcp" {
  load_balancer_arn = aws_lb.this.arn
  port              = var.tcp_port
  protocol          = "TCP"
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.tcp.arn
  }
}

resource "aws_lb_listener" "udp" {
  load_balancer_arn = aws_lb.this.arn
  port              = var.udp_port
  protocol          = "UDP"
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.udp.arn
  }
}

# --- Service -----------------------------------------------------------------

resource "aws_ecs_task_definition" "this" {
  family                   = "${var.name_prefix}-livekit"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.task_cpu
  memory                   = var.task_memory
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.task.arn

  container_definitions = jsonencode([
    {
      name      = "livekit"
      image     = var.container_image
      essential = true
      # Config comes from the LIVEKIT_CONFIG_BODY env below; keys from the LIVEKIT_KEYS secret.
      portMappings = [
        { containerPort = var.signaling_port, protocol = "tcp" },
        { containerPort = var.tcp_port, protocol = "tcp" },
        { containerPort = var.udp_port, protocol = "udp" }
      ]
      environment = [
        { name = "LIVEKIT_CONFIG_BODY", value = local.config_body }
      ]
      secrets = [
        { name = "LIVEKIT_KEYS", valueFrom = aws_secretsmanager_secret.keys.arn }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.this.name
          "awslogs-region"        = var.region
          "awslogs-stream-prefix" = "livekit"
        }
      }
    }
  ])

  tags = var.tags
}

resource "aws_ecs_service" "this" {
  name            = "${var.name_prefix}-livekit"
  cluster         = aws_ecs_cluster.this.id
  task_definition = aws_ecs_task_definition.this.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.service.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.signaling.arn
    container_name   = "livekit"
    container_port   = var.signaling_port
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.tcp.arn
    container_name   = "livekit"
    container_port   = var.tcp_port
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.udp.arn
    container_name   = "livekit"
    container_port   = var.udp_port
  }

  depends_on = [
    aws_lb_listener.signaling,
    aws_lb_listener.tcp,
    aws_lb_listener.udp,
  ]

  tags = var.tags
}
