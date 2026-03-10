#!/bin/bash
# Scale down ECS service to 0 tasks to stop costs (keeps infrastructure)

REGION=${1:-us-east-1}
CLUSTER=${2:-skillmatch-cluster}
SERVICE=${3:-skillmatch-backend-service}

echo "=========================================="
echo "Scaling Down ECS Service to 0 Tasks"
echo "=========================================="
echo ""
echo "This will:"
echo "  ✅ Stop all running tasks (saves ~\$30/month per task)"
echo "  ✅ Keep ALB running (~\$16/month still charged)"
echo "  ✅ Keep all infrastructure (can scale back up easily)"
echo ""
read -p "Continue? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 1
fi

echo ""
echo "Scaling service to 0 tasks..."

aws ecs update-service \
    --cluster "$CLUSTER" \
    --service "$SERVICE" \
    --desired-count 0 \
    --region "$REGION" \
    --output text > /dev/null

if [ $? -eq 0 ]; then
    echo "✅ Service scaled down to 0 tasks"
    echo ""
    echo "Cost savings:"
    echo "  - ECS tasks: \$0/month (was ~\$30/month)"
    echo "  - ALB: Still ~\$16/month (not stopped)"
    echo ""
    echo "To scale back up:"
    echo "  aws ecs update-service --cluster $CLUSTER --service $SERVICE --desired-count 1 --region $REGION"
else
    echo "❌ Failed to scale down service"
    exit 1
fi
