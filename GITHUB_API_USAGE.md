# GitHub API Usage Guide

This guide explains how to use the enhanced GitHub OAuth and file management features.

## Features

### 1. **Dry-Run Mode** - Preview Changes Before Committing

Check what files would be created/updated and their sizes without making actual changes:

```typescript
import { dryRunFiles } from '@/lib/github-oauth';

const files = [
  { path: 'README.md', contentText: '# My Project' },
  { path: 'src/index.ts', contentText: 'console.log("Hello");' },
  { path: 'assets/logo.png', contentBase64: 'iVBORw0KG...' },
];

const dryRunResults = await dryRunFiles(
  accessToken,
  'username',
  'repo-name',
  files,
  'main'
);

// Results show:
// [
//   { path: 'README.md', action: 'update', sizeBytes: 15, currentSha: 'abc123' },
//   { path: 'src/index.ts', action: 'create', sizeBytes: 25 },
//   { path: 'assets/logo.png', action: 'create', sizeBytes: 5432 }
// ]
```

### 2. **Bulk Commit via Tree API** - For Large File Bundles

Use the Git Tree API for efficient bulk commits (handles large files and many files):

```typescript
import { bulkCommitViaTreeAPI } from '@/lib/github-oauth';

const files = [
  { path: 'file1.txt', contentText: 'Content 1' },
  { path: 'file2.txt', contentText: 'Content 2' },
  { path: 'data.json', contentText: JSON.stringify({ key: 'value' }) },
];

// Actual commit
const result = await bulkCommitViaTreeAPI(
  accessToken,
  'username',
  'repo-name',
  files,
  {
    message: 'Bulk update from AI App Generator',
    branch: 'main',
    committer: { name: 'Bot', email: 'bot@example.com' },
    author: { name: 'User', email: 'user@example.com' },
  }
);

// Result:
// {
//   commitSha: 'def456',
//   treeSha: 'ghi789',
//   filesProcessed: 3,
//   html_url: 'https://github.com/username/repo-name/commit/def456'
// }

// Or dry-run first
const dryRun = await bulkCommitViaTreeAPI(
  accessToken,
  'username',
  'repo-name',
  files,
  { dryRun: true }
);
```

### 3. **Contents API** - For Smaller Files

Use the Contents API for individual file updates with concurrency control:

```typescript
import { upsertFilesViaContentsAPI } from '@/lib/github-oauth';

const files = [
  { path: 'README.md', contentText: '# Updated README' },
  { path: 'package.json', contentText: JSON.stringify(pkg, null, 2) },
];

const results = await upsertFilesViaContentsAPI(
  accessToken,
  'username',
  'repo-name',
  files,
  'Update documentation',
  'main',
  undefined, // committer (optional)
  undefined, // author (optional)
  4 // concurrency (default: 4)
);

// Results:
// [
//   { path: 'README.md', status: 'updated', sha: 'jkl012', html_url: '...' },
//   { path: 'package.json', status: 'created', sha: 'mno345', html_url: '...' }
// ]
```

## File Specifications

Three types of file content are supported:

```typescript
type FileSpec =
  | { path: string; contentText: string }                         // UTF-8 text
  | { path: string; contentBase64: string }                       // Already base64
  | { path: string; contentBytes: Uint8Array | ArrayBufferLike }; // Binary data
```

## When to Use Each Method

### Use **Dry-Run** when:
- You want to preview changes before committing
- You need to check file sizes
- You want to see which files will be created vs updated

### Use **Tree API** (`bulkCommitViaTreeAPI`) when:
- Committing many files at once (>10 files)
- Files are large (>500KB each)
- You want atomic commits (all files in one commit)
- You need better performance for bulk operations

### Use **Contents API** (`upsertFilesViaContentsAPI`) when:
- Updating individual files or small batches (<10 files)
- Files are small (<1MB each)
- You need per-file commit history
- You want to update files independently

## Size Limits

- **Contents API**: ~1MB per file (enforced by the library)
- **Tree API**: No practical limit (uses blob objects)
- Files >1MB should use Tree API or Git LFS

## Error Handling

All methods include:
- ✅ Automatic retries with exponential backoff
- ✅ Rate limit handling (respects `Retry-After` header)
- ✅ Conflict resolution (409 errors)
- ✅ Detailed error messages

```typescript
try {
  const result = await bulkCommitViaTreeAPI(...);
} catch (error) {
  console.error('Commit failed:', error.message);
  // Error includes detailed information about what failed
}
```

## Best Practices

1. **Always dry-run first** for large operations
2. **Use Tree API** for bulk operations (better performance, atomic commits)
3. **Use Contents API** for small, incremental updates
4. **Handle rate limits** - the library does this automatically
5. **Validate file sizes** before committing
6. **Use proper committer/author info** for audit trails

## Example: Complete Workflow

```typescript
import {
  dryRunFiles,
  bulkCommitViaTreeAPI,
  upsertFilesViaContentsAPI,
} from '@/lib/github-oauth';

async function deployToGitHub(accessToken: string, files: FileSpec[]) {
  // 1. Dry-run to check what will happen
  const dryRun = await dryRunFiles(accessToken, 'user', 'repo', files);
  
  console.log('Dry-run results:');
  dryRun.forEach(r => {
    console.log(`${r.action} ${r.path} (${r.sizeBytes} bytes)`);
  });
  
  // 2. Check if any files are too large for Contents API
  const hasLargeFiles = dryRun.some(r => r.sizeBytes > 950_000);
  
  // 3. Choose appropriate method
  if (hasLargeFiles || files.length > 10) {
    // Use Tree API for bulk/large files
    const result = await bulkCommitViaTreeAPI(
      accessToken,
      'user',
      'repo',
      files,
      {
        message: 'Deploy from AI App Generator',
        branch: 'main',
      }
    );
    console.log('Committed:', result.html_url);
  } else {
    // Use Contents API for small files
    const results = await upsertFilesViaContentsAPI(
      accessToken,
      'user',
      'repo',
      files,
      'Deploy from AI App Generator'
    );
    console.log(`Updated ${results.length} files`);
  }
}
```

## Security Notes

- ✅ Uses PKCE for OAuth (no client secret in mobile app)
- ✅ Proper token handling
- ✅ User-Agent headers included
- ✅ No secrets logged or exposed
- ✅ Secure token exchange via backend on web

## Testing

Run the test suite:

```bash
bun test __tests__/github-oauth.test.ts
```

Tests cover:
- Dry-run functionality
- Tree API bulk commits
- Contents API upsert operations
- File encoding (text, base64, binary)
- Path encoding (spaces, special chars, folders)
- Size validation
- Concurrency control
- Error handling and retries
