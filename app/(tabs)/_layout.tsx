import { Tabs } from "expo-router";
import { 
  Home,
  Sparkles,
  Network,
  Rocket,
  User,
  Shield,
  BarChart3,
  Trophy,
  Crown,
  Gift,
  Inbox,
  GitMerge,
  Brain,
} from "lucide-react-native";
import React from "react";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => <Home color={color} size={26} />,
        }}
      />
      <Tabs.Screen
        name="agent"
        options={{
          title: "Canvas",
          tabBarIcon: ({ color }) => <Sparkles color={color} size={26} />,
        }}
      />
      <Tabs.Screen
        name="orchestration"
        options={{
          title: "Orchestrate",
          tabBarIcon: ({ color }) => <Network color={color} size={26} />,
        }}
      />
      <Tabs.Screen
        name="code"
        options={{
          title: "Deploy",
          tabBarIcon: ({ color }) => <Rocket color={color} size={26} />,
        }}
      />
      <Tabs.Screen
        name="preferences"
        options={{
          title: "Preferences",
          tabBarIcon: ({ color }) => <User color={color} size={26} />,
        }}
      />
      <Tabs.Screen
        name="security"
        options={{
          title: "Security",
          tabBarIcon: ({ color }) => <Shield color={color} size={26} />,
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color }) => <BarChart3 color={color} size={26} />,
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: "Leaderboard",
          tabBarIcon: ({ color }) => <Trophy color={color} size={26} />,
        }}
      />
      <Tabs.Screen
        name="subscription"
        options={{
          title: "Subscription",
          tabBarIcon: ({ color }) => <Crown color={color} size={26} />,
        }}
      />
      <Tabs.Screen
        name="referrals"
        options={{
          title: "Referrals",
          tabBarIcon: ({ color }) => <Gift color={color} size={26} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="workflow"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="terminal"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="analysis"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="database"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="integrations"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="research"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="workflow-enhanced"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="api-keys"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="ai-models"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="queue"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="conflicts"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="console"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="mcp"
        options={{
          title: "MCP",
          tabBarIcon: ({ color }) => <Brain color={color} size={26} />,
        }}
      />
    </Tabs>
  );
}

