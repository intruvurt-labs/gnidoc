import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, lazy, Suspense } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { AuthProvider } from "@/contexts/AuthContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import { trpc, trpcClient } from "@/lib/trpc";

const AgentProvider = lazy(() => import("@/contexts/AgentContext").then(m => ({ default: m.AgentProvider })));
const DatabaseProvider = lazy(() => import("@/contexts/DatabaseContext").then(m => ({ default: m.DatabaseProvider })));
const WorkflowProvider = lazy(() => import("@/contexts/WorkflowContext").then(m => ({ default: m.WorkflowProvider })));
const AppBuilderProvider = lazy(() => import("@/contexts/AppBuilderContext").then(m => ({ default: m.AppBuilderProvider })));
const TriModelProvider = lazy(() => import("@/contexts/TriModelContext").then(m => ({ default: m.TriModelProvider })));
const NoCodeBuilderProvider = lazy(() => import("@/contexts/NoCodeBuilderContext").then(m => ({ default: m.NoCodeBuilderProvider })));
const IntegrationsProvider = lazy(() => import("@/contexts/IntegrationsContext").then(m => ({ default: m.IntegrationsProvider })));

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 10,
      gcTime: 1000 * 60 * 30,
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: true,
      networkMode: 'offlineFirst',
    },
    mutations: {
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      networkMode: 'offlineFirst',
    },
  },
});

function RootLayoutNav() {
  return (
    <Stack 
      screenOptions={{ 
        headerBackTitle: "Back",
        headerStyle: {
          backgroundColor: Colors.Colors.background.primary,
        },
        headerTintColor: Colors.Colors.text.primary,
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen 
        name="modal" 
        options={{ 
          presentation: "modal",
          headerTitle: "Settings",
        }} 
      />
      <Stack.Screen 
        name="about" 
        options={{ 
          headerTitle: "About",
        }} 
      />
      <Stack.Screen 
        name="faq" 
        options={{ 
          headerTitle: "FAQ & Help",
        }} 
      />
      <Stack.Screen 
        name="connections" 
        options={{ 
          headerTitle: "Database Connections",
        }} 
      />
      <Stack.Screen 
        name="orchestration" 
        options={{ 
          headerTitle: "AI Orchestration",
        }} 
      />
      <Stack.Screen 
        name="app-generator" 
        options={{ 
          headerTitle: "App Generator",
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="builder/design" 
        options={{ 
          headerTitle: "Design Studio",
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="builder/logic" 
        options={{ 
          headerTitle: "Logic Builder",
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="builder/preview" 
        options={{ 
          headerTitle: "Preview & Test",
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="builder/deploy" 
        options={{ 
          headerTitle: "Deploy",
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="builder/export" 
        options={{ 
          headerTitle: "Export Code",
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="auth/login" 
        options={{ 
          headerTitle: "Login",
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="auth/signup" 
        options={{ 
          headerTitle: "Sign Up",
          headerShown: false,
        }} 
      />
    </Stack>
  );
}

const LoadingFallback = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.Colors.background.primary }}>
    <ActivityIndicator size="large" color={Colors.Colors.cyan.primary} />
  </View>
);

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <trpc.Provider client={trpcClient} queryClient={queryClient}>
            <QueryClientProvider client={queryClient}>
              <AuthProvider>
                <SettingsProvider>
                  <Suspense fallback={<LoadingFallback />}>
                    <DatabaseProvider>
                      <AgentProvider>
                        <WorkflowProvider>
                          <AppBuilderProvider>
                            <TriModelProvider>
                              <NoCodeBuilderProvider>
                                <IntegrationsProvider>
                                  <StatusBar style="light" backgroundColor={Colors.Colors.background.primary} />
                                  <RootLayoutNav />
                                </IntegrationsProvider>
                              </NoCodeBuilderProvider>
                            </TriModelProvider>
                          </AppBuilderProvider>
                        </WorkflowProvider>
                      </AgentProvider>
                    </DatabaseProvider>
                  </Suspense>
                </SettingsProvider>
              </AuthProvider>
            </QueryClientProvider>
          </trpc.Provider>
        </GestureHandlerRootView>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}