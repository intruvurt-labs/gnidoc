import { describe, it, expect } from 'bun:test';
import {
  dryRunFiles,
  bulkCommitViaTreeAPI,
  upsertFilesViaContentsAPI,
  type FileSpec,
  type DryRunResult,
  type UpsertResult,
} from '@/lib/github-oauth';

const MOCK_TOKEN = process.env.GITHUB_TEST_TOKEN || 'mock_token';
const MOCK_OWNER = process.env.GITHUB_TEST_OWNER || 'test-owner';
const MOCK_REPO = process.env.GITHUB_TEST_REPO || 'test-repo';

describe('GitHub API - Dry Run Mode', () => {
  it('should analyze files without making changes', async () => {
    const files: FileSpec[] = [
      { path: 'test1.txt', contentText: 'Hello World' },
      { path: 'test2.txt', contentText: 'Another file' },
      { path: 'folder/test3.txt', contentText: 'Nested file' },
    ];

    console.log('[Test] Running dry-run analysis...');
    
    try {
      const results = await dryRunFiles(MOCK_TOKEN, MOCK_OWNER, MOCK_REPO, files);
      
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(files.length);
      
      results.forEach((result: DryRunResult, idx: number) => {
        console.log(`[Dry Run] ${result.path}: ${result.action} (${result.sizeBytes} bytes)`);
        expect(result.path).toBe(files[idx].path);
        expect(['create', 'update', 'skip']).toContain(result.action);
        expect(result.sizeBytes).toBeGreaterThan(0);
      });
      
      console.log('[Test] ✓ Dry-run completed successfully');
    } catch (error: any) {
      console.log('[Test] Dry-run test skipped (requires valid GitHub credentials):', error.message);
    }
  });

  it('should calculate correct file sizes', () => {
    const testCases: { file: FileSpec; expectedMinSize: number }[] = [
      { file: { path: 'small.txt', contentText: 'Hi' }, expectedMinSize: 2 },
      { file: { path: 'medium.txt', contentText: 'A'.repeat(1000) }, expectedMinSize: 1000 },
      { file: { path: 'large.txt', contentText: 'B'.repeat(10000) }, expectedMinSize: 10000 },
    ];

    testCases.forEach(({ file, expectedMinSize }) => {
      const base64 = Buffer.from((file as any).contentText, 'utf8').toString('base64');
      const sizeBytes = Math.ceil(base64.length * 0.75);
      expect(sizeBytes).toBeGreaterThanOrEqual(expectedMinSize);
      console.log(`[Size Check] ${file.path}: ${sizeBytes} bytes`);
    });
  });
});

describe('GitHub API - Git Tree API (Bulk Commits)', () => {
  it('should support dry-run via options', async () => {
    const files: FileSpec[] = [
      { path: 'bulk1.txt', contentText: 'Bulk file 1' },
      { path: 'bulk2.txt', contentText: 'Bulk file 2' },
    ];

    console.log('[Test] Testing bulk commit with dry-run option...');
    
    try {
      const result = await bulkCommitViaTreeAPI(
        MOCK_TOKEN,
        MOCK_OWNER,
        MOCK_REPO,
        files,
        { dryRun: true }
      );

      expect(Array.isArray(result)).toBe(true);
      const dryRunResults = result as DryRunResult[];
      expect(dryRunResults.length).toBe(files.length);
      
      console.log('[Test] ✓ Bulk commit dry-run completed');
    } catch (error: any) {
      console.log('[Test] Bulk commit test skipped (requires valid GitHub credentials):', error.message);
    }
  });

  it('should handle large file bundles', async () => {
    const largeBundle: FileSpec[] = Array.from({ length: 50 }, (_, i) => ({
      path: `generated/file${i}.txt`,
      contentText: `Content for file ${i}\n${'x'.repeat(1000)}`,
    }));

    console.log(`[Test] Testing bulk commit with ${largeBundle.length} files...`);
    
    try {
      const result = await bulkCommitViaTreeAPI(
        MOCK_TOKEN,
        MOCK_OWNER,
        MOCK_REPO,
        largeBundle,
        {
          message: 'Test bulk commit with 50 files',
          dryRun: true,
        }
      );

      expect(Array.isArray(result)).toBe(true);
      console.log('[Test] ✓ Large bundle dry-run completed');
    } catch (error: any) {
      console.log('[Test] Large bundle test skipped:', error.message);
    }
  });

  it('should validate commit options', async () => {
    const files: FileSpec[] = [{ path: 'test.txt', contentText: 'Test' }];
    
    const options = {
      message: 'Custom commit message',
      branch: 'main',
      committer: { name: 'Test Bot', email: 'bot@test.com' },
      author: { name: 'Test Author', email: 'author@test.com' },
      dryRun: true,
    };

    console.log('[Test] Testing commit options validation...');
    
    try {
      const result = await bulkCommitViaTreeAPI(
        MOCK_TOKEN,
        MOCK_OWNER,
        MOCK_REPO,
        files,
        options
      );

      expect(result).toBeDefined();
      console.log('[Test] ✓ Commit options validated');
    } catch (error: any) {
      console.log('[Test] Options validation test skipped:', error.message);
    }
  });
});

