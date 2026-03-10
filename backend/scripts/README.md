# Deployment & Infrastructure Scripts

This directory contains scripts for deploying, monitoring, and troubleshooting the SkillMatch backend on AWS ECS.

## Scripts Overview

### Deployment & Monitoring Scripts

#### `test-api.sh`
**Purpose:** End-to-end API testing script  
**Usage:** `./scripts/test-api.sh [region]`  
**Description:** Automatically discovers the ALB DNS name and tests all API endpoints including health check, user registration, login, and protected endpoints.

**Example:**
```bash
./scripts/test-api.sh us-east-1
```

---

#### `check-deployment-status.sh`
**Purpose:** Comprehensive deployment status checker  
**Usage:** `./scripts/check-deployment-status.sh [region] [cluster] [service]`  
**Description:** Checks ECS service status, running tasks, target group health, and provides actionable recommendations.

**Example:**
```bash
./scripts/check-deployment-status.sh us-east-1 skillmatch-cluster skillmatch-backend-service
```

---

#### `monitor-deployment-v2.sh`
**Purpose:** Real-time deployment monitoring  
**Usage:** `./scripts/monitor-deployment-v2.sh`  
**Description:** Polls ECS service status every 10 seconds and automatically detects when deployment is successful. Shows task health status and API URL when ready.

**Example:**
```bash
./scripts/monitor-deployment-v2.sh
```

---

#### `check-target-health.sh`
**Purpose:** Target group health diagnostics  
**Usage:** `./scripts/check-target-health.sh [region]`  
**Description:** Checks target group health status, shows detailed information about each target, and provides recommendations for fixing unhealthy targets.

**Example:**
```bash
./scripts/check-target-health.sh us-east-1
```

---

#### `check-task-status.sh`
**Purpose:** Individual task status checker  
**Usage:** `./scripts/check-task-status.sh <task-arn> [cluster] [region]`  
**Description:** Shows detailed status of a specific ECS task including last status, desired status, exit codes, and health status.

**Example:**
```bash
./scripts/check-task-status.sh arn:aws:ecs:us-east-1:123456789:task/skillmatch-cluster/abc123
```

---

### Infrastructure Fix Scripts

#### `fix-az-mismatch.sh`
**Purpose:** Fix availability zone mismatch between ALB and ECS service  
**Usage:** `./scripts/fix-az-mismatch.sh [region] [cluster] [service]`  
**Description:** Automatically detects AZ mismatch and updates ECS service to use the same subnets as the ALB. This fixes the "unused" target state issue.

**Example:**
```bash
./scripts/fix-az-mismatch.sh us-east-1 skillmatch-cluster skillmatch-backend-service
```

---

#### `fix-sg-rule.sh`
**Purpose:** Fix security group rules for ALB-ECS communication  
**Usage:** `./scripts/fix-sg-rule.sh [region]`  
**Description:** Adds security group rule to allow ALB to communicate with ECS tasks on port 3001. Fixes 502 Bad Gateway errors.

**Example:**
```bash
./scripts/fix-sg-rule.sh us-east-1
```

**Note:** You may need to update the security group IDs in the script for your environment.

---

#### `update_mongodb_secret.sh`
**Purpose:** Update MongoDB connection string in AWS Secrets Manager  
**Usage:** `./scripts/update_mongodb_secret.sh`  
**Description:** Updates the MongoDB URI secret in AWS Secrets Manager and triggers a new ECS deployment.

**Example:**
```bash
./scripts/update_mongodb_secret.sh
```

---

### Testing Scripts

#### `test_mongodb_connection.py`
**Purpose:** Test MongoDB Atlas connection string  
**Usage:** `python3 scripts/test_mongodb_connection.py "<connection-string>"`  
**Description:** Validates MongoDB connection string format, tests DNS resolution, and verifies connectivity. Helps troubleshoot connection issues.

**Prerequisites:**
- Python 3.x
- pymongo library (install via `pip install -r scripts/requirements-test.txt`)

**Example:**
```bash
cd backend
source venv/bin/activate  # if using virtual environment
python3 scripts/test_mongodb_connection.py "mongodb://user:pass@host:27017/dbname"
```

---

#### `setup_test_env.sh`
**Purpose:** Set up Python virtual environment for testing  
**Usage:** `./scripts/setup_test_env.sh`  
**Description:** Creates and activates a Python virtual environment and installs test dependencies.

**Example:**
```bash
./scripts/setup_test_env.sh
source venv/bin/activate
```

---

## Prerequisites

### AWS CLI Configuration
All scripts require AWS CLI to be installed and configured:

```bash
aws configure
```

Required AWS permissions:
- `ecs:*` (for ECS operations)
- `elbv2:*` (for load balancer operations)
- `ec2:Describe*` (for network information)
- `logs:*` (for CloudWatch logs)
- `secretsmanager:*` (for secret management)

### Python Environment (for MongoDB testing)
```bash
cd backend
./scripts/setup_test_env.sh
source venv/bin/activate
```

---

## Common Workflows

### 1. Deploy and Monitor
```bash
# After pushing new Docker image and updating service
./scripts/monitor-deployment-v2.sh

# Or check status manually
./scripts/check-deployment-status.sh
```

### 2. Troubleshoot Unhealthy Targets
```bash
# Check target health
./scripts/check-target-health.sh

# Fix AZ mismatch if needed
./scripts/fix-az-mismatch.sh

# Fix security group if needed
./scripts/fix-sg-rule.sh

# Check again
./scripts/check-target-health.sh
```

### 3. Test MongoDB Connection
```bash
# Set up environment
./scripts/setup_test_env.sh
source venv/bin/activate

# Test connection string
python3 scripts/test_mongodb_connection.py "<your-connection-string>"
```

### 4. End-to-End API Testing
```bash
# After deployment is complete
./scripts/test-api.sh us-east-1
```

---

## Script Categories

### Deployment Scripts
- `test-api.sh` - API testing
- `check-deployment-status.sh` - Status checking
- `monitor-deployment-v2.sh` - Real-time monitoring

### Infrastructure Scripts
- `fix-az-mismatch.sh` - Fix AZ configuration
- `fix-sg-rule.sh` - Fix security groups
- `update_mongodb_secret.sh` - Update secrets

### Diagnostic Scripts
- `check-target-health.sh` - Target group diagnostics
- `check-task-status.sh` - Task status checking
- `test_mongodb_connection.py` - MongoDB connection testing

### Setup Scripts
- `setup_test_env.sh` - Python environment setup

---

## Troubleshooting

### Script Permission Issues
If scripts are not executable:
```bash
chmod +x scripts/*.sh
```

### AWS CLI Not Found
Install AWS CLI:
```bash
# macOS
brew install awscli

# Or download from: https://aws.amazon.com/cli/
```

### Python Dependencies Missing
```bash
pip install -r scripts/requirements-test.txt
```

---

## Notes

- All scripts use sensible defaults (us-east-1, skillmatch-cluster, etc.)
- Scripts output colored text for better readability
- Most scripts provide actionable recommendations when issues are detected
- Scripts are designed to be idempotent (safe to run multiple times)

---

## Related Documentation

- Deployment Guide: `../docs/DEPLOYMENT_GUIDE.md`
- AWS Deployment Guide: `../docs/AWS_DEPLOYMENT_GUIDE.md`
- MongoDB Troubleshooting: `../docs/MONGODB_CONNECTION_TROUBLESHOOTING.md`
- Deployment Challenges: `../../docs/DEPLOYMENT_CHALLENGES_AND_SOLUTIONS.md`
