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

                      ┌─────────────┐
                      │ React Client│
                      └──────┬──────┘
                             │ HTTPS
                             ▼
                      ┌─────────────┐
                      │ Express API │
                      │   (ECS)     │
                      └──────┬──────┘
                             │
                             ▼
                       ┌──────────┐
                       │ MongoDB  │
                       │ + Outbox │
                       └────┬─────┘
                            │
                      Outbox Publisher
                            │
                            ▼
                       ┌─────────┐
                       │   SQS   │
                       └────┬────┘
                            │
                            ▼
                     ┌─────────────┐
                     │   Worker    │
                     │    ECS      │
                     └──────┬──────┘
                            │
                    ┌───────┴───────┐
                    ▼               ▼
                   SES          CloudWatch
                   

## Why asynchronous notifications?

Sending email directly inside an API request couples user-facing
latency and reliability to an external provider.

Instead, SkillMatch persists notification events to an outbox and
processes them asynchronously.

This provides:

- faster user-facing requests
- durable event processing
- retryable failures
- independent worker scaling
- isolation from SES failures

### Delivery semantics

SQS provides at-least-once delivery, meaning messages may be
delivered more than once. Workers therefore process events
idempotently rather than assuming exactly-once delivery.

Normal:

API → Outbox → SQS → Worker → SES ✓


Transient failure:

SQS → Worker → SES ✗
              ↓
            retry
              ↓
            retry
              ↓
             SES ✓


Persistent failure:

SQS → Worker → retry → retry → max attempts → DLQ

## Observability

The notification pipeline exposes operational signals through
CloudWatch and structured application logs.

Key metrics:

- Queue depth
- Oldest message age
- Processing success/failure
- Retry count
- DLQ count
- Processing latency

## Product Features

- JWT authentication
- User profiles
- Skills offered/wanted
- User matching
- Messaging
- Notifications


Engineering Tradeoffs

Three short decisions:

Why SQS instead of Kafka?

SkillMatch needs durable asynchronous delivery but doesn't currently require event replay or stream processing. SQS provides the required delivery semantics with substantially lower operational complexity.

Why separate worker from API?

Notification processing can scale and fail independently without affecting user-facing API availability.

Why outbox instead of API → SQS directly?

Explain the dual-write failure:

DB write succeeds
       ↓
process crashes
       ↓
SQS publish never happens
