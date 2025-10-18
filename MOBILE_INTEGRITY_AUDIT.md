# gnidoC terceS — Mobile Integrity & Release Readiness Audit

**Date:** 2025-10-18  
**Targets:** Android AAB / iOS IPA — Expo SDK 53, React Native 0.79.5, Hermes ON  
**Audit Scope:** Mobile app integrity, security, orchestration, build readiness

---

## Executive Summary

**Status:** 🔴 **NOT READY FOR PRODUCTION**

### Critical Blockers (5)
1. ❌ **Multi-model enforcement NOT implemented** — API allows single model execution
2. ❌ **localhost URLs hardcoded** — Will break in production builds
3. ❌ **Android security hardening missing** — allowBackup, cleartext traffic not configured
4. ❌ **Sensitive data logging** — Tokens and prompts exposed in logs
5. ❌ **.env file committed** — Contains placeholder API keys

### Health Score: 42/100

| Category | Score | Status |
|----------|-------|--------|
| Dependencies | 75/100 | 🟡 Good |
| Security | 25/100 | 🔴 Critical |
| Orchestration | 30/100 | 🔴 Critical |
| Build & Deploy | 20/100 | 🔴 Critical |
| Runtime | 60/100 | 🟡 Needs Work |
| Code Hygiene | 70/100 | 🟡 Good |
| Performance & A11y | 40/100 | 🟠 Needs Work |

---

## 1) 📦 Dependencies

### Status: 🟡 GOOD (75/100)

#### Outdated Packages
- `@sentry/react-native: ~6.14.0` → Latest: ~8.x (Major security/stability updates)

#### Missing Optimization Libraries
- `@shopify/flash-list` — Not installed (recommended for queue/conflicts/console lists)
- `react-native-reanimated` — Present but not explicitly configured

#### Heavy Modules
- Large PNG assets in `/assets/images` (multiple >500KB files)
- Video asset: `assets/images/ANIMATED.mp4` (should be hosted externally)

#### Recommendations
```bash
# Update critical packages
bun add @sentry/react-native@latest

# Add performance libraries
bun add @shopify/flash-list

# Optimize assets
- Compress PNGs with tinypng/imageoptim
- Host ANIMATED.mp4 on CDN (Cloudflare R2, S3)
```

---

## 2) 🛡 Security & Privacy

### Status: 🔴 CRITICAL (25/100)

### Android Security Issues
```xml
<!-- MISSING in AndroidManifest.xml -->
<application
  android:allowBackup="false"
  android:usesCleartextTraffic="false">
</application>
```

**Impact:** App data can be backed up (potential key leakage), allows unencrypted HTTP traffic.

### iOS Security Issues
```xml
<!-- MISSING in Info.plist -->
<key>NSAppTransportSecurity</key>
<dict>
  <key>NSAllowsArbitraryLoads</key><false/>
</dict>
```

**Impact:** App may allow arbitrary network loads without explicit configuration.

### Privacy Violations

#### 1. Token Logging
**File:** `lib/trpc.ts:42`
```typescript
console.log('[tRPC] Using token:', token ? `${token.substring(0, 10)}...` : 'none');
```
**Fix:**
```typescript
// Remove in production
if (__DEV__) {
  console.log('[tRPC] Using token:', token ? 'present' : 'none');
}
```

#### 2. No Prompt/Output Redaction
**File:** `backend/trpc/routes/orchestration/generate/route.ts`
- Full prompts logged (may contain user PII)
- Model responses stored unredacted

**Fix:**
```typescript
// Redact sensitive content
const redactedPrompt = input.prompt.length > 50 
  ? `${input.prompt.substring(0, 50)}... [${input.prompt.length} chars]`
  : input.prompt;
console.log(`[Orchestration] Prompt: ${redactedPrompt}`);
```

#### 3. .env File Committed
**File:** `.env` (line 1-28)
- Contains 18 AI provider API keys (placeholders)
- **MUST BE REMOVED** from git

**Fix:**
```bash
# Remove from git history
git rm --cached .env
echo ".env" >> .gitignore

# Use .env.example for reference only
```

---

## 3) 🧠 Orchestrator & Multi-Model Enforcement

### Status: 🔴 CRITICAL (30/100)

