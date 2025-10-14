import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

const GITHUB_CLIENT_ID = process.env.EXPO_PUBLIC_GITHUB_CLIENT_ID || '';

const discovery = {
  authorizationEndpoint: 'https://github.com/login/oauth/authorize',
  tokenEndpoint: 'https://github.com/login/oauth/access_token',
};

function base64URLEncode(input: string | Uint8Array): string {
  const str = typeof input === 'string' ? input : String.fromCharCode(...input);
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

export interface GitHubUser {
  id: number;
  login: string;
  name: string;
  email: string;
  avatar_url: string;
  bio?: string;
  company?: string;
  location?: string;
  public_repos: number;
  followers: number;
  following: number;
}

export interface GitHubAuthResult {
  accessToken: string;
  user: GitHubUser;
}

export function useGitHubAuth() {
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'aiappgen',
    path: 'auth/callback',
  });

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: GITHUB_CLIENT_ID,
      scopes: ['read:user', 'user:email', 'public_repo'],
      redirectUri,
      usePKCE: true,
      state: Math.random().toString(36).slice(2),
    },
    discovery
  );

  return {
    request,
    response,
    promptAsync,
    redirectUri,
  };
}

export async function exchangeCodeForTokenPKCE({
  code,
  redirectUri,
  codeVerifier,
}: {
  code: string;
  redirectUri: string;
  codeVerifier: string;
}): Promise<string> {
  const tokenRes = await AuthSession.exchangeCodeAsync(
    {
      clientId: GITHUB_CLIENT_ID,
      code,
      redirectUri,
      extraParams: {
        code_verifier: codeVerifier,
      },
    },
    {
      tokenEndpoint: discovery.tokenEndpoint,
    }
  );
  if (!tokenRes.accessToken) {
    throw new Error('No access token returned from GitHub.');
  }
  return tokenRes.accessToken;
}

export async function fetchGitHubUser(accessToken: string): Promise<GitHubUser> {
  const response = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch GitHub user: ${response.statusText}`);
  }

  const user = await response.json();

  if (!user.email) {
    const emailsResponse = await fetch('https://api.github.com/user/emails', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (emailsResponse.ok) {
      const emails = await emailsResponse.json();
      const primaryEmail = emails.find((e: any) => e.primary);
      user.email = primaryEmail?.email || emails[0]?.email || '';
    }
  }

  return user;
}

export async function authenticateWithGitHub(): Promise<GitHubAuthResult> {
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'aiappgen',
    path: 'auth/callback',
  });

  console.log('[GitHub OAuth] Redirect URI:', redirectUri);
  console.log('[GitHub OAuth] Platform:', Platform.OS);

  await WebBrowser.warmUpAsync().catch(() => {});

  let authUrl: string;
  let codeVerifier: string | undefined;
  
  if (Platform.OS === 'web') {
    try {
      const { trpcClient } = await import('@/lib/trpc');
      const urlResponse = await trpcClient.auth.githubUrl.query({ redirectUri });
      authUrl = urlResponse.authUrl;
      console.log('[GitHub OAuth] Got auth URL from backend:', authUrl);
    } catch (error) {
      console.error('[GitHub OAuth] Failed to get auth URL from backend:', error);
      throw new Error('Failed to initialize GitHub OAuth. Please ensure the backend is running and GitHub credentials are configured.');
    }
  } else {
    if (!GITHUB_CLIENT_ID) {
      throw new Error('GitHub Client ID not configured. Please set EXPO_PUBLIC_GITHUB_CLIENT_ID in your .env file.');
    }

    const state = Math.random().toString(36).slice(2);
    codeVerifier = base64URLEncode(Crypto.getRandomBytes(32));
    const challengeBuffer = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      codeVerifier,
      { encoding: Crypto.CryptoEncoding.BASE64 }
    );
    const codeChallenge = base64URLEncode(challengeBuffer);

    const params = new URLSearchParams({
      client_id: GITHUB_CLIENT_ID,
      redirect_uri: redirectUri,
      scope: 'read:user user:email public_repo',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
  await WebBrowser.coolDownAsync().catch(() => {});

  if (result.type !== 'success') {
    throw new Error('GitHub authentication was cancelled or failed');
  }

  const url = result.url;
  const codeMatch = url.match(/code=([^&]+)/);

  if (!codeMatch) {
    throw new Error('No authorization code received from GitHub');
  }

  const code = codeMatch[1];
  
  let accessToken: string;
  let user: GitHubUser;
  
  if (Platform.OS === 'web') {
    try {
      const { trpcClient } = await import('@/lib/trpc');
      const oauthResponse = await trpcClient.auth.githubOAuth.mutate({ code });
      accessToken = oauthResponse.accessToken;
      user = oauthResponse.user;
      console.log('[GitHub OAuth] Successfully exchanged code for token via backend');
    } catch (error) {
      console.error('[GitHub OAuth] Failed to exchange code for token:', error);
      throw new Error('Failed to complete GitHub authentication. Please try again.');
    }
  } else {
    if (!codeVerifier) {
      throw new Error('Missing PKCE code_verifier. This should not happen.');
    }
    accessToken = await exchangeCodeForTokenPKCE({ code, redirectUri, codeVerifier });
    user = await fetchGitHubUser(accessToken);
  }

  console.log('[GitHub OAuth] Authentication successful:', user.login);

  return {
    accessToken,
    user,
  };
}

export async function createGitHubRepository(
  accessToken: string,
  name: string,
  description: string,
  isPrivate: boolean = false
): Promise<any> {
  const response = await fetch('https://api.github.com/user/repos', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      description,
      private: isPrivate,
      auto_init: true,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to create repository: ${error.message || response.statusText}`);
  }

  return response.json();
}

