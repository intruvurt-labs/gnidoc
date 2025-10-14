import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

const GITHUB_CLIENT_ID = process.env.EXPO_PUBLIC_GITHUB_CLIENT_ID || '';

const discovery = {
  authorizationEndpoint: 'https://github.com/login/oauth/authorize',
  tokenEndpoint: 'https://github.com/login/oauth/access_token',
};

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

  let authUrl: string;
  
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
    authUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=read:user%20user:email%20repo`;
  }

  const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

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
    accessToken = await exchangeCodeForToken(code);
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
