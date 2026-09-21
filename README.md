# SkillMatch

A full-stack community skill-exchange platform built to explore
reliable backend systems and asynchronous event processing.

Users can discover people based on skills, connect, message each
other, and receive notifications.

## Engineering Highlights

- Designed an asynchronous notification pipeline using
  MongoDB Outbox → Amazon SQS → Worker → Amazon SES
- Built idempotent consumers with retry and failure handling
- Implemented exponential-backoff retries and dead-letter handling
- Deployed API and worker services on AWS ECS
- Added CloudWatch metrics and structured logging for queue health,
  processing failures, retries, and latency
- Built authentication, profiles, matching, and messaging APIs

## Tech Stack

React · Node.js · Express · MongoDB · AWS ECS · SQS · SES ·
CloudWatch · JWT · Docker