### ❌ Single-Model Execution Allowed
**File:** `backend/trpc/routes/orchestration/generate/route.ts:9`
```typescript
models: z.array(z.string()).min(1).max(10),
// ^^^ WRONG: Allows single model
```

**Required Fix:**
```typescript
models: z.array(z.string()).min(2).max(10),
// ^^^ Enforce at least 2 models
```

### Missing Consensus Mechanism
Current implementation:
- ✅ Multiple models called in sequence
- ✅ Quality scoring per model
- ❌ **NO cross-critique stage**
- ❌ **NO vote vectors**
- ❌ **NO consensus threshold enforcement**

**Required Implementation:**
```typescript
// Add to orchestration pipeline
interface VoteResult {
  modelId: string;
  output: string;
  confidence: number;
  critique: string[];
}

// Stage A: Parallel model execution
const votes: VoteResult[] = await Promise.all(
  models.map(m => generateWithCritique(m, prompt))
);

// Stage B: Cross-critique
const critiques = await Promise.all(
  votes.map(v => critiqueOtherOutputs(v, votes))
);

// Stage C: Consensus resolution
const consensus = calculateConsensus(votes, critiques);
if (consensus.score < 0.6) {
  throw new Error('Low consensus - manual review required');
}
```

### Client-Side Issues
**File:** `contexts/TriModelContext.tsx:195`
```typescript
models: [], // Empty array allows zero models
```

**Fix:** Add validation:
```typescript
if (config.models.length < 2) {
  throw new Error('At least 2 models required for orchestration');
}
```

---

## 4) 🏗 Build & Deployment

### Status: 🔴 CRITICAL (20/100)

### EAS Configuration Missing
- ❌ No `eas.json` found
- ❌ No build profiles (preview, production)
- ❌ No ProGuard/R8 configuration for Android

**Required Setup:**
```json
{
  "cli": { "version": ">= 8.0.0" },
  "build": {
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      },
      "ios": {
        "simulator": true
      },
      "env": {
        "EXPO_PUBLIC_RORK_API_BASE_URL": "https://preview-api.gnidoc.xyz"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle",
        "enableProguardInReleaseBuilds": true
      },
      "ios": {
        "simulator": false
      },
      "env": {
        "EXPO_PUBLIC_RORK_API_BASE_URL": "https://api.gnidoc.xyz"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

### OTA Updates Issues
**File:** `app.json:137-140`
```json
"updates": {
  "checkAutomatically": "ON_LOAD",
  "fallbackToCacheTimeout": 0
}
```

Issues:
- ❌ Code signing NOT enabled
- ❌ No custom channels configured
- ❌ Using sdkVersion policy (not recommended for production)

**Fix:**
```json
"runtimeVersion": "1.0.0",
"updates": {
  "enabled": true,
  "checkAutomatically": "ON_LOAD",
  "fallbackToCacheTimeout": 10000,
  "codeSigningCertificate": "./certs/update-certificate.pem",
  "codeSigningMetadata": {
    "keyid": "main",
    "alg": "rsa-v1_5-sha256"
  }
}
```

### Metro Configuration Missing
- ❌ No `metro.config.js` for optimization
- ❌ `inlineRequires` not enabled
- ❌ Bundle size not measured

**Create `metro.config.js`:**
```javascript
const { getDefaultConfig } = require('expo/metro-config');

module.exports = (async () => {
  const config = await getDefaultConfig(__dirname);
  
  config.transformer.inlineRequires = true;
  config.transformer.minifierConfig = {
    keep_classnames: false,
    keep_fnames: false,
    mangle: { toplevel: false },
    compress: {
      drop_console: true, // Remove console.log in production
      reduce_funcs: true,
      passes: 3,
    },
  };
  
  return config;
})();
```

---

## 5) ⚙️ Runtime & Deployment Health

### Status: 🟡 NEEDS WORK (60/100)

### Endpoint Validation
**Issues:**
1. `src/api/client.ts:6` — Fallback: `http://localhost:8787`
2. `.env:1` — `EXPO_PUBLIC_RORK_API_BASE_URL=http://localhost:3000`

