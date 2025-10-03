import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import {
  Zap,
  Sparkles,
  Crown,
  Rocket,
  Check,
  X,
  Info,
  TrendingUp,
} from 'lucide-react-native';
import Colors from '@/constants/colors';

interface Tier {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  price: string;
  models: number;
  description: string;
  features: string[];
  limitations: string[];
  requestsPerDay: string;
  responseTime: string;
  quality: string;
}

const TIERS: Tier[] = [
  {
    id: 'basic',
    name: 'Basic',
    icon: <Zap size={32} />,
    color: Colors.Colors.text.muted,
    price: 'Free',
    models: 1,
    description: 'Single AI model for basic code generation',
    features: [
      'Single AI model',
      '100 requests/day',
      'Basic code generation',
      'Standard response time',
      'Community support',
    ],
    limitations: [
      'No model orchestration',
      'Limited quality checks',
      'Basic error handling',
    ],
    requestsPerDay: '100',
    responseTime: '~5s',
    quality: '70%',
  },
  {
    id: 'pro',
    name: 'Pro',
    icon: <Sparkles size={32} />,
    color: Colors.Colors.cyan.primary,
    price: '$29/mo',
    models: 2,
    description: 'Dual-model orchestration for improved quality',
    features: [
      '2 AI models working together',
      '500 requests/day',
      'Quality comparison & selection',
      'Fast response time',
      'Priority support',
      'Advanced error handling',
    ],
    limitations: [
      'Limited to 2 models',
      'Standard quality scoring',
    ],
    requestsPerDay: '500',
    responseTime: '~3s',
    quality: '85%',
  },
  {
    id: 'premium',
    name: 'Premium',
    icon: <Crown size={32} />,
    color: Colors.Colors.warning,
    price: '$79/mo',
    models: 3,
    description: 'Tri-model orchestration for exceptional results',
    features: [
      '3 AI models competing',
      '2000 requests/day',
      'Advanced quality scoring',
      'Fastest response time',
      'Dedicated support',
      'Custom model selection',
      'Detailed analytics',
    ],
    limitations: [
      'Limited to 3 models',
    ],
    requestsPerDay: '2000',
    responseTime: '~2s',
    quality: '92%',
  },
  {
    id: 'ultimate',
    name: 'Ultimate',
    icon: <Rocket size={32} />,
    color: Colors.Colors.red.primary,
    price: '$199/mo',
    models: 4,
    description: 'Quad-model orchestration for unmatched quality',
    features: [
      '4 AI models competing',
      'Unlimited requests',
      'Advanced quality scoring',
      'Instant response time',
      '24/7 premium support',
      'Custom model configuration',
      'Real-time analytics',
      'API access',
      'White-label options',
    ],
    limitations: [],
    requestsPerDay: 'Unlimited',
    responseTime: '~1s',
    quality: '98%',
  },
];

