import { z } from "zod";
import { publicProcedure } from "../../../create-context";

const GITHUB_CLIENT_ID = process.env.EXPO_PUBLIC_GITHUB_CLIENT_ID || '';

export const githubUrlRoute = publicProcedure
  .input(z.object({
    redirectUri: z.string(),
  }))
  .query(({ input }) => {
    console.log('[GitHub URL Route] Generating auth URL');
    console.log('[GitHub URL Route] Client ID configured:', !!GITHUB_CLIENT_ID);
    console.log('[GitHub URL Route] Redirect URI:', input.redirectUri);

    if (!GITHUB_CLIENT_ID) {
      console.error('[GitHub URL Route] GitHub Client ID not configured');
      throw new Error('GitHub Client ID not configured on server. Please set EXPO_PUBLIC_GITHUB_CLIENT_ID environment variable.');
    }

    const authUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(input.redirectUri)}&scope=read:user%20user:email%20repo`;

    console.log('[GitHub URL Route] Generated auth URL successfully');

    return {
      success: true,
      authUrl,
    };
  });

export default githubUrlRoute;