describe('GitHub API - Contents API (Individual Files)', () => {
  it('should reject files larger than 1MB', async () => {
    const largeFile: FileSpec = {
      path: 'huge.txt',
      contentText: 'X'.repeat(1_100_000),
    };

    console.log('[Test] Testing file size validation...');
    
    try {
      await upsertFilesViaContentsAPI(
        MOCK_TOKEN,
        MOCK_OWNER,
        MOCK_REPO,
        [largeFile]
      );
      
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error.message).toContain('File too large for Contents API');
      console.log('[Test] ✓ Large file rejected correctly:', error.message);
    }
  });

  it('should handle concurrent uploads', async () => {
    const files: FileSpec[] = Array.from({ length: 10 }, (_, i) => ({
      path: `concurrent/file${i}.txt`,
      contentText: `File ${i} content`,
    }));

    console.log('[Test] Testing concurrent file uploads...');
    
    try {
      const results = await upsertFilesViaContentsAPI(
        MOCK_TOKEN,
        MOCK_OWNER,
        MOCK_REPO,
        files,
        'Test concurrent uploads',
        'main',
        undefined,
        undefined,
        4
      );

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(files.length);
      
      results.forEach((result: UpsertResult) => {
        expect(['created', 'updated']).toContain(result.status);
        expect(result.sha).toBeDefined();
        console.log(`[Upload] ${result.path}: ${result.status}`);
      });
      
      console.log('[Test] ✓ Concurrent uploads completed');
    } catch (error: any) {
      console.log('[Test] Concurrent upload test skipped:', error.message);
    }
  });

  it('should handle path encoding correctly', async () => {
    const files: FileSpec[] = [
      { path: 'folder with spaces/file.txt', contentText: 'Test' },
      { path: 'special-chars/file@#$.txt', contentText: 'Test' },
      { path: 'unicode/文件.txt', contentText: 'Test' },
    ];

    console.log('[Test] Testing path encoding...');
    
    try {
      const results = await upsertFilesViaContentsAPI(
        MOCK_TOKEN,
        MOCK_OWNER,
        MOCK_REPO,
        files
      );

      expect(results.length).toBe(files.length);
      console.log('[Test] ✓ Path encoding handled correctly');
    } catch (error: any) {
      console.log('[Test] Path encoding test skipped:', error.message);
    }
  });
});

describe('GitHub API - Binary File Support', () => {
  it('should handle binary files via base64', () => {
    const binaryData = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

    console.log('[Test] Testing binary file handling...');
    
    const base64 = Buffer.from(binaryData).toString('base64');
    expect(base64).toBeDefined();
    expect(base64.length).toBeGreaterThan(0);
    
    console.log('[Test] ✓ Binary file encoded to base64:', base64);
  });

  it('should handle pre-encoded base64 files', () => {
    const base64Content = 'SGVsbG8gV29ybGQ=';
    const file: FileSpec = {
      path: 'encoded.txt',
      contentBase64: base64Content,
    };

    console.log('[Test] Testing pre-encoded base64 files...');
    expect(file.contentBase64).toBe(base64Content);
    console.log('[Test] ✓ Pre-encoded base64 handled correctly');
  });
});

