# AWS Cost Management Guide

## Understanding Your AWS Costs

### Main Cost Drivers

1. **Application Load Balancer (ALB)** - ~$16/month
   - Charged per hour (~$0.0225/hour)
   - Always running, even with 0 tasks
   - **This is usually the biggest cost!**

2. **ECS Fargate Tasks** - ~$30/month per task
   - 0.25 vCPU, 0.5GB RAM: ~$0.04/hour
   - 0.5 vCPU, 1GB RAM: ~$0.08/hour
   - Only charged when tasks are running

3. **CloudWatch Custom Metrics** - $0.30/metric/month
   - Each unique metric (with dimensions) counts separately
   - Can add up if you have many metrics

4. **Data Transfer** - $0.09/GB
   - Outbound data transfer charges
   - First 1GB free per month

5. **ECR Storage** - $0.10/GB/month
   - Usually minimal (~$0.10-0.50/month)

### Estimated Monthly Costs

| Configuration | Monthly Cost |
|--------------|--------------|
| **Full deployment** (1 task + ALB) | ~$46-50 |
| **ALB only** (0 tasks) | ~$16-20 |
| **Nothing running** | ~$0-5 |

---

## Cost Reduction Options

### Option 1: Scale Down to 0 Tasks (Recommended for Development)

**Cost**: ~$16/month (ALB only)

**What it does:**
- Stops all ECS tasks (saves ~$30/month)
- Keeps ALB running (still charged)
- Keeps all infrastructure intact
- Easy to scale back up

**Command:**
```bash
./backend/scripts/scale-down.sh
```

**To scale back up:**
```bash
aws ecs update-service \
  --cluster skillmatch-cluster \
  --service skillmatch-backend-service \
  --desired-count 1 \
  --region us-east-1
```

**Best for:**
- Development/testing
- When you're not actively using the app
- Want to keep infrastructure for quick restarts

---

### Option 2: Delete Everything (Complete Cleanup)

**Cost**: $0/month

**What it does:**
- Deletes ECS service
- Deletes ALB (biggest cost saver!)
- Deletes target groups
- Deletes CloudWatch log groups
- Optionally deletes ECR images

**Command:**
```bash
./backend/scripts/delete-all-resources.sh
```

**Warning**: This cannot be undone! You'll need to recreate everything.

**Best for:**
- When you're done with the project
- Need to stop all costs immediately
- Don't need the infrastructure anymore

---

### Option 3: Use Fargate Spot (70% Cheaper)

**Cost**: ~$9/month per task (instead of $30)

**What it is:**
- Fargate Spot uses spare capacity
- Up to 70% cheaper
- Tasks can be interrupted (not ideal for production)

**How to enable:**
1. Update task definition to use Fargate Spot
2. Modify ECS service to use Spot capacity

**Best for:**
- Development/testing
- Non-critical workloads
- Cost-sensitive applications

---

### Option 4: Optimize Resources

**Reduce task size:**
- If you're using 0.5 vCPU / 1GB, try 0.25 vCPU / 0.5GB
- Saves ~50% on task costs

**Reduce CloudWatch metrics:**
- Remove unnecessary custom metrics
- Each metric = $0.30/month

**Set log retention:**
- CloudWatch logs can grow expensive
- Set retention to 7-30 days
- Command: `aws logs put-retention-policy --log-group-name /ecs/skillmatch-backend --retention-in-days 7`

---

## Quick Cost Check

Check what's currently running and costing money:

```bash
./backend/scripts/check-aws-costs.sh
```

This shows:
- Running ECS tasks
- ALB status
- ECR storage
- CloudWatch logs
- Custom metrics
- Estimated monthly cost

---

## Cost Monitoring

### View Billing Dashboard

1. Go to AWS Console → Billing Dashboard
2. View current month charges
3. Set up billing alerts

### Set Up Billing Alerts

```bash
# Create SNS topic for billing alerts
aws sns create-topic --name billing-alerts

# Subscribe your email
aws sns subscribe \
  --topic-arn <topic-arn> \
  --protocol email \
  --notification-endpoint your@email.com

# Create billing alarm
aws cloudwatch put-metric-alarm \
  --alarm-name billing-alert-10 \
  --alarm-description "Alert when charges exceed $10" \
  --metric-name EstimatedCharges \
  --namespace AWS/Billing \
  --statistic Maximum \
  --period 86400 \
  --evaluation-periods 1 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions <sns-topic-arn>
```

