# Backend Documentation

This directory contains technical documentation for the SkillMatch backend application.

## Documentation Structure

### Core Documentation

#### `DATABASE_STRUCTURE.md`
Database schema and structure documentation. Describes all collections, indexes, and relationships.

#### `MESSAGING_ANALYSIS.md`
Analysis of the messaging system implementation, including message flow, threading, and user interactions.

#### `MONGODB_CONNECTION_TROUBLESHOOTING.md`
Comprehensive guide for troubleshooting MongoDB Atlas connection issues, including DNS resolution, IP whitelisting, and connection string configuration.

---

### Theory & Implementation Guides (`theory/`)

The `theory/` subdirectory contains detailed implementation guides and architectural documentation:

#### Architecture & Design
- **`ARCHITECTURE.md`** - Overall system architecture and design decisions
- **`DATABASE_SCHEMA.md`** - Detailed database schema documentation
- **`FUNCTIONAL_FEATURES.md`** - List of implemented features and functionality

#### Authentication & Security
- **`AUTH_FLOW_EXPLAINED.md`** - Detailed explanation of authentication flow
- **`JWT_AUTH_IMPLEMENTATION.md`** - JWT authentication implementation details
- **`RATE_LIMITING_EXPLAINED.md`** - Rate limiting implementation and configuration
- **`RATE_LIMITING_SCALABILITY.md`** - Rate limiting scalability considerations

#### Testing & Development
- **`TESTING_AUTH.md`** - Authentication testing guide
- **`TESTING_PROFILE.md`** - Profile API testing guide
- **`POSTMAN_PARALLEL_TESTING.md`** - Guide for parallel testing with Postman
- **`TEST_RATE_LIMITING_POSTMAN.md`** - Rate limiting testing with Postman
- **`STRESS_TEST_RATE_LIMITING.md`** - Stress testing rate limiting
- **`ANALYZE_RATE_LIMIT_RESULTS.md`** - How to analyze rate limiting test results

#### Data & Seeding
- **`DATABASE_SEEDING.md`** - Database seeding scripts and procedures

#### Roadmaps
- **`IMPLEMENTATION_ROADMAP.md`** - Future implementation plans and roadmap

---

## Quick Links

### For Developers
- [Architecture Overview](../docs/theory/ARCHITECTURE.md)
- [Database Schema](../docs/theory/DATABASE_SCHEMA.md)
- [Authentication Flow](../docs/theory/AUTH_FLOW_EXPLAINED.md)

### For DevOps
- [MongoDB Troubleshooting](./MONGODB_CONNECTION_TROUBLESHOOTING.md)
- [Deployment Scripts](../scripts/README.md)

### For Testing
- [Testing Guides](../docs/theory/TESTING_AUTH.md)
- [Rate Limiting Tests](../docs/theory/TEST_RATE_LIMITING_POSTMAN.md)

---

## Related Documentation

- **Deployment Guides:** See root-level `docs/` directory
- **Scripts:** See `../scripts/README.md`
- **API Tests:** See `../tests/` directory
