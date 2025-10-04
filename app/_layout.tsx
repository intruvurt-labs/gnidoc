import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import Colors from "@/constants/colors";
import { AuthProvider } from "@/contexts/AuthContext";
import { AgentProvider } from "@/contexts/AgentContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { DatabaseProvider } from "@/contexts/DatabaseContext";
import { WorkflowProvider } from "@/contexts/WorkflowContext";
import { AppBuilderProvider } from "@/contexts/AppBuilderContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import { trpc, trpcClient } from "@/lib/trpc";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

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

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <ErrorBoundary>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <SettingsProvider>
              <DatabaseProvider>
                <AgentProvider>
                  <WorkflowProvider>
                    <AppBuilderProvider>
                      <GestureHandlerRootView style={{ flex: 1 }}>
                        <StatusBar style="light" backgroundColor={Colors.Colors.background.primary} />
                        <RootLayoutNav />
                      </GestureHandlerRootView>
                    </AppBuilderProvider>
                  </WorkflowProvider>
                </AgentProvider>
              </DatabaseProvider>
            </SettingsProvider>
          </AuthProvider>
        </QueryClientProvider>
      </trpc.Provider>
    </ErrorBoundary>
  );
}