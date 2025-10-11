import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Modal,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  User,
  Code,
  Shield,
  Palette,
  Zap,
  Clock,
  Target,
  Brain,
  Save,
  RotateCcw,
  ChevronRight,
  X,
  Check,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { textWithOutline } from '@/constants/textStyles';
import { usePreferences, type PersonaType, type DisciplineType } from '@/contexts/PreferencesContext';

const PERSONAS = [
  {
    id: 'pragmatic' as PersonaType,
    name: 'Pragmatic Coder',
    description: 'Focus on practical, working solutions with clean code',
    icon: Code,
    color: Colors.Colors.cyan.primary,
  },
  {
    id: 'ux-purist' as PersonaType,
    name: 'UX Purist',
    description: 'Prioritize user experience and beautiful interfaces',
    icon: Palette,
    color: Colors.Colors.orange.primary,
  },
  {
    id: 'security-auditor' as PersonaType,
    name: 'Security Auditor',
    description: 'Emphasize security, validation, and best practices',
    icon: Shield,
    color: Colors.Colors.red.primary,
  },
  {
    id: 'creative-artist' as PersonaType,
    name: 'Creative Artist',
    description: 'Innovative designs with cutting-edge features',
    icon: Brain,
    color: Colors.Colors.cyanOrange.primary,
  },
];

const DISCIPLINES = [
  {
    id: 'strict-typescript' as DisciplineType,
    name: 'Strict TypeScript',
    description: 'Type-safe code with comprehensive interfaces',
    color: Colors.Colors.cyan.primary,
  },
  {
    id: 'fast-js' as DisciplineType,
    name: 'Fast JavaScript',
    description: 'Quick prototyping with flexible typing',
    color: Colors.Colors.orange.primary,
  },
  {
    id: 'secure-rust' as DisciplineType,
    name: 'Secure Rust',
    description: 'Memory-safe, high-performance code',
    color: Colors.Colors.red.primary,
  },
  {
    id: 'cross-platform-flutter' as DisciplineType,
    name: 'Cross-Platform Flutter',
    description: 'Beautiful native apps from single codebase',
    color: Colors.Colors.cyanOrange.primary,
  },
];

