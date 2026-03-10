# AWS Deployment Guide - SkillMatch Backend

This guide will deploy your SkillMatch backend to **AWS ECS Fargate** (containerized, serverless-like). This is the modern, scalable way to deploy on AWS.

---

## 🎯 Prerequisites

- AWS Account (free tier eligible)
- AWS CLI installed and configured
- Docker installed locally (for testing)
- Your code pushed to GitHub (or AWS CodeCommit)

---

## 📋 Overview: What We'll Build

1. **ECR (Elastic Container Registry)** - Store your Docker image
2. **ECS Cluster** - Run your containers
3. **ECS Task Definition** - Define how your container runs
4. **ECS Service** - Keep your container running
5. **Application Load Balancer (ALB)** - Route traffic to your containers
6. **Security Groups** - Control network access
7. **IAM Roles** - Permissions for ECS to pull images and write logs

---

## Step 1: Prepare Your Code

### 1.1 Verify Dockerfile

Your `backend/Dockerfile` should be ready (we created it earlier). Verify it exists:

```bash
cd backend
cat Dockerfile
```

### 1.2 Test Docker Build Locally (Optional but Recommended)

```bash
cd backend

# Build image
docker build -t skillmatch-backend:local .

# Test run (with your .env file)
docker run -p 3001:3001 --env-file .env skillmatch-backend:local

# In another terminal, test:
curl http://localhost:3001/api/health
```

If this works, your Docker setup is good! ✅

---

## Step 2: Set Up AWS CLI

### 2.1 Install AWS CLI (if not installed)

```bash
# macOS
brew install awscli

# Or download from: https://aws.amazon.com/cli/
```

### 2.2 Configure AWS Credentials

```bash
aws configure
```

You'll need:
- **AWS Access Key ID**: Get from AWS Console → IAM → Users → Your User → Security Credentials
- **AWS Secret Access Key**: Same place
- **Default region**: `us-east-1` (or your preferred region)
- **Default output format**: `json`

**Important**: Create an IAM user with these permissions:
- `AmazonEC2ContainerRegistryFullAccess`
- `AmazonECS_FullAccess`
- `AmazonVPCFullAccess`
- `ElasticLoadBalancingFullAccess`
- `IAMFullAccess` (or create custom policy with minimal permissions)

---

## Step 3: Create ECR Repository

ECR stores your Docker images.

### 3.1 Create Repository via AWS Console

1. Go to **ECR** (Elastic Container Registry) in AWS Console
2. Click **"Create repository"**
3. **Repository name**: `skillmatch-backend`
4. **Visibility**: Private
5. Click **"Create repository"**

### 3.2 Get Login Command

In the repository page, click **"View push commands"** and run:

```bash
# Get login token
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <YOUR_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com

# Replace <YOUR_ACCOUNT_ID> with your actual AWS account ID
# You can find it in the ECR repository URI
```

**Or use AWS CLI:**

```bash
# Get your account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=us-east-1

# Create ECR repository
aws ecr create-repository \
  --repository-name skillmatch-backend \
  --region $AWS_REGION

# Login to ECR
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
```

---

## Step 4: Build and Push Docker Image

### 4.1 Build Image

```bash
cd backend

# Set variables
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=us-east-1
IMAGE_NAME=skillmatch-backend

# Build
docker build -t $IMAGE_NAME:latest .

# Tag for ECR
docker tag $IMAGE_NAME:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$IMAGE_NAME:latest
```

### 4.2 Push to ECR

```bash
# Push
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$IMAGE_NAME:latest
```

Wait 2-3 minutes for the push to complete. You should see the image in ECR console.

---

## Step 5: Create ECS Cluster

### 5.1 Create Cluster via AWS Console

1. Go to **ECS** (Elastic Container Service) in AWS Console
2. Click **"Clusters"** → **"Create Cluster"**
3. **Cluster name**: `skillmatch-cluster`
4. **Infrastructure**: **AWS Fargate** (serverless)
5. Click **"Create"**

### 5.2 Or via AWS CLI

```bash
aws ecs create-cluster \
  --cluster-name skillmatch-cluster \
  --region us-east-1
```

---

## Step 6: Create Task Definition

A task definition tells ECS how to run your container.

### 6.1 Create Task Definition File

Create `backend/ecs-task-definition.json`:

