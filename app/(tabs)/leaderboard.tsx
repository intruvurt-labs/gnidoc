import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Image,
} from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Trophy,
  Medal,
  Award,
  TrendingUp,
  Star,
  Zap,
  Crown,
  Target,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { limeWithOutline } from '@/constants/textStyles';
import { useGamification } from '@/contexts/GamificationContext';
import { useAuth } from '@/contexts/AuthContext';
import BrandedHeader from '@/components/BrandedHeader';
import ScreenBackground from '@/components/ScreenBackground';

const { width } = Dimensions.get('window');

interface LeaderboardEntry {
  id: string;
  rank: number;
  name: string;
  avatar?: string;
  level: number;
  xp: number;
  builds: number;
  achievements: number;
  streak: number;
}

const mockLeaderboard: LeaderboardEntry[] = [
  {
    id: '1',
    rank: 1,
    name: 'CodeMaster Pro',
    level: 42,
    xp: 125000,
    builds: 350,
    achievements: 45,
    streak: 89,
  },
  {
    id: '2',
    rank: 2,
    name: 'AI Architect',
    level: 38,
    xp: 98000,
    builds: 280,
    achievements: 38,
    streak: 67,
  },
  {
    id: '3',
    rank: 3,
    name: 'DevOps Ninja',
    level: 35,
    xp: 87000,
    builds: 245,
    achievements: 35,
    streak: 54,
  },
  {
    id: '4',
    rank: 4,
    name: 'Full Stack Hero',
    level: 32,
    xp: 76000,
    builds: 220,
    achievements: 32,
    streak: 45,
  },
  {
    id: '5',
    rank: 5,
    name: 'Cloud Wizard',
    level: 30,
    xp: 68000,
    builds: 195,
    achievements: 28,
    streak: 38,
  },
];