---

## Recommendations

### For Development/Testing

1. **Scale down to 0 tasks** when not in use
2. **Delete ALB** if you won't use it for a while
3. **Use Fargate Spot** for non-critical workloads
4. **Set log retention** to 7 days

### For Production

1. **Keep ALB** (necessary for production)
2. **Use appropriate task sizes** (don't over-provision)
3. **Set up auto-scaling** (scale down during low traffic)
4. **Monitor costs** with billing alerts
5. **Use Reserved Capacity** if running 24/7 (saves ~40%)

### For Complete Shutdown

1. **Delete everything** using the cleanup script
2. **Verify deletion** in AWS Console
3. **Check billing** to ensure charges stop
4. **Keep secrets** in Secrets Manager (no cost, useful for future)

---

## Cost Breakdown Example

**Typical Month (1 task + ALB):**

```
Application Load Balancer:     $16.20
ECS Fargate (0.25 vCPU):       $29.20
CloudWatch Logs (5GB):         $0.00 (free tier)
CloudWatch Metrics (10):       $3.00
ECR Storage (0.5GB):           $0.05
Data Transfer (1GB):           $0.00 (free tier)
─────────────────────────────────────
Total:                         ~$48.45/month
```

**After Scaling Down (0 tasks):**

```
Application Load Balancer:     $16.20
ECS Fargate:                   $0.00
CloudWatch Logs:               $0.00
CloudWatch Metrics:            $3.00
ECR Storage:                   $0.05
─────────────────────────────────────
Total:                         ~$19.25/month
```

**After Complete Deletion:**

```
Total:                         ~$0.00/month
```

---

## FAQ

### Q: Why am I still being charged after scaling down?

**A**: The ALB is still running. It costs ~$16/month even with 0 tasks. You need to delete the ALB to stop those charges.

### Q: Can I pause/resume instead of deleting?

**A**: Not really. ECS tasks can be scaled to 0, but ALB always runs (and charges). The closest thing is scaling to 0 tasks.

### Q: Will I lose data if I delete everything?

**A**: 
- **Database**: No, MongoDB Atlas is separate
- **Secrets**: No, Secrets Manager keeps them (no cost)
- **ECR Images**: Yes, unless you skip that step
- **Logs**: Yes, CloudWatch logs will be deleted

### Q: How do I know what's costing money?

**A**: 
1. Run `./backend/scripts/check-aws-costs.sh`
2. Check AWS Billing Dashboard
3. Use AWS Cost Explorer

### Q: Can I get a refund?

**A**: AWS doesn't typically refund charges, but you can:
1. Contact AWS Support if charges seem incorrect
2. Stop all resources immediately
3. Set up billing alerts to prevent future surprises

---

## Emergency Cost Stop

If you need to stop costs **immediately**:

```bash
# 1. Scale down tasks (saves ~$30/month)
aws ecs update-service \
  --cluster skillmatch-cluster \
  --service skillmatch-backend-service \
  --desired-count 0 \
  --region us-east-1

# 2. Delete ALB (saves ~$16/month)
# Get ALB ARN first
ALB_ARN=$(aws elbv2 describe-load-balancers \
  --region us-east-1 \
  --query 'LoadBalancers[?contains(LoadBalancerName, `skillmatch`)].LoadBalancerArn' \
  --output text | head -1)

# Delete it
aws elbv2 delete-load-balancer \
  --load-balancer-arn "$ALB_ARN" \
  --region us-east-1
```

**This will stop ~$46/month in charges immediately.**

---

## Next Steps

1. **Check your current costs**: `./backend/scripts/check-aws-costs.sh`
2. **Decide on approach**: Scale down vs. delete everything
3. **Execute cleanup**: Use appropriate script
4. **Verify**: Check AWS Billing Dashboard after 24 hours
5. **Set up alerts**: Prevent future surprises

---

*Remember: AWS charges are based on usage. If resources are running, you're being charged. Always verify resources are stopped/deleted in the AWS Console.*