export default function OrchestrationScreen() {
  const insets = useSafeAreaInsets();
  const [selectedTier, setSelectedTier] = useState<string>('basic');
  const [testPrompt, setTestPrompt] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const handleSelectTier = (tierId: string) => {
    setSelectedTier(tierId);
    const tier = TIERS.find(t => t.id === tierId);
    if (tier) {
      Alert.alert(
        `${tier.name} Tier Selected`,
        `You've selected the ${tier.name} tier with ${tier.models} AI model${tier.models > 1 ? 's' : ''}.\n\n${tier.description}\n\nPrice: ${tier.price}`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade', onPress: () => handleUpgrade(tierId) },
        ]
      );
    }
  };

  const handleUpgrade = (tierId: string) => {
    const tier = TIERS.find(t => t.id === tierId);
    if (tier) {
      Alert.alert(
        'Upgrade',
        `Upgrade to ${tier.name} tier for ${tier.price}?\n\nThis is a demo. In production, this would redirect to payment.`,
        [{ text: 'OK' }]
      );
    }
  };

  const handleTestGeneration = async () => {
    if (!testPrompt.trim()) {
      Alert.alert('Error', 'Please enter a test prompt');
      return;
    }

    setIsGenerating(true);
    const tier = TIERS.find(t => t.id === selectedTier);

    setTimeout(() => {
      setIsGenerating(false);
      Alert.alert(
        'Generation Complete',
        `Using ${tier?.name} tier with ${tier?.models} model${tier && tier.models > 1 ? 's' : ''}:\n\nQuality Score: ${tier?.quality}\nResponse Time: ${tier?.responseTime}\n\nIn production, this would generate code using ${tier?.models} AI model${tier && tier.models > 1 ? 's' : ''} and select the best result.`,
        [{ text: 'OK' }]
      );
    }, parseInt(tier?.responseTime.replace('~', '').replace('s', '') || '1') * 1000);
  };

  const renderTierCard = (tier: Tier) => {
    const isSelected = selectedTier === tier.id;

    return (
      <TouchableOpacity
        key={tier.id}
        style={[
          styles.tierCard,
          isSelected && styles.tierCardSelected,
          { borderColor: tier.color },
        ]}
        onPress={() => handleSelectTier(tier.id)}
      >
        <View style={[styles.tierHeader, { backgroundColor: tier.color + '20' }]}>
          <View style={[styles.tierIcon, { backgroundColor: tier.color }]}>
            {tier.icon}
          </View>
          <View style={styles.tierHeaderText}>
            <Text style={styles.tierName}>{tier.name}</Text>
            <Text style={styles.tierPrice}>{tier.price}</Text>
          </View>
          {isSelected && (
            <View style={styles.selectedBadge}>
              <Check color={Colors.Colors.text.inverse} size={16} />
            </View>
          )}
        </View>

        <View style={styles.tierBody}>
          <View style={styles.modelsBadge}>
            <TrendingUp color={tier.color} size={16} />
            <Text style={[styles.modelsText, { color: tier.color }]}>
              {tier.models} Model{tier.models > 1 ? 's' : ''}
            </Text>
          </View>

          <Text style={styles.tierDescription}>{tier.description}</Text>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Requests/Day</Text>
              <Text style={styles.statValue}>{tier.requestsPerDay}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Response Time</Text>
              <Text style={styles.statValue}>{tier.responseTime}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Quality</Text>
              <Text style={styles.statValue}>{tier.quality}</Text>
            </View>
          </View>

          <View style={styles.featuresContainer}>
            <Text style={styles.featuresTitle}>Features</Text>
            {tier.features.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <Check color={Colors.Colors.success} size={14} />
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>

          {tier.limitations.length > 0 && (
            <View style={styles.limitationsContainer}>
              <Text style={styles.limitationsTitle}>Limitations</Text>
              {tier.limitations.map((limitation, index) => (
                <View key={index} style={styles.limitationItem}>
                  <X color={Colors.Colors.error} size={14} />
                  <Text style={styles.limitationText}>{limitation}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.selectButton,
            isSelected && styles.selectButtonSelected,
            { backgroundColor: tier.color },
          ]}
          onPress={() => handleSelectTier(tier.id)}
        >
          <Text style={styles.selectButtonText}>
            {isSelected ? 'Current Plan' : 'Select Plan'}
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen
        options={{
          title: 'AI Orchestration',
          headerShown: true,
          headerStyle: {
            backgroundColor: Colors.Colors.background.primary,
          },
          headerTintColor: Colors.Colors.text.primary,
        }}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Sparkles color={Colors.Colors.cyan.primary} size={40} />
          </View>
          <Text style={styles.headerTitle}>Multi-Model AI Orchestration</Text>
          <Text style={styles.headerSubtitle}>
            Harness the power of multiple AI models working together to produce
            outstanding quality and consistency
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Info color={Colors.Colors.cyan.primary} size={20} />
          <Text style={styles.infoText}>
            Our orchestration system runs your request through multiple AI models
            simultaneously, scores each result, and delivers the best output.
            Higher tiers use more models for better results.
          </Text>
        </View>

        <View style={styles.tiersContainer}>
          {TIERS.map(tier => renderTierCard(tier))}
        </View>

        <View style={styles.testSection}>
          <Text style={styles.testTitle}>Test Generation</Text>
          <Text style={styles.testSubtitle}>
            Try generating code with your selected tier
          </Text>

          <TextInput
            style={styles.testInput}
            value={testPrompt}
            onChangeText={setTestPrompt}
            placeholder="Enter a code generation prompt..."
            placeholderTextColor={Colors.Colors.text.muted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[
              styles.testButton,
              isGenerating && styles.testButtonDisabled,
            ]}
            onPress={handleTestGeneration}
            disabled={isGenerating}
          >
            <Zap color={Colors.Colors.text.inverse} size={20} />
            <Text style={styles.testButtonText}>
              {isGenerating ? 'Generating...' : 'Test Generation'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.Colors.background.primary,
  },
  content: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  headerIcon: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.Colors.text.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 24,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: Colors.Colors.text.secondary,
    lineHeight: 18,
  },
  tiersContainer: {
    paddingHorizontal: 20,
    gap: 16,
    marginBottom: 24,
  },
  tierCard: {
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 16,
    borderWidth: 2,
    overflow: 'hidden',
  },
  tierCardSelected: {
    borderWidth: 3,
  },
  tierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  tierIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierHeaderText: {
    flex: 1,
  },
  tierName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.Colors.text.primary,
    marginBottom: 4,
  },
  tierPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.Colors.text.secondary,
  },
  selectedBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierBody: {
    padding: 16,
  },
  modelsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: Colors.Colors.background.secondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    marginBottom: 12,
  },
  modelsText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tierDescription: {
    fontSize: 14,
    color: Colors.Colors.text.secondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.Colors.border.muted,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: Colors.Colors.text.muted,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.Colors.text.primary,
  },
  featuresContainer: {
    marginBottom: 12,
  },
  featuresTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.Colors.text.primary,
    marginBottom: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  featureText: {
    fontSize: 13,
    color: Colors.Colors.text.secondary,
  },
  limitationsContainer: {
    marginTop: 8,
  },
  limitationsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.Colors.text.primary,
    marginBottom: 8,
  },
  limitationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  limitationText: {
    fontSize: 13,
    color: Colors.Colors.text.muted,
  },
  selectButton: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectButtonSelected: {
    opacity: 0.8,
  },
  selectButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.Colors.text.inverse,
  },
  testSection: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  testTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.Colors.text.primary,
    marginBottom: 4,
  },
  testSubtitle: {
    fontSize: 14,
    color: Colors.Colors.text.secondary,
    marginBottom: 16,
  },
  testInput: {
    backgroundColor: Colors.Colors.background.card,
    borderColor: Colors.Colors.border.muted,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: Colors.Colors.text.primary,
    fontSize: 14,
    marginBottom: 16,
    minHeight: 100,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.Colors.cyan.primary,
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  testButtonDisabled: {
    opacity: 0.6,
  },
  testButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.Colors.text.inverse,
  },
});