export default function LeaderboardScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { level, xp, iterationStats, achievements, streak } = useGamification();
  const [category, setCategory] = useState<'overall' | 'builds' | 'achievements' | 'streak'>('overall');

  const userRank = 12;
  const userEntry: LeaderboardEntry = {
    id: user?.id || 'current',
    rank: userRank,
    name: user?.name || 'You',
    avatar: user?.avatar,
    level,
    xp,
    builds: iterationStats.totalIterations,
    achievements: achievements.filter(a => a.unlockedAt).length,
    streak,
  };

  const categories = [
    { id: 'overall' as const, label: 'Overall', icon: Trophy },
    { id: 'builds' as const, label: 'Builds', icon: Zap },
    { id: 'achievements' as const, label: 'Achievements', icon: Award },
    { id: 'streak' as const, label: 'Streak', icon: Target },
  ];

  const getRankColor = (rank: number) => {
    if (rank === 1) return Colors.Colors.warning;
    if (rank === 2) return '#C0C0C0';
    if (rank === 3) return '#CD7F32';
    return Colors.Colors.cyan.primary;
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown color={Colors.Colors.warning} size={24} />;
    if (rank === 2) return <Medal color="#C0C0C0" size={24} />;
    if (rank === 3) return <Medal color="#CD7F32" size={24} />;
    return <Star color={Colors.Colors.cyan.primary} size={20} />;
  };

  return (
    <ScreenBackground variant="default" showPattern>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Stack.Screen options={{ headerShown: false }} />

        <BrandedHeader
          title="Leaderboard"
          subtitle="Compete with top builders worldwide"
        />

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.categorySelector}>
            {categories.map(cat => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryButton,
                  category === cat.id && styles.categoryButtonActive,
                ]}
                onPress={() => setCategory(cat.id)}
              >
                <cat.icon
                  color={
                    category === cat.id
                      ? Colors.Colors.text.inverse
                      : Colors.Colors.cyan.primary
                  }
                  size={18}
                />
                <Text
                  style={[
                    styles.categoryText,
                    category === cat.id && styles.categoryTextActive,
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.podiumSection}>
            <View style={styles.podiumContainer}>
              <View style={[styles.podiumPlace, styles.podiumSecond]}>
                <View style={styles.podiumAvatar}>
                  <Text style={styles.podiumAvatarText}>
                    {mockLeaderboard[1].name.charAt(0)}
                  </Text>
                </View>
                <View style={styles.podiumRank}>
                  <Medal color="#C0C0C0" size={20} />
                  <Text style={styles.podiumRankText}>2</Text>
                </View>
                <Text style={styles.podiumName} numberOfLines={1}>
                  {mockLeaderboard[1].name}
                </Text>
                <Text style={styles.podiumScore}>{mockLeaderboard[1].xp.toLocaleString()} XP</Text>
              </View>

              <View style={[styles.podiumPlace, styles.podiumFirst]}>
                <View style={[styles.podiumAvatar, styles.podiumAvatarFirst]}>
                  <Text style={styles.podiumAvatarText}>
                    {mockLeaderboard[0].name.charAt(0)}
                  </Text>
                </View>
                <View style={[styles.podiumRank, styles.podiumRankFirst]}>
                  <Crown color={Colors.Colors.warning} size={24} />
                  <Text style={styles.podiumRankText}>1</Text>
                </View>
                <Text style={styles.podiumName} numberOfLines={1}>
                  {mockLeaderboard[0].name}
                </Text>
                <Text style={styles.podiumScore}>{mockLeaderboard[0].xp.toLocaleString()} XP</Text>
              </View>

              <View style={[styles.podiumPlace, styles.podiumThird]}>
                <View style={styles.podiumAvatar}>
                  <Text style={styles.podiumAvatarText}>
                    {mockLeaderboard[2].name.charAt(0)}
                  </Text>
                </View>
                <View style={styles.podiumRank}>
                  <Medal color="#CD7F32" size={20} />
                  <Text style={styles.podiumRankText}>3</Text>
                </View>
                <Text style={styles.podiumName} numberOfLines={1}>
                  {mockLeaderboard[2].name}
                </Text>
                <Text style={styles.podiumScore}>{mockLeaderboard[2].xp.toLocaleString()} XP</Text>
              </View>
            </View>
          </View>

          <View style={styles.userRankCard}>
            <View style={styles.userRankHeader}>
              <Text style={styles.userRankTitle}>Your Rank</Text>
              <TrendingUp color={Colors.Colors.success} size={20} />
            </View>
            <View style={styles.userRankContent}>
              <View style={styles.userRankBadge}>
                <Text style={styles.userRankNumber}>#{userRank}</Text>
              </View>
              <View style={styles.userRankStats}>
                <View style={styles.userRankStat}>
                  <Text style={styles.userRankStatLabel}>Level</Text>
                  <Text style={styles.userRankStatValue}>{level}</Text>
                </View>
                <View style={styles.userRankStat}>
                  <Text style={styles.userRankStatLabel}>XP</Text>
                  <Text style={styles.userRankStatValue}>{xp.toLocaleString()}</Text>
                </View>
                <View style={styles.userRankStat}>
                  <Text style={styles.userRankStatLabel}>Builds</Text>
                  <Text style={styles.userRankStatValue}>{iterationStats.totalIterations}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.leaderboardList}>
            <Text style={styles.listTitle}>Top Builders</Text>
            {mockLeaderboard.slice(3).map(entry => (
              <View key={entry.id} style={styles.leaderboardCard}>
                <View style={styles.leaderboardRank}>
                  {getRankIcon(entry.rank)}
                  <Text style={[styles.leaderboardRankText, { color: getRankColor(entry.rank) }]}>
                    #{entry.rank}
                  </Text>
                </View>
                <View style={styles.leaderboardAvatar}>
                  <Text style={styles.leaderboardAvatarText}>{entry.name.charAt(0)}</Text>
                </View>
                <View style={styles.leaderboardInfo}>
                  <Text style={styles.leaderboardName}>{entry.name}</Text>
                  <View style={styles.leaderboardStats}>
                    <View style={styles.leaderboardStat}>
                      <Text style={styles.leaderboardStatLabel}>Lvl {entry.level}</Text>
                    </View>
                    <View style={styles.leaderboardStat}>
                      <Zap color={Colors.Colors.warning} size={12} />
                      <Text style={styles.leaderboardStatLabel}>{entry.builds}</Text>
                    </View>
                    <View style={styles.leaderboardStat}>
                      <Award color={Colors.Colors.cyan.primary} size={12} />
                      <Text style={styles.leaderboardStatLabel}>{entry.achievements}</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.leaderboardScore}>
                  <Text style={styles.leaderboardScoreValue}>{entry.xp.toLocaleString()}</Text>
                  <Text style={styles.leaderboardScoreLabel}>XP</Text>
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
  categorySelector: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 8,
  },
  categoryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: Colors.Colors.background.card,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
    gap: 6,
  },
  categoryButtonActive: {
    backgroundColor: Colors.Colors.cyan.primary,
    borderColor: Colors.Colors.cyan.primary,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600' as const,
    ...limeWithOutline,
  },
  categoryTextActive: {
    color: Colors.Colors.text.inverse,
  },
  podiumSection: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  podiumContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 12,
  },
  podiumPlace: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: Colors.Colors.border.muted,
  },
  podiumFirst: {
    borderColor: Colors.Colors.warning,
    paddingTop: 24,
  },
  podiumSecond: {
    borderColor: '#C0C0C0',
  },
  podiumThird: {
    borderColor: '#CD7F32',
  },
  podiumAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.Colors.cyan.primary + '40',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  podiumAvatarFirst: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  podiumAvatarText: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: Colors.Colors.cyan.primary,
  },
  podiumRank: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  podiumRankFirst: {
    marginBottom: 12,
  },
  podiumRankText: {
    fontSize: 16,
    fontWeight: 'bold' as const,
    ...limeWithOutline,
  },
  podiumName: {
    fontSize: 13,
    fontWeight: '600' as const,
    ...limeWithOutline,
    marginBottom: 4,
    textAlign: 'center',
  },
  podiumScore: {
    fontSize: 12,
    color: Colors.Colors.cyan.primary,
    fontWeight: '600' as const,
  },
  userRankCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: Colors.Colors.cyan.primary,
  },
  userRankHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  userRankTitle: {
    fontSize: 16,
    fontWeight: 'bold' as const,
    ...limeWithOutline,
  },
  userRankContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  userRankBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.Colors.cyan.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.Colors.cyan.primary,
  },
  userRankNumber: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: Colors.Colors.cyan.primary,
  },
  userRankStats: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  userRankStat: {
    alignItems: 'center',
  },
  userRankStatLabel: {
    fontSize: 11,
    color: Colors.Colors.text.muted,
    marginBottom: 4,
  },
  userRankStatValue: {
    fontSize: 16,
    fontWeight: 'bold' as const,
    color: Colors.Colors.cyan.primary,
  },
  leaderboardList: {
    paddingHorizontal: 20,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    ...limeWithOutline,
    marginBottom: 16,
  },
  leaderboardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
    gap: 12,
  },
  leaderboardRank: {
    width: 50,
    alignItems: 'center',
    gap: 4,
  },
  leaderboardRankText: {
    fontSize: 12,
    fontWeight: 'bold' as const,
  },
  leaderboardAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.Colors.cyan.primary + '40',
    justifyContent: 'center',
    alignItems: 'center',
  },
  leaderboardAvatarText: {
    fontSize: 16,
    fontWeight: 'bold' as const,
    color: Colors.Colors.cyan.primary,
  },
  leaderboardInfo: {
    flex: 1,
  },
  leaderboardName: {
    fontSize: 14,
    fontWeight: '600' as const,
    ...limeWithOutline,
    marginBottom: 4,
  },
  leaderboardStats: {
    flexDirection: 'row',
    gap: 12,
  },
  leaderboardStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  leaderboardStatLabel: {
    fontSize: 11,
    color: Colors.Colors.text.muted,
  },
  leaderboardScore: {
    alignItems: 'flex-end',
  },
  leaderboardScoreValue: {
    fontSize: 14,
    fontWeight: 'bold' as const,
    color: Colors.Colors.cyan.primary,
  },
  leaderboardScoreLabel: {
    fontSize: 10,
    color: Colors.Colors.text.muted,
  },
});