```json
{
  "family": "skillmatch-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "containerDefinitions": [
    {
      "name": "skillmatch-backend",
      "image": "<YOUR_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/skillmatch-backend:latest",
      "portMappings": [
        {
          "containerPort": 3001,
          "protocol": "tcp"
        }
      ],
      "essential": true,
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "PORT",
          "value": "3001"
        },
        {
          "name": "LOG_LEVEL",
          "value": "info"
        }
      ],
      "secrets": [
        {
          "name": "MONGODB_URI",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:<ACCOUNT_ID>:secret:skillmatch/mongodb-uri"
        },
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:<ACCOUNT_ID>:secret:skillmatch/jwt-secret"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/skillmatch-backend",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": [
          "CMD-SHELL",
          "node -e \"require('http').get('http://localhost:3001/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})\""
        ],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ],
  "executionRoleArn": "arn:aws:iam::<ACCOUNT_ID>:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::<ACCOUNT_ID>:role/ecsTaskRole"
}
```

**Note**: We'll use AWS Secrets Manager for sensitive data. See Step 7.

### 6.2 Register Task Definition

```bash
# Replace <YOUR_ACCOUNT_ID> in the JSON file first
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Update the JSON file (you can use sed or edit manually)
sed -i '' "s/<YOUR_ACCOUNT_ID>/$AWS_ACCOUNT_ID/g" backend/ecs-task-definition.json
sed -i '' "s/<ACCOUNT_ID>/$AWS_ACCOUNT_ID/g" backend/ecs-task-definition.json

# Register
aws ecs register-task-definition \
  --cli-input-json file://backend/ecs-task-definition.json \
  --region us-east-1
```

---

## Step 7: Set Up AWS Secrets Manager

Store sensitive data securely.

### 7.1 Create Secrets

```bash
AWS_REGION=us-east-1

# MongoDB URI
aws secretsmanager create-secret \
  --name skillmatch/mongodb-uri \
  --secret-string "mongodb+srv://username:password@cluster.mongodb.net/skillmatch-1" \
  --region $AWS_REGION

# JWT Secret (generate a strong one)
JWT_SECRET=$(openssl rand -base64 32)
aws secretsmanager create-secret \
  --name skillmatch/jwt-secret \
  --secret-string "$JWT_SECRET" \
  --region $AWS_REGION

# Other secrets (optional)
aws secretsmanager create-secret \
  --name skillmatch/aws-access-key \
  --secret-string "your-aws-access-key" \
  --region $AWS_REGION

aws secretsmanager create-secret \
  --name skillmatch/aws-secret-key \
  --secret-string "your-aws-secret-key" \
  --region $AWS_REGION
```

**Or via AWS Console:**
1. Go to **Secrets Manager**
2. Click **"Store a new secret"**
3. Select **"Other type of secret"**
4. Enter key-value pairs or plain text
5. Name: `skillmatch/mongodb-uri`
6. Click **"Next"** → **"Store"**

---

## Step 8: Create IAM Roles

ECS needs permissions to pull images and write logs.

### 8.1 Create Task Execution Role

This role allows ECS to pull images from ECR and read secrets.

**Policy JSON** (`ecs-task-execution-role-policy.json`):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "*"
    }
  ]
}
```

**Create role:**

```bash
# Create role
aws iam create-role \
  --role-name ecsTaskExecutionRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "ecs-tasks.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

# Attach policy
aws iam put-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-name ecsTaskExecutionRolePolicy \
  --policy-document file://ecs-task-execution-role-policy.json

# Attach AWS managed policy (also needed)
aws iam attach-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy
```

### 8.2 Create Task Role (Optional - for app permissions)

```bash
# Create role
aws iam create-role \
  --role-name ecsTaskRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "ecs-tasks.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

# If you need S3 access, attach S3 policy
aws iam attach-role-policy \
  --role-name ecsTaskRole \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess
```

---

## Step 9: Create CloudWatch Log Group

For container logs.

```bash
aws logs create-log-group \
  --log-group-name /ecs/skillmatch-backend \
  --region us-east-1
```

---

## Step 10: Create VPC and Networking (Simplified)

For a quick start, we'll use the default VPC. For production, create a custom VPC.

### 10.1 Get Default VPC Info

```bash
# Get default VPC ID
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --query "Vpcs[0].VpcId" --output text)

# Get default subnets
SUBNET_IDS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" --query "Subnets[*].SubnetId" --output text | tr '\t' ',')

# Get default security group
SECURITY_GROUP_ID=$(aws ec2 describe-security-groups --filters "Name=vpc-id,Values=$VPC_ID" "Name=group-name,Values=default" --query "SecurityGroups[0].GroupId" --output text)

