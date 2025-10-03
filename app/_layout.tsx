import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import Colors from "@/constants/colors";
import { AgentProvider } from "@/contexts/AgentContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import ErrorBoundary from "@/components/ErrorBoundary";

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
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SettingsProvider>
          <AgentProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <StatusBar style="light" backgroundColor={Colors.Colors.background.primary} />
              <RootLayoutNav />
            </GestureHandlerRootView>
          </AgentProvider>
        </SettingsProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}