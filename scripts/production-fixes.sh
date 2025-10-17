#!/bin/bash
# Production Readiness Fixes - Immediate Actions
# Run this script to implement critical production fixes

set -e

echo "🚀 gnidoC terceS - Production Readiness Implementation"
echo "======================================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Step 1: Install critical dependencies
echo -e "${BLUE}[Step 1/8]${NC} Installing critical dependencies..."
bun add @upstash/redis @upstash/ratelimit @sentry/react-native @sentry/node
bun add -D babel-plugin-transform-remove-console
echo -e "${GREEN}✅ Dependencies installed${NC}\n"

# Step 2: Create production env template
echo -e "${BLUE}[Step 2/8]${NC} Creating production environment template..."
cat > .env.production << 'EOF'
# Production Environment Configuration
NODE_ENV=production

# API Base URL (UPDATE THIS)
EXPO_PUBLIC_RORK_API_BASE_URL=https://api.gnidoc.xyz

# Security Keys (GENERATE NEW ONES!)
JWT_SECRET=CHANGE_ME_USE_CRYPTO_RANDOM_BYTES_64
ENCRYPTION_KEY=CHANGE_ME_USE_CRYPTO_RANDOM_BYTES_32

# Database (Neon/Supabase recommended)
DB_HOST=your-db-host.neon.tech
DB_PORT=5432
DB_NAME=gnidoc_prod
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require

# Rate Limiting (Upstash)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_upstash_token

# Error Tracking (Sentry)
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
EXPO_PUBLIC_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id

# OAuth Configuration
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_IOS_CLIENT_ID=your-ios-client-id.apps.googleusercontent.com
GOOGLE_ANDROID_CLIENT_ID=your-android-client-id.apps.googleusercontent.com
GOOGLE_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com

EXPO_PUBLIC_GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# AI Models (OpenRouter recommended for multi-model)
OPENROUTER_API_KEY=sk-or-v1-your-key-here
OPENAI_API_KEY=sk-proj-your-key-here
ANTHROPIC_API_KEY=sk-ant-your-key-here

# Deployment
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=your_vercel_org_id
VERCEL_PROJECT_ID=your_vercel_project_id
EOF

echo -e "${GREEN}✅ Production environment template created${NC}"
echo -e "${YELLOW}⚠️  IMPORTANT: Edit .env.production with REAL values!${NC}\n"

# Step 3: Generate secure JWT secret
echo -e "${BLUE}[Step 3/8]${NC} Generating secure JWT secret..."
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
echo -e "${GREEN}✅ Generated JWT Secret (copy to .env.production):${NC}"
echo -e "${YELLOW}JWT_SECRET=${JWT_SECRET}${NC}\n"

# Step 4: Configure Babel for console log removal
echo -e "${BLUE}[Step 4/8]${NC} Configuring Babel for production..."
cat > babel.config.js << 'EOF'
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [],
    env: {
      production: {
        plugins: [
          ['transform-remove-console', {
            exclude: ['error', 'warn']
          }]
        ]
      }
    }
  };
};
EOF
echo -e "${GREEN}✅ Babel configured (console logs will be stripped in production)${NC}\n"

# Step 5: Create rate limiting middleware
echo -e "${BLUE}[Step 5/8]${NC} Creating rate limiting middleware..."
mkdir -p backend/trpc/middleware
cat > backend/trpc/middleware/rate-limit.ts << 'EOF'
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { TRPCError } from '@trpc/server';
import { publicProcedure } from '../create-context';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, '1m'),
  analytics: true,
  prefix: 'gnidoc',
});

export const rateLimitedProcedure = publicProcedure.use(async ({ ctx, next }) => {
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }

  const ip = ctx.req?.headers?.['x-forwarded-for'] || 
             ctx.req?.headers?.['x-real-ip'] || 
             'unknown';
  
  const { success, remaining, reset } = await ratelimit.limit(ip.toString());
  
  if (!success) {
    throw new TRPCError({ 
      code: 'TOO_MANY_REQUESTS',
      message: `Rate limit exceeded. Try again in ${Math.ceil((reset - Date.now()) / 1000)}s`
    });
  }

  return next({
    ctx: {
      ...ctx,
      rateLimit: { remaining, reset },
    },
  });
});
EOF
echo -e "${GREEN}✅ Rate limiting middleware created${NC}\n"

