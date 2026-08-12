output "acm_certificate_arn" {
  description = "The ARN of the requested ACM certificate"
  value       = aws_acm_certificate.alb_cert.arn
}

output "acm_validation_records" {
  description = "DNS records required to validate the ACM certificate if not using automated Route53 validation"
  value       = aws_acm_certificate.alb_cert.domain_validation_options
}
