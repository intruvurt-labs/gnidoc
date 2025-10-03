import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  Switch,
} from "react-native";
import { Settings, X, User, Bell, Shield, Palette } from "lucide-react-native";
import Colors from "@/constants/colors";
import { useState } from "react";

export default function ModalScreen() {
  const [notifications, setNotifications] = useState<boolean>(true);
  const [autoSave, setAutoSave] = useState<boolean>(true);
  const [darkMode, setDarkMode] = useState<boolean>(true);

  const settingsOptions = [
    {
      title: "Profile Settings",
      icon: <User color={Colors.Colors.cyan.primary} size={20} />,
      description: "Manage your account and preferences"
    },
    {
      title: "Notifications",
      icon: <Bell color={Colors.Colors.cyan.primary} size={20} />,
      description: "Configure alert preferences",
      toggle: notifications,
      onToggle: setNotifications
    },
    {
      title: "Security",
      icon: <Shield color={Colors.Colors.cyan.primary} size={20} />,
      description: "Privacy and security settings"
    },
    {
      title: "Auto-Save",
      icon: <Settings color={Colors.Colors.cyan.primary} size={20} />,
      description: "Automatically save your work",
      toggle: autoSave,
      onToggle: setAutoSave
    },
    {
      title: "Theme",
      icon: <Palette color={Colors.Colors.cyan.primary} size={20} />,
      description: "Customize appearance",
      toggle: darkMode,
      onToggle: setDarkMode
    },
  ];

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={true}
      onRequestClose={() => router.back()}
    >
      <Pressable style={styles.overlay} onPress={() => router.back()}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Settings color={Colors.Colors.cyan.primary} size={24} />
              <Text style={styles.title}>Settings</Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => router.back()}
            >
              <X color={Colors.Colors.text.muted} size={24} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle}>Application Settings</Text>
            
            {settingsOptions.map((option, index) => (
              <View key={index} style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <Text>{option.icon}</Text>
                  <View style={styles.settingText}>
                    <Text style={styles.settingTitle}>{option.title}</Text>
                    <Text style={styles.settingDescription}>{option.description}</Text>
                  </View>
                </View>
                {option.toggle !== undefined && option.onToggle && (
                  <Switch
                    value={option.toggle}
                    onValueChange={option.onToggle}
                    trackColor={{
                      false: Colors.Colors.background.secondary,
                      true: Colors.Colors.cyan.secondary
                    }}
                    thumbColor={option.toggle ? Colors.Colors.cyan.primary : Colors.Colors.text.muted}
                  />
                )}
              </View>
            ))}

            <View style={styles.infoSection}>
              <Text style={styles.infoTitle}>gnidoC Terces</Text>
              <Text style={styles.infoText}>Master Coding Agent v1.0.0</Text>
              <Text style={styles.infoText}>
                Professional development environment with AI-powered code generation,
                real-time analysis, and comprehensive project management tools.
              </Text>
            </View>
          </ScrollView>
        </View>
      </Pressable>

      <StatusBar style={Platform.OS === "ios" ? "light" : "auto"} />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.Colors.background.overlay,
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: Colors.Colors.background.primary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    minHeight: "60%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.Colors.border.muted,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.Colors.text.primary,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.Colors.text.primary,
    marginTop: 24,
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.Colors.border.muted,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    flex: 1,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.Colors.text.primary,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: Colors.Colors.text.muted,
    lineHeight: 18,
  },
  infoSection: {
    marginTop: 32,
    marginBottom: 24,
    padding: 20,
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.Colors.border.primary,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.Colors.text.primary,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: Colors.Colors.text.secondary,
    lineHeight: 20,
    marginBottom: 8,
  },
});