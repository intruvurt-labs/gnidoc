import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Sparkles, Download, Share2, Star } from 'lucide-react-native';
import Colors, { Shadows } from '@/constants/colors';
import MatrixGridBackground from '@/components/MatrixGridBackground';

const { width } = Dimensions.get('window');

interface Template {
  id: string;
  title: string;
  description: string;
  category: string;
  downloads: number;
  rating: number;
}

export default function HubScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [selectedFilter, setSelectedFilter] = useState<string>('Trending');

  const filters = ['Trending', 'New', 'Templates', 'Yours'];

  const templates: Template[] = [
    {
      id: '1',
      title: 'E-Commerce Starter',
      description: 'Full-featured e-commerce app with cart and checkout',
      category: 'Business',
      downloads: 1234,
      rating: 4.8,
    },
    {
      id: '2',
      title: 'Social Media Feed',
      description: 'Instagram-like feed with stories and posts',
      category: 'Social',
      downloads: 2341,
      rating: 4.9,
    },
    {
      id: '3',
      title: 'Fitness Tracker',
      description: 'Track workouts, nutrition, and progress',
      category: 'Health',
      downloads: 987,
      rating: 4.7,
    },
    {
      id: '4',
      title: 'Chat Application',
      description: 'Real-time messaging with groups and media',
      category: 'Communication',
      downloads: 3456,
      rating: 4.9,
    },
    {
      id: '5',
      title: 'Task Manager',
      description: 'Organize tasks with projects and deadlines',
      category: 'Productivity',
      downloads: 1567,
      rating: 4.6,
    },
    {
      id: '6',
      title: 'Recipe Book',
      description: 'Browse and save your favorite recipes',
      category: 'Food',
      downloads: 876,
      rating: 4.5,
    },
  ];

  const handleRemix = (templateId: string) => {
    console.log('Remixing template:', templateId);
    router.push('/app-generator' as any);
  };

  const handleExport = (templateId: string) => {
    console.log('Exporting template:', templateId);
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
          <Sparkles color={Colors.Colors.lime.primary} size={24} />
          <View>
            <Text style={styles.headerTitle}>Creator Hub</Text>
            <Text style={styles.headerSubtitle}>Remix, Share, Export</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.featuredSection}>
          <Text style={styles.sectionTitle}>Featured Template</Text>
          <TouchableOpacity
            style={styles.featuredCard}
            onPress={() => handleRemix('featured')}
          >
            <View style={styles.featuredBadge}>
              <Star color={Colors.Colors.yellow.primary} size={16} fill={Colors.Colors.yellow.primary} />
              <Text style={styles.featuredBadgeText}>FEATURED</Text>
            </View>
            <Text style={styles.featuredTitle}>AI-Powered Dashboard</Text>
            <Text style={styles.featuredDescription}>
              Complete analytics dashboard with AI insights and real-time data visualization
            </Text>
            <View style={styles.featuredActions}>
              <TouchableOpacity style={styles.remixButton}>
                <Text style={styles.remixButtonText}>Remix</Text>
              </TouchableOpacity>
              <View style={styles.featuredStats}>
                <Text style={styles.featuredStat}>⭐ 4.9</Text>
                <Text style={styles.featuredStat}>↓ 5.2K</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.filtersSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filters}
          >
            {filters.map((filter) => (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.filterChip,
                  selectedFilter === filter && styles.filterChipActive,
                ]}
                onPress={() => setSelectedFilter(filter)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedFilter === filter && styles.filterChipTextActive,
                  ]}
                >
                  {filter}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.templatesSection}>
          <Text style={styles.sectionTitle}>Templates</Text>
          <View style={styles.templatesGrid}>
            {templates.map((template) => (
              <View key={template.id} style={styles.templateCard}>
                <View style={styles.templateHeader}>
                  <Text style={styles.templateTitle}>{template.title}</Text>
                  <View style={styles.templateRating}>
                    <Star color={Colors.Colors.yellow.primary} size={14} fill={Colors.Colors.yellow.primary} />
                    <Text style={styles.ratingText}>{template.rating}</Text>
                  </View>
                </View>
                <Text style={styles.templateDescription}>{template.description}</Text>
                <View style={styles.templateFooter}>
                  <Text style={styles.templateCategory}>{template.category}</Text>
                  <Text style={styles.templateDownloads}>↓ {template.downloads}</Text>
                </View>
                <View style={styles.templateActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleRemix(template.id)}
                  >
                    <Sparkles color={Colors.Colors.cyan.primary} size={16} />
                    <Text style={styles.actionButtonText}>Remix</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButtonSecondary}
                    onPress={() => handleExport(template.id)}
                  >
                    <Download color={Colors.Colors.lime.primary} size={16} />
                    <Text style={styles.actionButtonTextSecondary}>Export</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.Colors.black.primary,
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
  headerSubtitle: {
    fontSize: 12,
    color: Colors.Colors.yellow.primary,
  },
  content: {
    flex: 1,
  },
  featuredSection: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.Colors.lime.primary,
    marginBottom: 16,
  },
  featuredCard: {
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 20,
    padding: 24,
    borderWidth: 3,
    borderColor: Colors.Colors.lime.primary,
    ...Shadows.glowLime,
    position: 'relative',
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.Colors.yellow.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  featuredBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.Colors.yellow.primary,
  },
  featuredTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.Colors.cyan.primary,
    marginBottom: 8,
  },
  featuredDescription: {
    fontSize: 14,
    color: Colors.Colors.text.primary,
    lineHeight: 20,
    marginBottom: 16,
  },
  featuredActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  remixButton: {
    backgroundColor: Colors.Colors.lime.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  remixButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.Colors.text.inverse,
  },
  featuredStats: {
    flexDirection: 'row',
    gap: 16,
  },
  featuredStat: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.Colors.text.primary,
  },
  filtersSection: {
    paddingVertical: 16,
  },
  filters: {
    paddingHorizontal: 20,
  },
  filterChip: {
    backgroundColor: Colors.Colors.background.card,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 2,
    borderColor: Colors.Colors.border.muted,
  },
  filterChipActive: {
    backgroundColor: Colors.Colors.lime.primary,
    borderColor: Colors.Colors.lime.primary,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.Colors.text.primary,
  },
  filterChipTextActive: {
    color: Colors.Colors.text.inverse,
  },
  templatesSection: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  templatesGrid: {
    gap: 16,
  },
  templateCard: {
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: Colors.Colors.cyan.primary,
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  templateTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.Colors.cyan.primary,
    flex: 1,
  },
  templateRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.Colors.yellow.primary,
  },
  templateDescription: {
    fontSize: 14,
    color: Colors.Colors.text.primary,
    lineHeight: 20,
    marginBottom: 12,
  },
  templateFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  templateCategory: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.Colors.lime.primary,
    backgroundColor: Colors.Colors.lime.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  templateDownloads: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.Colors.text.muted,
  },
  templateActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.Colors.cyan.primary,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.Colors.text.inverse,
  },
  actionButtonSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.Colors.background.secondary,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
    borderWidth: 2,
    borderColor: Colors.Colors.lime.primary,
  },
  actionButtonTextSecondary: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.Colors.lime.primary,
  },
});