export async function listGitHubRepositories(accessToken: string): Promise<any[]> {
  const response = await fetch('https://api.github.com/user/repos?sort=updated&per_page=100', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch repositories: ${response.statusText}`);
  }

  return response.json();
}

export async function pushToGitHub(
  accessToken: string,
  owner: string,
  repo: string,
  files: { path: string; content: string }[],
  message: string = 'Initial commit from AI App Generator'
): Promise<void> {
  const branch = 'main';

  const refResponse = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branch}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    }
  );

  if (!refResponse.ok) {
    throw new Error('Failed to get branch reference');
  }

  const refData = await refResponse.json();
  const latestCommitSha = refData.object.sha;

  const treeItems = files.map((file) => ({
    path: file.path,
    mode: '100644',
    type: 'blob',
    content: file.content,
  }));

  const treeResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tree: treeItems,
      base_tree: latestCommitSha,
    }),
  });

  if (!treeResponse.ok) {
    throw new Error('Failed to create tree');
  }

  const treeData = await treeResponse.json();

  const commitResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/commits`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      tree: treeData.sha,
      parents: [latestCommitSha],
    }),
  });

  if (!commitResponse.ok) {
    throw new Error('Failed to create commit');
  }

  const commitData = await commitResponse.json();

  const updateRefResponse = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branch}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sha: commitData.sha,
      }),
    }
  );

  if (!updateRefResponse.ok) {
    throw new Error('Failed to update branch reference');
  }

  console.log('[GitHub] Successfully pushed files to repository');
}

type FileSpec =
  | { path: string; contentText: string }
  | { path: string; contentBase64: string }
  | { path: string; contentBytes: Uint8Array | ArrayBufferLike };

type UpsertResult = { path: string; status: 'created' | 'updated'; sha: string; html_url: string };

function encodePath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/');
}

function toBase64(input: FileSpec): string {
  if ('contentBase64' in input) return input.contentBase64;
  if ('contentText' in input) {
    if (typeof btoa === 'function') {
      return btoa(unescape(encodeURIComponent(input.contentText)));
    }
    const { Buffer } = require('buffer');
    return Buffer.from(input.contentText, 'utf8').toString('base64');
  }
  const bytes = input.contentBytes instanceof Uint8Array
    ? input.contentBytes
    : new Uint8Array(input.contentBytes as ArrayBufferLike);
  if (typeof btoa === 'function') {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }
  const { Buffer } = require('buffer');
  return Buffer.from(bytes).toString('base64');
}