**Fix:**
```typescript
const API_BASE = (() => {
  const base = Constants.expoConfig?.extra?.apiBase || process.env.EXPO_PUBLIC_API_BASE;
  
  if (!base) {
    throw new Error(
      'EXPO_PUBLIC_API_BASE not configured. Set in .env or app.config.js'
    );
  }
  
  if (__DEV__ && base.includes('localhost')) {
    console.warn('[API] Using localhost URL - ensure backend is running');
  }
  
  if (!__DEV__ && (base.includes('localhost') || base.includes('127.0.0.1'))) {
    throw new Error('Production builds cannot use localhost URLs');
  }
  
  return base;
})();
```

### Background Fetch
**Status:** ✅ Configured but incomplete
**File:** `src/sync/worker.ts`

Issues:
- Implementation references missing backend endpoints
- No error recovery for failed syncs
- No network condition checking

### Push Notifications
**Status:** ⚠️ Partial

Issues:
- Push infrastructure present in config
- No token registration in backend
- No deep link handling for notifications

---

## 6) 📦 Codebase Hygiene

### Status: 🟡 GOOD (70/100)

### Large Assets
```
assets/images/ANIMATED.mp4     — Video (likely >5MB)
assets/images/agent*.PNG       — Multiple large PNGs (>500KB each)
```

**Recommendations:**
1. Host video externally on CDN
2. Compress PNGs with ImageOptim
3. Use WebP format where supported

### Unused Modules
```
Users/kaiokendev/aurebix/      — Legacy directory structure
*.md documentation files       — 38 files (excessive)
```

**Cleanup:**
```bash
# Remove legacy directories
rm -rf Users/

# Consolidate docs
mkdir -p docs/
mv *.md docs/
# Keep only README.md, CHANGELOG.md in root
```

### .gitignore
**Status:** ✅ Good
- Properly excludes node_modules, .expo, builds
- ❌ **BUT:** .env file currently committed

---

## 7) 🚦 Frontend Performance & Accessibility

### Status: 🟠 NEEDS WORK (40/100)

### Performance Issues

#### 1. No List Optimization
**Files:** `app/(tabs)/queue.tsx`, `app/(tabs)/conflicts.tsx`, `app/(tabs)/console.tsx`

All use standard `FlatList` instead of `@shopify/flash-list`:

**Current:**
```typescript
<FlatList data={items} ... />
```

**Recommended:**
```typescript
import { FlashList } from '@shopify/flash-list';

<FlashList
  data={items}
  estimatedItemSize={120}
  ...
/>
```

**Impact:** 5-10x better scroll performance on large lists.

#### 2. No Component Memoization
**Searched:** `components/` directory
**Found:** ❌ Zero usage of `React.memo`, `useMemo`, `useCallback`

**High-priority candidates:**
- `components/OrchestrationCard.tsx`
- `components/QueueItemCard.tsx`
- `components/ConflictCard.tsx`
- `components/ScreenBackground.tsx`

**Fix:**
```typescript
import { memo } from 'react';

export const OrchestrationCard = memo(({ orchestration, onRerun }) => {
  // ...
});
```

#### 3. No Lazy Loading
All screens loaded eagerly. Heavy screens should be lazy loaded:
- OrchestrationConsole (vote vectors, critiques)
- Revisions viewer (JSON patch rendering)

**Implementation:**
```typescript
import { lazy, Suspense } from 'react';

const ConsoleScreen = lazy(() => import('./app/(tabs)/console'));

// In navigation
<Suspense fallback={<LoadingScreen />}>
  <ConsoleScreen />
</Suspense>
```

### Accessibility Issues

#### No A11y Labels Found
**Searched:** `app/` directory for `accessibilityLabel`, `accessibilityRole`, `accessible`
**Found:** ❌ Zero usage

**Impact:** Screen readers cannot navigate the app effectively.

**Required Fixes:**
```typescript
// Before
<TouchableOpacity onPress={...}>
  <Text>Retry</Text>
</TouchableOpacity>

// After
<TouchableOpacity
  onPress={...}
  accessibilityLabel="Retry failed queue item"
  accessibilityRole="button"
  accessibilityHint="Double tap to retry this operation"
>
  <Text>Retry</Text>
</TouchableOpacity>
```

#### Touch Targets
No verification that touch targets meet 44×44pt minimum.

**Audit Required:**
```typescript
// Add to all interactive elements
style={{
  minHeight: 44,
  minWidth: 44,
  justifyContent: 'center',
  alignItems: 'center',
}}
```

---

## 8) 🔗 App ↔ Server Alignment

