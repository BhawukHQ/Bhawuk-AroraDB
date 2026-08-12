# Authentication Architecture

Bhawuk-AroraDB uses a modern, zero-trust authentication architecture deployed on Amazon EKS. We leverage **AWS Application Load Balancer (ALB)** and **AWS Cognito** to handle authentication at the network edge, ensuring that unauthenticated traffic never reaches the application pods.

## How It Works (The Flow)

1. **Edge Interception**: When a user navigates to the application (e.g., `https://app.aroradb.bhawukarora.app`), the request hits the AWS Application Load Balancer.
2. **ALB Auth Action**: The ALB is configured with an `authenticate-cognito` rule. If the request lacks a valid session cookie, the ALB redirects the user to the AWS Cognito Hosted UI.
3. **Cognito Login**: The user authenticates against the Cognito User Pool (`us-east-1_XqA9bWB6S`).
4. **Session Creation**: Upon successful login, Cognito redirects back to the ALB with an authorization code. The ALB exchanges this code for JWTs, sets a secure HTTP-only cookie (`AWSELBAuthSessionCookie`), and forwards the request to the EKS pods.
5. **Stateless Backend**: The Go backend receives the request. The ALB injects the user's claims into the `x-amzn-oidc-data` header. The Go backend's `CognitoALBMiddleware` reads this header, trusts the ALB, and sets temporary frontend cookies (`aroradb_user`, `aroradb_role`) to hydrate the Next.js UI context.

## Infrastructure Configuration

### Kubernetes Ingress
We use the AWS Load Balancer Controller to provision our ingress. The `ingress.yaml` file specifies the Cognito integration:
```yaml
annotations:
  kubernetes.io/ingress.class: alb
  alb.ingress.kubernetes.io/auth-type: cognito
  alb.ingress.kubernetes.io/auth-idp-cognito: '{"userPoolARN":"...","userPoolClientID":"...","userPoolDomain":"..."}'
  alb.ingress.kubernetes.io/auth-on-unauthenticated-request: authenticate
```

### Helm Deployment
When deploying the Helm chart, the Cognito variables are passed via `values.yaml`:
- `cognito.userPoolArn`: The ARN of your AWS Cognito User Pool.
- `cognito.clientId`: The App Client ID.
- `cognito.domain`: The Cognito domain prefix.

### Application Logic (Stateless Pods)
Because the ALB handles the heavy lifting, **the backend pods are entirely stateless** regarding authentication sessions. 
- There is no need for sticky sessions.
- There is no need for a shared Redis session cache.
- The Go backend simply acts upon the `x-amzn-oidc-data` header securely injected by the ALB.

## Local Development
For local development where an ALB is not present, the `CognitoALBMiddleware` currently falls through allowing mock authentication, but can be configured to require strict headers or mock them for testing purposes.