async function withRetry<T>(fn: () => Promise<T>, label: string, max = 3): Promise<T> {
  let attempt = 0;
  let lastErr: any;
  while (attempt < max) {
    try {
      return await fn();
    } catch (e: any) {
      lastErr = e;
      attempt++;
      const retryAfter = Number(e?.retryAfter || 0);
      const delay = retryAfter > 0 ? retryAfter * 1000 : 400 * Math.pow(2, attempt);
      if (attempt >= max) break;
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error(`${label} failed after ${max} attempts: ${lastErr?.message || lastErr}`);
}

async function fetchJson(url: string, init: RequestInit) {
  const res = await fetch(url, init);
  if (!res.ok) {
    let detail = '';
    try { detail = JSON.stringify(await res.json()); } catch {}
    const err: any = new Error(`${init.method || 'GET'} ${url} -> ${res.status} ${res.statusText} ${detail}`);
    const ra = res.headers.get('Retry-After');
    if (ra) err.retryAfter = ra;
    throw err;
  }
  return res.json();
}

export interface DryRunResult {
  path: string;
  action: 'create' | 'update' | 'skip';
  sizeBytes: number;
  currentSha?: string;
}

export interface BulkCommitOptions {
  message?: string;
  branch?: string;
  committer?: { name: string; email: string };
  author?: { name: string; email: string };
  dryRun?: boolean;
}

export interface BulkCommitResult {
  commitSha: string;
  treeSha: string;
  filesProcessed: number;
  html_url: string;
}

export async function dryRunFiles(
  accessToken: string,
  owner: string,
  repo: string,
  files: FileSpec[],
  branch = 'main'
): Promise<DryRunResult[]> {
  const base = `https://api.github.com/repos/${owner}/${repo}`;
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'User-Agent': 'aiappgen/1.0',
    Accept: 'application/vnd.github.v3+json',
  } as const;

  const results: DryRunResult[] = [];

  for (const f of files) {
    const path = 'path' in f ? f.path : (f as any).path;
    const urlPath = encodePath(path);
    const base64 = toBase64(f);
    const sizeBytes = Math.ceil(base64.length * 0.75);

    let currentSha: string | undefined;
    let action: 'create' | 'update' | 'skip' = 'create';

    try {
      const headRes = await fetch(`${base}/contents/${urlPath}?ref=${encodeURIComponent(branch)}`, { headers });
      if (headRes.ok) {
        const meta = await headRes.json();
        currentSha = meta.sha;
        action = 'update';
      }
    } catch {
      action = 'create';
    }

    results.push({ path, action, sizeBytes, currentSha });
  }

  return results;
}

export async function bulkCommitViaTreeAPI(
  accessToken: string,
  owner: string,
  repo: string,
  files: FileSpec[],
  options: BulkCommitOptions = {}
): Promise<BulkCommitResult | DryRunResult[]> {
  const {
    message = 'Bulk commit from AI App Generator',
    branch = 'main',
    committer,
    author,
    dryRun = false,
  } = options;

  if (dryRun) {
    return dryRunFiles(accessToken, owner, repo, files, branch);
  }

  const base = `https://api.github.com/repos/${owner}/${repo}`;
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'User-Agent': 'aiappgen/1.0',
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  } as const;

  const refRes = await withRetry(
    async () => fetchJson(`${base}/git/refs/heads/${encodeURIComponent(branch)}`, { headers }),
    `get ref ${branch}`
  );
  const latestCommitSha = refRes.object.sha;

  const commitRes = await withRetry(
    async () => fetchJson(`${base}/git/commits/${latestCommitSha}`, { headers }),
    `get commit ${latestCommitSha}`
  );
  const baseTreeSha = commitRes.tree.sha;

  const blobs: Array<{ path: string; mode: string; type: 'blob'; sha: string }> = [];

  for (const f of files) {
    const path = 'path' in f ? f.path : (f as any).path;
    const base64 = toBase64(f);

    const blobRes = await withRetry(
      async () =>
        fetchJson(`${base}/git/blobs`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ content: base64, encoding: 'base64' }),
        }),
      `create blob ${path}`
    );

    blobs.push({
      path,
      mode: '100644',
      type: 'blob',
      sha: blobRes.sha,
    });
  }

  const treeRes = await withRetry(
    async () =>
      fetchJson(`${base}/git/trees`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ base_tree: baseTreeSha, tree: blobs }),
      }),
    'create tree'
  );

  const commitBody: any = {
    message,
    tree: treeRes.sha,
    parents: [latestCommitSha],
  };
  if (committer) commitBody.committer = committer;
  if (author) commitBody.author = author;

  const newCommitRes = await withRetry(
    async () =>
      fetchJson(`${base}/git/commits`, {
        method: 'POST',
        headers,
        body: JSON.stringify(commitBody),
      }),
    'create commit'
  );

  await withRetry(
    async () =>
      fetchJson(`${base}/git/refs/heads/${encodeURIComponent(branch)}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ sha: newCommitRes.sha, force: false }),
      }),
    'update ref'
  );

  return {
    commitSha: newCommitRes.sha,
    treeSha: treeRes.sha,
    filesProcessed: files.length,
    html_url: `https://github.com/${owner}/${repo}/commit/${newCommitRes.sha}`,
  };
}

