#!/bin/bash
# Fix security group rule to allow ALB SG

REGION=${1:-us-east-1}
ECS_SG="sg-03f32bcca5d189233"
ALB_SG="sg-0f0bee627e8896c3f"
CURRENT_SG="sg-07329bf86122b26a6"

echo "=========================================="
echo "Fixing Security Group Rule"
echo "=========================================="
echo ""

# Check what the current SG is
echo "Current rule allows: $CURRENT_SG"
echo "ALB security group: $ALB_SG"
echo ""

# Check if they're the same
if [ "$CURRENT_SG" == "$ALB_SG" ]; then
    echo "✅ Security group rule is correct!"
    exit 0
fi

# Check what the current SG is
echo "Checking what $CURRENT_SG is..."
CURRENT_SG_NAME=$(aws ec2 describe-security-groups \
    --region "$REGION" \
    --group-ids "$CURRENT_SG" \
    --query 'SecurityGroups[0].GroupName' \
    --output text 2>/dev/null)

echo "Current SG name: $CURRENT_SG_NAME"
echo ""

# Add rule for ALB SG
echo "Adding rule to allow ALB SG ($ALB_SG) on port 3001..."
aws ec2 authorize-security-group-ingress \
    --region "$REGION" \
    --group-id "$ECS_SG" \
    --protocol tcp \
    --port 3001 \
    --source-group "$ALB_SG" \
    --output text 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ Security group rule added successfully!"
    echo ""
    echo "Now ECS SG allows traffic from both:"
    echo "  - $CURRENT_SG ($CURRENT_SG_NAME)"
    echo "  - $ALB_SG (ALB security group)"
else
    echo "❌ Failed to add rule. Error code: $?"
    echo ""
    echo "Possible reasons:"
    echo "  1. Rule already exists"
    echo "  2. Insufficient permissions"
    echo "  3. Invalid security group ID"
    echo ""
    echo "Try adding manually via AWS Console:"
    echo "  EC2 → Security Groups → $ECS_SG → Inbound Rules → Edit"
    echo "  Add: Custom TCP, Port 3001, Source: $ALB_SG"
fi

echo ""
echo "Verifying rule..."
aws ec2 describe-security-groups \
    --region "$REGION" \
    --group-ids "$ECS_SG" \
    --query 'SecurityGroups[0].IpPermissions[?FromPort==`3001` && ToPort==`3001` && IpProtocol==`tcp`].{
        Protocol:IpProtocol,
        FromPort:FromPort,
        ToPort:ToPort,
        SourceGroup:UserIdGroupPairs[0].GroupId
    }' \
    --output table 2>/dev/null
