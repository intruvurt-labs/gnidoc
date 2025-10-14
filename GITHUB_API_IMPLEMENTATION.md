# GitHub API Implementation Guide

## Overview

This implementation provides robust GitHub file management with three key features:

1. **Git Tree API** - For bulk commits with many files
2. **Contents API** - For individual file updates with conflict resolution
3. **Dry-Run Mode** - Preview changes before committing

## API Selection Guide

### Use Contents API When:
- Uploading 1-10 files
- Each file < 950KB
- Total payload < 5MB
- Need individual file conflict resolution

### Use Tree API When:
- Uploading 10+ files
- Any file > 950KB
- Total payload > 5MB
- Need atomic multi-file commits

## Features

### 1. Dry-Run Mode

Preview what will happen before making changes:

```typescript
import { dryRunFiles } from '@/lib/github-oauth';

const files = [
  { path: 'src/app.ts', contentText: 'console.log("Hello");' },
  { path: 'README.md', contentText: '# My Project' },
];

const results = await dryRunFiles(
  accessToken,
  'owner',
  'repo',
  files,
  'main'
);

results.forEach(r => {
  console.log(`${r.path}: ${r.action} (${r.sizeBytes} bytes)`);
  // Output: src/app.ts: create (25 bytes)
  //         README.md: update (14 bytes)
});
```

### 2. Bulk Commit via Tree API

Atomic multi-file commits:

```typescript
import { bulkCommitViaTreeAPI } from '@/lib/github-oauth';

const files = [
  { path: 'file1.txt', contentText: 'Content 1' },
  { path: 'file2.txt', contentText: 'Content 2' },
  { path: 'binary.png', contentBytes: new Uint8Array([...]) },
];

// Dry-run first
const dryRun = await bulkCommitViaTreeAPI(
  accessToken,
  'owner',
  'repo',
  files,
  { dryRun: true }
);

console.log('Will create/update:', dryRun.length, 'files');

// Actual commit
const result = await bulkCommitViaTreeAPI(
  accessToken,
  'owner',
  'repo',
  files,
  {
    message: 'Add multiple files',
    branch: 'main',
    committer: { name: 'Bot', email: 'bot@example.com' },
  }
);

console.log('Commit:', result.commitSha);
console.log('View at:', result.html_url);
```

### 3. Contents API with Concurrency

Individual file updates with automatic conflict resolution:

```typescript
import { upsertFilesViaContentsAPI } from '@/lib/github-oauth';

const files = [
  { path: 'src/index.ts', contentText: 'export * from "./app";' },
  { path: 'package.json', contentText: JSON.stringify(pkg, null, 2) },
];

const results = await upsertFilesViaContentsAPI(
  accessToken,
  'owner',
  'repo',
  files,
  'Update source files',
  'main',
  undefined, // committer
  undefined, // author
  4 // concurrency
);

results.forEach(r => {
  console.log(`${r.path}: ${r.status} (${r.sha})`);
  // Output: src/index.ts: created (abc123...)
  //         package.json: updated (def456...)
});
```

## File Formats

### Text Files
```typescript
{ path: 'file.txt', contentText: 'Hello World' }
```

### Binary Files
```typescript
{ path: 'image.png', contentBytes: new Uint8Array([0x89, 0x50, ...]) }
```

### Pre-encoded Base64
```typescript
{ path: 'data.bin', contentBase64: 'SGVsbG8gV29ybGQ=' }
```

## Error Handling

### Automatic Retries
- 3 attempts with exponential backoff (400ms, 800ms, 1600ms)
- Respects `Retry-After` headers from GitHub
- Handles rate limiting gracefully

### Conflict Resolution
- 409 conflicts automatically retry after fetching latest SHA
- One immediate retry on conflict
- Fails if conflict persists

### Size Validation
- Contents API rejects files > 950KB
- Clear error message suggests using Tree API
- Dry-run mode shows sizes before committing

## Best Practices

### 1. Always Dry-Run First
```typescript
// Check what will happen
const preview = await dryRunFiles(token, owner, repo, files);

// Verify no large files
const hasLarge = preview.some(f => f.sizeBytes > 950_000);
if (hasLarge) {
  console.log('Use Tree API for large files');
}

// Proceed with actual commit
```

### 2. Choose Right API
```typescript
function selectAPI(files: FileSpec[]) {
  const totalFiles = files.length;
  const maxSize = Math.max(...files.map(f => estimateSize(f)));
  
  if (totalFiles > 10 || maxSize > 950_000) {
    return 'tree'; // Use bulkCommitViaTreeAPI
  }
  return 'contents'; // Use upsertFilesViaContentsAPI
}
```

### 3. Handle Errors Gracefully
```typescript
try {
  const result = await bulkCommitViaTreeAPI(...);
  console.log('Success:', result.html_url);
} catch (error) {
  if (error.message.includes('rate limit')) {
    // Wait and retry
    await sleep(60000);
    return retry();
  }
  throw error;
}
```

## Testing

Run the test suite:

```bash
# Set credentials (optional - tests will skip if not provided)
export GITHUB_TEST_TOKEN="ghp_..."
export GITHUB_TEST_OWNER="your-username"
export GITHUB_TEST_REPO="test-repo"

# Run tests
bun test __tests__/github-api.test.ts
```

### Test Coverage

