#!/bin/bash
# Check ECS task status

TASK_ARN=$1
CLUSTER=${2:-skillmatch-cluster}
REGION=${3:-us-east-1}

if [ -z "$TASK_ARN" ]; then
    echo "Usage: ./check-task-status.sh <task-arn> [cluster] [region]"
    echo ""
    echo "Example:"
    echo "  ./check-task-status.sh arn:aws:ecs:us-east-1:156041405933:task/skillmatch-cluster/74eeb3bd448e468a99b991d32c2afa9a"
    exit 1
fi

echo "Checking task status..."
echo "Task ARN: $TASK_ARN"
echo "Cluster: $CLUSTER"
echo "Region: $REGION"
echo ""

# Get task details with proper query syntax
aws ecs describe-tasks \
    --cluster "$CLUSTER" \
    --tasks "$TASK_ARN" \
    --region "$REGION" \
    --query 'tasks[0].{
        lastStatus:lastStatus,
        desiredStatus:desiredStatus,
        stoppedReason:stoppedReason,
        containerExitCode:containers[0].exitCode,
        containerReason:containers[0].reason,
        containerHealthStatus:containers[0].healthStatus
    }' \
    --output json
