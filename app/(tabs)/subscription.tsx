import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Crown,
  Check,
  X,
  Zap,
  Users,
  Shield,
  Sparkles,
  TrendingUp,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { limeWithOutline } from '@/constants/textStyles';
import { useSubscription, SubscriptionTier } from '@/contexts/SubscriptionContext';
import { useAuth } from '@/contexts/AuthContext';
import BrandedHeader from '@/components/BrandedHeader';
import ScreenBackground from '@/components/ScreenBackground';

const { width } = Dimensions.get('window');

export default function SubscriptionScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { plans, currentTier, upgradeTier, currentPlan } = useSubscription();
  const [billingPeriod, setBillingPeriod] = useState<'month' | 'year'>('month');
  const [isUpgrading, setIsUpgrading] = useState<boolean>(false);

  const handleUpgrade = async (tier: SubscriptionTier) => {
    if (tier === currentTier) {
      Alert.alert('Already Subscribed', `You are already on the ${tier} plan.`);
      return;
    }

    if (tier === 'free') {
      Alert.alert('Downgrade', 'Please contact support to downgrade your plan.');
      return;
    }

    Alert.alert(
      'Upgrade Subscription',
      `Upgrade to ${tier.charAt(0).toUpperCase() + tier.slice(1)} plan?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Upgrade',
          onPress: async () => {
            setIsUpgrading(true);
            try {
              await upgradeTier(tier);
              Alert.alert('Success!', `You've been upgraded to ${tier} plan!`);
            } catch (error) {
              Alert.alert('Error', error instanceof Error ? error.message : 'Upgrade failed');
            } finally {
              setIsUpgrading(false);
            }
          },
        },
      ]
    );
  };

  const benefits = [
    {
      icon: Zap,
      title: 'Unlimited AI Power',
      description: 'Access to all AI models including MGA',
    },
    {
      icon: Users,
      title: 'Team Collaboration',
      description: 'Multiple seats for your team',
    },
    {
      icon: Shield,
      title: 'Priority Support',
      description: '24/7 dedicated support team',
    },
    {
      icon: Sparkles,
      title: 'Advanced Features',
      description: 'Custom integrations & white-label',
    },
  ];

  return (
    <ScreenBackground variant="default" showPattern>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Stack.Screen options={{ headerShown: false }} />

        <BrandedHeader
          title="Subscription"
          subtitle="Choose the perfect plan for your needs"
        />

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.currentPlanCard}>
            <View style={styles.currentPlanHeader}>
              <Crown color={Colors.Colors.warning} size={24} />
              <Text style={styles.currentPlanTitle}>Current Plan</Text>
            </View>
            <Text style={styles.currentPlanName}>
              {currentPlan.name}
            </Text>
            <Text style={styles.currentPlanPrice}>
              ${currentPlan.price}/{currentPlan.billingPeriod}
            </Text>
            <View style={styles.currentPlanStats}>
              <View style={styles.currentPlanStat}>
                <Text style={styles.currentPlanStatValue}>{currentPlan.credits}</Text>
                <Text style={styles.currentPlanStatLabel}>Bix Credits</Text>
              </View>
              <View style={styles.currentPlanStat}>
                <Text style={styles.currentPlanStatValue}>
                  {currentTier === 'free' ? '1' : currentTier === 'basic' ? '3' : currentTier === 'pro' ? '10' : '∞'}
                </Text>
                <Text style={styles.currentPlanStatLabel}>Seats</Text>
              </View>
            </View>
          </View>

          <View style={styles.benefitsSection}>
            <Text style={styles.sectionTitle}>Why Upgrade?</Text>
            <View style={styles.benefitsGrid}>
              {benefits.map((benefit, index) => (
                <View key={index} style={styles.benefitCard}>
                  <View style={[styles.benefitIcon, { backgroundColor: Colors.Colors.cyan.primary + '20' }]}>
                    <benefit.icon color={Colors.Colors.cyan.primary} size={24} />
                  </View>
                  <Text style={styles.benefitTitle}>{benefit.title}</Text>
                  <Text style={styles.benefitDescription}>{benefit.description}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.plansSection}>
            <Text style={styles.sectionTitle}>Choose Your Plan</Text>
            
            <View style={styles.billingToggle}>
              <TouchableOpacity
                style={[
                  styles.billingButton,
                  billingPeriod === 'month' && styles.billingButtonActive,
                ]}
                onPress={() => setBillingPeriod('month')}
              >
                <Text
                  style={[
                    styles.billingButtonText,
                    billingPeriod === 'month' && styles.billingButtonTextActive,
                  ]}
                >
                  Monthly
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.billingButton,
                  billingPeriod === 'year' && styles.billingButtonActive,
                ]}
                onPress={() => setBillingPeriod('year')}
              >
                <Text
                  style={[
                    styles.billingButtonText,
                    billingPeriod === 'year' && styles.billingButtonTextActive,
                  ]}
                >
                  Yearly
                </Text>
                <View style={styles.saveBadge}>
                  <Text style={styles.saveBadgeText}>Save 20%</Text>
                </View>
              </TouchableOpacity>
            </View>

            {plans.map(plan => {
              const isCurrentPlan = plan.id === currentTier;
              const price = billingPeriod === 'year' ? Math.round(plan.price * 12 * 0.8) : plan.price;
              
              return (
                <View
                  key={plan.id}
                  style={[
                    styles.planCard,
                    plan.popular && styles.planCardPopular,
                    isCurrentPlan && styles.planCardCurrent,
                  ]}
                >
                  {plan.popular && (
                    <View style={styles.popularBadge}>
                      <TrendingUp color={Colors.Colors.text.inverse} size={14} />
                      <Text style={styles.popularBadgeText}>Most Popular</Text>
                    </View>
                  )}
                  
                  <View style={styles.planHeader}>
                    <Text style={styles.planName}>{plan.name}</Text>
                    <View style={styles.planPriceContainer}>
                      <Text style={styles.planPrice}>${price}</Text>
                      <Text style={styles.planPeriod}>/{billingPeriod}</Text>
                    </View>
                  </View>

                  <View style={styles.planFeatures}>
                    {plan.features.map((feature, index) => (
                      <View key={index} style={styles.planFeature}>
                        {feature.included ? (
                          <Check color={Colors.Colors.success} size={16} />
                        ) : (
                          <X color={Colors.Colors.text.muted} size={16} />
                        )}
                        <Text
                          style={[
                            styles.planFeatureText,
                            !feature.included && styles.planFeatureTextDisabled,
                          ]}
                        >
                          {feature.name}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.planButton,
                      isCurrentPlan && styles.planButtonCurrent,
                      plan.popular && !isCurrentPlan && styles.planButtonPopular,
                    ]}
                    onPress={() => handleUpgrade(plan.id)}
                    disabled={isUpgrading || isCurrentPlan}
                  >
                    <Text
                      style={[
                        styles.planButtonText,
                        (isCurrentPlan || plan.popular) && styles.planButtonTextActive,
                      ]}
                    >
                      {isCurrentPlan ? 'Current Plan' : 'Upgrade Now'}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>

          <View style={styles.faqSection}>
            <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
            <View style={styles.faqCard}>
              <Text style={styles.faqQuestion}>Can I change plans anytime?</Text>
              <Text style={styles.faqAnswer}>
                Yes! You can upgrade your plan at any time. Downgrades take effect at the end of your billing period.
              </Text>
            </View>
            <View style={styles.faqCard}>
              <Text style={styles.faqQuestion}>What are Bix credits?</Text>
              <Text style={styles.faqAnswer}>
                Bix credits are used for AI model requests, app generations, and advanced features. They reset monthly.
              </Text>
            </View>
            <View style={styles.faqCard}>
              <Text style={styles.faqQuestion}>Do unused credits roll over?</Text>
              <Text style={styles.faqAnswer}>
                Pro and Enterprise plans include credit rollover for up to 3 months.
              </Text>
            </View>
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
  currentPlanCard: {
    marginHorizontal: 20,
    marginVertical: 16,
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: Colors.Colors.cyan.primary,
  },
  currentPlanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  currentPlanTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    ...limeWithOutline,
  },
  currentPlanName: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: Colors.Colors.cyan.primary,
    marginBottom: 4,
  },
  currentPlanPrice: {
    fontSize: 16,
    ...limeWithOutline,
    marginBottom: 16,
  },
  currentPlanStats: {
    flexDirection: 'row',
    gap: 24,
  },
  currentPlanStat: {
    flex: 1,
  },
  currentPlanStatValue: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: Colors.Colors.cyan.primary,
    marginBottom: 4,
  },
  currentPlanStatLabel: {
    fontSize: 12,
    color: Colors.Colors.text.muted,
  },
  benefitsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    ...limeWithOutline,
    marginBottom: 16,
  },
  benefitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  benefitCard: {
    width: (width - 52) / 2,
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
  },
  benefitIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  benefitTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    ...limeWithOutline,
    marginBottom: 4,
  },
  benefitDescription: {
    fontSize: 12,
    color: Colors.Colors.text.muted,
    lineHeight: 16,
  },
  plansSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  billingToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 8,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
  },
  billingButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  billingButtonActive: {
    backgroundColor: Colors.Colors.cyan.primary,
  },
  billingButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    ...limeWithOutline,
  },
  billingButtonTextActive: {
    color: Colors.Colors.text.inverse,
  },
  saveBadge: {
    backgroundColor: Colors.Colors.success,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  saveBadgeText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.Colors.text.inverse,
  },
  planCard: {
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: Colors.Colors.border.muted,
  },
  planCardPopular: {
    borderColor: Colors.Colors.cyan.primary,
  },
  planCardCurrent: {
    borderColor: Colors.Colors.success,
  },
  popularBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: Colors.Colors.cyan.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
    marginBottom: 16,
  },
  popularBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.Colors.text.inverse,
  },
  planHeader: {
    marginBottom: 20,
  },
  planName: {
    fontSize: 22,
    fontWeight: 'bold' as const,
    color: Colors.Colors.cyan.primary,
    marginBottom: 8,
  },
  planPriceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  planPrice: {
    fontSize: 32,
    fontWeight: 'bold' as const,
    ...limeWithOutline,
  },
  planPeriod: {
    fontSize: 16,
    color: Colors.Colors.text.muted,
    marginLeft: 4,
  },
  planFeatures: {
    marginBottom: 20,
    gap: 12,
  },
  planFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  planFeatureText: {
    fontSize: 14,
    ...limeWithOutline,
  },
  planFeatureTextDisabled: {
    color: Colors.Colors.text.muted,
  },
  planButton: {
    backgroundColor: Colors.Colors.background.secondary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
  },
  planButtonPopular: {
    backgroundColor: Colors.Colors.cyan.primary,
    borderColor: Colors.Colors.cyan.primary,
  },
  planButtonCurrent: {
    backgroundColor: Colors.Colors.success + '20',
    borderColor: Colors.Colors.success,
  },
  planButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    ...limeWithOutline,
  },
  planButtonTextActive: {
    color: Colors.Colors.text.inverse,
  },
  faqSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  faqCard: {
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
  },
  faqQuestion: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.Colors.cyan.primary,
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 13,
    ...limeWithOutline,
    lineHeight: 20,
  },
});
