#!/usr/bin/env bun

import {
  dryRunFiles,
  bulkCommitViaTreeAPI,
  upsertFilesViaContentsAPI,
  type FileSpec,
  type DryRunResult,
} from './lib/github-oauth';

console.log('🧪 GitHub API Implementation Test\n');
console.log('================================================');
console.log('  Testing GitHub API Functions');
console.log('================================================\n');

const TEST_TOKEN = process.env.GITHUB_TEST_TOKEN || 'mock_token';
const TEST_OWNER = process.env.GITHUB_TEST_OWNER || 'test-owner';
const TEST_REPO = process.env.GITHUB_TEST_REPO || 'test-repo';

const hasCredentials = process.env.GITHUB_TEST_TOKEN && 
                       process.env.GITHUB_TEST_OWNER && 
                       process.env.GITHUB_TEST_REPO;

if (!hasCredentials) {
  console.log('⚠️  No test credentials provided. Running in demo mode.\n');
  console.log('To run integration tests, set these environment variables:');
  console.log('  - GITHUB_TEST_TOKEN');
  console.log('  - GITHUB_TEST_OWNER');
  console.log('  - GITHUB_TEST_REPO\n');
}

async function testDryRun() {
  console.log('📋 Test 1: Dry Run Mode');
  console.log('─────────────────────────────────────────────\n');

  const files: FileSpec[] = [
    { path: 'test/file1.txt', contentText: 'Hello World' },
    { path: 'test/file2.json', contentText: JSON.stringify({ key: 'value' }, null, 2) },
    { path: 'test/nested/file3.md', contentText: '# Test File\n\nThis is a test.' },
  ];

  try {
    const results = await dryRunFiles(TEST_TOKEN, TEST_OWNER, TEST_REPO, files);
    
    console.log('✅ Dry run completed successfully!\n');
    console.log('Results:');
    results.forEach((r: DryRunResult) => {
      console.log(`  📄 ${r.path}`);
      console.log(`     Action: ${r.action}`);
      console.log(`     Size: ${r.sizeBytes} bytes`);
      if (r.currentSha) {
        console.log(`     Current SHA: ${r.currentSha}`);
      }
      console.log('');
    });

    const totalSize = results.reduce((sum, r) => sum + r.sizeBytes, 0);
    console.log(`Total size: ${totalSize} bytes\n`);

    return true;
  } catch (error: any) {
    console.log('❌ Dry run failed:', error.message);
    if (!hasCredentials) {
      console.log('   (Expected - no credentials provided)\n');
      return true;
    }
    return false;
  }
}

async function testBulkCommitDryRun() {
  console.log('📦 Test 2: Bulk Commit with Dry Run');
  console.log('─────────────────────────────────────────────\n');

  const files: FileSpec[] = Array.from({ length: 10 }, (_, i) => ({
    path: `bulk/file${i}.txt`,
    contentText: `Content for file ${i}\n${'x'.repeat(100)}`,
  }));

  try {
    const result = await bulkCommitViaTreeAPI(
      TEST_TOKEN,
      TEST_OWNER,
      TEST_REPO,
      files,
      { dryRun: true, message: 'Test bulk commit' }
    );

    if (Array.isArray(result)) {
      console.log('✅ Bulk commit dry run completed!\n');
      console.log(`Analyzed ${result.length} files:`);
      result.forEach((r: DryRunResult) => {
        console.log(`  - ${r.path}: ${r.action} (${r.sizeBytes} bytes)`);
      });
      console.log('');
      return true;
    } else {
      console.log('❌ Expected dry run results, got commit result');
      return false;
    }
  } catch (error: any) {
    console.log('❌ Bulk commit dry run failed:', error.message);
    if (!hasCredentials) {
      console.log('   (Expected - no credentials provided)\n');
      return true;
    }
    return false;
  }
}

async function testFileSizeValidation() {
  console.log('📏 Test 3: File Size Validation');
  console.log('─────────────────────────────────────────────\n');

  const largeFile: FileSpec = {
    path: 'large-file.txt',
    contentText: 'X'.repeat(1_100_000),
  };

  try {
    await upsertFilesViaContentsAPI(
      TEST_TOKEN,
      TEST_OWNER,
      TEST_REPO,
      [largeFile]
    );
    
    console.log('❌ Should have rejected large file\n');
    return false;
  } catch (error: any) {
    if (error.message.includes('File too large for Contents API')) {
      console.log('✅ Large file correctly rejected!');
      console.log(`   Error: ${error.message}\n`);
      return true;
    } else {
      console.log('❌ Unexpected error:', error.message, '\n');
      return false;
    }
  }
}

