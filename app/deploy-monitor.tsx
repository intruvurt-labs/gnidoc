import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Activity, TrendingUp } from 'lucide-react-native';
import Colors, { Shadows } from '@/constants/colors';
import HoloBrain from '@/components/HoloBrain';
import MatrixGridBackground from '@/components/MatrixGridBackground';

type TabType = 'Status' | 'Connections' | 'History';

export default function DeployMonitorScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('Status');

  const metrics = [
    { metric: 'build' as const, color: Colors.Colors.magenta.primary, value: 0 },
    { metric: 'ship' as const, color: Colors.Colors.lime.primary, value: 0 },
    { metric: 'uptime' as const, color: Colors.Colors.cyan.primary, value: 100 },
    { metric: 'latency' as const, color: Colors.Colors.red.primary, value: 40 },
  ];

  const handleDeploy = () => {
    console.log('Deploying...');
    router.push('/deploy' as any);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <MatrixGridBackground />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Activity color={Colors.Colors.lime.primary} size={24} />
          <Text style={styles.headerTitle}>Deploy & Monitor</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.brainSection}>
          <HoloBrain rings={metrics} />
        </View>

        <View style={styles.tabsContainer}>
          {(['Status', 'Connections', 'History'] as TabType[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'Status' && (
          <View style={styles.section}>
            <View style={styles.statusCard}>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Build Status</Text>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusBadgeText}>Ready</Text>
                </View>
              </View>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Last Deploy</Text>
                <Text style={styles.statusValue}>2 hours ago</Text>
              </View>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Active Deployments</Text>
                <Text style={styles.statusValue}>3</Text>
              </View>
            </View>
          </View>
        )}

        {activeTab === 'Connections' && (
          <View style={styles.section}>
            <View style={styles.connectionCard}>
              <Text style={styles.connectionTitle}>Database</Text>
              <Text style={styles.connectionStatus}>● Connected</Text>
            </View>
            <View style={styles.connectionCard}>
              <Text style={styles.connectionTitle}>API Gateway</Text>
              <Text style={styles.connectionStatus}>● Connected</Text>
            </View>
            <View style={styles.connectionCard}>
              <Text style={styles.connectionTitle}>CDN</Text>
              <Text style={styles.connectionStatus}>● Active</Text>
            </View>
          </View>
        )}

        {activeTab === 'History' && (
          <View style={styles.section}>
            <View style={styles.historyCard}>
              <View style={styles.historyItem}>
                <View style={styles.historyDot} />
                <View style={styles.historyContent}>
                  <Text style={styles.historyTitle}>Deployed v1.2.3</Text>
                  <Text style={styles.historyTime}>2 hours ago</Text>
                </View>
              </View>
              <View style={styles.historyItem}>
                <View style={styles.historyDot} />
                <View style={styles.historyContent}>
                  <Text style={styles.historyTitle}>Build completed</Text>
                  <Text style={styles.historyTime}>3 hours ago</Text>
                </View>
              </View>
              <View style={styles.historyItem}>
                <View style={styles.historyDot} />
                <View style={styles.historyContent}>
                  <Text style={styles.historyTitle}>Started deployment</Text>
                  <Text style={styles.historyTime}>3 hours ago</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        <TouchableOpacity style={styles.deployButton} onPress={handleDeploy}>
          <TrendingUp color={Colors.Colors.text.inverse} size={20} />
          <Text style={styles.deployButtonText}>Deploy Now</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.Colors.black.ink,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 2,
    borderBottomColor: Colors.Colors.lime.primary,
    gap: 12,
  },
  backButton: {
    padding: 8,
  },
  backText: {
    fontSize: 24,
    color: Colors.Colors.lime.primary,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.Colors.lime.primary,
  },
  content: {
    flex: 1,
  },
  brainSection: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: Colors.Colors.background.card,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.Colors.border.muted,
  },
  tabActive: {
    backgroundColor: Colors.Colors.cyan.primary,
    borderColor: Colors.Colors.cyan.primary,
    ...Shadows.glowCyan,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.Colors.text.primary,
  },
  tabTextActive: {
    color: Colors.Colors.text.inverse,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  statusCard: {
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: Colors.Colors.cyan.primary,
    gap: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.Colors.text.primary,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.Colors.cyan.primary,
  },
  statusBadge: {
    backgroundColor: Colors.Colors.lime.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.Colors.text.inverse,
  },
  connectionCard: {
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: Colors.Colors.lime.primary,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  connectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.Colors.text.primary,
  },
  connectionStatus: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.Colors.lime.primary,
  },
  historyCard: {
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: Colors.Colors.cyan.primary,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 20,
  },
  historyDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.Colors.cyan.primary,
    marginTop: 4,
  },
  historyContent: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.Colors.text.primary,
    marginBottom: 4,
  },
  historyTime: {
    fontSize: 12,
    color: Colors.Colors.text.muted,
  },
  deployButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginBottom: 32,
    backgroundColor: Colors.Colors.lime.primary,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    ...Shadows.glowLime,
  },
  deployButtonText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.Colors.text.inverse,
  },
});
