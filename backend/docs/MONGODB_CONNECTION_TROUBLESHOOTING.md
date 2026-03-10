# MongoDB Connection Troubleshooting Guide

## Issue: DNS Resolution Failed + IP Whitelisting Error

### Root Cause Analysis

The test script shows:
1. ❌ DNS resolution failed for all MongoDB hosts
2. ❌ IP whitelisting issue detected

This suggests either:
- The connection string hostnames are incorrect
- The MongoDB Atlas cluster configuration has changed
- Network/DNS issues

### Solution: Get the Correct Connection String from MongoDB Atlas

**Step 1: Get the Standard Connection String (not SRV)**

1. Log into [MongoDB Atlas](https://cloud.mongodb.com/)
2. Go to your cluster → **Connect**
3. Choose **"Connect your application"**
4. Select **"Node.js"** driver
5. **IMPORTANT**: Click **"I don't have the MongoDB URI"** or look for **"Standard connection string"**
6. Copy the connection string - it should look like:
   ```
   mongodb://db_user1:<password>@cluster0-shard-00-00.xxxxx.mongodb.net:27017,cluster0-shard-00-01.xxxxx.mongodb.net:27017,cluster0-shard-00-02.xxxxx.mongodb.net:27017/skillmatch-1?ssl=true&replicaSet=atlas-xxxxx-shard-0&authSource=admin&retryWrites=true&w=majority
   ```

**Step 2: Verify IP Whitelist**

1. In MongoDB Atlas, go to **Network Access**
2. Ensure `0.0.0.0/0` is in the list and shows **"Active"** status
3. If you just added it, wait 1-2 minutes for propagation

**Step 3: Test the Connection String**

Use the Python test script with the connection string from Atlas:

```bash
cd backend
source venv/bin/activate
python test_mongodb_connection.py "<connection-string-from-atlas>"
```

### Alternative: Use SRV Format (if DNS works)

If the standard format doesn't work, try the SRV format:

1. In MongoDB Atlas Connect dialog, select **"SRV connection string"**
2. It will look like: `mongodb+srv://db_user1:<password>@cluster0.xxxxx.mongodb.net/skillmatch-1?retryWrites=true&w=majority`
3. **Note**: SRV requires DNS resolution, which may not work in ECS. Use standard format for ECS.

### For ECS Deployment

Once you have the correct connection string:

1. **Update AWS Secrets Manager:**
   ```bash
   aws secretsmanager update-secret \
     --secret-id skillmatch/mongodb-uri \
     --secret-string "mongodb://db_user1:YOUR_PASSWORD@cluster0-shard-00-00.xxxxx.mongodb.net:27017,cluster0-shard-00-01.xxxxx.mongodb.net:27017,cluster0-shard-00-02.xxxxx.mongodb.net:27017/skillmatch-1?ssl=true&replicaSet=atlas-xxxxx-shard-0&authSource=admin&retryWrites=true&w=majority" \
     --region us-east-1
   ```

2. **Force new ECS deployment:**
   ```bash
   aws ecs update-service \
     --cluster skillmatch-cluster \
     --service skillmatch-backend-service \
     --force-new-deployment \
     --region us-east-1
   ```

3. **Monitor logs:**
   ```bash
   aws logs tail /ecs/skillmatch-backend --since 2m --follow --region us-east-1
   ```

### Common Issues

1. **Hostnames don't match**: The connection string you're using might be from an old cluster or manually constructed. Always get it fresh from Atlas.

2. **IP Whitelist not active**: Even with `0.0.0.0/0`, wait 1-2 minutes after adding it.

3. **Wrong replica set name**: The `replicaSet` parameter must match your cluster's replica set name (visible in Atlas cluster details).

4. **Password encoding**: If your password has special characters, they must be URL-encoded in the connection string.
