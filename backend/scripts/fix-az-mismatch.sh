#!/bin/bash
# Fix AZ mismatch between ALB and ECS service

REGION=${1:-us-east-1}
CLUSTER=${2:-skillmatch-cluster}
SERVICE=${3:-skillmatch-backend-service}

echo "=========================================="
echo "Fixing Availability Zone Mismatch"
echo "=========================================="
echo ""

# 1. Get ALB subnets (these are the AZs ALB is enabled in)
echo "1️⃣  Getting ALB subnets..."
ALB_SUBNETS=$(aws elbv2 describe-load-balancers \
    --region "$REGION" \
    --query 'LoadBalancers[?contains(LoadBalancerName, `skillmatch`)].AvailabilityZones[*].SubnetId' \
    --output text 2>/dev/null)

if [ -z "$ALB_SUBNETS" ]; then
    echo "❌ Could not find ALB subnets"
    exit 1
fi

echo "ALB is enabled in these subnets:"
ALB_SUBNET_LIST=()
for subnet in $ALB_SUBNETS; do
    AZ=$(aws ec2 describe-subnets \
        --region "$REGION" \
        --subnet-ids "$subnet" \
        --query 'Subnets[0].AvailabilityZone' \
        --output text 2>/dev/null)
    echo "  - $subnet ($AZ)"
    ALB_SUBNET_LIST+=("$subnet")
done

# Convert array to comma-separated string
ALB_SUBNETS_CSV=$(IFS=','; echo "${ALB_SUBNET_LIST[*]}")

echo ""
echo "ALB Subnets (comma-separated): $ALB_SUBNETS_CSV"
echo ""

# 2. Get current ECS service subnets
echo "2️⃣  Getting current ECS service subnets..."
CURRENT_SUBNETS=$(aws ecs describe-services \
    --cluster "$CLUSTER" \
    --services "$SERVICE" \
    --region "$REGION" \
    --query 'services[0].networkConfiguration.awsvpcConfiguration.subnets[*]' \
    --output text 2>/dev/null)

echo "Current ECS service subnets:"
for subnet in $CURRENT_SUBNETS; do
    AZ=$(aws ec2 describe-subnets \
        --region "$REGION" \
        --subnet-ids "$subnet" \
        --query 'Subnets[0].AvailabilityZone' \
        --output text 2>/dev/null)
    echo "  - $subnet ($AZ)"
done

echo ""

# 3. Get ECS security group
ECS_SG=$(aws ecs describe-services \
    --cluster "$CLUSTER" \
    --services "$SERVICE" \
    --region "$REGION" \
    --query 'services[0].networkConfiguration.awsvpcConfiguration.securityGroups[0]' \
    --output text 2>/dev/null)

if [ -z "$ECS_SG" ]; then
    echo "❌ Could not find ECS security group"
    exit 1
fi

echo "ECS Security Group: $ECS_SG"
echo ""

# 4. Check if subnets match
SUBNETS_MATCH=true
for alb_subnet in "${ALB_SUBNET_LIST[@]}"; do
    if ! echo "$CURRENT_SUBNETS" | grep -q "$alb_subnet"; then
        SUBNETS_MATCH=false
        break
    fi
done

if [ "$SUBNETS_MATCH" = true ] && [ "$(echo $CURRENT_SUBNETS | wc -w)" -eq "${#ALB_SUBNET_LIST[@]}" ]; then
    echo "✅ ECS service subnets already match ALB subnets"
    echo ""
    echo "The issue might be that tasks need to be redeployed."
    echo "Forcing new deployment..."
    aws ecs update-service \
        --cluster "$CLUSTER" \
        --service "$SERVICE" \
        --force-new-deployment \
        --region "$REGION" \
        --output text > /dev/null
    
    if [ $? -eq 0 ]; then
        echo "✅ New deployment triggered"
    else
        echo "❌ Failed to trigger deployment"
    fi
else
    echo "⚠️  ECS service subnets don't match ALB subnets"
    echo ""
    echo "3️⃣  Updating ECS service to use ALB subnets..."
    echo "----------------------------------------"
    
    aws ecs update-service \
        --cluster "$CLUSTER" \
        --service "$SERVICE" \
        --network-configuration "awsvpcConfiguration={subnets=[$ALB_SUBNETS_CSV],securityGroups=[$ECS_SG],assignPublicIp=ENABLED}" \
        --region "$REGION" \
        --output text > /dev/null
    
    if [ $? -eq 0 ]; then
        echo "✅ ECS service updated to use ALB subnets"
        echo "   This will trigger a new deployment"
    else
        echo "❌ Failed to update ECS service"
        echo ""
        echo "Manual update via AWS Console:"
        echo "  1. ECS → Clusters → $CLUSTER → Services → $SERVICE"
        echo "  2. Click 'Update'"
        echo "  3. Under 'Networking', select subnets: $ALB_SUBNETS_CSV"
        echo "  4. Save changes"
    fi
fi

echo ""
echo "=========================================="
echo "Next Steps"
echo "=========================================="
echo ""
echo "1. Wait 3-5 minutes for new tasks to start in correct AZs"
echo ""
echo "2. Check target group health:"
echo "   TARGET_GROUP_ARN=\$(aws elbv2 describe-target-groups --region $REGION --query 'TargetGroups[?contains(TargetGroupName, \`skillmatch\`)].TargetGroupArn' --output text | head -1)"
echo "   aws elbv2 describe-target-health --target-group-arn \"\$TARGET_GROUP_ARN\" --region $REGION --query 'TargetHealthDescriptions[*].{Target:Target.Id,State:TargetHealth.State}' --output table"
echo ""
echo "3. Test the API:"
echo "   curl http://skillmatch-alb-634414557.us-east-1.elb.amazonaws.com/api/health"
echo ""