# Step 6: Create environment validator
echo -e "${BLUE}[Step 6/8]${NC} Creating environment validator..."
cat > backend/env.ts << 'EOF'
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  
  DB_HOST: z.string().optional(),
  DB_PORT: z.string().regex(/^\d+$/).optional(),
  DB_NAME: z.string().optional(),
  DB_USER: z.string().optional(),
  DB_PASSWORD: z.string().optional(),
  DATABASE_URL: z.string().url().optional(),
  
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  
  SENTRY_DSN: z.string().url().optional(),
  
  OPENROUTER_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Invalid environment variables:');
      error.errors.forEach(err => {
        console.error(`   - ${err.path.join('.')}: ${err.message}`);
      });
      throw new Error('Environment validation failed');
    }
    throw error;
  }
}

export const ENV = validateEnv();
EOF
echo -e "${GREEN}✅ Environment validator created${NC}\n"

# Step 7: Create GitHub Actions workflow
echo -e "${BLUE}[Step 7/8]${NC} Creating GitHub Actions CI/CD workflow..."
mkdir -p .github/workflows
cat > .github/workflows/ci-cd.yml << 'EOF'
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  NODE_ENV: production

jobs:
  test:
    name: Test & Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest
      
      - name: Install dependencies
        run: bun install --frozen-lockfile
      
      - name: Type check
        run: bunx tsc --noEmit
      
      - name: Lint
        run: bun run lint

  security:
    name: Security Scan
    runs-on: ubuntu-latest
    permissions:
      security-events: write
    steps:
      - uses: actions/checkout@v4
      
      - name: Run Semgrep
        uses: returntocorp/semgrep-action@v1
        with:
          config: >-
            p/security-audit
            p/secrets
            p/owasp-top-ten
          generateSarif: "1"
      
      - name: Upload Semgrep results
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: semgrep.sarif
      
      - name: Trivy vulnerability scan
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'
      
      - name: Upload Trivy results
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: 'trivy-results.sarif'

  deploy-preview:
    name: Deploy Preview
    if: github.event_name == 'pull_request'
    needs: [test, security]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: oven-sh/setup-bun@v1
      
      - name: Install dependencies
        run: bun install --frozen-lockfile
      
      - name: Build
        run: bun run build
        env:
          NODE_ENV: production
      
      - name: Deploy to Vercel Preview
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          scope: ${{ secrets.VERCEL_ORG_ID }}

  deploy-production:
    name: Deploy Production
    if: github.ref == 'refs/heads/main'
    needs: [test, security]
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://gnidoc.xyz
    steps:
      - uses: actions/checkout@v4
      
      - uses: oven-sh/setup-bun@v1
      
      - name: Install dependencies
        run: bun install --frozen-lockfile
      
      - name: Build
        run: bun run build
        env:
          NODE_ENV: production
      
      - name: Deploy to Vercel Production
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
          scope: ${{ secrets.VERCEL_ORG_ID }}
      
      - name: Notify Sentry of release
        uses: getsentry/action-release@v1
        if: success()
        env:
          SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
          SENTRY_ORG: ${{ secrets.SENTRY_ORG }}
          SENTRY_PROJECT: ${{ secrets.SENTRY_PROJECT }}
        with:
          environment: production
EOF
echo -e "${GREEN}✅ GitHub Actions workflow created${NC}\n"

# Step 8: Create production checklist
echo -e "${BLUE}[Step 8/8]${NC} Creating production deployment checklist..."
cat > PRODUCTION_CHECKLIST.md << 'EOF'
# 🚀 Production Deployment Checklist

## Before First Deploy

