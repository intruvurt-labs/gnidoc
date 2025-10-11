import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  Clock,
  CheckCircle,
  XCircle,
  BarChart3,
  PieChart,
  Target,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { limeWithOutline } from '@/constants/textStyles';
import { useGamification } from '@/contexts/GamificationContext';
import { useAuth } from '@/contexts/AuthContext';
import BrandedHeader from '@/components/BrandedHeader';
import ScreenBackground from '@/components/ScreenBackground';

const { width } = Dimensions.get('window');

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { iterationStats, level, xp, xpToNextLevel, streak } = useGamification();
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month' | 'all'>('week');

  const successRate = iterationStats.totalIterations > 0
    ? (iterationStats.successfulBuilds / iterationStats.totalIterations) * 100
    : 0;

  const stats = [
    {
      id: 'total',
      label: 'Total Builds',
      value: iterationStats.totalIterations,
      icon: Activity,
      color: Colors.Colors.cyan.primary,
      trend: '+12%',
      trendUp: true,
    },
    {
      id: 'success',
      label: 'Successful',
      value: iterationStats.successfulBuilds,
      icon: CheckCircle,
      color: Colors.Colors.success,
      trend: '+8%',
      trendUp: true,
    },
    {
      id: 'failed',
      label: 'Failed',
      value: iterationStats.failedBuilds,
      icon: XCircle,
      color: Colors.Colors.error,
      trend: '-5%',
      trendUp: false,
    },
    {
      id: 'avgTime',
      label: 'Avg Build Time',
      value: `${Math.round(iterationStats.averageBuildTime)}s`,
      icon: Clock,
      color: Colors.Colors.warning,
      trend: '-3%',
      trendUp: false,
    },
  ];

  const progressData = [
    {
      id: 'level',
      label: 'Level',
      value: level,
      max: level + 1,
      color: Colors.Colors.cyan.primary,
      icon: '🎯',
    },
    {
      id: 'xp',
      label: 'XP Progress',
      value: xp,
      max: xpToNextLevel,
      color: Colors.Colors.success,
      icon: '⚡',
    },
    {
      id: 'streak',
      label: 'Day Streak',
      value: streak,
      max: 30,
      color: Colors.Colors.warning,
      icon: '🔥',
    },
    {
      id: 'success-rate',
      label: 'Success Rate',
      value: Math.round(successRate),
      max: 100,
      color: Colors.Colors.red.primary,
      icon: '📊',
    },
  ];

  const recentActivity = [
    {
      id: '1',
      type: 'build',
      title: 'App Generated Successfully',
      description: 'E-commerce mobile app',
      timestamp: '2 hours ago',
      status: 'success',
    },
    {
      id: '2',
      type: 'achievement',
      title: 'Achievement Unlocked',
      description: 'Power User - 10 apps generated',
      timestamp: '5 hours ago',
      status: 'achievement',
    },
    {
      id: '3',
      type: 'build',
      title: 'Build Failed',
      description: 'Social media dashboard',
      timestamp: '1 day ago',
      status: 'error',
    },
    {
      id: '4',
      type: 'referral',
      title: 'Referral Completed',
      description: '+500 Bix credits earned',
      timestamp: '2 days ago',
      status: 'success',
    },
  ];

  return (
    <ScreenBackground variant="default" showPattern>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Stack.Screen options={{ headerShown: false }} />

        <BrandedHeader
          title="Dashboard"
          subtitle={`Welcome back, ${user?.name || 'Builder'}!`}
        />

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.timeRangeSelector}>
            {(['day', 'week', 'month', 'all'] as const).map(range => (
              <TouchableOpacity
                key={range}
                style={[
                  styles.timeRangeButton,
                  timeRange === range && styles.timeRangeButtonActive,
                ]}
                onPress={() => setTimeRange(range)}
              >
                <Text
                  style={[
                    styles.timeRangeText,
                    timeRange === range && styles.timeRangeTextActive,
                  ]}
                >
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.statsGrid}>
            {stats.map(stat => (
              <View key={stat.id} style={styles.statCard}>
                <View style={styles.statHeader}>
                  <View style={[styles.statIcon, { backgroundColor: stat.color + '20' }]}>
                    <stat.icon color={stat.color} size={20} />
                  </View>
                  <View style={styles.statTrend}>
                    {stat.trendUp ? (
                      <TrendingUp color={Colors.Colors.success} size={14} />
                    ) : (
                      <TrendingDown color={Colors.Colors.error} size={14} />
                    )}
                    <Text
                      style={[
                        styles.statTrendText,
                        { color: stat.trendUp ? Colors.Colors.success : Colors.Colors.error },
                      ]}
                    >
                      {stat.trend}
                    </Text>
                  </View>
                </View>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Target color={Colors.Colors.cyan.primary} size={24} />
              <Text style={styles.sectionTitle}>Progress Overview</Text>
            </View>
            <View style={styles.progressGrid}>
              {progressData.map(item => {
                const percentage = (item.value / item.max) * 100;
                return (
                  <View key={item.id} style={styles.progressCard}>
                    <View style={styles.progressHeader}>
                      <Text style={styles.progressIcon}>{item.icon}</Text>
                      <Text style={styles.progressLabel}>{item.label}</Text>
                    </View>
                    <View style={styles.progressBarContainer}>
                      <View style={styles.progressBarBg}>
                        <View
                          style={[
                            styles.progressBarFill,
                            {
                              width: `${Math.min(percentage, 100)}%`,
                              backgroundColor: item.color,
                            },
                          ]}
                        />
                      </View>
                    </View>
                    <View style={styles.progressFooter}>
                      <Text style={styles.progressValue}>
                        {item.value} / {item.max}
                      </Text>
                      <Text style={styles.progressPercentage}>{Math.round(percentage)}%</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <BarChart3 color={Colors.Colors.cyan.primary} size={24} />
              <Text style={styles.sectionTitle}>Performance Insights</Text>
            </View>
            <View style={styles.insightsCard}>
              <View style={styles.insightRow}>
                <View style={styles.insightItem}>
                  <PieChart color={Colors.Colors.cyan.primary} size={40} />
                  <View style={styles.insightContent}>
                    <Text style={styles.insightValue}>{Math.round(successRate)}%</Text>
                    <Text style={styles.insightLabel}>Success Rate</Text>
                  </View>
                </View>
                <View style={styles.insightDivider} />
                <View style={styles.insightItem}>
                  <Zap color={Colors.Colors.warning} size={40} />
                  <View style={styles.insightContent}>
                    <Text style={styles.insightValue}>{iterationStats.totalCreditsSpent}</Text>
                    <Text style={styles.insightLabel}>Credits Spent</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Activity color={Colors.Colors.cyan.primary} size={24} />
              <Text style={styles.sectionTitle}>Recent Activity</Text>
            </View>
            {recentActivity.map(activity => (
              <View key={activity.id} style={styles.activityCard}>
                <View
                  style={[
                    styles.activityIndicator,
                    {
                      backgroundColor:
                        activity.status === 'success'
                          ? Colors.Colors.success
                          : activity.status === 'error'
                          ? Colors.Colors.error
                          : Colors.Colors.cyan.primary,
                    },
                  ]}
                />
                <View style={styles.activityContent}>
                  <Text style={styles.activityTitle}>{activity.title}</Text>
                  <Text style={styles.activityDescription}>{activity.description}</Text>
                  <Text style={styles.activityTimestamp}>{activity.timestamp}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  timeRangeSelector: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 8,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: Colors.Colors.background.card,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
    alignItems: 'center',
  },
  timeRangeButtonActive: {
    backgroundColor: Colors.Colors.cyan.primary,
    borderColor: Colors.Colors.cyan.primary,
  },
  timeRangeText: {
    fontSize: 13,
    fontWeight: '600' as const,
    ...limeWithOutline,
  },
  timeRangeTextActive: {
    color: Colors.Colors.text.inverse,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
  },
  statCard: {
    width: (width - 52) / 2,
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statTrendText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: Colors.Colors.cyan.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    ...limeWithOutline,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    ...limeWithOutline,
  },
  progressGrid: {
    gap: 12,
  },
  progressCard: {
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  progressIcon: {
    fontSize: 20,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    ...limeWithOutline,
  },
  progressBarContainer: {
    marginBottom: 8,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: Colors.Colors.background.secondary,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressValue: {
    fontSize: 12,
    ...limeWithOutline,
  },
  progressPercentage: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.Colors.cyan.primary,
  },
  insightsCard: {
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  insightItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  insightDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.Colors.border.muted,
    marginHorizontal: 16,
  },
  insightContent: {
    flex: 1,
  },
  insightValue: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: Colors.Colors.cyan.primary,
    marginBottom: 2,
  },
  insightLabel: {
    fontSize: 12,
    ...limeWithOutline,
  },
  activityCard: {
    flexDirection: 'row',
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
    gap: 12,
  },
  activityIndicator: {
    width: 4,
    borderRadius: 2,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.Colors.cyan.primary,
    marginBottom: 4,
  },
  activityDescription: {
    fontSize: 13,
    ...limeWithOutline,
    marginBottom: 4,
  },
  activityTimestamp: {
    fontSize: 11,
    color: Colors.Colors.text.muted,
  },
});
