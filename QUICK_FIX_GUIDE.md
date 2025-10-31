# 🚨 Quick Fix Guide - Critical Issues Only

## ⏱️ 30-Minute Production Readiness

### 1. Remove Secrets from Git (5 min)
```bash
# Add backend/.env to .gitignore (already done)
# Remove from git history
git rm --cached backend/.env
git commit -m "Remove backend env from tracking"

# Never commit actual secrets - use EAS Secrets instead:
eas secret:create --scope project --name DATABASE_URL --value "your_db_url"
eas secret:create --scope project --name JWT_SECRET --value "your_jwt_secret"
```

### 2. Wrap Console Logs (10 min)
**Quick automated fix:**
```bash
# Find all console.log and wrap in __DEV__
find app -name "*.tsx" -o -name "*.ts" | xargs sed -i.bak 's/console\.log(/if(__DEV__)console.log(/g'

# Or manually replace key files
```

**Better approach** - Create a logger utility:
```typescript
// lib/logger.ts
export const logger = {
  log: (...args: any[]) => {
    if (__DEV__) console.log(...args);
  },
  error: (...args: any[]) => {
    if (__DEV__) console.error(...args);
    // In production, send to Sentry
  }
};

// Then replace: console.log → logger.log
```

### 3. Create Missing Notification Assets (5 min)
**Option A: Remove from config** (recommended for v1.0)
Already done in app.json fixes above - removed icon and sound references.

**Option B: Add actual assets**
```bash
mkdir -p local/assets
# Add 192x192 PNG icon for Android notifications
# Add <5sec WAV audio file
```

### 4. Initialize Sentry (5 min)
```bash
# Install if needed (already in package.json)
npx @sentry/wizard@latest -i reactNative

# Add to app/_layout.tsx (top of file):
import * as Sentry from '@sentry/react-native';

if (!__DEV__) {
  Sentry.init({
    dsn: 'https://your_sentry_dsn@sentry.io/project_id',
    tracesSampleRate: 0.2,
    enableAutoSessionTracking: true,
  });
}
```

### 5. Build & Test (5 min)
```bash
# Install EAS CLI if needed
npm install -g eas-cli

# Login
eas login

# Configure project
eas build:configure

# Start preview build
eas build --platform android --profile preview

# Or iOS
eas build --platform ios --profile preview
```

---

## 📋 Post-Build Checklist

- [ ] Test on physical iOS device (not simulator)
- [ ] Test on physical Android device
- [ ] Verify all screens load
- [ ] Test offline mode
- [ ] Verify camera/mic permissions work
- [ ] Test deep linking: `gnidoc://some-route`
- [ ] Check app doesn't crash on background/foreground
- [ ] Verify notifications work
- [ ] Test with poor network connection

---

## 🔥 Emergency Rollback Plan

If production build has critical issues:

```bash
# Revert to previous OTA update
eas update:republish --channel production --group <previous_group_id>

# Or submit hotfix build
eas build --platform all --profile production --auto-submit
```

---

## 📞 Production Support Contacts

- **Expo Status:** https://status.expo.dev
- **Emergency Support:** Use Expo Discord #help channel
- **App Store Issues:** https://developer.apple.com/contact/
- **Play Store Issues:** https://support.google.com/googleplay/android-developer

---

## ⚡ Performance Monitoring Setup

Add to app/_layout.tsx:
```typescript
import * as Performance from 'expo-performance';

useEffect(() => {
  const mark = Performance.mark('app-startup');
  // ... after app loads
  Performance.measure('startup-time', mark);
}, []);
```

---

## 🎯 Success Metrics

**Week 1 Targets:**
- Crash-free rate: > 99%
- Startup time: < 3s (p95)
- App Store rating: > 4.0
- Zero critical security issues

**Monitor:**
- Sentry dashboard
- EAS Insights
- App Store Connect analytics
- Google Play Console vitals
