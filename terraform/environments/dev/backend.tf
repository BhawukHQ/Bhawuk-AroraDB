terraform {
  backend "s3" {
    bucket       = "bhawuk-aroradb-terraform-state-backend"
    key          = "dev/terraform.tfstate"
    region       = "us-east-1"
    use_lockfile = true
    encrypt      = true
  }
}
