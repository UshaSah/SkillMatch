#!/bin/bash
# Delete all AWS resources for SkillMatch (COMPLETE CLEANUP)
# WARNING: This will delete everything and cannot be undone!

REGION=${1:-us-east-1}
CLUSTER=${2:-skillmatch-cluster}
SERVICE=${3:-skillmatch-backend-service}

echo "=========================================="
echo "⚠️  DELETE ALL AWS RESOURCES"
echo "=========================================="
echo ""
echo "This will DELETE:"
echo "  ❌ ECS Service"
echo "  ❌ ECS Tasks"
echo "  ❌ Application Load Balancer"
echo "  ❌ Target Groups"
echo "  ❌ Security Groups (if created by you)"
echo "  ❌ CloudWatch Log Groups"
echo "  ❌ ECR Images (optional)"
echo ""
echo "This CANNOT be undone!"
echo ""
read -p "Type 'DELETE' to confirm: " confirmation

if [ "$confirmation" != "DELETE" ]; then
    echo "Cancelled. Nothing was deleted."
    exit 1
fi

echo ""
echo "Starting deletion process..."
echo ""

# 1. Scale down service first
echo "1️⃣  Scaling down ECS service..."
aws ecs update-service \
    --cluster "$CLUSTER" \
    --service "$SERVICE" \
    --desired-count 0 \
    --region "$REGION" \
    --output text > /dev/null

echo "   Waiting for tasks to stop..."
sleep 30

# 2. Delete ECS Service
echo "2️⃣  Deleting ECS service..."
aws ecs delete-service \
    --cluster "$CLUSTER" \
    --service "$SERVICE" \
    --force \
    --region "$REGION" \
    --output text > /dev/null

if [ $? -eq 0 ]; then
    echo "   ✅ ECS service deleted"
else
    echo "   ⚠️  Service may not exist or already deleted"
fi

# 3. Get and delete ALB
echo "3️⃣  Deleting Application Load Balancer..."
ALB_ARN=$(aws elbv2 describe-load-balancers \
    --region "$REGION" \
    --query 'LoadBalancers[?contains(LoadBalancerName, `skillmatch`)].LoadBalancerArn' \
    --output text 2>/dev/null | head -1)

if [ -n "$ALB_ARN" ] && [ "$ALB_ARN" != "None" ]; then
    # Delete listeners first
    LISTENERS=$(aws elbv2 describe-listeners \
        --load-balancer-arn "$ALB_ARN" \
        --region "$REGION" \
        --query 'Listeners[*].ListenerArn' \
        --output text 2>/dev/null)
    
    for listener in $LISTENERS; do
        aws elbv2 delete-listener \
            --listener-arn "$listener" \
            --region "$REGION" \
            --output text > /dev/null 2>&1
    done
    
    # Delete target groups
    TARGET_GROUPS=$(aws elbv2 describe-target-groups \
        --region "$REGION" \
        --query 'TargetGroups[?contains(TargetGroupName, `skillmatch`)].TargetGroupArn' \
        --output text 2>/dev/null)
    
    for tg in $TARGET_GROUPS; do
        aws elbv2 delete-target-group \
            --target-group-arn "$tg" \
            --region "$REGION" \
            --output text > /dev/null 2>&1
    done
    
    # Delete ALB
    aws elbv2 delete-load-balancer \
        --load-balancer-arn "$ALB_ARN" \
        --region "$REGION" \
        --output text > /dev/null
    
    if [ $? -eq 0 ]; then
        echo "   ✅ ALB deleted (this may take a few minutes)"
    fi
else
    echo "   ⚠️  No ALB found"
fi

# 4. Delete CloudWatch Log Groups
echo "4️⃣  Deleting CloudWatch Log Groups..."
LOG_GROUPS=$(aws logs describe-log-groups \
    --region "$REGION" \
    --log-group-name-prefix "/ecs/skillmatch" \
    --query 'logGroups[*].logGroupName' \
    --output text 2>/dev/null)

if [ -n "$LOG_GROUPS" ] && [ "$LOG_GROUPS" != "None" ]; then
    for group in $LOG_GROUPS; do
        aws logs delete-log-group \
            --log-group-name "$group" \
            --region "$REGION" \
            --output text > /dev/null 2>&1
    done
    echo "   ✅ Log groups deleted"
else
    echo "   ⚠️  No log groups found"
fi

# 5. Optionally delete ECR images
echo ""
read -p "5️⃣  Delete ECR images? This will delete your Docker images. (y/N): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "   Deleting ECR images..."
    aws ecr batch-delete-image \
        --repository-name skillmatch-backend \
        --region "$REGION" \
        --image-ids imageTag=latest \
        --output text > /dev/null 2>&1
    
    echo "   ✅ ECR images deleted"
else
    echo "   ⏭️  Skipping ECR deletion (images kept)"
fi

# Note: We're NOT deleting:
# - ECS Cluster (can be reused, minimal cost)
# - Security Groups (may be used by other resources)
# - Secrets Manager secrets (kept for future use)
# - IAM roles (no cost, can be reused)

echo ""
echo "=========================================="
echo "Deletion Complete"
echo "=========================================="
echo ""
echo "Deleted:"
echo "  ✅ ECS Service"
echo "  ✅ Application Load Balancer"
echo "  ✅ Target Groups"
echo "  ✅ CloudWatch Log Groups"
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "  ✅ ECR Images"
fi
echo ""
echo "Not deleted (no cost or minimal cost):"
echo "  - ECS Cluster (can be reused)"
echo "  - Security Groups (manual cleanup if needed)"
echo "  - Secrets Manager secrets (kept for future)"
echo "  - IAM roles (no cost)"
echo ""
echo "Cost after cleanup: ~\$0/month"
echo ""
echo "To manually delete remaining resources:"
echo "  - ECS Cluster: aws ecs delete-cluster --cluster $CLUSTER --region $REGION"
echo "  - Security Groups: Check EC2 Console and delete manually"
echo ""
