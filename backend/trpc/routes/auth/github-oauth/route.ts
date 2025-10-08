import { z } from "zod";
import { publicProcedure } from "../../../create-context";

const GITHUB_CLIENT_ID = process.env.EXPO_PUBLIC_GITHUB_CLIENT_ID || '';
const GITHUB_CLIENT_SECRET = process.env.EXPO_PUBLIC_GITHUB_CLIENT_SECRET || '';

export const githubOAuthRoute = publicProcedure
  .input(z.object({
    code: z.string(),
  }))
  .mutation(async ({ input }) => {
    console.log('[GitHub OAuth Route] Exchanging code for token');
    console.log('[GitHub OAuth Route] Client ID configured:', !!GITHUB_CLIENT_ID);
    console.log('[GitHub OAuth Route] Client Secret configured:', !!GITHUB_CLIENT_SECRET);

    if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
      console.error('[GitHub OAuth Route] GitHub OAuth credentials not configured');
      throw new Error('GitHub OAuth credentials not configured on server. Please set EXPO_PUBLIC_GITHUB_CLIENT_ID and EXPO_PUBLIC_GITHUB_CLIENT_SECRET environment variables.');
    }

    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code: input.code,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error(`Failed to exchange code for token: ${tokenResponse.statusText}`);
    }

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      throw new Error(`GitHub OAuth error: ${tokenData.error_description || tokenData.error}`);
    }

    const accessToken = tokenData.access_token;

    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!userResponse.ok) {
      throw new Error(`Failed to fetch GitHub user: ${userResponse.statusText}`);
    }

    const user = await userResponse.json();

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

    console.log('[GitHub OAuth] Authentication successful:', user.login);

    return {
      success: true,
      accessToken,
      user: {
        id: user.id,
        login: user.login,
        name: user.name || user.login,
        email: user.email,
        avatar_url: user.avatar_url,
        bio: user.bio,
        company: user.company,
        location: user.location,
        public_repos: user.public_repos,
        followers: user.followers,
        following: user.following,
      },
    };
  });

export default githubOAuthRoute;
