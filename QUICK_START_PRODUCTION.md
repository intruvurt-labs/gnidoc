# ⚡ Quick Start: Production Deployment
**Get gnidoC terceS production-ready in 6 weeks**

---

## 🚀 ONE-COMMAND SETUP

```bash
chmod +x scripts/production-fixes.sh && ./scripts/production-fixes.sh
```

This installs everything needed and generates templates. **Takes 2 minutes.**

---

## 📋 CRITICAL PATH (Must Do First)

### 1️⃣ **Sign Up for Services (30 min)**

| Service | Purpose | Cost | Link |
|---------|---------|------|------|
| **Upstash Redis** | Rate limiting | Free tier | [upstash.com](https://upstash.com) |
| **Sentry** | Error tracking | Free tier | [sentry.io](https://sentry.io) |
| **Vercel** | Deployment | Free tier | [vercel.com](https://vercel.com) |
| **Neon** | Database | Free tier | [neon.tech](https://neon.tech) |
| **OpenRouter** | AI models | $25 credit | [openrouter.ai](https://openrouter.ai) |

---

### 2️⃣ **Configure OAuth (1 hour)**

#### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project: "gnidoC terceS"
3. Enable "Google+ API"
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `https://gnidoc.xyz/auth/callback/google`
6. Copy **Client ID** and **Client Secret**

#### GitHub OAuth
1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Create new OAuth App
3. Set callback URL: `https://gnidoc.xyz/auth/callback/github`
4. Copy **Client ID** and **Client Secret**

---

### 3️⃣ **Fill in Environment Variables (20 min)**

Edit `.env.production`:

```bash
# Security (CRITICAL - use the generated JWT_SECRET from script output)
JWT_SECRET=<paste_from_script_output>

# Upstash Redis (from dashboard → REST API)
UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
UPSTASH_REDIS_REST_TOKEN=<your_token>

# Sentry (from project settings)
SENTRY_DSN=https://<key>@sentry.io/<project>

# Database (from Neon dashboard)
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require

# OAuth (from step 2)
EXPO_PUBLIC_GOOGLE_CLIENT_ID=<google_client_id>
GOOGLE_CLIENT_SECRET=<google_secret>
EXPO_PUBLIC_GITHUB_CLIENT_ID=<github_client_id>
GITHUB_CLIENT_SECRET=<github_secret>

# AI (from OpenRouter)
OPENROUTER_API_KEY=sk-or-v1-<your_key>
```

---

### 4️⃣ **Deploy to Vercel (10 min)**

```bash
# Install Vercel CLI
bun add -g vercel

# Link project
vercel link

# Add environment variables
vercel env add UPSTASH_REDIS_REST_URL production
vercel env add SENTRY_DSN production
# ... (repeat for all vars in .env.production)

# Deploy
vercel --prod
```

---

## 🔧 FIX CRITICAL ISSUES (Week 1)

### Issue #1: Google OAuth is Fake ❌
**File:** `contexts/AuthContext.tsx:192-201`

Replace mock implementation with:

```typescript
// lib/google-oauth.ts
import * as Google from 'expo-auth-session/providers/google';

export async function authenticateWithGoogle() {
  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID!,
    iosClientId: process.env.GOOGLE_IOS_CLIENT_ID!,
    androidClientId: process.env.GOOGLE_ANDROID_CLIENT_ID!,
  });

  const result = await promptAsync();
  if (result.type === 'success') {
    const userInfo = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${result.authentication.accessToken}` },
    });
    return { user: await userInfo.json(), token: result.authentication.accessToken };
  }
  throw new Error('Google auth failed');
}
```

---

### Issue #2: No Rate Limiting ❌
**Vulnerability:** DDoS, API abuse, credit farming

Add to ALL public tRPC procedures:

```typescript
// backend/trpc/middleware/rate-limit.ts (already created by script)
import { rateLimitedProcedure } from './middleware/rate-limit';

// Use instead of publicProcedure:
export const exampleProcedure = rateLimitedProcedure
  .input(z.object({ /* ... */ }))
  .mutation(async ({ input }) => {
    // Your code
  });
```

---

### Issue #3: SQL Injection Risk ❌
**File:** `backend/trpc/routes/database/execute/route.ts`

Replace ALL direct queries with:

```typescript
// BEFORE (VULNERABLE):
await db.query(input.query);

// AFTER (SECURE):
import { safeQuery } from '@/backend/db/safe-query';
await safeQuery(input.query, input.params);
```

---

### Issue #4: Console Logs Expose Secrets ❌
**Already fixed by script!** Babel config strips logs in production.

Verify:
```bash
NODE_ENV=production bun run build
# Check dist/index.js - should have no console.log
```

---

## 📊 VALIDATION CHECKLIST

Run these before deploying:

```bash
# Type check
bunx tsc --noEmit

