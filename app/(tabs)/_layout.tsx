import { Tabs } from "expo-router";
import { 
  Code, 
  Brain,
  Monitor,
  Network,
  User,
  Shield,
  BarChart3,
  Trophy,
  Crown,
  Gift,
  Menu
} from "lucide-react-native";
import React, { useState } from "react";
import { View, TouchableOpacity, Text, StyleSheet, Platform, Modal, ScrollView, Image } from "react-native";
import Colors from "@/constants/colors";
import LogoMenu from "@/components/LogoMenu";

function CustomTabBar({ state, descriptors, navigation }: any) {
  const [showOverflowMenu, setShowOverflowMenu] = useState(false);
  
  const visibleRoutes = state.routes.filter((route: any) => {
    const { options } = descriptors[route.key];
    return options.href !== null;
  });

  const mainTabs = visibleRoutes.slice(0, 3);
  const overflowTabs = visibleRoutes.slice(3);

  return (
    <>
      <View style={styles.tabBarContainer}>
        <View style={styles.tabBarContent}>
          <LogoMenu />
          
          {mainTabs.map((route: any, index: number) => {
            const routeIndex = state.routes.indexOf(route);
            const { options } = descriptors[route.key];
            const label =
              options.tabBarLabel !== undefined
                ? options.tabBarLabel
                : options.title !== undefined
                ? options.title
                : route.name;

            const isFocused = state.index === routeIndex;

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

            const iconColor = isFocused ? Colors.Colors.cyan.primary : Colors.Colors.text.muted;

            return (
              <TouchableOpacity
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                onPress={onPress}
                style={[
                  styles.tabButton,
                  isFocused && styles.tabButtonActive,
                ]}
              >
                {options.tabBarIcon && options.tabBarIcon({ color: iconColor, size: 24, focused: isFocused })}
                <Text
                  style={[
                    styles.tabLabel,
                    { color: iconColor },
                    isFocused && styles.tabLabelActive,
                  ]}
                >
                  {typeof label === 'string' ? label : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
          
          {overflowTabs.length > 0 && (
            <TouchableOpacity
              style={styles.tabButton}
              onPress={() => setShowOverflowMenu(true)}
            >
              <Menu color={Colors.Colors.text.muted} size={24} />
              <Text style={styles.tabLabel}>More</Text>
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.footerLogoContainer}>
          <Image
            source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/1nutezip17rqx39f27nrb' }}
            style={styles.footerLogo}
            resizeMode="contain"
          />
        </View>
      </View>

      <Modal
        visible={showOverflowMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOverflowMenu(false)}
      >
        <TouchableOpacity
          style={styles.overflowModalOverlay}
          activeOpacity={1}
          onPress={() => setShowOverflowMenu(false)}
        >
          <View style={styles.overflowMenu}>
            <Text style={styles.overflowMenuTitle}>More Tabs</Text>
            <ScrollView>
              {overflowTabs.map((route: any) => {
                const routeIndex = state.routes.indexOf(route);
                const { options } = descriptors[route.key];
                const label =
                  options.tabBarLabel !== undefined
                    ? options.tabBarLabel
                    : options.title !== undefined
                    ? options.title
                    : route.name;

                const isFocused = state.index === routeIndex;

                const onPress = () => {
                  setShowOverflowMenu(false);
                  const event = navigation.emit({
                    type: 'tabPress',
                    target: route.key,
                    canPreventDefault: true,
                  });

                  if (!isFocused && !event.defaultPrevented) {
                    navigation.navigate(route.name);
                  }
                };

                const iconColor = isFocused ? Colors.Colors.cyan.primary : Colors.Colors.text.muted;

                return (
                  <TouchableOpacity
                    key={route.key}
                    style={[
                      styles.overflowMenuItem,
                      isFocused && styles.overflowMenuItemActive,
                    ]}
                    onPress={onPress}
                  >
                    {options.tabBarIcon && options.tabBarIcon({ color: iconColor, size: 20, focused: isFocused })}
                    <Text style={[styles.overflowMenuItemText, { color: iconColor }]}>
                      {typeof label === 'string' ? label : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

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
        name="orchestration"
        options={{
          title: "Orchestrate",
          tabBarIcon: ({ color }) => <Network color={color} size={26} />,
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
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    backgroundColor: Colors.Colors.background.secondary,
    borderTopColor: Colors.Colors.cyan.primary,
    borderTopWidth: 2,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    paddingTop: 8,
  },
  tabBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    flex: 1,
    backgroundColor: 'transparent',
  },
  tabButtonActive: {
    backgroundColor: Colors.Colors.cyan.primary + '20',
    borderWidth: 1,
    borderColor: Colors.Colors.cyan.primary + '40',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    marginTop: 4,
  },
  tabLabelActive: {
    fontWeight: '700' as const,
  },
  footerLogoContainer: {
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.Colors.border.muted,
  },
  footerLogo: {
    width: 120,
    height: 24,
  },
  overflowModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  overflowMenu: {
    backgroundColor: Colors.Colors.background.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '60%',
    borderWidth: 2,
    borderColor: Colors.Colors.cyan.primary,
  },
  overflowMenuTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.Colors.cyanRed.primary,
    marginBottom: 16,
  },
  overflowMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: Colors.Colors.background.secondary,
  },
  overflowMenuItemActive: {
    backgroundColor: Colors.Colors.cyan.primary + '20',
    borderWidth: 1,
    borderColor: Colors.Colors.cyan.primary,
  },
  overflowMenuItemText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
});