#!/bin/bash
# Setup CloudWatch alarms for SkillMatch API metrics

REGION=${1:-us-east-1}
NAMESPACE=${2:-SkillMatch/API}
SNS_TOPIC_ARN=${3:-}

echo "=========================================="
echo "Setting up CloudWatch Alarms"
echo "=========================================="
echo ""
echo "Region: $REGION"
echo "Namespace: $NAMESPACE"
echo "SNS Topic: ${SNS_TOPIC_ARN:-'Not configured'}"
echo ""

# Check if SNS topic is provided
if [ -z "$SNS_TOPIC_ARN" ]; then
    echo "⚠️  No SNS topic ARN provided. Alarms will be created but won't send notifications."
    echo "   To add notifications later, update alarms with:"
    echo "   aws cloudwatch put-metric-alarm --alarm-name <name> --alarm-actions <sns-arn>"
    echo ""
fi

# Function to create alarm
create_alarm() {
    local ALARM_NAME=$1
    local METRIC_NAME=$2
    local STATISTIC=$3
    local THRESHOLD=$4
    local COMPARISON=$5
    local PERIOD=${6:-300}
    local EVAL_PERIODS=${7:-2}
    local DESCRIPTION=$8

    echo "Creating alarm: $ALARM_NAME"
    
    local CMD="aws cloudwatch put-metric-alarm \
        --alarm-name \"$ALARM_NAME\" \
        --alarm-description \"$DESCRIPTION\" \
        --metric-name \"$METRIC_NAME\" \
        --namespace \"$NAMESPACE\" \
        --statistic \"$STATISTIC\" \
        --period $PERIOD \
        --evaluation-periods $EVAL_PERIODS \
        --threshold $THRESHOLD \
        --comparison-operator \"$COMPARISON\" \
        --region \"$REGION\""

    if [ -n "$SNS_TOPIC_ARN" ]; then
        CMD="$CMD --alarm-actions \"$SNS_TOPIC_ARN\""
    fi

    eval $CMD

    if [ $? -eq 0 ]; then
        echo "✅ Alarm created: $ALARM_NAME"
    else
        echo "❌ Failed to create alarm: $ALARM_NAME"
    fi
    echo ""
}

# 1. High Error Rate Alarm
create_alarm \
    "skillmatch-high-error-rate" \
    "ApiErrors" \
    "Sum" \
    10 \
    "GreaterThanThreshold" \
    300 \
    2 \
    "Alert when API errors exceed 10 in 5 minutes"

# 2. High Server Error Rate (5xx)
create_alarm \
    "skillmatch-high-server-errors" \
    "ApiServerErrors" \
    "Sum" \
    5 \
    "GreaterThanThreshold" \
    300 \
    2 \
    "Alert when 5xx server errors exceed 5 in 5 minutes"

# 3. High Latency Alarm (P95)
create_alarm \
    "skillmatch-high-latency-p95" \
    "ApiLatencyP95" \
    "Average" \
    1000 \
    "GreaterThanThreshold" \
    300 \
    2 \
    "Alert when P95 latency exceeds 1 second"

# 4. High Latency Alarm (P99)
create_alarm \
    "skillmatch-high-latency-p99" \
    "ApiLatencyP99" \
    "Average" \
    2000 \
    "GreaterThanThreshold" \
    300 \
    2 \
    "Alert when P99 latency exceeds 2 seconds"

# 5. Database Errors Alarm
create_alarm \
    "skillmatch-database-errors" \
    "DatabaseErrors" \
    "Sum" \
    1 \
    "GreaterThanThreshold" \
    300 \
    1 \
    "Alert on any database errors"

# 6. High Authentication Failure Rate
create_alarm \
    "skillmatch-high-auth-failures" \
    "AuthFailure" \
    "Sum" \
    20 \
    "GreaterThanThreshold" \
    300 \
    2 \
    "Alert when authentication failures exceed 20 in 5 minutes (possible attack)"

# 7. Notification Delivery Failure
create_alarm \
    "skillmatch-notification-failures" \
    "NotificationsFailed" \
    "Sum" \
    10 \
    "GreaterThanThreshold" \
    300 \
    2 \
    "Alert when notification failures exceed 10 in 5 minutes"

echo "=========================================="
echo "Alarm Setup Complete"
echo "=========================================="
echo ""
echo "Created alarms:"
echo "  1. skillmatch-high-error-rate"
echo "  2. skillmatch-high-server-errors"
echo "  3. skillmatch-high-latency-p95"
echo "  4. skillmatch-high-latency-p99"
echo "  5. skillmatch-database-errors"
echo "  6. skillmatch-high-auth-failures"
echo "  7. skillmatch-notification-failures"
echo ""
echo "View alarms in CloudWatch Console:"
echo "  https://console.aws.amazon.com/cloudwatch/home?region=$REGION#alarmsV2:"
echo ""
echo "To create SNS topic for notifications:"
echo "  aws sns create-topic --name skillmatch-alerts --region $REGION"
echo "  aws sns subscribe --topic-arn <topic-arn> --protocol email --notification-endpoint your@email.com"
echo ""
