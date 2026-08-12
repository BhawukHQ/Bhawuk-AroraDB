# Request ACM Certificate
resource "aws_acm_certificate" "alb_cert" {
  domain_name       = var.domain_name
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

# Note: The actual Route53 validation records would go here if Route53 is managed in the same account.
# For now, we output the DNS requirements so you can manually add them to your DNS provider.
