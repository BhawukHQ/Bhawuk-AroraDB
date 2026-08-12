aws_region      = "us-east-1"
vpc_name        = "bhawuk-dev-vpc"
vpc_cidr        = "10.1.0.0/16"
cluster_name    = "bhawuk-dev-eks"
cluster_version = "1.30"

azs             = ["us-east-1a", "us-east-1b", "us-east-1c"]
private_subnets = ["10.1.1.0/24", "10.1.2.0/24", "10.1.3.0/24"]
public_subnets  = ["10.1.101.0/24", "10.1.102.0/24", "10.1.103.0/24"]