### 1. Environment Setup
- [ ] Copy `.env.production` and fill in ALL values
- [ ] Generate secure JWT_SECRET (use the one printed above)
- [ ] Set up Upstash Redis account (https://upstash.com)
- [ ] Set up Sentry account (https://sentry.io)
- [ ] Set up Vercel project (https://vercel.com)

### 2. Database Setup
- [ ] Create Neon/Supabase database
- [ ] Run migrations (if any)
- [ ] Set up connection pooling
- [ ] Configure SSL/TLS

### 3. OAuth Configuration
#### Google OAuth
- [ ] Create project in Google Cloud Console
- [ ] Enable Google+ API
- [ ] Create OAuth 2.0 credentials
- [ ] Add authorized redirect URIs
- [ ] Copy Client ID and Secret to `.env.production`

#### GitHub OAuth
- [ ] Create GitHub OAuth App
- [ ] Set authorization callback URL
- [ ] Copy Client ID and Secret to `.env.production`

### 4. AI Model Setup
- [ ] Sign up for OpenRouter (https://openrouter.ai)
- [ ] Add credits to OpenRouter account
- [ ] Copy API key to `.env.production`
- [ ] Test API connectivity

### 5. Vercel Setup
- [ ] Create Vercel project
- [ ] Link to GitHub repository
- [ ] Add environment variables in Vercel dashboard
- [ ] Configure custom domain (optional)

### 6. GitHub Secrets
Add these secrets to your GitHub repository:
- [ ] `VERCEL_TOKEN`
- [ ] `VERCEL_ORG_ID`
- [ ] `VERCEL_PROJECT_ID`
- [ ] `SENTRY_AUTH_TOKEN`
- [ ] `SENTRY_ORG`
- [ ] `SENTRY_PROJECT`

### 7. Security Audit
- [ ] Run `bun run lint`
- [ ] Run security scan: `bunx semgrep --config=p/security-audit .`
- [ ] Check for exposed secrets
- [ ] Verify rate limiting works
- [ ] Test authentication flows

### 8. Performance Check
- [ ] Bundle size < 2MB
- [ ] Initial load < 3s
- [ ] Time to Interactive < 5s
- [ ] Lighthouse score > 90

### 9. Monitoring Setup
- [ ] Sentry error tracking configured
- [ ] Uptime monitoring set up (UptimeRobot/Pingdom)
- [ ] Analytics configured (optional)

### 10. Documentation
- [ ] Update README with production URLs
- [ ] Document API endpoints
- [ ] Create user onboarding guide

## After First Deploy

### Week 1
- [ ] Monitor error rates in Sentry
- [ ] Check rate limiting logs
- [ ] Verify OAuth flows work
- [ ] Test AI model integrations
- [ ] Check database performance

### Week 2
- [ ] Review security scan results
- [ ] Optimize slow queries
- [ ] Add missing tests
- [ ] Implement feature flags

### Month 1
- [ ] Set up automated backups
- [ ] Configure CDN for assets
- [ ] Implement caching strategy
- [ ] Add load testing

## Emergency Contacts
- **Database Issues:** [Database provider support]
- **OAuth Failures:** Check provider status pages
- **API Errors:** Sentry dashboard + logs
- **Deployment Issues:** Vercel support

## Rollback Procedure
1. Go to Vercel dashboard
2. Find previous deployment
3. Click "Promote to Production"
4. Verify rollback successful
5. Investigate issue in Sentry

---

**Status:** ⚠️ IN PROGRESS  
**Last Updated:** $(date +%Y-%m-%d)
EOF
echo -e "${GREEN}✅ Production checklist created${NC}\n"

echo "======================================================="
echo -e "${GREEN}✅ Production readiness setup complete!${NC}"
echo ""
echo -e "${YELLOW}📋 NEXT STEPS:${NC}"
echo ""
echo "1. Edit .env.production with REAL values:"
echo "   ${BLUE}nano .env.production${NC}"
echo ""
echo "2. Set up required services:"
echo "   - Upstash Redis: ${BLUE}https://upstash.com${NC}"
echo "   - Sentry: ${BLUE}https://sentry.io${NC}"
echo "   - Vercel: ${BLUE}https://vercel.com${NC}"
echo "   - Neon Database: ${BLUE}https://neon.tech${NC}"
echo ""
echo "3. Configure OAuth providers:"
echo "   - Google Cloud Console: ${BLUE}https://console.cloud.google.com${NC}"
echo "   - GitHub Developer Settings: ${BLUE}https://github.com/settings/developers${NC}"
echo ""
echo "4. Test locally with production settings:"
echo "   ${BLUE}NODE_ENV=production bun start${NC}"
echo ""
echo "5. Follow the checklist:"
echo "   ${BLUE}cat PRODUCTION_CHECKLIST.md${NC}"
echo ""
echo "6. Review the comprehensive guide:"
echo "   ${BLUE}cat PRODUCTION_READINESS_2025_COMPREHENSIVE.md${NC}"
echo ""
echo "======================================================="
