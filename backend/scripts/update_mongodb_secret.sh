#!/bin/bash
# Script to update MongoDB URI in AWS Secrets Manager

set -e

echo "=========================================="
echo "MongoDB URI Update Script"
echo "=========================================="
echo ""

# Check if connection string is provided
if [ -z "$1" ]; then
    echo "Usage: ./update_mongodb_secret.sh \"<mongodb-connection-string>\""
    echo ""
    echo "Example:"
    echo "  ./update_mongodb_secret.sh \"mongodb://user:pass@host1:27017,host2:27017/db?ssl=true&authSource=admin\""
    echo ""
    echo "⚠️  IMPORTANT: Get the connection string from MongoDB Atlas:"
    echo "   1. Go to https://cloud.mongodb.com/"
    echo "   2. Select your cluster → Connect"
    echo "   3. Choose 'Connect your application'"
    echo "   4. Select 'Node.js' and copy the STANDARD connection string (not SRV)"
    exit 1
fi

CONNECTION_STRING="$1"
SECRET_NAME="skillmatch/mongodb-uri"
REGION="us-east-1"

echo "📋 Updating secret: $SECRET_NAME"
echo "📍 Region: $REGION"
echo ""

# Mask password in output
MASKED_STRING=$(echo "$CONNECTION_STRING" | sed 's/:[^@]*@/:****@/')
echo "🔐 Connection string: ${MASKED_STRING:0:80}..."
echo ""

# Update the secret
echo "⏳ Updating AWS Secrets Manager..."
aws secretsmanager update-secret \
    --secret-id "$SECRET_NAME" \
    --secret-string "$CONNECTION_STRING" \
    --region "$REGION" \
    --output json > /tmp/secret-update-result.json

if [ $? -eq 0 ]; then
    echo "✅ Secret updated successfully!"
    echo ""
    
    # Verify the update
    echo "🔍 Verifying secret value..."
    VERIFIED=$(aws secretsmanager get-secret-value \
        --secret-id "$SECRET_NAME" \
        --region "$REGION" \
        --query 'SecretString' \
        --output text)
    
    if [ "$VERIFIED" == "$CONNECTION_STRING" ]; then
        echo "✅ Verification successful - secret matches!"
    else
        echo "⚠️  Warning: Retrieved secret doesn't match input"
    fi
    
    echo ""
    echo "🚀 Next steps:"
    echo "   1. Force new ECS deployment:"
    echo "      aws ecs update-service --cluster skillmatch-cluster --service skillmatch-backend-service --force-new-deployment --region us-east-1"
    echo ""
    echo "   2. Monitor logs:"
    echo "      aws logs tail /ecs/skillmatch-backend --since 2m --follow --region us-east-1"
    echo ""
else
    echo "❌ Failed to update secret. Check AWS credentials and permissions."
    exit 1
fi
