import { createTRPCReact } from '@trpc/react-query';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import superjson from 'superjson';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppRouter } from '../backend/trpc/app-router';

const getBaseUrl = () => {
  const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
  if (backendUrl) return backendUrl;
  
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000';
  }
  
  return 'https://api.production.com';
};

export const trpc = createTRPCReact<AppRouter>();

export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${getBaseUrl()}/api/trpc`,
      transformer: superjson,
      async headers() {
        const token = await AsyncStorage.getItem('auth_token');
        return {
          authorization: token ? `Bearer ${token}` : '',
        };
      },
    }),
  ],
});

export function createAuthenticatedTRPCClient(token: string) {
  return createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: `${getBaseUrl()}/api/trpc`,
        transformer: superjson,
        headers: {
          authorization: `Bearer ${token}`,
        },
      }),
    ],
  });
}
