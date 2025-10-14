import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import {
  ExternalLink,
  Globe,
  Mail,
  MessageCircle,
  Code,
  Zap,
  Shield,
} from 'lucide-react-native';
import Colors from '@/constants/colors';

type IconEl = React.ReactElement;

interface ProjectLink {
  name: string;
  url: string;
  description: string;
  icon: IconEl;
}

interface SocialLink {
  platform: string;
  handle: string;
  url: string;
  icon: IconEl;
}

export default function AboutScreen() {
  const insets = useSafeAreaInsets();

  // 🚫 The web/Tailwind resume app that was embedded here has been removed.
  // If you want that resume in-app, we can render a Markdown/HTML version or link out.

  const projects: ProjectLink[] = [
    {
      name: 'nimrev.xyz',
      url: 'https://nimrev.xyz',
      description: 'Advanced blockchain analytics and DeFi tools',
      icon: <Code color={Colors.Colors.cyan.primary} size={20} />,
    },
    {
      name: 'aurebix.pro',
      url: 'https://aurebix.pro',
      description: 'Professional cloud infrastructure solutions',
      icon: <Globe color={Colors.Colors.red.primary} size={20} />,
    },
    {
      name: 'linklocker.space',
      url: 'https://linklocker.space',
      description: 'Secure link management and sharing platform',
      icon: <Shield color={Colors.Colors.success} size={20} />,
    },
    {
      name: 'gritdex.online',
      url: 'https://gritdex.online',
      description: 'Decentralized exchange with advanced trading features',
      icon: <Zap color={Colors.Colors.warning} size={20} />,
    },
    {
      name: 'odinary.xyz',
      url: 'https://odinary.xyz',
      description: 'Next-generation digital asset management',
      icon: <Code color={Colors.Colors.cyan.primary} size={20} />,
    },
  ];

  const socialLinks: SocialLink[] = [
    {
      platform: 'X (Twitter)',
      handle: '@dobleduche',
      url: 'https://x.com/dobleduche',
      icon: <ExternalLink color={Colors.Colors.text.muted} size={16} />,
    },
    {
      platform: 'X (Twitter)',
      handle: '@aurebix',
      url: 'https://x.com/aurebix',
      icon: <ExternalLink color={Colors.Colors.text.muted} size={16} />,
    },
    {
      platform: 'Telegram',
      handle: '@nimrevxyz',
      url: 'https://t.me/nimrevxyz',
      icon: <MessageCircle color={Colors.Colors.text.muted} size={16} />,
    },
    {
      platform: 'Telegram',
      handle: '@odinarychat',
      url: 'https://t.me/odinarychat',
      icon: <MessageCircle color={Colors.Colors.text.muted} size={16} />,
    },
  ];

  const handleLinkPress = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) await Linking.openURL(url);
    } catch (err) {
      console.error('[About] openURL failed:', err);
    }
  };

  const handleContactPress = async () => {
    const to = encodeURIComponent('support@intruvurt.space');
    const subject = encodeURIComponent('gnidoC Terces Support Request');
    const body = encodeURIComponent(
      'Hello Support Team,\n\nI need help with:\n\n'
    );
    const url = `mailto:${to}?subject=${subject}&body=${body}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) await Linking.openURL(url);
    } catch (err) {
      console.error('[About] mailto failed:', err);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen
        options={{
          title: 'About',
          headerStyle: { backgroundColor: Colors.Colors.background.primary },
          headerTintColor: Colors.Colors.text.primary,
          headerTitleStyle: { color: Colors.Colors.text.primary },
        }}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* App Info */}
        <View style={styles.appSection}>
          <View style={styles.logoContainer}>
            <Image
              source={{
                uri:
                  'https://r2-pub.rork.com/generated-images/d28a4e8c-8bf7-4039-b4cd-9114de432ab2.png',
              }}
              style={styles.logo}
              resizeMode="contain"
            />
            <View>
              <Text style={styles.appTitle}>gnidoC Terces</Text>
              <Text style={styles.appSubtitle}>Master Coding Agent</Text>
            </View>
          </View>

          <Text style={styles.description}>
            A professional mobile development environment powered by AI. Build,
            analyze, and deploy React Native applications with advanced code
            generation, real-time analysis, and comprehensive dev tools.
          </Text>

          <View style={styles.versionInfo}>
            <Text style={styles.versionText}>Version 1.0.0</Text>
            <Text style={styles.buildText}>Build 2024.10.02</Text>
          </View>
        </View>

        {/* Company Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Development & Holdings</Text>
          <View style={styles.companyCard}>
            <Text style={styles.companyName}>intruvurt.space</Text>
            <Text style={styles.companyDescription}>
              Leading development and holdings company specializing in
              blockchain technology, cloud infrastructure, and advanced web
              applications.
            </Text>
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => handleLinkPress('https://intruvurt.space')}
            >
              <Globe color={Colors.Colors.cyan.primary} size={16} />
              <Text style={styles.linkButtonText}>Visit Website</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Other Projects */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Other Projects</Text>
          {projects.map((project, idx) => (
            <TouchableOpacity
              key={project.url + idx}
              style={styles.projectCard}
              onPress={() => handleLinkPress(project.url)}
            >
              <View style={styles.projectHeader}>
                {project.icon}
                <Text style={styles.projectName}>{project.name}</Text>
                <ExternalLink color={Colors.Colors.text.muted} size={16} />
              </View>
              <Text style={styles.projectDescription}>
                {project.description}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Social Links */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connect With Us</Text>
          {socialLinks.map((social, idx) => (
            <TouchableOpacity
              key={social.url + idx}
              style={styles.socialCard}
              onPress={() => handleLinkPress(social.url)}
            >
              <View style={styles.socialInfo}>
                {social.icon}
                <View>
                  <Text style={styles.socialPlatform}>{social.platform}</Text>
                  <Text style={styles.socialHandle}>{social.handle}</Text>
                </View>
              </View>
              <ExternalLink color={Colors.Colors.text.muted} size={16} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Contact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <TouchableOpacity style={styles.contactCard} onPress={handleContactPress}>
            <Mail color={Colors.Colors.cyan.primary} size={20} />
            <View style={styles.contactInfo}>
              <Text style={styles.contactTitle}>Email Support</Text>
              <Text style={styles.contactEmail}>support@intruvurt.space</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Legal */}
        <View style={styles.legalSection}>
          <Text style={styles.legalText}>© 2024 Intruvurt Holdings. All rights reserved.</Text>
          <Text style={styles.legalText}>Built with React Native and powered by AI</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.Colors.background.primary },
  content: { flex: 1, paddingHorizontal: 20 },
  appSection: {
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.Colors.border.muted,
    marginBottom: 24,
  },
  logoContainer: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
  logo: { width: 60, height: 60 },
  appTitle: { fontSize: 24, fontWeight: 'bold', color: Colors.Colors.text.primary },
  appSubtitle: { fontSize: 16, color: Colors.Colors.text.accent, marginTop: 4 },
  description: { fontSize: 16, color: Colors.Colors.text.secondary, lineHeight: 24, marginBottom: 16 },
  versionInfo: { flexDirection: 'row', gap: 16 },
  versionText: { fontSize: 14, color: Colors.Colors.text.muted, fontWeight: '600' },
  buildText: { fontSize: 14, color: Colors.Colors.text.muted },

  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.Colors.text.primary, marginBottom: 16 },

  companyCard: {
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
  },
  companyName: { fontSize: 18, fontWeight: 'bold', color: Colors.Colors.cyan.primary, marginBottom: 8 },
  companyDescription: { fontSize: 14, color: Colors.Colors.text.secondary, lineHeight: 20, marginBottom: 16 },
  linkButton: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  linkButtonText: { fontSize: 14, color: Colors.Colors.cyan.primary, fontWeight: '600' },

  projectCard: {
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
  },
  projectHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  projectName: { flex: 1, fontSize: 16, fontWeight: '600', color: Colors.Colors.text.primary },
  projectDescription: { fontSize: 14, color: Colors.Colors.text.secondary, lineHeight: 20 },

  socialCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
  },
  socialInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  socialPlatform: { fontSize: 14, fontWeight: '600', color: Colors.Colors.text.primary },
  socialHandle: { fontSize: 12, color: Colors.Colors.text.muted },

  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.Colors.border.primary,
    gap: 16,
  },
  contactInfo: { flex: 1 },
  contactTitle: { fontSize: 16, fontWeight: '600', color: Colors.Colors.text.primary, marginBottom: 4 },
  contactEmail: { fontSize: 14, color: Colors.Colors.cyan.primary, fontWeight: '500' },

  legalSection: {
    paddingVertical: 24,
    borderTopWidth: 1,
    borderTopColor: Colors.Colors.border.muted,
    alignItems: 'center',
  },
  legalText: { fontSize: 12, color: Colors.Colors.text.muted, textAlign: 'center', marginBottom: 4 },
});