export async function upsertFilesViaContentsAPI(
  accessToken: string,
  owner: string,
  repo: string,
  files: FileSpec[],
  message = 'Update from AI App Generator',
  branch = 'main',
  committer?: { name: string; email: string },
  author?: { name: string; email: string },
  concurrency = 4
): Promise<UpsertResult[]> {
  const base = `https://api.github.com/repos/${owner}/${repo}`;
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'User-Agent': 'aiappgen/1.0',
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  } as const;

  async function upsertOne(f: FileSpec): Promise<UpsertResult> {
    const path = 'path' in f ? f.path : (f as any).path;
    const urlPath = encodePath(path);

    let sha: string | undefined;
    await withRetry(async () => {
      const headRes = await fetch(`${base}/contents/${urlPath}?ref=${encodeURIComponent(branch)}`, { headers });
      if (headRes.status === 404) { sha = undefined; return; }
      if (!headRes.ok) {
        const errJson = await headRes.json().catch(() => ({}));
        const err: any = new Error(`HEAD ${path} -> ${headRes.status} ${headRes.statusText} ${JSON.stringify(errJson)}`);
        const ra = headRes.headers.get('Retry-After'); if (ra) err.retryAfter = ra;
        throw err;
      }
      const meta = await headRes.json();
      sha = meta.sha;
    }, `read ${path}`);

    const base64 = toBase64(f);
    const approxBytes = Math.ceil(base64.length * 0.75);
    if (approxBytes > 950_000) {
      throw new Error(`File too large for Contents API (~1MB): ${path} (${approxBytes} bytes). Use git tree API or LFS.`);
    }

    const body = JSON.stringify({
      message,
      content: base64,
      branch,
      ...(sha ? { sha } : {}),
      ...(committer ? { committer } : {}),
      ...(author ? { author } : {}),
    });

    const res = await withRetry(async () =>
      fetchJson(`${base}/contents/${urlPath}`, { method: 'PUT', headers, body })
    , `upsert ${path}`);

    const status: 'created' | 'updated' = sha ? 'updated' : 'created';
    return {
      path,
      status,
      sha: res.content?.sha || res.commit?.sha,
      html_url: res.content?.html_url || `${base.replace('api.github.com/repos', 'github.com')}/blob/${branch}/${urlPath}`,
    };
  }

  const results: UpsertResult[] = [];
  let i = 0;
  async function worker() {
    while (i < files.length) {
      const idx = i++;
      try {
        results[idx] = await upsertOne(files[idx]);
      } catch (e: any) {
        if (String(e?.message || '').includes('409')) {
          const retried = await upsertOne(files[idx]);
          results[idx] = retried;
        } else {
          throw e;
        }
      }
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, files.length) }, () => worker());
  await Promise.all(workers);
  return results;
}
