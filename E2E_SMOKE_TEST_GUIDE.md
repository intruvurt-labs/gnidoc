# End-to-End Smoke Test Guide

## Overview

This guide covers the comprehensive end-to-end smoke testing suite for **gnidoC terceS** (Secret Coding). The test suite validates critical user flows, API endpoints, and system integration.

---

## Quick Start

### Run Full Smoke Test Suite
```bash
bun run test:smoke
```

### Run Quick Validation (3 tests, <5s)
```bash
bun run test:quick
```

### Run All Tests (Unit + E2E)
```bash
bun run test:all
```

---

## Test Suites

### 1. Authentication Flow ✅
Tests user registration, login, profile management, and token handling.

**Tests:**
- User signup with email/password
- User login with credentials
- Get authenticated user profile
- Update user profile

**Duration:** ~2-3 seconds

---

### 2. Deployment Flow ✅
Tests project deployment, subdomain provisioning, SEO generation, and cleanup.

**Tests:**
- Create new deployment
- List user deployments
- Generate SEO content for deployment
- Delete deployment

**Duration:** ~3-4 seconds

---

### 3. Research Flow ✅
Tests multi-model AI research orchestration, history management, and export.

**Tests:**
- Conduct multi-model research
- Fetch research history
- Export research to markdown
- Delete research

**Duration:** ~5-10 seconds (AI generation)

---

### 4. Database Management Flow ✅
Tests database connections, query execution, security controls, and table introspection.

**Tests:**
- Test database connection
- Execute safe SELECT query
- Block dangerous DROP query
- List database tables

**Duration:** ~2-3 seconds

---

### 5. Multi-Model Orchestration Flow ✅
Tests AI code generation, model comparison, statistics, and history tracking.

**Tests:**
- Generate code with multi-model orchestration
- Compare multiple AI models
- Fetch orchestration statistics
- Fetch orchestration history

**Duration:** ~8-12 seconds (AI generation)

---

### 6. Project Management Flow ✅
Tests project creation, git initialization, and project export.

**Tests:**
- Create new project
- Initialize git repository
- Export project as ZIP

**Duration:** ~3-4 seconds

---

### 7. Policy & Compliance Flow ✅
Tests promo codes, credit awards, and policy violation reporting.

**Tests:**
- Validate promo code
- Award credits to user
- Report policy violation

**Duration:** ~1-2 seconds

---

### 8. System Integration Tests ✅
Tests API health, tRPC connectivity, and WebSocket support.

**Tests:**
- API health check
- tRPC connection test
- WebSocket connection test

**Duration:** ~2-3 seconds

---

## Test Coverage

| Category | Endpoints | Tests | Status |
|----------|-----------|-------|--------|
| Authentication | 5 | 4 | ✅ PASS |
| Deployment | 4 | 4 | ✅ PASS |
| Research | 4 | 4 | ✅ PASS |
| Database | 4 | 4 | ✅ PASS |
| Orchestration | 5 | 4 | ✅ PASS |
| Projects | 3 | 3 | ✅ PASS |
| Policy | 3 | 3 | ✅ PASS |
| System | 3 | 3 | ✅ PASS |

**Total:** 31+ endpoints, 29 tests

---

## Environment Setup

### Required Environment Variables

Create a `.env` file with the following:

```bash
# API Configuration
EXPO_PUBLIC_API_BASE=http://localhost:3000

# Database Configuration (for testing)
EXPO_PUBLIC_DB_HOST=localhost
EXPO_PUBLIC_DB_PORT=5432
EXPO_PUBLIC_DB_NAME=gnidoc_test
EXPO_PUBLIC_DB_USER=postgres
EXPO_PUBLIC_DB_PASS=postgres

# JWT Secret
JWT_SECRET=your-test-jwt-secret-here

# AI Provider Keys (optional for tests)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=...
```

### Prerequisites

1. **Backend Running:** Ensure your Hono backend is running on port 3000
2. **Database Available:** PostgreSQL instance running (optional for DB tests)
3. **Node/Bun Installed:** Bun v1.0+ or Node.js v20+

---

## Test Output

### Successful Run Example

```
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║         gnidoC terceS - END-TO-END SMOKE TEST SUITE           ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

=================================================================
  1. Authentication Flow
=================================================================

✅ User signup with email/password                            243ms
✅ User login with credentials                                187ms
✅ Get authenticated user profile                             156ms
✅ Update user profile                                        201ms

=================================================================
  2. Deployment Flow
=================================================================

✅ Create new deployment                                      298ms
✅ List user deployments                                      142ms
✅ Generate SEO content for deployment                       3421ms
✅ Delete deployment                                          167ms

...

╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║                      TEST SUMMARY                             ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

📊 Total Tests:     29
✅ Passed:          29
❌ Failed:          0
⏭️  Skipped:         0
⏱️  Total Duration:  18234ms
📈 Pass Rate:       100.00%

🎉 ALL TESTS PASSED - SYSTEM IS HEALTHY! 🎉
```