# Lint
bun run lint

# Security scan
bunx semgrep --config=p/security-audit .

# Vulnerability scan
docker run aquasec/trivy:latest fs .

# Build test
NODE_ENV=production bun run build

# Start production server
NODE_ENV=production bun start
```

All should pass with 0 errors.

---

## 🎯 WEEK-BY-WEEK PLAN

### Week 1: Security 🔒
- [ ] Real Google OAuth
- [ ] Rate limiting on all endpoints
- [ ] SQL injection fixes
- [ ] Environment validation
- [ ] Sentry integration

**Goal:** No P0 vulnerabilities

---

### Week 2: Backend 🔧
- [ ] Database connection pooling
- [ ] API key encryption
- [ ] Protected middleware
- [ ] Health check endpoints
- [ ] Error boundaries

**Goal:** Backend production-ready

---

### Week 3: AI Integration 🤖
- [ ] OpenRouter setup
- [ ] Multi-model orchestration
- [ ] Streaming responses
- [ ] Token tracking
- [ ] Model comparison

**Goal:** AI features working

---

### Week 4: AI Features 🎨
- [ ] Research agent
- [ ] Code generation
- [ ] Image generation
- [ ] Speech-to-text
- [ ] Cost tracking

**Goal:** All AI features functional

---

### Week 5: Deployment 🚀
- [ ] GitHub Actions workflow
- [ ] Vercel integration
- [ ] Docker containers
- [ ] Database migrations
- [ ] Preview environments

**Goal:** Auto-deploy working

---

### Week 6: Launch Prep 🎉
- [ ] GitHub App registration
- [ ] One-click deploy
- [ ] Load testing
- [ ] Performance optimization
- [ ] Documentation

**Goal:** Production launch

---

## 💰 REVENUE MILESTONES

| Month | Users | Pro | Ent | MRR |
|-------|-------|-----|-----|-----|
| 1 | 500 | 10 | 0 | $490 |
| 2 | 800 | 25 | 1 | $1,424 |
| 3 | 1,200 | 45 | 2 | $2,603 |
| 6 | 2,500 | 100 | 6 | $6,094 |
| 12 | 5,000 | 200 | 15 | $12,785 |

**Year 1 ARR:** $124K  
**Year 2 ARR:** $372K (3x growth)

---

## 🆘 EMERGENCY CONTACTS

**Service Down?**
- Check status pages first
- Vercel: status.vercel.com
- Upstash: upstash.statuspage.io
- Sentry: status.sentry.io

**Database Issues?**
- Check Neon dashboard
- Review connection pool logs
- Verify SSL certificate valid

**OAuth Broken?**
- Verify redirect URIs match exactly
- Check credentials not expired
- Test in incognito mode

**Deployment Failed?**
- Review Vercel logs
- Check GitHub Actions logs
- Verify all env vars set

---

## 📚 REFERENCE DOCS

**Created by Setup Script:**
- `PRODUCTION_READINESS_2025_COMPREHENSIVE.md` - Full guide
- `PRODUCTION_CHECKLIST.md` - Step-by-step checklist
- `IMPLEMENTATION_SUMMARY_2025.md` - What was done

**Essential Reading:**
- [tRPC Docs](https://trpc.io/docs)
- [Expo OAuth Guide](https://docs.expo.dev/guides/authentication/)
- [React Query Best Practices](https://tkdodo.eu/blog/practical-react-query)

---

## ✅ SUCCESS CRITERIA

**Before Launch:**
- [ ] All P0 issues fixed (8 items)
- [ ] Security audit passed
- [ ] Load test: 1000 req/s handled
- [ ] Uptime test: 7 days > 99.5%
- [ ] Performance: Lighthouse > 90

**Post-Launch Monitoring:**
- Error rate < 0.1%
- API response time < 200ms (p95)
- User retention > 60% (30-day)
- Conversion rate > 5% (free → pro)

---

## 🎬 FINAL COMMAND

```bash
# Run this to start:
./scripts/production-fixes.sh

# Then follow:
cat PRODUCTION_CHECKLIST.md

# Questions? Read:
cat PRODUCTION_READINESS_2025_COMPREHENSIVE.md
```

---

**Status:** 🔴 PRE-ALPHA (35% ready)  
**Target:** ✅ PRODUCTION (95% ready in 6 weeks)  
**Potential:** 💰 $400K ARR by Dec 2026

---

**Last Updated:** December 2025  
**Next Review:** After Week 1 completion