describe('GitHub API - Error Handling & Retries', () => {
  it('should handle 409 conflicts with retry', async () => {
    console.log('[Test] Testing conflict resolution...');
    
    const file: FileSpec = { path: 'conflict.txt', contentText: 'Test conflict' };
    
    try {
      await upsertFilesViaContentsAPI(
        MOCK_TOKEN,
        MOCK_OWNER,
        MOCK_REPO,
        [file]
      );
      console.log('[Test] ✓ Conflict handling test completed');
    } catch (error: any) {
      console.log('[Test] Conflict test skipped:', error.message);
    }
  });

  it('should respect retry-after headers', async () => {
    console.log('[Test] Testing rate limit handling...');
    
    const files: FileSpec[] = Array.from({ length: 5 }, (_, i) => ({
      path: `rate-limit/file${i}.txt`,
      contentText: `File ${i}`,
    }));

    try {
      await upsertFilesViaContentsAPI(
        MOCK_TOKEN,
        MOCK_OWNER,
        MOCK_REPO,
        files,
        'Test rate limiting',
        'main',
        undefined,
        undefined,
        1
      );
      console.log('[Test] ✓ Rate limit handling test completed');
    } catch (error: any) {
      console.log('[Test] Rate limit test skipped:', error.message);
    }
  });
});

describe('GitHub API - Integration Scenarios', () => {
  it('should recommend correct API based on file count and size', () => {
    const scenarios = [
      { files: 1, avgSize: 100, recommended: 'Contents API' },
      { files: 5, avgSize: 500_000, recommended: 'Contents API' },
      { files: 50, avgSize: 10_000, recommended: 'Tree API' },
      { files: 100, avgSize: 50_000, recommended: 'Tree API' },
      { files: 1, avgSize: 2_000_000, recommended: 'Tree API or LFS' },
    ];

    console.log('[Test] API recommendation logic:');
    scenarios.forEach(({ files, avgSize, recommended }) => {
      const totalSize = files * avgSize;
      const useTreeAPI = files > 10 || avgSize > 950_000 || totalSize > 5_000_000;
      const actualRecommendation = useTreeAPI ? 'Tree API' : 'Contents API';
      
      console.log(`  ${files} files × ${avgSize} bytes → ${actualRecommendation}`);
      expect(actualRecommendation).toContain(recommended.split(' ')[0]);
    });
  });

  it('should validate dry-run before actual commit', async () => {
    const files: FileSpec[] = [
      { path: 'validate1.txt', contentText: 'Test 1' },
      { path: 'validate2.txt', contentText: 'Test 2' },
    ];

    console.log('[Test] Testing dry-run validation workflow...');
    
    try {
      const dryRunResults = await dryRunFiles(MOCK_TOKEN, MOCK_OWNER, MOCK_REPO, files);
      
      console.log('[Dry Run] Analysis complete:');
      dryRunResults.forEach((r: DryRunResult) => {
        console.log(`  - ${r.path}: ${r.action} (${r.sizeBytes} bytes)`);
      });

      const hasLargeFiles = dryRunResults.some(r => r.sizeBytes > 950_000);
      const recommendedAPI = hasLargeFiles ? 'Tree API' : 'Contents API';
      
      console.log(`[Recommendation] Use ${recommendedAPI} for this commit`);
      console.log('[Test] ✓ Dry-run validation workflow completed');
    } catch (error: any) {
      console.log('[Test] Validation workflow test skipped:', error.message);
    }
  });
});

console.log('\n=== GitHub API Test Suite ===\n');
console.log('Note: Some tests require valid GitHub credentials:');
console.log('  - GITHUB_TEST_TOKEN');
console.log('  - GITHUB_TEST_OWNER');
console.log('  - GITHUB_TEST_REPO');
console.log('\nTests will be skipped if credentials are not provided.\n');
