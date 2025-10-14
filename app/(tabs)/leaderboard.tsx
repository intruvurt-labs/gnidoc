import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Trophy, Medal, Award, TrendingUp, User } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';

type LeaderboardEntry = {
  id: string;
  name: string;
  score: number;
  rank: number;
  avatar?: string;
  trend: 'up' | 'down' | 'same';
};

export default function LeaderboardScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'monthly' | 'alltime'>('weekly');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    const mockData: LeaderboardEntry[] = [
      { id: '1', name: 'Alex Chen', score: 15420, rank: 1, trend: 'up' },
      { id: '2', name: 'Sarah Johnson', score: 14890, rank: 2, trend: 'same' },
      { id: '3', name: 'Mike Rodriguez', score: 13750, rank: 3, trend: 'up' },
      { id: '4', name: 'Emma Wilson', score: 12340, rank: 4, trend: 'down' },
      { id: '5', name: 'James Lee', score: 11890, rank: 5, trend: 'up' },
      { id: '6', name: user?.name || 'You', score: 10250, rank: 6, trend: 'up' },
      { id: '7', name: 'Lisa Anderson', score: 9870, rank: 7, trend: 'same' },
      { id: '8', name: 'David Kim', score: 9120, rank: 8, trend: 'down' },
      { id: '9', name: 'Rachel Green', score: 8540, rank: 9, trend: 'up' },
      { id: '10', name: 'Tom Harris', score: 7890, rank: 10, trend: 'same' },
    ];
    setLeaderboard(mockData);
  }, [timeframe, user?.name]);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy size={24} color={Colors.Colors.yellow.primary} />;
    if (rank === 2) return <Medal size={24} color="#C0C0C0" />;
    if (rank === 3) return <Award size={24} color="#CD7F32" />;
    return null;
  };

  const isCurrentUser = (entry: LeaderboardEntry) => {
    return entry.name === user?.name || entry.name === 'You';
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Leaderboard</Text>
        <Text style={styles.subtitle}>Compete with the best builders</Text>
      </View>

      <View style={styles.timeframeContainer}>
        {(['daily', 'weekly', 'monthly', 'alltime'] as const).map((tf) => (
          <TouchableOpacity
            key={tf}
            style={[
              styles.timeframeButton,
              timeframe === tf && styles.timeframeButtonActive,
            ]}
            onPress={() => setTimeframe(tf)}
          >
            <Text
              style={[
                styles.timeframeText,
                timeframe === tf && styles.timeframeTextActive,
              ]}
            >
              {tf === 'alltime' ? 'All Time' : tf.charAt(0).toUpperCase() + tf.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {leaderboard.map((entry, index) => {
          const isUser = isCurrentUser(entry);
          return (
            <View
              key={entry.id}
              style={[
                styles.entryCard,
                isUser && styles.entryCardHighlight,
                index === 0 && styles.entryCardFirst,
              ]}
            >
              <View style={styles.rankContainer}>
                {getRankIcon(entry.rank) || (
                  <Text style={styles.rankText}>#{entry.rank}</Text>
                )}
              </View>

              <View style={styles.avatarContainer}>
                <User size={20} color={Colors.Colors.text.inverse} />
              </View>

              <View style={styles.entryInfo}>
                <Text style={[styles.entryName, isUser && styles.entryNameHighlight]}>
                  {entry.name}
                  {isUser && ' (You)'}
                </Text>
                <Text style={styles.entryScore}>{entry.score.toLocaleString()} pts</Text>
              </View>

              <View style={styles.trendContainer}>
                {entry.trend === 'up' && (
                  <TrendingUp size={16} color={Colors.Colors.success} />
                )}
                {entry.trend === 'down' && (
                  <TrendingUp
                    size={16}
                    color={Colors.Colors.error}
                    style={{ transform: [{ rotate: '180deg' }] }}
                  />
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.Colors.background.primary,
  },
  header: {
    padding: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.Colors.text.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.Colors.text.secondary,
  },
  timeframeContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  timeframeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: Colors.Colors.background.card,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
    alignItems: 'center',
  },
  timeframeButtonActive: {
    backgroundColor: Colors.Colors.cyan.primary,
    borderColor: Colors.Colors.cyan.primary,
  },
  timeframeText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.Colors.text.secondary,
  },
  timeframeTextActive: {
    color: Colors.Colors.text.inverse,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  entryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: Colors.Colors.background.card,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
  },
  entryCardFirst: {
    borderColor: Colors.Colors.yellow.primary,
    borderWidth: 2,
    shadowColor: Colors.Colors.yellow.primary,
    shadowOpacity: Platform.select({ ios: 0.3, android: 0.0 }) as number,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  entryCardHighlight: {
    backgroundColor: Colors.Colors.cyan.primary + '15',
    borderColor: Colors.Colors.cyan.primary,
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
  },
  rankText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.Colors.text.secondary,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.Colors.cyan.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  entryInfo: {
    flex: 1,
  },
  entryName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.Colors.text.primary,
    marginBottom: 2,
  },
  entryNameHighlight: {
    color: Colors.Colors.cyan.primary,
  },
  entryScore: {
    fontSize: 14,
    color: Colors.Colors.text.secondary,
  },
  trendContainer: {
    width: 24,
    alignItems: 'center',
  },
});
