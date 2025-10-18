#!/usr/bin/env bun
/**
 * Quick Smoke Test - Critical Flows Only
 * Run this for fast validation of core functionality
 */

async function quickSmokeTest() {
  console.log('🚀 Running Quick Smoke Test...\n');
  
  const tests = [
    {
      name: 'API Health',
      test: async () => {
        const response = await fetch(`${process.env.EXPO_PUBLIC_API_BASE}/health`);
        if (!response.ok) throw new Error('API not healthy');
      },
    },
    {
      name: 'tRPC Connection',
      test: async () => {
        const { trpcClient } = await import('@/lib/trpc');
        await trpcClient.example.hi.query();
      },
    },
    {
      name: 'Storage Available',
      test: async () => {
        const AsyncStorage = await import('@react-native-async-storage/async-storage');
        await AsyncStorage.default.setItem('smoke-test', 'ok');
        const value = await AsyncStorage.default.getItem('smoke-test');
        if (value !== 'ok') throw new Error('Storage not working');
        await AsyncStorage.default.removeItem('smoke-test');
      },
    },
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const { name, test } of tests) {
    try {
      await test();
      console.log(`✅ ${name}`);
      passed++;
    } catch (error) {
      console.log(`❌ ${name}: ${error instanceof Error ? error.message : String(error)}`);
      failed++;
    }
  }
  
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);
  
  if (failed > 0) {
    process.exit(1);
  }
  
  console.log('✨ Quick smoke test passed!\n');
}

if (typeof process !== 'undefined' && require.main === module) {
  quickSmokeTest();
}

export { quickSmokeTest };