export default function PreferencesScreen() {
  const insets = useSafeAreaInsets();
  const { preferences, savedContexts, updatePreferences, resetPreferences } = usePreferences();

  const [showPersonaModal, setShowPersonaModal] = useState(false);
  const [showDisciplineModal, setShowDisciplineModal] = useState(false);
  const [showMemoryModal, setShowMemoryModal] = useState(false);

  const selectedPersona = PERSONAS.find(p => p.id === preferences.persona);
  const selectedDiscipline = DISCIPLINES.find(d => d.id === preferences.discipline);

  const renderPersonaModal = () => (
    <Modal
      visible={showPersonaModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowPersonaModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, textWithOutline(Colors.Colors.cyanOrange.primary)]}>
              Select Builder Persona
            </Text>
            <TouchableOpacity onPress={() => setShowPersonaModal(false)}>
              <X color={Colors.Colors.cyan.primary} size={24} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {PERSONAS.map(persona => {
              const Icon = persona.icon;
              const isSelected = preferences.persona === persona.id;

              return (
                <TouchableOpacity
                  key={persona.id}
                  style={[
                    styles.optionCard,
                    isSelected && { borderColor: persona.color, borderWidth: 2 },
                  ]}
                  onPress={() => {
                    updatePreferences({ persona: persona.id });
                    setShowPersonaModal(false);
                  }}
                >
                  <View style={styles.optionHeader}>
                    <View style={[styles.optionIcon, { backgroundColor: persona.color + '20' }]}>
                      <Icon color={persona.color} size={24} />
                    </View>
                    {isSelected && (
                      <View style={[styles.checkBadge, { backgroundColor: persona.color }]}>
                        <Check color={Colors.Colors.text.inverse} size={16} />
                      </View>
                    )}
                  </View>
                  <Text style={[styles.optionName, textWithOutline(persona.color)]}>
                    {persona.name}
                  </Text>
                  <Text style={styles.optionDescription}>{persona.description}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderDisciplineModal = () => (
    <Modal
      visible={showDisciplineModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowDisciplineModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, textWithOutline(Colors.Colors.cyanOrange.primary)]}>
              Select Code Discipline
            </Text>
            <TouchableOpacity onPress={() => setShowDisciplineModal(false)}>
              <X color={Colors.Colors.cyan.primary} size={24} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {DISCIPLINES.map(discipline => {
              const isSelected = preferences.discipline === discipline.id;

              return (
                <TouchableOpacity
                  key={discipline.id}
                  style={[
                    styles.optionCard,
                    isSelected && { borderColor: discipline.color, borderWidth: 2 },
                  ]}
                  onPress={() => {
                    updatePreferences({ discipline: discipline.id });
                    setShowDisciplineModal(false);
                  }}
                >
                  <View style={styles.optionHeader}>
                    <View style={[styles.optionIcon, { backgroundColor: discipline.color + '20' }]}>
                      <Code color={discipline.color} size={24} />
                    </View>
                    {isSelected && (
                      <View style={[styles.checkBadge, { backgroundColor: discipline.color }]}>
                        <Check color={Colors.Colors.text.inverse} size={16} />
                      </View>
                    )}
                  </View>
                  <Text style={[styles.optionName, textWithOutline(discipline.color)]}>
                    {discipline.name}
                  </Text>
                  <Text style={styles.optionDescription}>{discipline.description}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderMemoryModal = () => (
    <Modal
      visible={showMemoryModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowMemoryModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, textWithOutline(Colors.Colors.cyanOrange.primary)]}>
              Prompt Memory & Context
            </Text>
            <TouchableOpacity onPress={() => setShowMemoryModal(false)}>
              <X color={Colors.Colors.cyan.primary} size={24} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {savedContexts.length === 0 ? (
              <View style={styles.emptyState}>
                <Brain color={Colors.Colors.text.muted} size={48} />
                <Text style={styles.emptyStateText}>No saved contexts yet</Text>
                <Text style={styles.emptyStateSubtext}>
                  Your project reasoning chains will be saved here
                </Text>
              </View>
            ) : (
              savedContexts.map((context, idx) => (
                <View key={idx} style={styles.contextCard}>
                  <Text style={styles.contextTitle}>{context.title}</Text>
                  <Text style={styles.contextDate}>{new Date(context.timestamp).toLocaleDateString()}</Text>
                  <View style={styles.contextActions}>
                    <TouchableOpacity style={styles.contextButton}>
                      <Text style={styles.contextButtonText}>Load</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.contextButton}>
                      <Text style={styles.contextButtonText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerLeft}>
          <User color={Colors.Colors.cyan.primary} size={28} />
          <View>
            <Text style={[styles.headerTitle, textWithOutline(Colors.Colors.cyanOrange.primary)]}>
              User Preferences
            </Text>
            <Text style={styles.headerSubtitle}>Customize your AI builder experience</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, textWithOutline(Colors.Colors.cyan.primary)]}>
            Builder Persona
          </Text>
          <Text style={styles.sectionDescription}>
            Choose an AI mentor style that matches your workflow
          </Text>

          <TouchableOpacity
            style={styles.selectionCard}
            onPress={() => setShowPersonaModal(true)}
          >
            <View style={styles.selectionLeft}>
              {selectedPersona && (
                <>
                  <View style={[styles.selectionIcon, { backgroundColor: selectedPersona.color + '20' }]}>
                    <selectedPersona.icon color={selectedPersona.color} size={24} />
                  </View>
                  <View style={styles.selectionInfo}>
                    <Text style={[styles.selectionName, textWithOutline(selectedPersona.color)]}>
                      {selectedPersona.name}
                    </Text>
                    <Text style={styles.selectionDescription}>
                      {selectedPersona.description}
                    </Text>
                  </View>
                </>
              )}
            </View>
            <ChevronRight color={Colors.Colors.cyan.primary} size={20} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, textWithOutline(Colors.Colors.cyan.primary)]}>
            Code Discipline
          </Text>
          <Text style={styles.sectionDescription}>
            Set your preferred coding language and style
          </Text>

          <TouchableOpacity
            style={styles.selectionCard}
            onPress={() => setShowDisciplineModal(true)}
          >
            <View style={styles.selectionLeft}>
              {selectedDiscipline && (
                <>
                  <View style={[styles.selectionIcon, { backgroundColor: selectedDiscipline.color + '20' }]}>
                    <Code color={selectedDiscipline.color} size={24} />
                  </View>
                  <View style={styles.selectionInfo}>
                    <Text style={[styles.selectionName, textWithOutline(selectedDiscipline.color)]}>
                      {selectedDiscipline.name}
                    </Text>
                    <Text style={styles.selectionDescription}>
                      {selectedDiscipline.description}
                    </Text>
                  </View>
                </>
              )}
            </View>
            <ChevronRight color={Colors.Colors.cyan.primary} size={20} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, textWithOutline(Colors.Colors.cyan.primary)]}>
            Workflow Speed vs Accuracy
          </Text>
          <Text style={styles.sectionDescription}>
            Adjust model runtime budget for your needs
          </Text>

          <View style={styles.sliderCard}>
            <View style={styles.sliderLabels}>
              <View style={styles.sliderLabel}>
                <Zap color={Colors.Colors.orange.primary} size={20} />
                <Text style={[styles.sliderLabelText, textWithOutline(Colors.Colors.orange.primary)]}>
                  Fast Prototype
                </Text>
              </View>
              <View style={styles.sliderLabel}>
                <Target color={Colors.Colors.cyan.primary} size={20} />
                <Text style={[styles.sliderLabelText, textWithOutline(Colors.Colors.cyan.primary)]}>
                  Deep Optimization
                </Text>
              </View>
            </View>

            <View style={styles.sliderContainer}>
              <View style={styles.sliderTrack}>
                <View
                  style={[
                    styles.sliderFill,
                    { width: `${preferences.speedVsAccuracy}%` },
                  ]}
                />
                <View
                  style={[
                    styles.sliderThumb,
                    { left: `${preferences.speedVsAccuracy}%` },
                  ]}
                />
              </View>
            </View>

            <View style={styles.sliderButtons}>
              {[0, 25, 50, 75, 100].map(value => (
                <TouchableOpacity
                  key={value}
                  style={[
                    styles.sliderButton,
                    preferences.speedVsAccuracy === value && styles.sliderButtonActive,
                  ]}
                  onPress={() => updatePreferences({ speedVsAccuracy: value })}
                >
                  <Text
                    style={[
                      styles.sliderButtonText,
                      preferences.speedVsAccuracy === value && textWithOutline(Colors.Colors.cyan.primary),
                    ]}
                  >
                    {value}%
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, textWithOutline(Colors.Colors.cyan.primary)]}>
            Prompt Memory & Context
          </Text>
          <Text style={styles.sectionDescription}>
            Save and replay full project reasoning chains
          </Text>

          <View style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Brain color={Colors.Colors.cyan.primary} size={20} />
                <Text style={[styles.settingLabel, textWithOutline(Colors.Colors.cyan.primary)]}>
                  Enable Prompt Memory
                </Text>
              </View>
              <Switch
                value={preferences.enablePromptMemory}
                onValueChange={value => updatePreferences({ enablePromptMemory: value })}
                trackColor={{ false: Colors.Colors.border.muted, true: Colors.Colors.cyan.primary }}
                thumbColor={Colors.Colors.text.secondary}
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Clock color={Colors.Colors.orange.primary} size={20} />
                <Text style={[styles.settingLabel, textWithOutline(Colors.Colors.orange.primary)]}>
                  Enable Context Replay
                </Text>
              </View>
              <Switch
                value={preferences.enableContextReplay}
                onValueChange={value => updatePreferences({ enableContextReplay: value })}
                trackColor={{ false: Colors.Colors.border.muted, true: Colors.Colors.orange.primary }}
                thumbColor={Colors.Colors.text.secondary}
              />
            </View>

            <TouchableOpacity
              style={styles.memoryButton}
              onPress={() => setShowMemoryModal(true)}
            >
              <Text style={[styles.memoryButtonText, textWithOutline(Colors.Colors.cyan.primary)]}>
                View Saved Contexts
              </Text>
              <ChevronRight color={Colors.Colors.cyan.primary} size={20} />
            </TouchableOpacity>
          </View>

          <View style={styles.settingCard}>
            <View style={styles.inputRow}>
              <Text style={[styles.inputLabel, textWithOutline(Colors.Colors.cyan.primary)]}>
                Auto-save Interval (seconds)
              </Text>
              <TextInput
                style={styles.input}
                value={String(preferences.autoSaveInterval)}
                onChangeText={text => updatePreferences({ autoSaveInterval: parseInt(text) || 30 })}
                keyboardType="number-pad"
                placeholderTextColor={Colors.Colors.text.muted}
              />
            </View>

            <View style={styles.inputRow}>
              <Text style={[styles.inputLabel, textWithOutline(Colors.Colors.cyan.primary)]}>
                Max Context History
              </Text>
              <TextInput
                style={styles.input}
                value={String(preferences.maxContextHistory)}
                onChangeText={text => updatePreferences({ maxContextHistory: parseInt(text) || 100 })}
                keyboardType="number-pad"
                placeholderTextColor={Colors.Colors.text.muted}
              />
            </View>
          </View>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.resetButton} onPress={resetPreferences}>
            <RotateCcw color={Colors.Colors.red.primary} size={20} />
            <Text style={[styles.resetButtonText, textWithOutline(Colors.Colors.red.primary)]}>
              Reset to Defaults
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.saveButton} onPress={() => console.log('[Preferences] Saved')}>
            <Save color={Colors.Colors.text.inverse} size={20} />
            <Text style={styles.saveButtonText}>Save Preferences</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {renderPersonaModal()}
      {renderDisciplineModal()}
      {renderMemoryModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.Colors.background.primary,
  },
  header: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.Colors.border.muted,
  },
  headerLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.Colors.text.muted,
    marginTop: 2,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 12,
    color: Colors.Colors.text.muted,
    marginBottom: 12,
  },
  selectionCard: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
  },
  selectionLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    flex: 1,
  },
  selectionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  selectionInfo: {
    flex: 1,
  },
  selectionName: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  selectionDescription: {
    fontSize: 12,
    color: Colors.Colors.text.muted,
  },
  sliderCard: {
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
  },
  sliderLabels: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 16,
  },
  sliderLabel: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
  },
  sliderLabelText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  sliderContainer: {
    marginBottom: 16,
  },
  sliderTrack: {
    height: 6,
    backgroundColor: Colors.Colors.background.secondary,
    borderRadius: 3,
    position: 'relative' as const,
  },
  sliderFill: {
    height: '100%',
    backgroundColor: Colors.Colors.cyan.primary,
    borderRadius: 3,
  },
  sliderThumb: {
    position: 'absolute' as const,
    top: -5,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.Colors.cyan.primary,
    marginLeft: -8,
  },
  sliderButtons: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
  },
  sliderButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: Colors.Colors.background.secondary,
  },
  sliderButtonActive: {
    backgroundColor: Colors.Colors.cyan.primary + '30',
  },
  sliderButtonText: {
    fontSize: 12,
    color: Colors.Colors.text.muted,
  },
  settingCard: {
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
    marginBottom: 12,
  },
  settingRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 16,
  },
  settingLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    flex: 1,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  memoryButton: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.Colors.background.secondary,
    borderRadius: 8,
  },
  memoryButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  inputRow: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.Colors.background.secondary,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: Colors.Colors.text.primary,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
  },
  actionButtons: {
    flexDirection: 'row' as const,
    gap: 12,
    marginTop: 8,
    marginBottom: 32,
  },
  resetButton: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: Colors.Colors.background.card,
    borderWidth: 1,
    borderColor: Colors.Colors.red.primary,
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: Colors.Colors.cyan.primary,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.Colors.text.inverse,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.Colors.background.overlay,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 12,
    width: '100%',
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: Colors.Colors.border.primary,
  },
  modalHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.Colors.border.muted,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  modalBody: {
    padding: 16,
  },
  optionCard: {
    backgroundColor: Colors.Colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
  },
  optionHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 12,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  checkBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  optionName: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 12,
    color: Colors.Colors.text.muted,
  },
  emptyState: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 40,
    gap: 12,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.Colors.text.muted,
  },
  emptyStateSubtext: {
    fontSize: 12,
    color: Colors.Colors.text.muted,
    textAlign: 'center' as const,
    paddingHorizontal: 40,
  },
  contextCard: {
    backgroundColor: Colors.Colors.background.primary,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
  },
  contextTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.Colors.text.primary,
    marginBottom: 4,
  },
  contextDate: {
    fontSize: 11,
    color: Colors.Colors.text.muted,
    marginBottom: 8,
  },
  contextActions: {
    flexDirection: 'row' as const,
    gap: 8,
  },
  contextButton: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: Colors.Colors.cyan.primary + '30',
    alignItems: 'center' as const,
  },
  contextButtonText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.Colors.cyan.primary,
  },
});
