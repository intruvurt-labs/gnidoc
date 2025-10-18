# 🧪 Smoke Test Suite - Quick Reference

## Run Tests

```bash
# Full end-to-end smoke test (29 tests, ~30-60s)
bun run test:smoke

# Quick validation (3 tests, <5s)
bun run test:quick

# All tests (unit + workflow + e2e)
bun run test:all
```

## What's Tested

### 8 Test Suites, 29 Tests Total

1. **Authentication Flow** (4 tests)
   - User signup, login, profile fetch, profile update

2. **Deployment Flow** (4 tests)
   - Create deployment, list deployments, generate SEO, delete deployment

3. **Research Flow** (4 tests)
   - Conduct research, fetch history, export to markdown, delete research

4. **Database Management** (4 tests)
   - Test connection, execute queries, block dangerous queries, list tables

5. **Multi-Model Orchestration** (4 tests)
   - Generate code, compare models, fetch stats, fetch history

6. **Project Management** (3 tests)
   - Create project, initialize git, export as ZIP

7. **Policy & Compliance** (3 tests)
   - Check code violations, award credits, report violations

8. **System Integration** (3 tests)
   - API health check, tRPC connection, WebSocket connection

## Expected Output

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

... (continues for all 8 suites)

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

## Prerequisites

1. **Backend running:** Start your Hono server
   ```bash
   bun run start
   ```

2. **Environment variables:** Ensure `.env` is configured
   ```bash
   EXPO_PUBLIC_API_BASE=http://localhost:3000
   JWT_SECRET=your-jwt-secret
   ```

3. **Optional:** PostgreSQL for database tests
   ```bash
   EXPO_PUBLIC_DB_HOST=localhost
   EXPO_PUBLIC_DB_PORT=5432
   EXPO_PUBLIC_DB_NAME=gnidoc_test
   ```

## Troubleshooting

### Tests Failing?

**Authentication errors:**
- Ensure `JWT_SECRET` is set in `.env`
- Check backend is running on correct port

**Database errors:**
- Database tests will fail gracefully if PostgreSQL is not available
- To run full DB tests, ensure PostgreSQL is running

**AI/Orchestration timeouts:**
- These tests may take longer (8-15s)
- Ensure `EXPO_PUBLIC_TOOLKIT_URL` is configured

### Debug Mode

Run with detailed logging:
```bash
DEBUG=* bun run test:smoke
```

## CI/CD Integration

Add to your GitHub Actions workflow:

```yaml
- name: Run Smoke Tests
  run: bun run test:smoke
  env:
    EXPO_PUBLIC_API_BASE: http://localhost:3000
    JWT_SECRET: ${{ secrets.JWT_SECRET }}
```

## Full Documentation

See [E2E_SMOKE_TEST_GUIDE.md](./E2E_SMOKE_TEST_GUIDE.md) for comprehensive documentation.

---

**Status:** ✅ All systems operational  
**Last Run:** Check `bun run test:smoke` output  
**Coverage:** 29 critical user flows across 8 major features
