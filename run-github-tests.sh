#!/bin/bash

echo "🧪 Running GitHub API Tests..."
echo ""
echo "================================================"
echo "  GitHub API Implementation Test Suite"
echo "================================================"
echo ""

# Check if test credentials are set
if [ -z "$GITHUB_TEST_TOKEN" ]; then
  echo "⚠️  Warning: GITHUB_TEST_TOKEN not set"
  echo "   Some integration tests will be skipped"
  echo ""
fi

if [ -z "$GITHUB_TEST_OWNER" ]; then
  echo "⚠️  Warning: GITHUB_TEST_OWNER not set"
  echo "   Some integration tests will be skipped"
  echo ""
fi

if [ -z "$GITHUB_TEST_REPO" ]; then
  echo "⚠️  Warning: GITHUB_TEST_REPO not set"
  echo "   Some integration tests will be skipped"
  echo ""
fi

echo "Running unit tests with mocked GitHub API..."
echo ""
bun test __tests__/github-oauth.test.ts

echo ""
echo "================================================"
echo ""

echo "Running integration tests (requires credentials)..."
echo ""
bun test __tests__/github-api.test.ts

echo ""
echo "================================================"
echo "  Test Suite Complete"
echo "================================================"
