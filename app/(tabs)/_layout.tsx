import { Tabs } from "expo-router";
import { 
  Code, 
  Terminal, 
  FileText, 
  Settings, 
  Brain,
  Monitor,
  Database,
  Workflow
} from "lucide-react-native";
import React from "react";
import { View, ScrollView, TouchableOpacity, Text, StyleSheet } from "react-native";

import Colors from "@/constants/colors";

function CustomTabBar({ state, descriptors, navigation }: any) {
  return (
    <View style={styles.tabBarContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={true}
        contentContainerStyle={styles.scrollContent}
      >
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const label =
            options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
              ? options.title
              : route.name;

          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const color = isFocused
            ? Colors.Colors.cyan.primary
            : Colors.Colors.text.muted;

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              onPress={onPress}
              style={styles.tabItem}
            >
              {options.tabBarIcon && options.tabBarIcon({ color, size: 24, focused: isFocused })}
              <Text style={[styles.tabLabel, { color }]}>
                {typeof label === 'string' ? label : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    backgroundColor: Colors.Colors.background.secondary,
    borderTopColor: Colors.Colors.cyan.primary,
    borderTopWidth: 2,
  },
  scrollContent: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 8,
  },
  tabItem: {
    minWidth: 90,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    marginTop: 4,
  },
});

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
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
        name="workflow"
        options={{
          title: "Workflow",
          tabBarIcon: ({ color }) => <Workflow color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="database"
        options={{
          title: "Database",
          tabBarIcon: ({ color }) => <Database color={color} size={24} />,
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