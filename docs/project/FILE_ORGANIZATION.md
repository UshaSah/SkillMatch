# File Organization Guide

This document describes the standard file organization structure for the SkillMatch project.

## Directory Structure

```
SkillMatch/
├── docs/                          # Project-level documentation
│   ├── README.md                  # Documentation index
│   ├── DEPLOYMENT_GUIDE.md        # General deployment guide
│   ├── AWS_DEPLOYMENT_GUIDE.md    # AWS-specific deployment guide
│   └── DEPLOYMENT_CHALLENGES_AND_SOLUTIONS.md
│
├── backend/
│   ├── src/                       # Application source code
│   │   ├── app.js                 # Main application entry point
│   │   ├── config/                # Configuration files
│   │   ├── controllers/           # Route controllers
│   │   ├── middleware/            # Express middleware
│   │   ├── models/                # Database models
│   │   ├── routes/                # API routes
│   │   ├── scripts/               # Application scripts (seed, etc.)
│   │   ├── services/              # Business logic services
│   │   ├── utils/                 # Utility functions
│   │   ├── validators/            # Input validation
│   │   └── workers/               # Background workers
│   │
│   ├── scripts/                   # Deployment & infrastructure scripts
│   │   ├── README.md              # Scripts documentation
│   │   ├── test-api.sh            # API testing script
│   │   ├── check-deployment-status.sh
│   │   ├── monitor-deployment-v2.sh
│   │   ├── check-target-health.sh
│   │   ├── check-task-status.sh
│   │   ├── fix-az-mismatch.sh
│   │   ├── fix-sg-rule.sh
│   │   ├── update_mongodb_secret.sh
│   │   ├── setup_test_env.sh
│   │   ├── test_mongodb_connection.py
│   │   └── requirements-test.txt
│   │
│   ├── docs/                      # Backend technical documentation
│   │   ├── README.md              # Backend docs index
│   │   ├── DATABASE_STRUCTURE.md
│   │   ├── MESSAGING_ANALYSIS.md
│   │   ├── MONGODB_CONNECTION_TROUBLESHOOTING.md
│   │   └── theory/                # Detailed implementation guides
│   │       ├── ARCHITECTURE.md
│   │       ├── AUTH_FLOW_EXPLAINED.md
│   │       ├── DATABASE_SCHEMA.md
│   │       ├── RATE_LIMITING_EXPLAINED.md
│   │       └── ... (other theory docs)
│   │
│   ├── tests/                     # Test files
│   │   ├── test-auth.js
│   │   ├── test-listings.js
│   │   ├── test-messaging.js
│   │   ├── test-profile.js
│   │   ├── test-rate-limiting.js
│   │   └── test-server.js
│   │
│   ├── data/                      # Data files (seed data, etc.)
│   │   ├── listings.json
│   │   ├── profiles.json
│   │   └── users.json
│   │
│   ├── logs/                      # Application logs
│   │   ├── combined.log
│   │   └── error.log
│   │
│   ├── Dockerfile                 # Docker configuration
│   ├── ecs-task-definition.json   # ECS task definition
│   ├── env.example                # Environment variables template
│   ├── package.json               # Node.js dependencies
│   └── package-lock.json
│
└── frontend/                      # Frontend application (separate repo/module)
```

## Organization Principles

### 1. Scripts Organization (`backend/scripts/`)
All deployment, infrastructure, and utility scripts are centralized in `backend/scripts/`:
- **Deployment scripts**: Scripts for deploying and monitoring deployments
- **Infrastructure scripts**: Scripts for fixing AWS infrastructure issues
- **Testing scripts**: Scripts for testing connections and APIs
- **Setup scripts**: Scripts for setting up development environments

**Benefits:**
- Easy to find all automation scripts
- Clear separation from application code
- Can be version controlled separately if needed
- Easy to document as a group

### 2. Documentation Organization

#### Project-Level Docs (`docs/`)
- Deployment guides
- Project-wide documentation
- High-level architecture decisions

#### Backend Docs (`backend/docs/`)
- Technical documentation specific to backend
- Database structure
- API implementation details
- Theory and implementation guides

**Benefits:**
- Clear separation of concerns
- Easy to navigate
- Can be used for onboarding new developers

### 3. Test Files Organization (`backend/tests/`)
All test files are in the `tests/` directory:
- Unit tests
- Integration tests
- End-to-end tests
- Standalone test scripts

**Benefits:**
- Standard Node.js convention
- Easy to run all tests
- Clear separation from source code

### 4. Configuration Files
Configuration files remain at the backend root level:
- `Dockerfile` - Docker configuration
- `ecs-task-definition.json` - ECS configuration
- `env.example` - Environment variable template
- `package.json` - Node.js dependencies

**Reasoning:**
- Standard locations expected by tools
- Easy to find for deployment
- Follows common conventions

## File Naming Conventions

### Scripts
- Shell scripts: `kebab-case.sh` (e.g., `check-deployment-status.sh`)
- Python scripts: `snake_case.py` (e.g., `test_mongodb_connection.py`)
- All scripts are executable (`chmod +x`)

### Documentation
- Markdown files: `UPPER_SNAKE_CASE.md` for important docs, `Title-Case.md` for others
- README files: `README.md` in each major directory

### Test Files
- Test files: `test-*.js` or `test_*.js` (matching source file naming)

## Usage Examples

### Running Scripts
```bash
# From project root
./backend/scripts/test-api.sh us-east-1

# From backend directory
./scripts/check-deployment-status.sh

# With full path
cd backend/scripts && ./test-api.sh
```

### Accessing Documentation
```bash
# Project-level docs
cat docs/DEPLOYMENT_GUIDE.md

# Backend technical docs
cat backend/docs/DATABASE_STRUCTURE.md

# Theory guides
cat backend/docs/theory/ARCHITECTURE.md
```

### Running Tests
```bash
# From backend directory
npm test

# Or run specific test
node tests/test-auth.js
```

## Migration Notes

### Scripts
- All `.sh` scripts moved from `backend/` to `backend/scripts/`
- Python test script moved to `backend/scripts/`
- `requirements-test.txt` moved to `backend/scripts/`
- Script paths updated in documentation

### Documentation
- Backend-specific docs moved to `backend/docs/`
- Project-level deployment docs moved to `docs/`
- Theory folder moved to `backend/docs/theory/`

### Test Files
- Standalone test files (`test-messaging.js`, `test-rate-limiting.js`) moved to `backend/tests/`

## Benefits of This Organization

1. **Clarity**: Easy to find files by purpose
2. **Scalability**: Structure supports growth
3. **Convention**: Follows Node.js and industry standards
4. **Maintainability**: Related files are grouped together
5. **Documentation**: Each major directory has a README
6. **Separation**: Clear separation between code, scripts, docs, and tests

## Future Considerations

- Consider moving `data/` to `backend/src/data/` if it's application data
- Consider `backend/config/` folder for configuration files if they grow
- Consider `backend/scripts/aws/` subfolder if AWS scripts grow significantly
- Consider separate `docs/api/` for API documentation if needed
