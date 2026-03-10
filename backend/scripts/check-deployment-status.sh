#!/bin/bash
# Check ECS deployment status and task health

REGION=${1:-us-east-1}
CLUSTER=${2:-skillmatch-cluster}
SERVICE=${3:-skillmatch-backend-service}

echo "=========================================="
echo "ECS Deployment Status Check"
echo "=========================================="
echo ""

# 1. Check service status
echo "1️⃣  Service Status"
echo "----------------------------------------"
aws ecs describe-services \
    --cluster "$CLUSTER" \
    --services "$SERVICE" \
    --region "$REGION" \
    --query 'services[0].{
        Status:status,
        Running:runningCount,
        Desired:desiredCount,
        Pending:pendingCount,
        Deployments:deployments[0].{
            Status:status,
            Running:runningCount,
            Desired:desiredCount,
            RolloutState:rolloutState
        }
    }' \
    --output table 2>/dev/null

echo ""

# 2. List running tasks
echo "2️⃣  Running Tasks"
echo "----------------------------------------"
TASKS=$(aws ecs list-tasks \
    --cluster "$CLUSTER" \
    --service-name "$SERVICE" \
    --desired-status RUNNING \
    --region "$REGION" \
    --output text --query 'taskArns[*]' 2>/dev/null)

if [ -z "$TASKS" ]; then
    echo "❌ No running tasks found!"
    echo ""
    echo "Checking pending tasks..."
    PENDING_TASKS=$(aws ecs list-tasks \
        --cluster "$CLUSTER" \
        --service-name "$SERVICE" \
        --desired-status PENDING \
        --region "$REGION" \
        --output text --query 'taskArns[*]' 2>/dev/null)
    
    if [ -n "$PENDING_TASKS" ]; then
        echo "Found $(echo $PENDING_TASKS | wc -w | tr -d ' ') pending task(s)"
        echo "Tasks are still starting..."
    else
        echo "No pending tasks either. Service may be updating."
    fi
else
    echo "Found $(echo $TASKS | wc -w | tr -d ' ') running task(s):"
    echo ""
    for task in $TASKS; do
        echo "Task: $(basename $task)"
        TASK_DETAILS=$(aws ecs describe-tasks \
            --cluster "$CLUSTER" \
            --tasks "$task" \
            --region "$REGION" \
            --query 'tasks[0].{
                Status:lastStatus,
                Health:healthStatus,
                Started:startedAt,
                AZ:availabilityZone,
                Subnet:attachments[0].details[?name==`subnetId`].value | [0],
                ContainerStatus:containers[0].lastStatus,
                ContainerHealth:containers[0].healthStatus
            }' \
            --output json 2>/dev/null)
        
        echo "$TASK_DETAILS" | python3 -m json.tool 2>/dev/null || echo "$TASK_DETAILS"
        echo ""
    done
fi

echo ""

# 3. Check target group health
echo "3️⃣  Target Group Health"
echo "----------------------------------------"
TARGET_GROUP_ARN=$(aws elbv2 describe-target-groups \
    --region "$REGION" \
    --query 'TargetGroups[?contains(TargetGroupName, `skillmatch`)].TargetGroupArn' \
    --output text 2>/dev/null | head -1)

if [ -n "$TARGET_GROUP_ARN" ] && [ "$TARGET_GROUP_ARN" != "None" ]; then
    HEALTHY=$(aws elbv2 describe-target-health \
        --target-group-arn "$TARGET_GROUP_ARN" \
        --region "$REGION" \
        --query 'TargetHealthDescriptions[?TargetHealth.State==`healthy`] | length(@)' \
        --output text 2>/dev/null)
    
    UNHEALTHY=$(aws elbv2 describe-target-health \
        --target-group-arn "$TARGET_GROUP_ARN" \
        --region "$REGION" \
        --query 'TargetHealthDescriptions[?TargetHealth.State==`unhealthy`] | length(@)' \
        --output text 2>/dev/null)
    
    DRAINING=$(aws elbv2 describe-target-health \
        --target-group-arn "$TARGET_GROUP_ARN" \
        --region "$REGION" \
        --query 'TargetHealthDescriptions[?TargetHealth.State==`draining`] | length(@)' \
        --output text 2>/dev/null)
    
    echo "Healthy targets: $HEALTHY"
    echo "Unhealthy targets: $UNHEALTHY"
    echo "Draining targets: $DRAINING"
    echo ""
    
    if [ "$HEALTHY" == "0" ] && [ "$DRAINING" -gt 0 ]; then
        echo "⚠️  Old targets are draining, but no new healthy targets yet"
        echo "   This is normal during deployment - wait a few more minutes"
    fi
fi

echo ""

# 4. Recommendations
echo "=========================================="
echo "Recommendations"
echo "=========================================="
echo ""

if [ -z "$TASKS" ]; then
    echo "1. Wait 2-3 more minutes for tasks to start"
    echo "2. Check again: ./scripts/check-deployment-status.sh"
elif [ "$HEALTHY" == "0" ]; then
    echo "1. Tasks are running but not healthy yet"
    echo "2. Wait 2-3 minutes for health checks to pass"
    echo "3. Check CloudWatch logs if still unhealthy:"
    echo "   aws logs tail /ecs/skillmatch-backend --since 10m --region $REGION"
else
    echo "✅ Deployment looks good!"
    echo "   Test the API: curl http://skillmatch-alb-634414557.us-east-1.elb.amazonaws.com/api/health"
fi
