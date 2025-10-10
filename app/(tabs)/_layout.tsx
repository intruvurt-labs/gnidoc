import { Tabs } from "expo-router";
import { 
  Code, 
  Brain,
  Monitor,
  Workflow,
  Settings
} from "lucide-react-native";
import React from "react";
import Colors from "@/constants/colors";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.Colors.cyan.primary,
        tabBarInactiveTintColor: Colors.Colors.text.muted,
        tabBarStyle: {
          backgroundColor: Colors.Colors.background.secondary,
          borderTopColor: Colors.Colors.cyan.primary,
          borderTopWidth: 2,
          height: 90,
          paddingBottom: 25,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600' as const,
          marginBottom: 5,
        },
        tabBarIconStyle: {
          marginTop: 5,
          marginBottom: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Generator",
          tabBarIcon: ({ color }) => <Code color={color} size={26} />,
        }}
      />
      <Tabs.Screen
        name="agent"
        options={{
          title: "AI Agent",
          tabBarIcon: ({ color }) => <Brain color={color} size={26} />,
        }}
      />
      <Tabs.Screen
        name="code"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color }) => <Monitor color={color} size={26} />,
        }}
      />
      <Tabs.Screen
        name="workflow"
        options={{
          title: "Workflow",
          tabBarIcon: ({ color }) => <Workflow color={color} size={26} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => <Settings color={color} size={26} />,
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
    </Tabs>
  );
}