import { describe, it, expect, beforeEach, mock } from 'bun:test';

const mockFetch = mock(() => Promise.resolve({
  ok: true,
  json: () => Promise.resolve({}),
  headers: new Headers(),
  status: 200,
  statusText: 'OK',
}));

global.fetch = mockFetch as any;

import {
  dryRunFiles,
  bulkCommitViaTreeAPI,
  upsertFilesViaContentsAPI,
  type FileSpec,
  type DryRunResult,
  type BulkCommitResult,
  type UpsertResult,
} from '../lib/github-oauth';

describe('GitHub OAuth - Git Tree API & Dry Run', () => {
  const mockAccessToken = 'test_token_123';
  const mockOwner = 'testuser';
  const mockRepo = 'testrepo';

  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('dryRunFiles', () => {
    it('should return dry run results for new files', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/contents/')) {
          return Promise.resolve({
            ok: false,
            status: 404,
            statusText: 'Not Found',
            json: () => Promise.resolve({}),
            headers: new Headers(),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
          headers: new Headers(),
          status: 200,
          statusText: 'OK',
        });
      });

      const files: FileSpec[] = [
        { path: 'test.txt', contentText: 'Hello World' },
        { path: 'data.json', contentText: '{"key":"value"}' },
      ];

      const results = await dryRunFiles(mockAccessToken, mockOwner, mockRepo, files);

      expect(results).toHaveLength(2);
      expect(results[0].path).toBe('test.txt');
      expect(results[0].action).toBe('create');
      expect(results[0].sizeBytes).toBeGreaterThan(0);
      expect(results[1].path).toBe('data.json');
      expect(results[1].action).toBe('create');
    });

    it('should detect existing files for update', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/contents/')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            statusText: 'OK',
            json: () => Promise.resolve({ sha: 'existing_sha_123' }),
            headers: new Headers(),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
          headers: new Headers(),
          status: 200,
          statusText: 'OK',
        });
      });

      const files: FileSpec[] = [
        { path: 'existing.txt', contentText: 'Updated content' },
      ];

      const results = await dryRunFiles(mockAccessToken, mockOwner, mockRepo, files);

      expect(results).toHaveLength(1);
      expect(results[0].action).toBe('update');
      expect(results[0].currentSha).toBe('existing_sha_123');
    });

    it('should calculate file sizes correctly', async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: false,
          status: 404,
          statusText: 'Not Found',
          json: () => Promise.resolve({}),
          headers: new Headers(),
        })
      );

      const smallFile: FileSpec[] = [
        { path: 'small.txt', contentText: 'x'.repeat(100) },
      ];

      const results = await dryRunFiles(mockAccessToken, mockOwner, mockRepo, smallFile);

      expect(results[0].sizeBytes).toBeGreaterThan(50);
      expect(results[0].sizeBytes).toBeLessThan(200);
    });
  });

  describe('bulkCommitViaTreeAPI', () => {
    it('should return dry run results when dryRun is true', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/contents/')) {
          return Promise.resolve({
            ok: false,
            status: 404,
            statusText: 'Not Found',
            json: () => Promise.resolve({}),
            headers: new Headers(),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
          headers: new Headers(),
          status: 200,
          statusText: 'OK',
        });
      });

      const files: FileSpec[] = [
        { path: 'file1.txt', contentText: 'Content 1' },
        { path: 'file2.txt', contentText: 'Content 2' },
      ];

      const result = await bulkCommitViaTreeAPI(
        mockAccessToken,
        mockOwner,
        mockRepo,
        files,
        { dryRun: true }
      );

      expect(Array.isArray(result)).toBe(true);
      expect((result as DryRunResult[]).length).toBe(2);
    });

    it('should create bulk commit via tree API', async () => {
      const mockRefSha = 'ref_sha_123';
      const mockCommitSha = 'commit_sha_456';
      const mockTreeSha = 'tree_sha_789';
      const mockBlobSha = 'blob_sha_abc';
      const mockNewCommitSha = 'new_commit_sha_def';

      mockFetch.mockImplementation((url: string, init?: RequestInit) => {
        if (url.includes('/git/refs/heads/')) {
          if (init?.method === 'PATCH') {
            return Promise.resolve({
              ok: true,
              status: 200,
              statusText: 'OK',
              json: () => Promise.resolve({ ref: 'refs/heads/main', object: { sha: mockNewCommitSha } }),
              headers: new Headers(),
            });
          }
          return Promise.resolve({
            ok: true,
            status: 200,
            statusText: 'OK',
            json: () => Promise.resolve({ object: { sha: mockRefSha } }),
            headers: new Headers(),
          });
        }
        if (url.includes('/git/commits/')) {
          if (init?.method === 'POST') {
            return Promise.resolve({
              ok: true,
              status: 201,
              statusText: 'Created',
              json: () => Promise.resolve({ sha: mockNewCommitSha }),
              headers: new Headers(),
            });
          }
          return Promise.resolve({
            ok: true,
            status: 200,
            statusText: 'OK',
            json: () => Promise.resolve({ tree: { sha: mockTreeSha } }),
            headers: new Headers(),
          });
        }
        if (url.includes('/git/blobs')) {
          return Promise.resolve({
            ok: true,
            status: 201,
            statusText: 'Created',
            json: () => Promise.resolve({ sha: mockBlobSha }),
            headers: new Headers(),
          });
        }
        if (url.includes('/git/trees')) {
          return Promise.resolve({
            ok: true,
            status: 201,
            statusText: 'Created',
            json: () => Promise.resolve({ sha: mockTreeSha }),
            headers: new Headers(),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          statusText: 'OK',
          json: () => Promise.resolve({}),
          headers: new Headers(),
        });
      });

      const files: FileSpec[] = [
        { path: 'file1.txt', contentText: 'Content 1' },
        { path: 'file2.txt', contentText: 'Content 2' },
      ];

      const result = await bulkCommitViaTreeAPI(
        mockAccessToken,
        mockOwner,
        mockRepo,
        files,
        { message: 'Test bulk commit', branch: 'main' }
      );

      expect((result as BulkCommitResult).commitSha).toBe(mockNewCommitSha);
      expect((result as BulkCommitResult).treeSha).toBe(mockTreeSha);
      expect((result as BulkCommitResult).filesProcessed).toBe(2);
      expect((result as BulkCommitResult).html_url).toContain(mockNewCommitSha);
    });

    it('should handle custom committer and author', async () => {
      const mockRefSha = 'ref_sha_123';
      const mockCommitSha = 'commit_sha_456';
      const mockTreeSha = 'tree_sha_789';
      const mockBlobSha = 'blob_sha_abc';
      const mockNewCommitSha = 'new_commit_sha_def';

      let commitBody: any = null;

      mockFetch.mockImplementation((url: string, init?: RequestInit) => {
        if (url.includes('/git/commits/') && init?.method === 'POST') {
          commitBody = JSON.parse(init.body as string);
          return Promise.resolve({
            ok: true,
            status: 201,
            statusText: 'Created',
            json: () => Promise.resolve({ sha: mockNewCommitSha }),
            headers: new Headers(),
          });
        }
        if (url.includes('/git/refs/heads/')) {
          if (init?.method === 'PATCH') {
            return Promise.resolve({
              ok: true,
              status: 200,
              statusText: 'OK',
              json: () => Promise.resolve({ ref: 'refs/heads/main', object: { sha: mockNewCommitSha } }),
              headers: new Headers(),
            });
          }
          return Promise.resolve({
            ok: true,
            status: 200,
            statusText: 'OK',
            json: () => Promise.resolve({ object: { sha: mockRefSha } }),
            headers: new Headers(),
          });
        }
        if (url.includes('/git/commits/') && !init?.method) {
          return Promise.resolve({
            ok: true,
            status: 200,
            statusText: 'OK',
            json: () => Promise.resolve({ tree: { sha: mockTreeSha } }),
            headers: new Headers(),
          });
        }
        if (url.includes('/git/blobs')) {
          return Promise.resolve({
            ok: true,
            status: 201,
            statusText: 'Created',
            json: () => Promise.resolve({ sha: mockBlobSha }),
            headers: new Headers(),
          });
        }
        if (url.includes('/git/trees')) {
          return Promise.resolve({
            ok: true,
            status: 201,
            statusText: 'Created',
            json: () => Promise.resolve({ sha: mockTreeSha }),
            headers: new Headers(),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          statusText: 'OK',
          json: () => Promise.resolve({}),
          headers: new Headers(),
        });
      });

      const files: FileSpec[] = [
        { path: 'file.txt', contentText: 'Content' },
      ];

      const committer = { name: 'Test Committer', email: 'committer@test.com' };
      const author = { name: 'Test Author', email: 'author@test.com' };

      await bulkCommitViaTreeAPI(
        mockAccessToken,
        mockOwner,
        mockRepo,
        files,
        { committer, author }
      );

      expect(commitBody).not.toBeNull();
      expect(commitBody.committer).toEqual(committer);
      expect(commitBody.author).toEqual(author);
    });
  });

  describe('upsertFilesViaContentsAPI', () => {
    it('should create new files', async () => {
      mockFetch.mockImplementation((url: string, init?: RequestInit) => {
        if (url.includes('/contents/') && !init?.method) {
          return Promise.resolve({
            ok: false,
            status: 404,
            statusText: 'Not Found',
            json: () => Promise.resolve({}),
            headers: new Headers(),
          });
        }
        if (url.includes('/contents/') && init?.method === 'PUT') {
          return Promise.resolve({
            ok: true,
            status: 201,
            statusText: 'Created',
            json: () => Promise.resolve({
              content: { sha: 'new_sha_123', html_url: 'https://github.com/test/test/blob/main/file.txt' },
            }),
            headers: new Headers(),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          statusText: 'OK',
          json: () => Promise.resolve({}),
          headers: new Headers(),
        });
      });

      const files: FileSpec[] = [
        { path: 'new-file.txt', contentText: 'New content' },
      ];

      const results = await upsertFilesViaContentsAPI(
        mockAccessToken,
        mockOwner,
        mockRepo,
        files
      );

      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('created');
      expect(results[0].path).toBe('new-file.txt');
      expect(results[0].sha).toBe('new_sha_123');
    });

    it('should update existing files', async () => {
      mockFetch.mockImplementation((url: string, init?: RequestInit) => {
        if (url.includes('/contents/') && !init?.method) {
          return Promise.resolve({
            ok: true,
            status: 200,
            statusText: 'OK',
            json: () => Promise.resolve({ sha: 'existing_sha_456' }),
            headers: new Headers(),
          });
        }
        if (url.includes('/contents/') && init?.method === 'PUT') {
          return Promise.resolve({
            ok: true,
            status: 200,
            statusText: 'OK',
            json: () => Promise.resolve({
              content: { sha: 'updated_sha_789', html_url: 'https://github.com/test/test/blob/main/file.txt' },
            }),
            headers: new Headers(),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          statusText: 'OK',
          json: () => Promise.resolve({}),
          headers: new Headers(),
        });
      });

      const files: FileSpec[] = [
        { path: 'existing-file.txt', contentText: 'Updated content' },
      ];

      const results = await upsertFilesViaContentsAPI(
        mockAccessToken,
        mockOwner,
        mockRepo,
        files
      );

      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('updated');
      expect(results[0].path).toBe('existing-file.txt');
      expect(results[0].sha).toBe('updated_sha_789');
    });

    it('should reject files larger than 1MB', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/contents/')) {
          return Promise.resolve({
            ok: false,
            status: 404,
            statusText: 'Not Found',
            json: () => Promise.resolve({}),
            headers: new Headers(),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          statusText: 'OK',
          json: () => Promise.resolve({}),
          headers: new Headers(),
        });
      });

      const largeContent = 'x'.repeat(1_000_000);
      const files: FileSpec[] = [
        { path: 'large-file.txt', contentText: largeContent },
      ];

      await expect(
        upsertFilesViaContentsAPI(mockAccessToken, mockOwner, mockRepo, files)
      ).rejects.toThrow('File too large for Contents API');
    });

    it('should handle multiple files with concurrency', async () => {
      let requestCount = 0;

      mockFetch.mockImplementation((url: string, init?: RequestInit) => {
        requestCount++;
        if (url.includes('/contents/') && !init?.method) {
          return Promise.resolve({
            ok: false,
            status: 404,
            statusText: 'Not Found',
            json: () => Promise.resolve({}),
            headers: new Headers(),
          });
        }
        if (url.includes('/contents/') && init?.method === 'PUT') {
          return Promise.resolve({
            ok: true,
            status: 201,
            statusText: 'Created',
            json: () => Promise.resolve({
              content: { sha: `sha_${requestCount}`, html_url: 'https://github.com/test/test/blob/main/file.txt' },
            }),
            headers: new Headers(),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          statusText: 'OK',
          json: () => Promise.resolve({}),
          headers: new Headers(),
        });
      });

      const files: FileSpec[] = [
        { path: 'file1.txt', contentText: 'Content 1' },
        { path: 'file2.txt', contentText: 'Content 2' },
        { path: 'file3.txt', contentText: 'Content 3' },
        { path: 'file4.txt', contentText: 'Content 4' },
      ];

      const results = await upsertFilesViaContentsAPI(
        mockAccessToken,
        mockOwner,
        mockRepo,
        files,
        'Test commit',
        'main',
        undefined,
        undefined,
        2
      );

      expect(results).toHaveLength(4);
      expect(results.every(r => r.status === 'created')).toBe(true);
    });

    it('should handle base64 content', async () => {
      mockFetch.mockImplementation((url: string, init?: RequestInit) => {
        if (url.includes('/contents/') && !init?.method) {
          return Promise.resolve({
            ok: false,
            status: 404,
            statusText: 'Not Found',
            json: () => Promise.resolve({}),
            headers: new Headers(),
          });
        }
        if (url.includes('/contents/') && init?.method === 'PUT') {
          return Promise.resolve({
            ok: true,
            status: 201,
            statusText: 'Created',
            json: () => Promise.resolve({
              content: { sha: 'base64_sha', html_url: 'https://github.com/test/test/blob/main/file.txt' },
            }),
            headers: new Headers(),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          statusText: 'OK',
          json: () => Promise.resolve({}),
          headers: new Headers(),
        });
      });

      const files: FileSpec[] = [
        { path: 'binary.dat', contentBase64: 'SGVsbG8gV29ybGQ=' },
      ];

      const results = await upsertFilesViaContentsAPI(
        mockAccessToken,
        mockOwner,
        mockRepo,
        files
      );

      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('created');
    });
  });

  describe('File encoding', () => {
    it('should handle special characters in file paths', async () => {
      mockFetch.mockImplementation((url: string, init?: RequestInit) => {
        if (url.includes('/contents/') && !init?.method) {
          return Promise.resolve({
            ok: false,
            status: 404,
            statusText: 'Not Found',
            json: () => Promise.resolve({}),
            headers: new Headers(),
          });
        }
        if (url.includes('/contents/') && init?.method === 'PUT') {
          expect(url).toContain('my%20file.txt');
          return Promise.resolve({
            ok: true,
            status: 201,
            statusText: 'Created',
            json: () => Promise.resolve({
              content: { sha: 'encoded_sha', html_url: 'https://github.com/test/test/blob/main/file.txt' },
            }),
            headers: new Headers(),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          statusText: 'OK',
          json: () => Promise.resolve({}),
          headers: new Headers(),
        });
      });

      const files: FileSpec[] = [
        { path: 'my file.txt', contentText: 'Content with spaces' },
      ];

      const results = await upsertFilesViaContentsAPI(
        mockAccessToken,
        mockOwner,
        mockRepo,
        files
      );

      expect(results).toHaveLength(1);
      expect(results[0].path).toBe('my file.txt');
    });

    it('should handle nested folder paths', async () => {
      mockFetch.mockImplementation((url: string, init?: RequestInit) => {
        if (url.includes('/contents/') && !init?.method) {
          return Promise.resolve({
            ok: false,
            status: 404,
            statusText: 'Not Found',
            json: () => Promise.resolve({}),
            headers: new Headers(),
          });
        }
        if (url.includes('/contents/') && init?.method === 'PUT') {
          expect(url).toContain('src/components/Button.tsx');
          return Promise.resolve({
            ok: true,
            status: 201,
            statusText: 'Created',
            json: () => Promise.resolve({
              content: { sha: 'nested_sha', html_url: 'https://github.com/test/test/blob/main/file.txt' },
            }),
            headers: new Headers(),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          statusText: 'OK',
          json: () => Promise.resolve({}),
          headers: new Headers(),
        });
      });

      const files: FileSpec[] = [
        { path: 'src/components/Button.tsx', contentText: 'export const Button = () => {}' },
      ];

      const results = await upsertFilesViaContentsAPI(
        mockAccessToken,
        mockOwner,
        mockRepo,
        files
      );

      expect(results).toHaveLength(1);
      expect(results[0].path).toBe('src/components/Button.tsx');
    });
  });
});
