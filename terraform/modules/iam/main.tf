module "pod_identity" {
  source = "terraform-aws-modules/eks-pod-identity/aws"

  cluster_name = var.cluster_name

  associations = {
    example = {
      namespace       = "default"
      service_account = "example-sa"
      role_arn        = aws_iam_role.example.arn
    }
  }
}

resource "aws_iam_role" "example" {
  name = "example-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = ["sts:AssumeRole", "sts:TagSession"]
        Effect = "Allow"
        Principal = {
          Service = "pods.eks.amazonaws.com"
        }
      }
    ]
  })
}
