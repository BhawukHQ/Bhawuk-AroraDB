variable "aws_region" {
  description = "AWS region to deploy to."
  type        = string
  default     = "us-east-1"
}

variable "common_tags" {
  description = "Map of default tags for all AWS resources."
  type        = map(string)
  default = {
    Project     = "Bhawuk-AroraDB"
    Environment = "bootstrap"
    Owner       = "BhawukArora"
    ManagedBy   = "terraform"
    CostCenter  = "1001"
  }
}
