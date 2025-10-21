# Android Production Readiness Scan

**Generated:** 2025-10-21  
**App:** gnidoC terceS (app.rork.gnidoc)  
**Version:** 1.0.0

---

## 🎯 Executive Summary

| Metric | Status |
|--------|--------|
| **Overall Readiness** | ⚠️ **NEEDS ATTENTION** |
| Critical Issues | ⛔ 3 |
| High Priority | 🚨 5 |
| Medium Priority | ⚠️ 6 |
| Low Priority | ℹ️ 2 |
| **Total Issues** | **16** |

---

## ⛔ Critical Issues

### 1. Missing allowBackup Security Flag
- **Severity:** CRITICAL
- **Issue:** `allowBackup` not explicitly set to false
- **Risk:** Allows backup extraction via ADB, exposing sensitive data
- **Fix:** Add to app.json android config:
```json
"android": {
  "allowBackup": false,
  ...
}
```

### 2. Missing usesCleartextTraffic Security Flag  
- **Severity:** CRITICAL
- **Issue:** `usesCleartextTraffic` not explicitly set to false
- **Risk:** Allows unencrypted HTTP traffic, enabling MITM attacks
- **Fix:** Add to app.json android config:
```json
"android": {
  "usesCleartextTraffic": false,
  ...
}
```

### 3. Deprecated Storage Permissions
- **Severity:** CRITICAL
- **Issue:** Using deprecated `READ_EXTERNAL_STORAGE` and `WRITE_EXTERNAL_STORAGE`
- **Risk:** Play Store rejection on Android 11+ (API 30+)
- **Fix:** Remove these permissions and use Scoped Storage:
```json
"permissions": [
  "android.permission.VIBRATE",
  "INTERNET",
  "CAMERA",
  "RECORD_AUDIO",
  "RECEIVE_BOOT_COMPLETED",
  "WAKE_LOCK",
  "android.permission.RECEIVE_BOOT_COMPLETED",
  "android.permission.SCHEDULE_EXACT_ALARM"
]
```

---

## 🚨 High Priority Issues

### 4. Missing versionCode
- **Severity:** HIGH
- **Issue:** No `versionCode` specified for Android
- **Impact:** Required for Play Store updates
- **Fix:** Add incrementing integer for each release:
```json
"android": {
  "versionCode": 1
}
```

### 5. Missing targetSdkVersion
- **Severity:** HIGH  
- **Issue:** Not explicitly set (defaults to SDK version)
- **Impact:** Play Store requires targetSdkVersion 34+ (Android 14) as of 2024
- **Fix:** Set to latest stable API level:
```json
"android": {
  "targetSdkVersion": 35
}
```

### 6. Missing minSdkVersion
- **Severity:** HIGH
- **Issue:** Not explicitly configured
- **Fix:** Set minimum supported Android version:
```json
"android": {
  "minSdkVersion": 23
}
```
Recommended: 23 (Android 6.0) for modern APIs, or 26 (Android 8.0) for optimal security.

### 7. No Network Security Config
- **Severity:** HIGH
- **Issue:** Missing network security configuration
- **Risk:** No certificate pinning, cleartext allowed by default on older APIs
- **Fix:** Create `network_security_config.xml` and reference in app.json:
```json
"android": {
  "networkSecurityConfig": "./android/network_security_config.xml"
}
```

### 8. Missing Asset References
- **Severity:** HIGH
- **Issue:** Notification icon and sound files referenced but not present
- **Files Missing:**
  - `./local/assets/notification_icon.png`
  - `./local/assets/notification_sound.wav`
- **Fix:** Either create these assets or remove references from expo-notifications plugin

---

## ⚠️ Medium Priority Issues

### 9. SQLCipher Disabled on Android
- **Severity:** MEDIUM
- **Issue:** Database encryption disabled via `useSQLCipher: false`
- **Risk:** Sensitive data stored in plaintext SQLite database
- **Fix:** Enable unless performance is critical:
```json
["expo-sqlite", {
  "android": {
    "useSQLCipher": true
  }
}]
```

