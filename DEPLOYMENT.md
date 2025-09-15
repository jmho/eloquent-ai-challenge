Architecture: Use ECR for container registry, ECS with Fargate for container orchestration, and
Application Load Balancers for traffic distribution.

Services to Deploy:

- Frontend (React Router app on port 3000)
- Backend (FastAPI Python service on port 8000)
- Database (RDS PostgreSQL instead of containerized)

Infrastructure Components:

1. ECR Repositories: Store Docker images for frontend and backend services
2. RDS PostgreSQL: Managed database service replacing the containerized PostgreSQL
3. ECS Cluster with Fargate: Container orchestration without managing EC2 instances
4. Application Load Balancers:

   - Frontend ALB for React app traffic
   - Backend ALB for API traffic

5. Auto Scaling: Configure ECS service auto-scaling based on CPU/memory metrics
6. VPC Setup: Private subnets for containers, public subnets for front-end load balancer

Deployment Flow:

1. Build and push Docker images to ECR
2. Create ECS task definitions referencing ECR images
3. Set up RDS instance and run database migrations
4. Deploy ECS services with load balancer integration
5. Configure auto-scaling policies and health checks