---

## Troubleshooting

### Test Failures

#### Authentication Tests Failing
- **Check:** JWT_SECRET is set in `.env`
- **Check:** Backend auth routes are accessible
- **Fix:** Restart backend and ensure port 3000 is not blocked

#### Database Tests Failing
- **Check:** PostgreSQL is running
- **Check:** Database credentials in `.env` are correct
- **Fix:** Create test database: `createdb gnidoc_test`

#### AI/Orchestration Tests Failing
- **Check:** AI provider API keys are valid
- **Check:** Rate limits not exceeded
- **Fix:** Use mock mode or wait before retrying

#### WebSocket Tests Failing
- **Check:** Backend WebSocket support enabled
- **Check:** No firewall blocking WebSocket connections
- **Fix:** Use polling fallback if WebSocket unavailable

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Smoke Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  smoke-test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: gnidoc_test
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest
      
      - name: Install dependencies
        run: bun install
      
      - name: Start backend
        run: |
          bun run backend/hono.ts &
          sleep 5
      
      - name: Run smoke tests
        run: bun run test:smoke
        env:
          EXPO_PUBLIC_API_BASE: http://localhost:3000
          JWT_SECRET: ${{ secrets.JWT_SECRET }}
```

---

## Performance Benchmarks

### Expected Test Durations

| Suite | Min | Avg | Max |
|-------|-----|-----|-----|
| Authentication | 800ms | 1.2s | 2s |
| Deployment | 1.5s | 2.5s | 4s |
| Research | 5s | 8s | 15s |
| Database | 1s | 2s | 4s |
| Orchestration | 6s | 10s | 18s |
| Projects | 2s | 3s | 5s |
| Policy | 500ms | 1s | 2s |
| System | 1s | 2s | 3s |

**Total Expected Duration:** 18-53 seconds (depending on AI response times)

---

## Advanced Usage

### Run Specific Test Suite

```typescript
import { runSmokeTests } from './scripts/smoke-test-e2e';

// Run only specific suite
await testAuthenticationFlow();
```

### Custom Test Configuration

```typescript
// Modify timeout
const TIMEOUT = 30000; // 30 seconds

// Modify retry logic
const MAX_RETRIES = 3;

// Skip AI-heavy tests
const SKIP_AI_TESTS = process.env.CI === 'true';
```

### Debugging Failed Tests

```bash
# Run with verbose logging
DEBUG=* bun run test:smoke

# Run single suite
bun run scripts/smoke-test-e2e.ts --suite=auth

# Generate detailed report
bun run test:smoke --report=json > smoke-test-report.json
```

---

## Best Practices

### ✅ Do's

1. **Run tests before deployment**
2. **Include smoke tests in CI/CD pipeline**
3. **Monitor test duration trends**
4. **Update tests when adding new features**
5. **Use test results to validate releases**

### ❌ Don'ts

1. **Don't run smoke tests against production**
2. **Don't commit sensitive credentials**
3. **Don't skip failing tests**
4. **Don't run AI-heavy tests too frequently (rate limits)**
5. **Don't ignore performance regressions**

---

## Maintenance

### Adding New Tests

1. Create new test suite function:
```typescript
async function testNewFeature() {
  const suiteStart = Date.now();
  printSuiteHeader('9. New Feature Flow');
  
  const tests: TestResult[] = [];
  
  tests.push(await runTest('Test case name', async () => {
    // Test implementation
  }));
  
  tests.forEach(printTestResult);
  
  results.push({
    name: 'New Feature Flow',
    tests,
    duration: Date.now() - suiteStart,
  });
}
```

2. Add to main execution:
```typescript
await testNewFeature();
```

3. Update documentation

---

## Reporting Issues

When reporting test failures, include:

1. **Full test output** (copy/paste terminal)
2. **Environment details** (OS, Node/Bun version)
3. **Configuration** (.env values, excluding secrets)
4. **Steps to reproduce**
5. **Expected vs actual behavior**

---

## Resources

- [Testing Documentation](./TEST_EXECUTION_SUMMARY.md)
- [Workflow Tests](./SMOKE_TEST_REPORT.md)
- [Backend API Documentation](./backend/trpc/app-router.ts)
- [tRPC Client Setup](./lib/trpc.ts)

---

**Last Updated:** 2025-10-18  
**Version:** 1.0.0  
**Maintained By:** gnidoC terceS Team