### Status: 🟡 GOOD (75/100)

### Type Safety
✅ tRPC provides end-to-end type safety
✅ Zod schemas for validation
❌ Missing transformer in `src/api/client.ts:18`

**Fix:**
```typescript
import superjson from 'superjson';

export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${API_BASE}/api/trpc`,
      transformer: superjson, // ADD THIS
      async headers() {
        const token = await getAuthToken();
        return token ? { authorization: `Bearer ${token}` } : {};
      },
    }),
  ],
});
```

### Auth Flow
✅ Token stored in SecureStore (src/api/client.ts)
✅ Token sent in headers
❌ No 401 interceptor for automatic refresh

**Add Interceptor:**
```typescript
async fetch(url, init) {
  const response = await fetch(url, init);
  
  if (response.status === 401) {
    // Try to refresh token
    const newToken = await refreshAuthToken();
    if (newToken) {
      await SecureStore.setItemAsync('auth_token', newToken);
      // Retry original request
      return fetch(url, {
        ...init,
        headers: {
          ...init.headers,
          authorization: `Bearer ${newToken}`,
        },
      });
    }
  }
  
  return response;
}
```

### Offline Queue
✅ Idempotency keys implemented
✅ Conflict UI path present
✅ Poison message handling

---

## 9) 📊 Summary & Action Plan

### Critical Path to Production (1-2 weeks)

#### Week 1: Security & Orchestration
**Day 1-2: Security Hardening**
- [ ] Remove .env from git, add to .gitignore
- [ ] Add Android security flags (allowBackup=false, cleartext=false)
- [ ] Configure iOS ATS properly
- [ ] Remove token/prompt logging or gate with `__DEV__`

**Day 3-4: Multi-Model Enforcement**
- [ ] Change API schema to `.min(2)` for models
- [ ] Implement ConsensusVoter with cross-critique
- [ ] Add vote vectors and consensus scores to response
- [ ] Update client to validate minModels >= 2

**Day 5: Environment Configuration**
- [ ] Create app.config.js with environment-based URLs
- [ ] Remove all localhost fallbacks
- [ ] Set up preview/production API endpoints

#### Week 2: Build & Performance
**Day 6-7: EAS Configuration**
- [ ] Create eas.json with preview/production profiles
- [ ] Configure code signing for OTA updates
- [ ] Set up Android ProGuard/R8
- [ ] Test preview builds on physical devices

**Day 8: Performance Optimization**
- [ ] Add @shopify/flash-list to queue/conflicts/console
- [ ] Wrap heavy components with React.memo
- [ ] Create metro.config.js with optimizations
- [ ] Compress/externalize large assets

**Day 9: Accessibility**
- [ ] Add accessibilityLabel to all interactive elements
- [ ] Add accessibilityRole to buttons/links
- [ ] Verify touch targets ≥44x44
- [ ] Test with screen reader (TalkBack/VoiceOver)

**Day 10: Final Testing**
- [ ] E2E tests with Maestro (offline queue, conflicts, orchestration)
- [ ] Manual QA on Android/iOS devices
- [ ] Load testing with multiple models
- [ ] Low consensus scenario testing

---

## 10) 🎯 Priority Matrix

| Priority | Item | Effort | Impact | Timeline |
|----------|------|--------|--------|----------|
| 🔴 P0 | Enforce minModels >= 2 | 2h | Critical | Day 3 |
| 🔴 P0 | Remove .env from git | 10min | Critical | Day 1 |
| 🔴 P0 | Fix localhost URLs | 1h | Critical | Day 5 |
| 🔴 P0 | Android security flags | 30min | Critical | Day 1 |
| 🔴 P0 | Remove sensitive logging | 1h | Critical | Day 2 |
| 🟠 P1 | Implement ConsensusVoter | 8h | High | Day 3-4 |
| 🟠 P1 | Create EAS config | 4h | High | Day 6 |
| 🟠 P1 | Configure OTA signing | 2h | High | Day 7 |
| 🟠 P1 | Add flash-list | 2h | High | Day 8 |
| 🟡 P2 | Add accessibility labels | 4h | Medium | Day 9 |
| 🟡 P2 | Component memoization | 3h | Medium | Day 8 |
| 🟡 P2 | Update Sentry | 1h | Medium | Day 6 |
| 🟢 P3 | Compress assets | 2h | Low | Day 8 |
| 🟢 P3 | Clean up docs | 30min | Low | Day 10 |

---

## 11) 🔧 Quick Fixes (Copy-Paste Ready)

### Fix 1: Enforce Multi-Model (P0)
**File:** `backend/trpc/routes/orchestration/generate/route.ts:9`
```typescript
const orchestrationRequestSchema = z.object({
  prompt: z.string().min(1).max(5000),
  models: z.array(z.string()).min(2).max(10), // Changed from .min(1)
  // ... rest
});
```

### Fix 2: Remove Sensitive Logging (P0)
**File:** `lib/trpc.ts:42`
```typescript
if (__DEV__) {
  console.log('[tRPC] Using token:', token ? 'present' : 'none');
}
```

**File:** `backend/trpc/routes/orchestration/generate/route.ts:25`
```typescript
if (__DEV__) {
  const shortToken = token.substring(0, 6);
  console.log(`[Orchestration] Token ${shortToken}... starting`);
}
```

### Fix 3: API URL Validation (P0)
**File:** `src/api/client.ts:6`
```typescript
const API_BASE = (() => {
  const base = Constants.expoConfig?.extra?.apiBase || 
               process.env.EXPO_PUBLIC_API_BASE;
  
  if (!base) {
    throw new Error('EXPO_PUBLIC_API_BASE must be configured');
  }
  
  if (!__DEV__ && (base.includes('localhost') || base.includes('127.0.0.1'))) {
    throw new Error('Cannot use localhost in production builds');
  }
  
  return base;
})();
```

### Fix 4: Android Security (P0)
**Create:** `android/app/src/main/AndroidManifest.xml` (if not exists)
```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest ...>
    <application
        android:allowBackup="false"
        android:usesCleartextTraffic="false"
        android:supportsRtl="true"
        ...>
    </application>
