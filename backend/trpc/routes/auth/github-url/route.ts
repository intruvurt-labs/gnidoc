import { z } from "zod";
import { publicProcedure } from "../../../create-context";

const GITHUB_CLIENT_ID = process.env.EXPO_PUBLIC_GITHUB_CLIENT_ID || '';

export const githubUrlRoute = publicProcedure
  .input(z.object({
    redirectUri: z.string(),
  }))
  .query(({ input }) => {
    if (!GITHUB_CLIENT_ID) {
      throw new Error('GitHub Client ID not configured on server');
    }

    const authUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(input.redirectUri)}&scope=read:user%20user:email%20repo`;

    return {
      success: true,
      authUrl,
    };
  });

export default githubUrlRoute;
