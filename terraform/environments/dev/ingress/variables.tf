variable "cluster_name" {
  type        = string
  description = "The name of the EKS cluster"
}

variable "oidc_provider_arn" {
  type        = string
  description = "The ARN of the OIDC provider for the EKS cluster"
}

variable "domain_name" {
  type        = string
  description = "The domain name for the ACM certificate (e.g. app.aroradb.bhawukarora.app)"
}
