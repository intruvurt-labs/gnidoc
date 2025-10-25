import { createTRPCReact, createTRPCClient } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";
import AsyncStorage from "@react-native-async-storage/async-storage";
// lib/trpc.ts
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '@backend/router'; // adjust path
import AsyncStorage from '@react-native-async-storage/async-storage';

export const trpcClient = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'https://your-api-url.com/trpc', // update with actual
      async headers() {
        const token = await AsyncStorage.getItem('auth-token');
        return token ? { Authorization: `Bearer ${token}` } : {};
      },
    }),
  ],
});

export const trpc = createTRPCReact<AppRouter>();

const getBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_RORK_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
  }

  throw new Error(
    "No base url found, please set EXPO_PUBLIC_RORK_API_BASE_URL"
  );
};

export const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: `${getBaseUrl()}/api/trpc`,
      transformer: superjson,
      async headers() {
        const token = await AsyncStorage.getItem('auth-token');
        return {
          authorization: token ? `Bearer ${token}` : '',
        };
      },
    }),
  ],
});

export const createAuthenticatedTRPCClient = () => {
  return createTRPCClient<AppRouter>({
    links: [
      httpLink({
        url: `${getBaseUrl()}/api/trpc`,
        transformer: superjson,
        async headers() {
          const token = await AsyncStorage.getItem('auth-token');
          console.log('[tRPC] Using token:', token ? `${token.substring(0, 10)}...` : 'none');
          return {
            authorization: token ? `Bearer ${token}` : '',
          };
        },
      }),
    ],
  });
};
