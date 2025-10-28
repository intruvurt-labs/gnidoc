import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Alert,
} from 'react-native';
import { setStringAsync } from 'expo-clipboard';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Gift,
  Copy,
  Share2,
  Users,
  CheckCircle,
  Clock,
  Sparkles,
  TrendingUp,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { cyanWithOutline } from '@/constants/textStyles';
import { useGamification } from '@/contexts/GamificationContext';
import BrandedHeader from '@/components/BrandedHeader';
import ScreenBackground from '@/components/ScreenBackground';

export default function ReferralsScreen() {
  const insets = useSafeAreaInsets();

  const { referralCode, referrals } = useGamification();
  const [copied, setCopied] = useState<boolean>(false);

  const referralLink = `https://gnidoc-terces.app/ref/${referralCode}`;

  const handleCopyCode = async () => {
    await setStringAsync(referralCode);
    setCopied(true);
    Alert.alert('Copied!', 'Referral code copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLink = async () => {
    await setStringAsync(referralLink);
    Alert.alert('Copied!', 'Referral link copied to clipboard');
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join me on gnidoC TerceS - The AI-powered app builder! Use my referral code ${referralCode} to get 100 bonus Bix credits. ${referralLink}`,
        title: 'Join gnidoC TerceS',
      });
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  const totalEarned = referrals.reduce((sum, ref) => sum + ref.creditsEarned, 0);
  const completedReferrals = referrals.filter(r => r.status === 'completed').length;
  const pendingReferrals = referrals.filter(r => r.status === 'pending').length;

  const rewards = [
    {
      id: '1',
      referrals: 1,
      reward: 500,
      icon: '🎯',
      title: 'First Referral',
      description: 'Earn 500 Bix credits',
    },
    {
      id: '2',
      referrals: 5,
      reward: 3000,
      icon: '⚡',
      title: 'Power Referrer',
      description: 'Earn 3000 Bix credits',
    },
    {
      id: '3',
      referrals: 10,
      reward: 7500,
      icon: '🔥',
      title: 'Referral Master',
      description: 'Earn 7500 Bix credits',
    },
    {
      id: '4',
      referrals: 25,
      reward: 20000,
      icon: '👑',
      title: 'Referral King',
      description: 'Earn 20000 Bix credits',
    },
  ];

  return (
    <ScreenBackground variant="default" showPattern>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Stack.Screen options={{ headerShown: false }} />

        <BrandedHeader
          title="Referrals"
          subtitle="Earn Bix credits by inviting friends"
        />

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.statsSection}>
            <View style={styles.statCard}>
              <Gift color={Colors.Colors.cyan.primary} size={32} />
              <Text style={styles.statValue}>{totalEarned}</Text>
              <Text style={styles.statLabel}>Credits Earned</Text>
            </View>
            <View style={styles.statCard}>
              <Users color={Colors.Colors.success} size={32} />
              <Text style={styles.statValue}>{completedReferrals}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            <View style={styles.statCard}>
              <Clock color={Colors.Colors.warning} size={32} />
              <Text style={styles.statValue}>{pendingReferrals}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
          </View>

          <View style={styles.referralCodeSection}>
            <View style={styles.referralCodeHeader}>
              <Sparkles color={Colors.Colors.cyan.primary} size={24} />
              <Text style={styles.sectionTitle}>Your Referral Code</Text>
            </View>
            
            <View style={styles.referralCodeCard}>
              <Text style={styles.referralCode}>{referralCode}</Text>
              <TouchableOpacity
                style={styles.copyButton}
                onPress={handleCopyCode}
              >
                {copied ? (
                  <CheckCircle color={Colors.Colors.success} size={20} />
                ) : (
                  <Copy color={Colors.Colors.cyan.primary} size={20} />
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.referralLinkCard}>
              <Text style={styles.referralLinkLabel}>Referral Link</Text>
              <Text style={styles.referralLink} numberOfLines={1}>
                {referralLink}
              </Text>
              <View style={styles.referralActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleCopyLink}
                >
                  <Copy color={Colors.Colors.cyan.primary} size={18} />
                  <Text style={styles.actionButtonText}>Copy Link</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.actionButtonPrimary]}
                  onPress={handleShare}
                >
                  <Share2 color={Colors.Colors.text.inverse} size={18} />
                  <Text style={[styles.actionButtonText, styles.actionButtonTextPrimary]}>
                    Share
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.howItWorksSection}>
            <Text style={styles.sectionTitle}>How It Works</Text>
            <View style={styles.stepCard}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Share Your Code</Text>
                <Text style={styles.stepDescription}>
                  Send your referral code or link to friends
                </Text>
              </View>
            </View>
            <View style={styles.stepCard}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>They Sign Up</Text>
                <Text style={styles.stepDescription}>
                  Your friend creates an account using your code
                </Text>
              </View>
            </View>
            <View style={styles.stepCard}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Earn Rewards</Text>
                <Text style={styles.stepDescription}>
                  Get 500 Bix credits when they complete their first build
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.rewardsSection}>
            <View style={styles.rewardsSectionHeader}>
              <TrendingUp color={Colors.Colors.cyan.primary} size={24} />
              <Text style={styles.sectionTitle}>Milestone Rewards</Text>
            </View>
            {rewards.map(reward => {
              const isUnlocked = completedReferrals >= reward.referrals;
              return (
                <View
                  key={reward.id}
                  style={[
                    styles.rewardCard,
                    isUnlocked && styles.rewardCardUnlocked,
                  ]}
                >
                  <View style={styles.rewardIcon}>
                    <Text style={styles.rewardIconText}>{reward.icon}</Text>
                  </View>
                  <View style={styles.rewardContent}>
                    <Text style={styles.rewardTitle}>{reward.title}</Text>
                    <Text style={styles.rewardDescription}>{reward.description}</Text>
                    <View style={styles.rewardProgress}>
                      <View style={styles.rewardProgressBar}>
                        <View
                          style={[
                            styles.rewardProgressFill,
                            {
                              width: `${Math.min((completedReferrals / reward.referrals) * 100, 100)}%`,
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.rewardProgressText}>
                        {completedReferrals}/{reward.referrals}
                      </Text>
                    </View>
                  </View>
                  {isUnlocked && (
                    <CheckCircle color={Colors.Colors.success} size={24} />
                  )}
                </View>
              );
            })}
          </View>

          {referrals.length > 0 && (
            <View style={styles.referralsList}>
              <Text style={styles.sectionTitle}>Your Referrals</Text>
              {referrals.map(referral => (
                <View key={referral.id} style={styles.referralCard}>
                  <View style={styles.referralAvatar}>
                    <Text style={styles.referralAvatarText}>
                      {referral.referredName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.referralInfo}>
                    <Text style={styles.referralName}>{referral.referredName}</Text>
                    <Text style={styles.referralEmail}>{referral.referredEmail}</Text>
                    <Text style={styles.referralDate}>
                      {new Date(referral.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.referralStatus}>
                    {referral.status === 'completed' ? (
                      <>
                        <CheckCircle color={Colors.Colors.success} size={20} />
                        <Text style={styles.referralCredits}>
                          +{referral.creditsEarned}
                        </Text>
                      </>
                    ) : (
                      <>
                        <Clock color={Colors.Colors.warning} size={20} />
                        <Text style={styles.referralPending}>Pending</Text>
                      </>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}

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
  statsSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: Colors.Colors.cyan.primary,
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.Colors.text.muted,
    textAlign: 'center',
  },
  referralCodeSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  referralCodeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    ...cyanWithOutline,
  },
  referralCodeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: Colors.Colors.cyan.primary,
    gap: 16,
  },
  referralCode: {
    flex: 1,
    fontSize: 28,
    fontWeight: 'bold' as const,
    color: Colors.Colors.cyan.primary,
    letterSpacing: 4,
  },
  copyButton: {
    padding: 8,
  },
  referralLinkCard: {
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
  },
  referralLinkLabel: {
    fontSize: 12,
    color: Colors.Colors.text.muted,
    marginBottom: 8,
  },
  referralLink: {
    fontSize: 14,
    ...cyanWithOutline,
    marginBottom: 16,
  },
  referralActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: Colors.Colors.background.secondary,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
    gap: 8,
  },
  actionButtonPrimary: {
    backgroundColor: Colors.Colors.cyan.primary,
    borderColor: Colors.Colors.cyan.primary,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    ...cyanWithOutline,
  },
  actionButtonTextPrimary: {
    color: Colors.Colors.text.inverse,
  },
  howItWorksSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  stepCard: {
    flexDirection: 'row',
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
    gap: 16,
  },
  stepNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.Colors.cyan.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: Colors.Colors.cyan.primary,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    ...cyanWithOutline,
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 13,
    color: Colors.Colors.text.muted,
    lineHeight: 18,
  },
  rewardsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  rewardsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  rewardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
    gap: 12,
  },
  rewardCardUnlocked: {
    borderColor: Colors.Colors.success,
    backgroundColor: Colors.Colors.success + '10',
  },
  rewardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rewardIconText: {
    fontSize: 24,
  },
  rewardContent: {
    flex: 1,
  },
  rewardTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    ...cyanWithOutline,
    marginBottom: 4,
  },
  rewardDescription: {
    fontSize: 12,
    color: Colors.Colors.text.muted,
    marginBottom: 8,
  },
  rewardProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rewardProgressBar: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.Colors.background.secondary,
    borderRadius: 3,
    overflow: 'hidden',
  },
  rewardProgressFill: {
    height: '100%',
    backgroundColor: Colors.Colors.cyan.primary,
    borderRadius: 3,
  },
  rewardProgressText: {
    fontSize: 11,
    color: Colors.Colors.text.muted,
    fontWeight: '600' as const,
  },
  referralsList: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  referralCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
    gap: 12,
  },
  referralAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.Colors.cyan.primary + '40',
    justifyContent: 'center',
    alignItems: 'center',
  },
  referralAvatarText: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: Colors.Colors.cyan.primary,
  },
  referralInfo: {
    flex: 1,
  },
  referralName: {
    fontSize: 14,
    fontWeight: '600' as const,
    ...cyanWithOutline,
    marginBottom: 2,
  },
  referralEmail: {
    fontSize: 12,
    color: Colors.Colors.text.muted,
    marginBottom: 2,
  },
  referralDate: {
    fontSize: 11,
    color: Colors.Colors.text.muted,
  },
  referralStatus: {
    alignItems: 'center',
    gap: 4,
  },
  referralCredits: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.Colors.success,
  },
  referralPending: {
    fontSize: 11,
    color: Colors.Colors.warning,
  },
});
