import { Tabs } from "expo-router";
import { 
  Code, 
  Terminal, 
  FileText, 
  Settings, 
  Zap, 
  Brain,
  Monitor
} from "lucide-react-native";
import React from "react";

import Colors from "@/constants/colors";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.Colors.cyan.primary,
        tabBarInactiveTintColor: Colors.Colors.text.muted,
        tabBarStyle: {
          backgroundColor: Colors.Colors.background.secondary,
          borderTopColor: Colors.Colors.border.primary,
          borderTopWidth: 1,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color }) => <Monitor color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="agent"
        options={{
          title: "AI Agent",
          tabBarIcon: ({ color }) => <Brain color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="code"
        options={{
          title: "IDE",
          tabBarIcon: ({ color }) => <Code color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="terminal"
        options={{
          title: "Terminal",
          tabBarIcon: ({ color }) => <Terminal color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="analysis"
        options={{
          title: "Analysis",
          tabBarIcon: ({ color }) => <FileText color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => <Settings color={color} size={24} />,
        }}
      />
    </Tabs>
  );
}