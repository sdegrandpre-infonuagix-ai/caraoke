# Public HTTPS ingress for the core API on api.caraoke.ai.
# Route 53 is authoritative for caraoke.ai (delegate the registrar's NS to this zone once).
# ACM issues a DNS-validated cert; the ALB terminates TLS; port 80 redirects to 443.

data "aws_secretsmanager_secret" "database_url" {
  name = "caraoke-dev/database-url"
}

# Hosted zone for the domain. Point your registrar's nameservers at this zone's NS records
# (output caraoke_nameservers) so the internet resolves caraoke.ai to Route 53.
resource "aws_route53_zone" "caraoke" {
  name = "caraoke.ai"
}

resource "aws_acm_certificate" "api" {
  domain_name       = "api.caraoke.ai"
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "api_cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.api.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      type   = dvo.resource_record_type
      record = dvo.resource_record_value
    }
  }

  zone_id = aws_route53_zone.caraoke.zone_id
  name    = each.value.name
  type    = each.value.type
  records = [each.value.record]
  ttl     = 60
}

resource "aws_acm_certificate_validation" "api" {
  certificate_arn         = aws_acm_certificate.api.arn
  validation_record_fqdns = [for r in aws_route53_record.api_cert_validation : r.fqdn]
}

resource "aws_security_group" "api_alb" {
  name        = "${local.name_prefix}-api-alb-sg"
  description = "Public HTTPS/HTTP ingress to the API ALB."
  vpc_id      = module.vpc.vpc_id

  ingress {
    description = "HTTPS from anywhere"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTP (redirected to HTTPS)"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "All egress"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${local.name_prefix}-api-alb-sg" }
}

resource "aws_lb" "api" {
  name               = "${local.name_prefix}-api-alb"
  load_balancer_type = "application"
  internal           = false
  subnets            = module.vpc.public_subnet_ids
  security_groups    = [aws_security_group.api_alb.id]
}

resource "aws_lb_target_group" "api" {
  name        = "${local.name_prefix}-api-tg"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = module.vpc.vpc_id
  target_type = "ip"

  health_check {
    path                = "/health"
    matcher             = "200"
    interval            = 30
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
  }
}

resource "aws_lb_listener" "api_https" {
  load_balancer_arn = aws_lb.api.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate_validation.api.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }
}

resource "aws_lb_listener" "api_http_redirect" {
  load_balancer_arn = aws_lb.api.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

resource "aws_route53_record" "api" {
  zone_id = aws_route53_zone.caraoke.zone_id
  name    = "api.caraoke.ai"
  type    = "A"

  alias {
    name                   = aws_lb.api.dns_name
    zone_id                = aws_lb.api.zone_id
    evaluate_target_health = true
  }
}

output "api_base_url" {
  description = "Public API base URL."
  value       = "https://api.caraoke.ai"
}

output "caraoke_nameservers" {
  description = "Set these as the nameservers for caraoke.ai at your registrar."
  value       = aws_route53_zone.caraoke.name_servers
}
