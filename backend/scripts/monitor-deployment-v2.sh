#!/bin/bash

echo "📊 Monitoring ECS Service Deployment..."
echo ""

CLUSTER_NAME=skillmatch-cluster
SERVICE_NAME=skillmatch-backend-service

for i in {1..12}; do
  echo "Check $i/12 ($(date +%H:%M:%S)):"
  echo "=================================="
  
  STATUS=$(aws ecs describe-services \
    --cluster $CLUSTER_NAME \
    --services $SERVICE_NAME \
    --query 'services[0].[runningCount,desiredCount,pendingCount,deployments[0].rolloutState]' \
    --output table)
  
  echo "$STATUS"
  echo ""
  
  # Check if we have a running task
  RUNNING=$(aws ecs describe-services \
    --cluster $CLUSTER_NAME \
    --services $SERVICE_NAME \
    --query 'services[0].runningCount' \
    --output text)
  
  if [ "$RUNNING" == "1" ]; then
    echo "✅ Task is running! Checking health..."
    
    # Get task ARN
    TASK_ARN=$(aws ecs list-tasks \
      --cluster $CLUSTER_NAME \
      --service-name $SERVICE_NAME \
      --desired-status RUNNING \
      --query 'taskArns[0]' \
      --output text)
    
    if [ -n "$TASK_ARN" ] && [ "$TASK_ARN" != "None" ]; then
      HEALTH=$(aws ecs describe-tasks \
        --cluster $CLUSTER_NAME \
        --tasks $TASK_ARN \
        --query 'tasks[0].healthStatus' \
        --output text)
      
      echo "Task Health: $HEALTH"
      
      if [ "$HEALTH" == "HEALTHY" ]; then
        echo ""
        echo "🎉 Deployment successful! Task is HEALTHY!"
        
        # Get API URL
        ALB_DNS=$(aws elbv2 describe-load-balancers \
          --query 'LoadBalancers[?contains(LoadBalancerName, `skillmatch`)].DNSName' \
          --output text)
        
        if [ -n "$ALB_DNS" ] && [ "$ALB_DNS" != "None" ]; then
          echo ""
          echo "🌐 API URL: http://$ALB_DNS/api/health"
          echo "Test with: curl http://$ALB_DNS/api/health"
        fi
        exit 0
      fi
    fi
  fi
  
  if [ $i -lt 12 ]; then
    echo "Waiting 10 seconds..."
    sleep 10
    echo ""
  fi
done

echo ""
echo "⚠️  Deployment still in progress or task not healthy yet."
echo "Check manually with:"
echo "  aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME --query 'services[0].[runningCount,desiredCount]' --output table"