echo "VPC: $VPC_ID"
echo "Subnets: $SUBNET_IDS"
echo "Security Group: $SECURITY_GROUP_ID"
```

### 10.2 Create Security Group for ALB

```bash
# Create security group for load balancer
ALB_SG_ID=$(aws ec2 create-security-group \
  --group-name skillmatch-alb-sg \
  --description "Security group for SkillMatch ALB" \
  --vpc-id $VPC_ID \
  --query 'GroupId' \
  --output text)

# Allow HTTP/HTTPS from internet
aws ec2 authorize-security-group-ingress \
  --group-id $ALB_SG_ID \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-id $ALB_SG_ID \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0
```

### 10.3 Create Security Group for ECS Tasks

```bash
# Create security group for ECS tasks
ECS_SG_ID=$(aws ec2 create-security-group \
  --group-name skillmatch-ecs-sg \
  --description "Security group for SkillMatch ECS tasks" \
  --vpc-id $VPC_ID \
  --query 'GroupId' \
  --output text)

# Allow traffic from ALB on port 3001
aws ec2 authorize-security-group-ingress \
  --group-id $ECS_SG_ID \
  --protocol tcp \
  --port 3001 \
  --source-group $ALB_SG_ID
```

---

## Step 11: Create Application Load Balancer

### 11.1 Create ALB via AWS Console

1. Go to **EC2** → **Load Balancers**
2. Click **"Create Load Balancer"**
3. Select **Application Load Balancer**
4. **Name**: `skillmatch-alb`
5. **Scheme**: Internet-facing
6. **IP address type**: IPv4
7. **VPC**: Select default VPC
8. **Subnets**: Select at least 2 subnets
9. **Security group**: Select `skillmatch-alb-sg`
10. **Listeners**: HTTP on port 80
11. Click **"Create load balancer"**

Wait 2-3 minutes for ALB to be created.

### 11.2 Get ALB ARN

```bash
ALB_ARN=$(aws elbv2 describe-load-balancers \
  --names skillmatch-alb \
  --query 'LoadBalancers[0].LoadBalancerArn' \
  --output text)

ALB_DNS=$(aws elbv2 describe-load-balancers \
  --names skillmatch-alb \
  --query 'LoadBalancers[0].DNSName' \
  --output text)

echo "ALB ARN: $ALB_ARN"
echo "ALB DNS: $ALB_DNS"
```

---

## Step 12: Create Target Group

```bash
# Get VPC ID
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --query "Vpcs[0].VpcId" --output text)

# Create target group
TARGET_GROUP_ARN=$(aws elbv2 create-target-group \
  --name skillmatch-tg \
  --protocol HTTP \
  --port 3001 \
  --vpc-id $VPC_ID \
  --health-check-path /api/health \
  --health-check-interval-seconds 30 \
  --health-check-timeout-seconds 5 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3 \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text)

echo "Target Group ARN: $TARGET_GROUP_ARN"
```

### 12.1 Create Listener Rule

```bash
# Get ALB ARN
ALB_ARN=$(aws elbv2 describe-load-balancers \
  --names skillmatch-alb \
  --query 'LoadBalancers[0].LoadBalancerArn' \
  --output text)

# Create listener (port 80)
LISTENER_ARN=$(aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=$TARGET_GROUP_ARN \
  --query 'Listeners[0].ListenerArn' \
  --output text)
```

---

## Step 13: Create ECS Service

This keeps your container running.

### 13.1 Create Service via AWS Console

1. Go to **ECS** → **Clusters** → `skillmatch-cluster`
2. Click **"Create Service"**
3. **Launch type**: Fargate
4. **Task Definition**: `skillmatch-backend` (latest)
5. **Service name**: `skillmatch-backend-service`
6. **Number of tasks**: 1 (start with 1, scale later)
7. **VPC**: Default VPC
8. **Subnets**: Select at least 2 subnets
9. **Security groups**: `skillmatch-ecs-sg`
10. **Auto-assign public IP**: Enabled
11. **Load balancer**: Application Load Balancer
    - **Load balancer name**: `skillmatch-alb`
    - **Container name**: `skillmatch-backend`
    - **Container port**: 3001
    - **Target group**: `skillmatch-tg`
12. Click **"Create"**

### 13.2 Or via AWS CLI

```bash
# Get values
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --query "Vpcs[0].VpcId" --output text)
SUBNET_IDS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" --query "Subnets[*].SubnetId" --output text | tr '\t' ',')
ECS_SG_ID=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=skillmatch-ecs-sg" --query "SecurityGroups[0].GroupId" --output text)
TARGET_GROUP_ARN=$(aws elbv2 describe-target-groups --names skillmatch-tg --query 'TargetGroups[0].TargetGroupArn' --output text)
CLUSTER_NAME=skillmatch-cluster

