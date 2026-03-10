#!/bin/bash
# Check target group health and diagnose why targets aren't healthy

REGION=${1:-us-east-1}

echo "=========================================="
echo "Target Group Health Check"
echo "=========================================="
echo ""

# Get target group
TARGET_GROUP_ARN=$(aws elbv2 describe-target-groups \
    --region "$REGION" \
    --query 'TargetGroups[?contains(TargetGroupName, `skillmatch`)].TargetGroupArn' \
    --output text 2>/dev/null | head -1)

if [ -z "$TARGET_GROUP_ARN" ] || [ "$TARGET_GROUP_ARN" == "None" ]; then
    echo "❌ Could not find target group"
    exit 1
fi

echo "Target Group: $TARGET_GROUP_ARN"
echo ""

# Get target health
echo "Target Health Status:"
echo "----------------------------------------"
aws elbv2 describe-target-health \
    --target-group-arn "$TARGET_GROUP_ARN" \
    --region "$REGION" \
    --query 'TargetHealthDescriptions[*].{
        Target:Target.Id,
        Port:Target.Port,
        AZ:Target.AvailabilityZone,
        State:TargetHealth.State,
        Reason:TargetHealth.Reason,
        Description:TargetHealth.Description
    }' \
    --output table 2>/dev/null

echo ""

# Count by state
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

UNUSED=$(aws elbv2 describe-target-health \
    --target-group-arn "$TARGET_GROUP_ARN" \
    --region "$REGION" \
    --query 'TargetHealthDescriptions[?TargetHealth.State==`unused`] | length(@)' \
    --output text 2>/dev/null)

echo "Summary:"
echo "  Healthy: $HEALTHY"
echo "  Unhealthy: $UNHEALTHY"
echo "  Draining: $DRAINING"
echo "  Unused: $UNUSED"
echo ""

# Check ECS tasks
echo "=========================================="
echo "ECS Task Status"
echo "=========================================="
echo ""

TASKS=$(aws ecs list-tasks \
    --cluster skillmatch-cluster \
    --service-name skillmatch-backend-service \
    --desired-status RUNNING \
    --region "$REGION" \
    --output text --query 'taskArns[*]' 2>/dev/null)

if [ -z "$TASKS" ]; then
    echo "❌ No running tasks found!"
    echo ""
    echo "Checking service status..."
    aws ecs describe-services \
        --cluster skillmatch-cluster \
        --services skillmatch-backend-service \
        --region "$REGION" \
        --query 'services[0].{Running:runningCount,Desired:desiredCount,Pending:pendingCount}' \
        --output table 2>/dev/null
else
    echo "Found $(echo $TASKS | wc -w | tr -d ' ') running task(s)"
    echo ""
    for task in $TASKS; do
        echo "Task: $(basename $task)"
        aws ecs describe-tasks \
            --cluster skillmatch-cluster \
            --tasks "$task" \
            --region "$REGION" \
            --query 'tasks[0].{
                Status:lastStatus,
                Health:healthStatus,
                Started:startedAt,
                Containers:containers[0].{Name:name,Status:lastStatus,Health:healthStatus}
            }' \
            --output table 2>/dev/null
        echo ""
    done
fi

echo ""

# Recommendations
if [ "$HEALTHY" == "0" ]; then
    echo "=========================================="
    echo "Recommendations"
    echo "=========================================="
    echo ""
    
    if [ "$DRAINING" -gt 0 ]; then
        echo "⚠️  Targets are draining (being deregistered)"
        echo "   This usually happens during service updates"
        echo "   Wait a few minutes for new tasks to register"
    fi
    
    if [ "$UNUSED" -gt 0 ]; then
        echo "⚠️  Targets are in unused state"
        echo "   This means they're in an AZ not enabled for the ALB"
        echo "   Solution: Update ECS service to use only ALB-enabled AZs"
    fi
    
    if [ "$UNHEALTHY" -gt 0 ]; then
        echo "⚠️  Targets are unhealthy"
        echo "   Check:"
        echo "   1. Health check path is correct: /api/health"
        echo "   2. Application is responding on port 3001"
        echo "   3. Security groups allow traffic"
        echo "   4. CloudWatch logs for errors"
    fi
    
    echo ""
    echo "Try forcing a new deployment:"
    echo "  aws ecs update-service \\"
    echo "    --cluster skillmatch-cluster \\"
    echo "    --service skillmatch-backend-service \\"
    echo "    --force-new-deployment \\"
    echo "    --region $REGION"
fi
