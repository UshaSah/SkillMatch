#!/bin/bash
# Check AWS costs and resource usage for SkillMatch deployment

REGION=${1:-us-east-1}

echo "=========================================="
echo "AWS Cost & Resource Check - SkillMatch"
echo "=========================================="
echo ""
echo "Region: $REGION"
echo ""

# Check ECS Service
echo "1️⃣  ECS Service Status"
echo "----------------------------------------"
RUNNING_TASKS=$(aws ecs describe-services \
    --cluster skillmatch-cluster \
    --services skillmatch-backend-service \
    --region "$REGION" \
    --query 'services[0].runningCount' \
    --output text 2>/dev/null)

if [ "$RUNNING_TASKS" != "None" ] && [ -n "$RUNNING_TASKS" ]; then
    echo "⚠️  Running Tasks: $RUNNING_TASKS"
    echo "   Cost: ~\$0.04/hour per task (0.25 vCPU, 0.5GB RAM)"
    echo "   Monthly estimate: ~\$30 per task"
else
    echo "✅ No running tasks"
fi
echo ""

# Check ALB
echo "2️⃣  Application Load Balancer"
echo "----------------------------------------"
ALB_COUNT=$(aws elbv2 describe-load-balancers \
    --region "$REGION" \
    --query 'LoadBalancers[?contains(LoadBalancerName, `skillmatch`)].LoadBalancerName' \
    --output text 2>/dev/null | wc -w | tr -d ' ')

if [ "$ALB_COUNT" -gt 0 ]; then
    echo "⚠️  ALB Found: $ALB_COUNT load balancer(s)"
    echo "   Cost: ~\$0.0225/hour (~\$16/month) + data transfer"
    echo "   This is the MAIN cost driver!"
else
    echo "✅ No ALB found"
fi
echo ""

# Check ECR Storage
echo "3️⃣  ECR Image Storage"
echo "----------------------------------------"
ECR_SIZE=$(aws ecr describe-images \
    --repository-name skillmatch-backend \
    --region "$REGION" \
    --query 'sum(imageDetails[*].imageSizeInBytes)' \
    --output text 2>/dev/null)

if [ "$ECR_SIZE" != "None" ] && [ -n "$ECR_SIZE" ] && [ "$ECR_SIZE" != "0" ]; then
    ECR_SIZE_GB=$(echo "scale=4; $ECR_SIZE / 1073741824" | bc)
    echo "⚠️  ECR Storage: ${ECR_SIZE_GB} GB"
    echo "   Cost: ~\$0.10/GB/month (~\$$(echo "scale=2; $ECR_SIZE_GB * 0.10" | bc)/month)"
else
    echo "✅ No ECR images (or minimal storage)"
fi
echo ""

# Check CloudWatch Logs
echo "4️⃣  CloudWatch Logs"
echo "----------------------------------------"
LOG_GROUPS=$(aws logs describe-log-groups \
    --region "$REGION" \
    --log-group-name-prefix "/ecs/skillmatch" \
    --query 'logGroups[*].logGroupName' \
    --output text 2>/dev/null)

if [ -n "$LOG_GROUPS" ] && [ "$LOG_GROUPS" != "None" ]; then
    echo "⚠️  Log Groups Found:"
    echo "$LOG_GROUPS" | tr '\t' '\n' | while read group; do
        echo "   - $group"
    done
    echo "   Cost: First 5GB free, then \$0.50/GB/month"
    echo "   Tip: Set retention policy to avoid long-term storage"
else
    echo "✅ No log groups found"
fi
echo ""

# Check CloudWatch Metrics
echo "5️⃣  CloudWatch Custom Metrics"
echo "----------------------------------------"
METRIC_COUNT=$(aws cloudwatch list-metrics \
    --namespace "SkillMatch/API" \
    --region "$REGION" \
    --query 'length(Metrics)' \
    --output text 2>/dev/null)

if [ "$METRIC_COUNT" != "None" ] && [ -n "$METRIC_COUNT" ] && [ "$METRIC_COUNT" != "0" ]; then
    echo "⚠️  Custom Metrics: $METRIC_COUNT"
    echo "   Cost: \$0.30/metric/month"
    echo "   Estimated cost: ~\$$(echo "scale=2; $METRIC_COUNT * 0.30" | bc)/month"
else
    echo "✅ No custom metrics (or minimal)"
fi
echo ""

# Summary
echo "=========================================="
echo "Cost Summary"
echo "=========================================="
echo ""
echo "Main Cost Drivers:"
echo "  1. Application Load Balancer: ~\$16/month (always on)"
echo "  2. ECS Fargate Tasks: ~\$30/month per running task"
echo "  3. CloudWatch Metrics: ~\$0.30/metric/month"
echo "  4. Data Transfer: ~\$0.09/GB"
echo ""
echo "Estimated Monthly Cost:"
if [ "$RUNNING_TASKS" != "None" ] && [ -n "$RUNNING_TASKS" ] && [ "$RUNNING_TASKS" -gt 0 ]; then
    echo "  - With 1 running task: ~\$46-50/month"
    echo "  - With ALB only (0 tasks): ~\$16-20/month"
else
    echo "  - Current: ~\$16-20/month (ALB only)"
fi
echo ""
echo "=========================================="
echo "Cost Reduction Options"
echo "=========================================="
echo ""
echo "Option 1: Scale Down to 0 Tasks (Keep ALB)"
echo "  Cost: ~\$16/month"
echo "  Command: ./scripts/scale-down.sh"
echo ""
echo "Option 2: Delete Everything (Complete Cleanup)"
echo "  Cost: \$0/month"
echo "  Command: ./scripts/delete-all-resources.sh"
echo ""
echo "Option 3: Use Fargate Spot (70% cheaper)"
echo "  Cost: ~\$9/month per task"
echo "  Note: Requires task definition update"
echo ""
echo "To view detailed billing:"
echo "  https://console.aws.amazon.com/billing/home"
echo ""