# Create service
aws ecs create-service \
  --cluster $CLUSTER_NAME \
  --service-name skillmatch-backend-service \
  --task-definition skillmatch-backend \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_IDS],securityGroups=[$ECS_SG_ID],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=$TARGET_GROUP_ARN,containerName=skillmatch-backend,containerPort=3001" \
  --region us-east-1
```

Wait 3-5 minutes for the service to start.

---

## Step 14: Test Your Deployment

### 14.1 Get ALB URL

```bash
ALB_DNS=$(aws elbv2 describe-load-balancers \
  --names skillmatch-alb \
  --query 'LoadBalancers[0].DNSName' \
  --output text)

echo "Your API URL: http://$ALB_DNS"
```

### 14.2 Test Endpoints

```bash
# Health check
curl http://$ALB_DNS/api/health

# Register user
curl -X POST http://$ALB_DNS/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!",
    "displayName": "Test User"
  }'
```

---

## Step 15: View Logs

### 15.1 CloudWatch Logs

1. Go to **CloudWatch** → **Log groups**
2. Click `/ecs/skillmatch-backend`
3. View real-time logs

### 15.2 Or via AWS CLI

```bash
aws logs tail /ecs/skillmatch-backend --follow --region us-east-1
```

---

## 🔄 Updating Your Deployment

When you make code changes:

```bash
cd backend

# 1. Build and push new image
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=us-east-1

docker build -t skillmatch-backend:latest .
docker tag skillmatch-backend:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/skillmatch-backend:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/skillmatch-backend:latest

# 2. Force new deployment
aws ecs update-service \
  --cluster skillmatch-cluster \
  --service skillmatch-backend-service \
  --force-new-deployment \
  --region us-east-1
```

---

## 📊 Monitoring & Scaling

### View Service Status

```bash
aws ecs describe-services \
  --cluster skillmatch-cluster \
  --services skillmatch-backend-service \
  --region us-east-1
```

### Scale Up/Down

```bash
# Scale to 2 tasks
aws ecs update-service \
  --cluster skillmatch-cluster \
  --service skillmatch-backend-service \
  --desired-count 2 \
  --region us-east-1
```

### Set Up Auto Scaling (Optional)

Create auto-scaling based on CPU/memory usage via ECS Console or CloudFormation.

---

## 🐛 Troubleshooting

### Issue: Tasks keep stopping

**Check:**
1. CloudWatch logs for errors
2. Task definition (CPU/memory might be too low)
3. Health checks (might be failing)

### Issue: Can't connect to MongoDB

**Fix:**
- Verify MongoDB Atlas IP whitelist includes `0.0.0.0/0` or your ECS task IPs
- Check Secrets Manager has correct `MONGODB_URI`

### Issue: 502 Bad Gateway

**Fix:**
- Check target group health (should show healthy targets)
- Verify security groups allow traffic from ALB to ECS tasks
- Check container logs for startup errors

### Issue: High costs

**Fix:**
- Use Fargate Spot for non-production (cheaper)
- Set up auto-scaling to scale down during low traffic
- Use CloudWatch alarms to monitor costs

---

## 💰 Cost Estimate

**Approximate monthly costs (us-east-1):**

- **ECS Fargate**: ~$15/month (1 task, 0.25 vCPU, 0.5GB RAM, 24/7)
- **ALB**: ~$16/month (always on)
- **ECR**: ~$0.10/month (storage)
- **CloudWatch Logs**: ~$0.50/month (first 5GB free)
- **Data Transfer**: ~$0.09/GB

**Total**: ~$32-40/month for basic setup

**Ways to reduce:**
- Use Fargate Spot (up to 70% cheaper)
- Scale down to 0 tasks when not in use
- Use smaller instance sizes if traffic is low

---

## ✅ Success Checklist

- [ ] Docker image pushed to ECR
- [ ] ECS cluster created
- [ ] Task definition registered
- [ ] Secrets stored in Secrets Manager
- [ ] IAM roles created
- [ ] ALB created and healthy
- [ ] ECS service running
- [ ] Health endpoint returns 200
- [ ] Can register/login via API
- [ ] Logs visible in CloudWatch

---

## 🚀 Next Steps

1. **Add HTTPS**: Use AWS Certificate Manager (ACM) + ALB listener on port 443
2. **Set up CI/CD**: GitHub Actions or AWS CodePipeline to auto-deploy on push
3. **Add monitoring**: CloudWatch dashboards, alarms
4. **Set up auto-scaling**: Scale based on CPU/memory/request count
5. **Add custom domain**: Route53 + ACM certificate

---

**Need help?** Check CloudWatch logs first - they usually tell you what's wrong!