### 10. SCHEDULE_EXACT_ALARM Permission
- **Severity:** MEDIUM
- **Issue:** Requires user consent on Android 12+ (API 31+)
- **Fix:** Implement runtime permission request or use `SCHEDULE_EXACT_ALARM` judiciously
- **Docs:** https://developer.android.com/about/versions/12/behavior-changes-12#exact-alarm-permission

### 11. Dangerous Permissions Require Runtime Handling
- **Severity:** MEDIUM
- **Issue:** CAMERA, RECORD_AUDIO declared without visible runtime permission code
- **Fix:** Ensure proper permission checks:
```typescript
import { Camera } from 'expo-camera';
import { Audio } from 'expo-av';

// Before using camera/audio
const { status } = await Camera.requestCameraPermissionsAsync();
const { status: audioStatus } = await Audio.requestPermissionsAsync();
```

### 12. No ProGuard/R8 Configuration
- **Severity:** MEDIUM
- **Issue:** Code shrinking not explicitly configured
- **Impact:** Larger APK size, easier reverse engineering
- **Fix:** Enable for release builds:
```json
"android": {
  "enableProguardInReleaseBuilds": true
}
```

### 13. Adaptive Icon Background Color
- **Severity:** MEDIUM
- **Issue:** Using pure white (#ffffff) may not work well on all launchers
- **Fix:** Consider a branded color or subtle shade for better visibility

### 14. Missing Google Services Config
- **Severity:** MEDIUM (if using Firebase)
- **Issue:** No `google-services.json` configured
- **Fix:** If using Firebase/FCM:
```json
"android": {
  "googleServicesFile": "./google-services.json"
}
```

---

## ℹ️ Low Priority / Info

### 15. No Hermes Configuration
- **Severity:** INFO
- **Current:** Defaults to JSC or Hermes based on Expo SDK
- **Recommendation:** Explicitly enable Hermes for better performance:
```json
"android": {
  "jsEngine": "hermes"
}
```

### 16. New Architecture Not Verified
- **Severity:** INFO
- **Current:** `newArchEnabled: true` in root config
- **Action:** Test thoroughly on Android devices - New Architecture has platform-specific quirks

---

## ✅ Readiness Checklist

### Security
- [ ] Set `allowBackup: false`
- [ ] Set `usesCleartextTraffic: false`  
- [ ] Remove deprecated storage permissions
- [ ] Add network security config
- [ ] Enable SQLCipher for sensitive data
- [ ] Implement runtime permission checks
- [ ] Remove or disable debuggable flag in production

### Configuration
- [ ] Add `versionCode` (increment for each release)
- [ ] Set `targetSdkVersion: 35` (Android 15)
- [ ] Set `minSdkVersion: 23` or higher
- [ ] Verify package name format: `app.rork.gnidoc` ✅
- [ ] Configure adaptive icon (verify display)
- [ ] Add missing notification assets or remove references

### Performance  
- [ ] Enable Hermes engine
- [ ] Enable ProGuard/R8 minification
- [ ] Test 64-bit builds (enabled by default)
- [ ] Optimize large assets (use WebP)
- [ ] Test app size (target < 50MB for initial download)

### Compatibility
- [ ] Test on Android 6.0 (API 23) - min supported
- [ ] Test on Android 10 (API 29) - scoped storage
- [ ] Test on Android 12 (API 31) - exact alarm permissions
- [ ] Test on Android 13 (API 33) - notification permissions
- [ ] Test on Android 14 (API 34) - current target
- [ ] Test on Android 15 (API 35) - latest

### Play Store Compliance
- [ ] Privacy policy URL provided
- [ ] App content rating completed
- [ ] Target audience selected
- [ ] Data safety section filled
- [ ] Test release on internal/closed track
- [ ] Release notes prepared
- [ ] Store listing assets ready

---

## 📋 Recommended app.json Changes

Apply these changes to your `app.json`:

```json
{
  "expo": {
    "android": {
      "package": "app.rork.gnidoc",
      "versionCode": 1,
      "minSdkVersion": 23,
      "targetSdkVersion": 35,
      "allowBackup": false,
      "usesCleartextTraffic": false,
      "enableProguardInReleaseBuilds": true,
      "jsEngine": "hermes",
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/adaptive-icon.png",
        "backgroundColor": "#0b0f12"
      },
      "permissions": [
        "android.permission.VIBRATE",
        "INTERNET",
        "CAMERA",
        "RECORD_AUDIO",
        "RECEIVE_BOOT_COMPLETED",
        "WAKE_LOCK",
        "android.permission.RECEIVE_BOOT_COMPLETED",
        "android.permission.SCHEDULE_EXACT_ALARM"
      ]
    },
    "plugins": [
      ["expo-notifications", {
        "icon": "./assets/images/notification-icon.png",
        "color": "#ffffff",
        "defaultChannel": "default",
        "enableBackgroundRemoteNotifications": false
      }],
      ["expo-sqlite", {
        "enableFTS": true,
        "useSQLCipher": true,
        "android": {
          "enableFTS": false,
          "useSQLCipher": true
        }
      }]
    ]
  }
}
```

---

## 🧪 Testing Requirements

### Pre-Release Testing
1. **Security Testing**
   - [ ] Run `adb backup` - should fail with allowBackup=false
   - [ ] Test network calls - HTTP should fail with cleartext=false
   - [ ] Verify SQLite encryption with SQLCipher
   - [ ] Test permission flows for camera/audio

2. **Compatibility Testing**
   - [ ] Test on Android 6.0 (API 23)
   - [ ] Test on Android 10+ (scoped storage)
   - [ ] Test on Android 12+ (notification/alarm permissions)
   - [ ] Test on different screen sizes/densities
   - [ ] Test on different manufacturers (Samsung, Pixel, Xiaomi)

3. **Performance Testing**
   - [ ] Measure cold start time (target < 3s)
   - [ ] Check bundle size (target < 50MB)
   - [ ] Profile memory usage
   - [ ] Test on low-end devices
   - [ ] Battery drain testing

4. **Integration Testing**
   - [ ] Test app updates (install over existing)
   - [ ] Test fresh installs
   - [ ] Test data persistence after updates
   - [ ] Test offline functionality
   - [ ] Test deep linking with gnidoc:// scheme

---

## 🚀 Build Commands

### Development Build
```bash
eas build --platform android --profile development
```

### Preview Build (Internal Testing)
```bash
eas build --platform android --profile preview
```

### Production Build
```bash
eas build --platform android --profile production
```

### Local Build (Testing)
```bash
expo prebuild --platform android
cd android && ./gradlew assembleRelease
```

---

## 📚 Resources

- [Android App Bundle Documentation](https://developer.android.com/guide/app-bundle)
- [Android Security Best Practices](https://developer.android.com/topic/security/best-practices)
- [Play Store Requirements](https://support.google.com/googleplay/android-developer/answer/9859455)
- [Expo Android Configuration](https://docs.expo.dev/versions/latest/config/app/#android)
- [React Native Android Setup](https://reactnative.dev/docs/signed-apk-android)

---

## ⚡ Quick Fixes Priority Order

1. **CRITICAL** - Remove deprecated storage permissions (5 min)
2. **CRITICAL** - Add `allowBackup: false` (1 min)
3. **CRITICAL** - Add `usesCleartextTraffic: false` (1 min)
4. **HIGH** - Add `versionCode: 1` (1 min)
5. **HIGH** - Add `targetSdkVersion: 35` (1 min)
6. **HIGH** - Remove missing notification asset references (2 min)
7. **MEDIUM** - Enable SQLCipher (1 min)
8. **MEDIUM** - Enable ProGuard (1 min)

**Total time for critical/high fixes: ~15 minutes**

---

*Scan completed on 2025-10-21. Re-run after applying fixes.*