- ✅ Dry-run mode validation
- ✅ File size calculation
- ✅ Bulk commit with Tree API
- ✅ Large file bundle handling
- ✅ Commit options validation
- ✅ Contents API size limits
- ✅ Concurrent uploads
- ✅ Path encoding (spaces, special chars, unicode)
- ✅ Binary file support
- ✅ Conflict resolution (409)
- ✅ Rate limit handling
- ✅ API recommendation logic
- ✅ Integration workflows

## Performance

### Contents API
- **Concurrency**: 4 parallel uploads (configurable)
- **Throughput**: ~10-20 files/second
- **Best for**: Small batches, incremental updates

### Tree API
- **Concurrency**: Sequential blob creation, single commit
- **Throughput**: ~50-100 files/commit
- **Best for**: Large batches, atomic updates

## Rate Limits

GitHub API rate limits:
- **Authenticated**: 5,000 requests/hour
- **Contents API**: ~1 request per file (read + write)
- **Tree API**: ~1 request per file (blob) + 3 (tree, commit, ref)

**Recommendation**: Use Tree API for >10 files to conserve rate limit.

## Security

### Token Permissions Required
- `public_repo` - For public repositories
- `repo` - For private repositories

### Best Practices
- Never log access tokens
- Use environment variables for credentials
- Rotate tokens regularly
- Use fine-grained tokens when possible

## Examples

### Example 1: Deploy Generated App
```typescript
const appFiles = [
  { path: 'app.json', contentText: JSON.stringify(config) },
  { path: 'App.tsx', contentText: appCode },
  { path: 'package.json', contentText: JSON.stringify(pkg) },
  // ... 50 more files
];

// Dry-run to verify
const preview = await bulkCommitViaTreeAPI(
  token, owner, repo, appFiles,
  { dryRun: true }
);

console.log(`Will create ${preview.length} files`);

// Commit all at once
const result = await bulkCommitViaTreeAPI(
  token, owner, repo, appFiles,
  { message: 'Deploy generated app' }
);

console.log('Deployed:', result.html_url);
```

### Example 2: Update Single File
```typescript
const readme = {
  path: 'README.md',
  contentText: '# Updated README\n\nNew content here.',
};

const [result] = await upsertFilesViaContentsAPI(
  token, owner, repo, [readme]
);

console.log(`README ${result.status}:`, result.html_url);
```

### Example 3: Mixed Binary and Text
```typescript
const files = [
  { path: 'logo.png', contentBytes: pngBuffer },
  { path: 'index.html', contentText: htmlContent },
  { path: 'data.json', contentText: JSON.stringify(data) },
];

const result = await bulkCommitViaTreeAPI(
  token, owner, repo, files,
  { message: 'Add assets and content' }
);
```

## Troubleshooting

### "File too large for Contents API"
**Solution**: Use `bulkCommitViaTreeAPI` instead:
```typescript
await bulkCommitViaTreeAPI(token, owner, repo, [largeFile]);
```

### "409 Conflict"
**Solution**: Already handled automatically. If persists, check for concurrent updates.

### "Rate limit exceeded"
**Solution**: Wait for reset or use Tree API to reduce requests:
```typescript
const resetTime = error.headers['x-ratelimit-reset'];
await sleep((resetTime - Date.now() / 1000) * 1000);
```

### "Missing PKCE code_verifier"
**Solution**: Ensure `useAuthRequest` has `usePKCE: true`:
```typescript
const [request] = AuthSession.useAuthRequest({
  clientId: GITHUB_CLIENT_ID,
  usePKCE: true, // Required for mobile
  // ...
}, discovery);
```

## Migration Guide

### From Old `pushToGitHub`
```typescript
// Old
await pushToGitHub(token, owner, repo, files, message);

// New (small batches)
await upsertFilesViaContentsAPI(token, owner, repo, files, message);

// New (large batches)
await bulkCommitViaTreeAPI(token, owner, repo, files, { message });
```

### From Manual Fetch Calls
```typescript
// Old
const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
  method: 'PUT',
  headers: { Authorization: `Bearer ${token}`, ... },
  body: JSON.stringify({ message, content: base64, sha }),
});

// New
const [result] = await upsertFilesViaContentsAPI(
  token, owner, repo,
  [{ path, contentText: content }],
  message
);
```

## API Reference

### `dryRunFiles()`
```typescript
function dryRunFiles(
  accessToken: string,
  owner: string,
  repo: string,
  files: FileSpec[],
  branch?: string
): Promise<DryRunResult[]>
```

### `bulkCommitViaTreeAPI()`
```typescript
function bulkCommitViaTreeAPI(
  accessToken: string,
  owner: string,
  repo: string,
  files: FileSpec[],
  options?: BulkCommitOptions
): Promise<BulkCommitResult | DryRunResult[]>
```

### `upsertFilesViaContentsAPI()`
```typescript
function upsertFilesViaContentsAPI(
  accessToken: string,
  owner: string,
  repo: string,
  files: FileSpec[],
  message?: string,
  branch?: string,
  committer?: { name: string; email: string },
  author?: { name: string; email: string },
  concurrency?: number
): Promise<UpsertResult[]>
```

## Related Documentation

- [GitHub API Usage](./GITHUB_API_USAGE.md)
- [Deployment Guide](./HOSTING_DEPLOYMENT_GUIDE.md)
- [Security Policy](./SECURITY_POLICY.md)