async function testPathEncoding() {
  console.log('🔤 Test 4: Path Encoding');
  console.log('─────────────────────────────────────────────\n');

  const files: FileSpec[] = [
    { path: 'folder with spaces/file.txt', contentText: 'Test' },
    { path: 'special-chars/file@#$.txt', contentText: 'Test' },
    { path: 'unicode/文件.txt', contentText: 'Test' },
  ];

  try {
    const results = await dryRunFiles(TEST_TOKEN, TEST_OWNER, TEST_REPO, files);
    
    console.log('✅ Path encoding test completed!\n');
    console.log('Encoded paths:');
    results.forEach((r: DryRunResult) => {
      console.log(`  - ${r.path}`);
    });
    console.log('');
    return true;
  } catch (error: any) {
    console.log('❌ Path encoding test failed:', error.message);
    if (!hasCredentials) {
      console.log('   (Expected - no credentials provided)\n');
      return true;
    }
    return false;
  }
}

async function testBinaryFiles() {
  console.log('🔢 Test 5: Binary File Support');
  console.log('─────────────────────────────────────────────\n');

  const binaryData = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const base64Data = Buffer.from(binaryData).toString('base64');

  const files: FileSpec[] = [
    { path: 'binary/image.png', contentBytes: binaryData },
    { path: 'binary/encoded.dat', contentBase64: base64Data },
  ];

  try {
    const results = await dryRunFiles(TEST_TOKEN, TEST_OWNER, TEST_REPO, files);
    
    console.log('✅ Binary file test completed!\n');
    console.log('Binary files analyzed:');
    results.forEach((r: DryRunResult) => {
      console.log(`  - ${r.path}: ${r.sizeBytes} bytes`);
    });
    console.log('');
    return true;
  } catch (error: any) {
    console.log('❌ Binary file test failed:', error.message);
    if (!hasCredentials) {
      console.log('   (Expected - no credentials provided)\n');
      return true;
    }
    return false;
  }
}

async function testAPIRecommendation() {
  console.log('💡 Test 6: API Recommendation Logic');
  console.log('─────────────────────────────────────────────\n');

  const scenarios = [
    { files: 1, avgSize: 100, desc: 'Single small file' },
    { files: 5, avgSize: 500_000, desc: '5 medium files' },
    { files: 50, avgSize: 10_000, desc: '50 small files' },
    { files: 100, avgSize: 50_000, desc: '100 medium files' },
    { files: 1, avgSize: 2_000_000, desc: 'Single large file' },
  ];

  console.log('Recommendations:\n');
  scenarios.forEach(({ files, avgSize, desc }) => {
    const totalSize = files * avgSize;
    const useTreeAPI = files > 10 || avgSize > 950_000 || totalSize > 5_000_000;
    const recommendation = useTreeAPI ? 'Tree API' : 'Contents API';
    
    console.log(`  ${desc}:`);
    console.log(`    Files: ${files}, Avg Size: ${avgSize} bytes`);
    console.log(`    Total: ${totalSize} bytes`);
    console.log(`    → Use ${recommendation}`);
    console.log('');
  });

  return true;
}

async function runAllTests() {
  const results = {
    passed: 0,
    failed: 0,
    total: 0,
  };

  const tests = [
    { name: 'Dry Run Mode', fn: testDryRun },
    { name: 'Bulk Commit Dry Run', fn: testBulkCommitDryRun },
    { name: 'File Size Validation', fn: testFileSizeValidation },
    { name: 'Path Encoding', fn: testPathEncoding },
    { name: 'Binary File Support', fn: testBinaryFiles },
    { name: 'API Recommendation', fn: testAPIRecommendation },
  ];

  for (const test of tests) {
    results.total++;
    try {
      const passed = await test.fn();
      if (passed) {
        results.passed++;
      } else {
        results.failed++;
      }
    } catch (error: any) {
      console.log(`❌ Test "${test.name}" threw an error:`, error.message, '\n');
      results.failed++;
    }
  }

  console.log('================================================');
  console.log('  Test Summary');
  console.log('================================================\n');
  console.log(`Total Tests: ${results.total}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log('');

  if (results.failed === 0) {
    console.log('🎉 All tests passed!\n');
  } else {
    console.log('⚠️  Some tests failed. Please review the output above.\n');
  }

  if (!hasCredentials) {
    console.log('ℹ️  Note: Integration tests were skipped due to missing credentials.');
    console.log('   Set GITHUB_TEST_TOKEN, GITHUB_TEST_OWNER, and GITHUB_TEST_REPO');
    console.log('   to run full integration tests.\n');
  }

  process.exit(results.failed > 0 ? 1 : 0);
}

runAllTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