</manifest>
```

### Fix 5: Add tRPC Transformer (P1)
**File:** `src/api/client.ts:18`
```typescript
import superjson from 'superjson';

export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${API_BASE}/api/trpc`,
      transformer: superjson,
      async headers() {
        // ...
      },
    }),
  ],
});
```

---

## 12) 📞 Support Contacts

For questions or blockers during implementation:

- **Multi-Model Orchestration:** Review ConsensusVoter pattern in audit
- **EAS Build Issues:** https://docs.expo.dev/build/introduction/
- **Security Best Practices:** https://docs.expo.dev/guides/security/
- **Performance Optimization:** https://shopify.github.io/flash-list/

---

## 13) ✅ Pre-Launch Checklist

Before submitting to app stores:

### Security
- [ ] .env removed from git history
- [ ] Android allowBackup=false, cleartext=false
- [ ] iOS ATS configured
- [ ] All sensitive logging removed or gated with `__DEV__`
- [ ] API keys fetched from secure backend, not bundled

### Orchestration
- [ ] minModels >= 2 enforced in API
- [ ] ConsensusVoter implemented with vote vectors
- [ ] Consensus threshold validation (default 0.6)
- [ ] Low consensus alerts configured

### Build & Deploy
- [ ] EAS profiles for preview/production created
- [ ] OTA code signing enabled and tested
- [ ] Android ProGuard/R8 enabled
- [ ] Environment-specific URLs configured
- [ ] Bundle size <30MB (Android), <40MB (iOS)

### Performance
- [ ] @shopify/flash-list for all lists >20 items
- [ ] Heavy components wrapped with React.memo
- [ ] metro.config.js optimizations applied
- [ ] Large assets compressed or externalized

### Accessibility
- [ ] accessibilityLabel on all interactive elements
- [ ] Touch targets ≥44x44pt verified
- [ ] Screen reader tested (TalkBack/VoiceOver)
- [ ] Dynamic type support enabled

### Testing
- [ ] E2E tests passing (Maestro)
- [ ] Manual QA on physical Android/iOS devices
- [ ] Offline queue tested with network interruption
- [ ] Conflict resolution UI tested
- [ ] Push notifications tested (if enabled)

### Documentation
- [ ] README updated with build instructions
- [ ] API documentation current
- [ ] Privacy policy updated
- [ ] Terms of service reviewed

---

**Audit Complete.** Review critical blockers and follow action plan for production readiness.
