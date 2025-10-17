import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

export interface GoogleUser {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  locale: string;
}

export interface GoogleAuthResult {
  accessToken: string;
  user: GoogleUser;
}

export function useGoogleAuth() {
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    iosClientId: process.env.GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.GOOGLE_ANDROID_CLIENT_ID,
    webClientId: process.env.GOOGLE_WEB_CLIENT_ID,
    scopes: ['openid', 'profile', 'email'],
  });

  const handleAuth = async () => {
    const result = await promptAsync();
    
    if (result.type === 'success' && result.authentication) {
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${result.authentication.accessToken}` },
      });

      if (!userInfoResponse.ok) {
        throw new Error('Failed to fetch user information');
      }

      const user: GoogleUser = await userInfoResponse.json();
      
      return {
        accessToken: result.authentication.accessToken,
        user,
      };
    }
    
    throw new Error('Authentication failed or was cancelled');
  };

  return {
    request,
    response,
    promptAsync: handleAuth,
  };
}
