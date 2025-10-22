import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Linking,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  X,
  Check,
  Zap,
  Crown,
  Rocket,
  Star,
  Sparkles,
  Layers,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useSubscription } from '@/contexts/SubscriptionContext';



interface PricingTier {
  id: string;
  name: string;
  price: string;
  period: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  features: string[];
  modelOrchestration: string;
  requestsPerMonth: string;
  highlighted?: boolean;
}

export default function PricingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [selectedTier, setSelectedTier] = useState<string>('premium');
  const [checkoutLoading, setCheckoutLoading] = useState<boolean>(false);
  const [errorText, setErrorText] = useState<string>('');
  const { upgradeTier, currentTier, plans } = useSubscription();

  const pricingTiers: PricingTier[] = [
    {
      id: 'free',
      name: 'Free',
      price: '$0',
      period: 'forever',
      description: 'Perfect for trying out the platform',
      icon: <Zap color={Colors.Colors.text.secondary} size={32} />,
      color: Colors.Colors.text.muted,
      modelOrchestration: 'Single Model',
      requestsPerMonth: '100 requests/month',
      features: [
        '1 AI model per request',
        '100 API requests per month',
        'Basic code generation',
        'Community support',
        'Public projects only',
        'Standard response time',
      ],
    },
    {
      id: 'starter',
      name: 'Starter',
      price: '$29',
      period: 'per month',
      description: 'For individual developers',
      icon: <Star color={Colors.Colors.cyan.primary} size={32} />,
      color: Colors.Colors.cyan.primary,
      modelOrchestration: 'Dual Model',
      requestsPerMonth: '1,000 requests/month',
      features: [
        '2 AI models orchestrated',
        '1,000 API requests per month',
        'Advanced code generation',
        'Priority email support',
        'Private projects',
        'Faster response time',
        'Code analysis tools',
        'Git integration',
      ],
    },
    {
      id: 'professional',
      name: 'Professional',
      price: '$99',
      period: 'per month',
      description: 'For professional teams',
      icon: <Rocket color={Colors.Colors.red.primary} size={32} />,
      color: Colors.Colors.red.primary,
      modelOrchestration: 'Tri-Model Orchestration',
      requestsPerMonth: '5,000 requests/month',
      highlighted: true,
      features: [
        '3 AI models orchestrated',
        '5,000 API requests per month',
        'Production-ready code',
        '24/7 priority support',
        'Unlimited private projects',
        'Fastest response time',
        'Advanced analytics',
        'Team collaboration',
        'Custom integrations',
        'Dedicated account manager',
      ],
    },
    {
      id: 'premium',
      name: 'Premium Elite',
      price: '$299',
      period: 'per month',
      description: 'Ultimate power for enterprises',
      icon: <Crown color={Colors.Colors.warning} size={32} />,
      color: Colors.Colors.warning,
      modelOrchestration: '4-Model Orchestration',
      requestsPerMonth: 'Unlimited requests',
      highlighted: true,
      features: [
        '4 AI models orchestrated simultaneously',
        'Unlimited API requests',
        'Enterprise-grade code quality',
        'White-glove support',
        'Unlimited everything',
        'Sub-second response time',
        'Custom model training',
        'On-premise deployment option',
        'SLA guarantees',
        'Custom contract terms',
        'Dedicated infrastructure',
        'Advanced security features',
      ],
    },
  ];

  const handleCheckout = async (tierId: string) => {
    setErrorText('');
    setCheckoutLoading(true);
    try {
      const next = tierId as any;
      await upgradeTier(next);
      if (Platform.OS === 'web') {
        window.location.href = '/';
      } else {
        await Linking.openURL('/');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Checkout failed';
      setErrorText(msg);
      console.error('[Pricing] Checkout error', msg);
    } finally {
      setCheckoutLoading(false);
    }
  };

  const renderPricingCard = (tier: PricingTier) => (
    <TouchableOpacity
      key={tier.id}
      style={[
        styles.pricingCard,
        selectedTier === tier.id && styles.pricingCardSelected,
        tier.highlighted && styles.pricingCardHighlighted,
        { borderColor: tier.color },
      ]}
      onPress={() => setSelectedTier(tier.id)}
    >
      {tier.highlighted && (
        <View style={[styles.popularBadge, { backgroundColor: tier.color }]}>
          <Sparkles color={Colors.Colors.text.inverse} size={14} />
          <Text style={styles.popularText}>MOST POPULAR</Text>
        </View>
      )}

      <View style={styles.cardHeader}>
        <View style={[styles.iconContainer, { backgroundColor: tier.color + '20' }]}>
          {tier.icon}
        </View>
        <Text style={styles.tierName}>{tier.name}</Text>
        <Text style={styles.tierDescription}>{tier.description}</Text>
      </View>

      <View style={styles.priceContainer}>
        <Text style={[styles.price, { color: tier.color }]}>{tier.price}</Text>
        <Text style={styles.period}>/{tier.period}</Text>
      </View>

      <View style={styles.orchestrationBadge}>
        <Layers color={tier.color} size={16} />
        <Text style={[styles.orchestrationText, { color: tier.color }]}>
          {tier.modelOrchestration}
        </Text>
      </View>

      <Text style={styles.requestsText}>{tier.requestsPerMonth}</Text>

      <View style={styles.featuresContainer}>
        {tier.features.map((feature, index) => (
          <View key={index} style={styles.featureRow}>
            <Check color={tier.color} size={16} />
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        testID={`select-plan-${tier.id}`}
        style={[
          styles.selectButton,
          selectedTier === tier.id && { backgroundColor: tier.color },
        ]}
        onPress={() => setSelectedTier(tier.id)}
      >
        <Text
          style={[
            styles.selectButtonText,
            selectedTier === tier.id && styles.selectButtonTextActive,
          ]}
        >
          {selectedTier === tier.id ? 'Selected' : 'Select Plan'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        testID={`checkout-${tier.id}`}
        disabled={checkoutLoading}
        onPress={() => handleCheckout(tier.id)}
        style={[styles.checkoutButton, checkoutLoading && styles.checkoutDisabled, { borderColor: tier.color }]}
      >
        {checkoutLoading ? (
          <ActivityIndicator color={tier.color} />
        ) : (
          <Text style={[styles.checkoutText, { color: tier.color }]}>Upgrade</Text>
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const selectedPlan = useMemo(() => pricingTiers.find(t => t.id === selectedTier), [pricingTiers, selectedTier]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]} testID="pricing-screen">
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <X color={Colors.Colors.text.primary} size={24} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Pricing & Plans</Text>
          <Text style={styles.headerSubtitle}>Choose the perfect plan for your needs</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {errorText ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorTextLabel}>{errorText}</Text>
          </View>
        ) : null}
        <View style={styles.heroSection}>
          <View style={styles.heroIcon}>
            <Layers color={Colors.Colors.cyan.primary} size={48} />
          </View>
          <Text style={styles.heroTitle}>AI Model Orchestration</Text>
          <Text style={styles.heroDescription}>
            Our unique multi-model orchestration system combines the strengths of
            multiple AI models to deliver unmatched code quality and consistency
          </Text>
        </View>

        <View style={styles.pricingGrid}>
          {pricingTiers.map(renderPricingCard)}
        </View>

        <BenefitsGrid />

        {selectedPlan ? (
          <UsagePreview
            tierId={selectedPlan.id}
            requests={selectedPlan.id === 'free' ? '100' : selectedPlan.id === 'starter' ? '1000' : selectedPlan.id === 'professional' ? '5000' : 'Unlimited'}
            models={selectedPlan.id === 'free' ? 1 : selectedPlan.id === 'starter' ? 2 : selectedPlan.id === 'professional' ? 3 : 4}
          />
        ) : null}

        <View style={styles.comparisonSection}>
          <Text style={styles.sectionTitle}>Why Multi-Model Orchestration?</Text>
          <View style={styles.comparisonCard}>
            <View style={styles.comparisonItem}>
              <Text style={styles.comparisonLabel}>Single Model</Text>
              <Text style={styles.comparisonValue}>70-80% accuracy</Text>
              <Text style={styles.comparisonDescription}>
                Limited by one AI&apos;s capabilities and biases
              </Text>
            </View>
            <View style={styles.comparisonDivider} />
            <View style={styles.comparisonItem}>
              <Text style={[styles.comparisonLabel, { color: Colors.Colors.cyan.primary }]}>
                4-Model Orchestration
              </Text>
              <Text style={[styles.comparisonValue, { color: Colors.Colors.cyan.primary }]}>
                95-99% accuracy
              </Text>
              <Text style={styles.comparisonDescription}>
                Combines strengths, eliminates weaknesses, validates output
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.faqSection}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          <View style={styles.faqCard}>
            <Text style={styles.faqQuestion}>What is model orchestration?</Text>
            <Text style={styles.faqAnswer}>
              Model orchestration means using multiple AI models simultaneously to generate
              code. Each model contributes its strengths, and we synthesize the best parts
              into a single, superior output.
            </Text>
          </View>
          <View style={styles.faqCard}>
            <Text style={styles.faqQuestion}>Can I upgrade or downgrade anytime?</Text>
            <Text style={styles.faqAnswer}>
              Yes! You can change your plan at any time. Upgrades take effect immediately,
              and downgrades apply at the start of your next billing cycle.
            </Text>
          </View>
          <View style={styles.faqCard}>
            <Text style={styles.faqQuestion}>What happens if I exceed my request limit?</Text>
            <Text style={styles.faqAnswer}>
              Your requests will be queued until your next billing cycle, or you can
              purchase additional request packs. Premium Elite users have unlimited requests.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function BenefitsGrid() {
  const items = [
    { icon: '⚡', title: 'Faster Results', description: 'Parallel model execution reduces latency' },
    { icon: '🎯', title: 'Higher Accuracy', description: 'Multi-model consensus improves quality' },
    { icon: '🛡️', title: 'Better Safety', description: 'Cross-validation catches harmful content' },
    { icon: '💸', title: 'Cost Optimization', description: 'Use cheaper models for appropriate tasks' },
  ];
  return (
    <View style={benefitStyles.container}>
      {items.map(b => (
        <View key={b.title} style={benefitStyles.card}>
          <Text style={benefitStyles.icon}>{b.icon}</Text>
          <Text style={benefitStyles.title}>{b.title}</Text>
          <Text style={benefitStyles.desc}>{b.description}</Text>
        </View>
      ))}
    </View>
  );
}

type UsagePreviewProps = { tierId: string; requests: string; models: number };
function UsagePreview({ tierId, requests, models }: UsagePreviewProps) {
  return (
    <View style={usageStyles.container}>
      <Text style={usageStyles.title}>Monthly Usage Estimate</Text>
      <View style={usageStyles.row}>
        <Text style={usageStyles.label}>API Requests</Text>
        <Text style={usageStyles.value}>{requests}</Text>
      </View>
      <View style={usageStyles.row}>
        <Text style={usageStyles.label}>Active Models</Text>
        <Text style={usageStyles.value}>Up to {models}</Text>
      </View>
      <View style={usageStyles.row}>
        <Text style={usageStyles.label}>Team Members</Text>
        <Text style={usageStyles.value}>{tierId === 'premium' ? 'Unlimited' : tierId === 'professional' ? '10' : tierId === 'starter' ? '3' : '1'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.Colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.Colors.border.muted,
    gap: 12,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.Colors.text.primary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.Colors.text.muted,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.Colors.cyan.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.Colors.text.primary,
    textAlign: 'center',
    marginBottom: 12,
  },
  heroDescription: {
    fontSize: 16,
    color: Colors.Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  pricingGrid: {
    paddingHorizontal: 20,
    gap: 20,
    marginBottom: 32,
  },
  pricingCard: {
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 16,
    padding: 24,
    borderWidth: 2,
    position: 'relative',
  },
  pricingCardSelected: {
    borderWidth: 3,
  },
  pricingCardHighlighted: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 6,
  },
  popularText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: Colors.Colors.text.inverse,
    letterSpacing: 1,
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  tierName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.Colors.text.primary,
    marginBottom: 8,
  },
  tierDescription: {
    fontSize: 14,
    color: Colors.Colors.text.muted,
    textAlign: 'center',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 16,
  },
  price: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  period: {
    fontSize: 16,
    color: Colors.Colors.text.muted,
    marginLeft: 8,
  },
  orchestrationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: Colors.Colors.background.secondary,
    borderRadius: 20,
    alignSelf: 'center',
    marginBottom: 12,
  },
  orchestrationText: {
    fontSize: 13,
    fontWeight: '600',
  },
  requestsText: {
    fontSize: 14,
    color: Colors.Colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  featuresContainer: {
    gap: 12,
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    color: Colors.Colors.text.secondary,
  },
  selectButton: {
    backgroundColor: Colors.Colors.background.secondary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  selectButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.Colors.text.secondary,
  },
  selectButtonTextActive: {
    color: Colors.Colors.text.inverse,
  },
  checkoutButton: {
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
  },
  checkoutDisabled: {
    opacity: 0.6,
  },
  checkoutText: {
    fontSize: 16,
    fontWeight: '700',
  },
  errorBox: {
    backgroundColor: Colors.Colors.error + '20',
    borderColor: Colors.Colors.error,
    borderWidth: 1,
    marginHorizontal: 20,
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
  },
  errorTextLabel: {
    color: Colors.Colors.error,
    fontSize: 13,
    fontWeight: '600',
  },
  comparisonSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.Colors.text.primary,
    marginBottom: 16,
  },
  comparisonCard: {
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
  },
  comparisonItem: {
    paddingVertical: 16,
  },
  comparisonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.Colors.text.secondary,
    marginBottom: 8,
  },
  comparisonValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  comparisonDescription: {
    fontSize: 14,
    color: Colors.Colors.text.muted,
  },
  comparisonDivider: {
    height: 1,
    backgroundColor: Colors.Colors.border.muted,
    marginVertical: 8,
  },
  faqSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  faqCard: {
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.Colors.text.primary,
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 14,
    color: Colors.Colors.text.secondary,
    lineHeight: 20,
  },
});

const benefitStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginBottom: 24,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    flexBasis: '48%',
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
  },
  icon: {
    fontSize: 20,
    marginBottom: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.Colors.text.primary,
    marginBottom: 4,
  },
  desc: {
    fontSize: 12,
    color: Colors.Colors.text.secondary,
  },
});

const usageStyles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.Colors.text.primary,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  label: {
    fontSize: 12,
    color: Colors.Colors.text.secondary,
  },
  value: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.Colors.text.primary,
  },
});
