import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, lazy, Suspense, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Colors from "@/constants/colors";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import { trpc, trpcClient } from "@/lib/trpc";
import AISupportChat from "@/components/AISupportChat";
import UniversalFooter from "@/components/UniversalFooter";
import OnboardingTour from "@/components/OnboardingTour";

const AgentProvider = lazy(() => import("@/contexts/AgentContext").then(m => ({ default: m.AgentProvider })));
const DatabaseProvider = lazy(() => import("@/contexts/DatabaseContext").then(m => ({ default: m.DatabaseProvider })));
const WorkflowProvider = lazy(() => import("@/contexts/WorkflowContext").then(m => ({ default: m.WorkflowProvider })));
const AppBuilderProvider = lazy(() => import("@/contexts/AppBuilderContext").then(m => ({ default: m.AppBuilderProvider })));
const DeploymentProvider = lazy(() => import("@/contexts/DeploymentContext").then(m => ({ default: m.DeploymentProvider })));
const TriModelProvider = lazy(() => import("@/contexts/TriModelContext").then(m => ({ default: m.TriModelProvider })));
const NoCodeBuilderProvider = lazy(() => import("@/contexts/NoCodeBuilderContext").then(m => ({ default: m.NoCodeBuilderProvider })));
const IntegrationsProvider = lazy(() => import("@/contexts/IntegrationsContext").then(m => ({ default: m.IntegrationsProvider })));
const ResearchProvider = lazy(() => import("@/contexts/ResearchContext").then(m => ({ default: m.ResearchProvider })));
const PreferencesProvider = lazy(() => import("@/contexts/PreferencesContext").then(m => ({ default: m.PreferencesProvider })));
const SecurityProvider = lazy(() => import("@/contexts/SecurityContext").then(m => ({ default: m.SecurityProvider })));
const GamificationProvider = lazy(() => import("@/contexts/GamificationContext").then(m => ({ default: m.GamificationProvider })));
const SubscriptionProvider = lazy(() => import("@/contexts/SubscriptionContext").then(m => ({ default: m.SubscriptionProvider })));
const PolicyProvider = lazy(() => import("@/contexts/PolicyContext").then(m => ({ default: m.PolicyProvider })));

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
        name="splash" 
        options={{ 
          headerShown: false,
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
      <Stack.Screen 
        name="deploy" 
        options={{ 
          headerTitle: "Deploy Project",
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="pricing" 
        options={{ 
          headerTitle: "Pricing",
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="policy" 
        options={{ 
          headerTitle: "No Mock/Demo Policy",
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

function FloatingAISupport() {
  const { user } = useAuth();
  const tier = user?.subscription;
  let mapped: 'free' | 'starter' | 'professional' | 'premium' = 'free';
  if (tier === 'basic') mapped = 'starter';
  if (tier === 'pro') mapped = 'professional';
  if (tier === 'enterprise') mapped = 'premium';
  return <AISupportChat userTier={mapped} />;
}

function OnboardingWrapper() {
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const done = await AsyncStorage.getItem('onboarding_completed');
        setShowTour(!done);
      } catch (error) {
        console.error('Failed to check onboarding status:', error);
      }
    })();
  }, []);

  const handleComplete = async () => {
    try {
      await AsyncStorage.setItem('onboarding_completed', 'true');
      setShowTour(false);
    } catch (error) {
      console.error('Failed to save onboarding completion:', error);
      setShowTour(false);
    }
  };

  const handleSkip = async () => {
    try {
      await AsyncStorage.setItem('onboarding_completed', 'true');
      setShowTour(false);
    } catch (error) {
      console.error('Failed to save onboarding skip:', error);
      setShowTour(false);
    }
  };

  return (
    <OnboardingTour
      visible={showTour}
      onComplete={handleComplete}
      onSkip={handleSkip}
      onStepChange={(index, step) => {
        console.log(`Onboarding step ${index}:`, step.title);
      }}
      persistProgress
    />
  );
}

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
                  <ThemeProvider>
                  <Suspense fallback={<LoadingFallback />}>
                    <GamificationProvider>
                      <SubscriptionProvider>
                        <PolicyProvider>
                        <SecurityProvider>
                          <PreferencesProvider>
                        <DatabaseProvider>
                        <AgentProvider>
                          <WorkflowProvider>
                            <DeploymentProvider>
                              <AppBuilderProvider>
                                <TriModelProvider>
                                <NoCodeBuilderProvider>
                                  <IntegrationsProvider>
                                    <ResearchProvider>
                                    <StatusBar style="light" backgroundColor={Colors.Colors.background.primary} />
                                    <View style={{ flex: 1, backgroundColor: Colors.Colors.background.primary }}>
                                      <RootLayoutNav />
                                      <UniversalFooter />
                                      <FloatingAISupport />
                                      <OnboardingWrapper />
                                    </View>
                                    </ResearchProvider>
                                  </IntegrationsProvider>
                                </NoCodeBuilderProvider>
                                </TriModelProvider>
                              </AppBuilderProvider>
                            </DeploymentProvider>
                          </WorkflowProvider>
                        </AgentProvider>
                        </DatabaseProvider>
                          </PreferencesProvider>
                        </SecurityProvider>
                        </PolicyProvider>
                      </SubscriptionProvider>
                    </GamificationProvider>
                  </Suspense>
                  </ThemeProvider>
                </SettingsProvider>
              </AuthProvider>
            </QueryClientProvider>
          </trpc.Provider>
        </GestureHandlerRootView>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}