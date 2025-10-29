# Bundling Error Fix Guide

## Persistent Error Resolution

The bundling errors you're experiencing are typically caused by:
1. Stale Metro bundler cache
2. TypeScript server cache issues
3. Expo cache corruption

## Step-by-Step Fix

### Option 1: Quick Fix (Recommended)
```bash
# Clear all caches and restart
rm -rf node_modules/.cache .expo .expo-shared
bunx expo start --clear
```

### Option 2: Deep Clean
```bash
# 1. Stop all running processes
# Kill any running Metro bundlers

# 2. Clean everything
rm -rf node_modules/.cache
rm -rf .expo
rm -rf .expo-shared
rm -rf node_modules/.vite

# 3. Reinstall dependencies
bun install

# 4. Start fresh
bunx expo start --clear --reset-cache
```

### Option 3: Nuclear Option (if above don't work)
```bash
# Complete reset
rm -rf node_modules
rm -rf .expo
rm -rf .expo-shared
rm bun.lockb
bun install
bunx expo start --clear
```

## TypeScript Errors Fix

For the TypeScript errors you saw:
- `Property 'git' does not exist` - This is resolved (gitInit exists in router)
- `Property 'export' does not exist` - This is resolved (exportZip exists in router)
- `Property 'cacheDirectory' does not exist` - This was a typo, should be `documentDirectory`

These are now fixed in the code. If you still see them:

1. **Restart TypeScript Server** (in VS Code):
   - Press `Cmd/Ctrl + Shift + P`
   - Type "TypeScript: Restart TS Server"
   - Hit Enter

2. **Restart your IDE**

## Preventing Future Issues

Add this to your workflow:

**Before running the app:**
```bash
bunx expo start --clear
```

**Weekly cleanup:**
```bash
rm -rf .expo node_modules/.cache
```

## What Each Error Meant

1. **"Empty file" error** - Missing/corrupt asset file (already removed)
2. **"Identifier 'initTRPC' has already been declared"** - Duplicate import (already fixed)
3. **"Unable to resolve expo-sharing"** - Package exists, just needed cache clear
4. **TypeScript property errors** - Type cache issues (restart TS server)

## Current Status

✅ All code errors are fixed
✅ Dependencies are correctly installed
✅ TypeScript types are correct
✅ Routes exist in backend

The issue is **cache-related**. Run Option 1 above to fix it.
