import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Alert,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import {
  Layout,
  Type,
  Square,
  Image as ImageIcon,
  List,
  MousePointer,
  Plus,
  Play,
  Code,
  Smartphone,
  Tablet,
  Monitor,
  Trash2,
  Settings,
  Sparkles,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useNoCodeBuilder, ComponentDefinition } from '@/contexts/NoCodeBuilderContext';

const { width } = Dimensions.get('window');

const COMPONENT_LIBRARY = [
  { type: 'View', icon: <Layout size={20} />, label: 'Container', color: Colors.Colors.cyan.primary },
  { type: 'Text', icon: <Type size={20} />, label: 'Text', color: Colors.Colors.red.primary },
  { type: 'Button', icon: <Square size={20} />, label: 'Button', color: Colors.Colors.warning },
  { type: 'TextInput', icon: <Type size={20} />, label: 'Input', color: Colors.Colors.success },
  { type: 'Image', icon: <ImageIcon size={20} />, label: 'Image', color: Colors.Colors.cyan.primary },
  { type: 'ScrollView', icon: <List size={20} />, label: 'Scroll', color: Colors.Colors.red.primary },
  { type: 'TouchableOpacity', icon: <MousePointer size={20} />, label: 'Touchable', color: Colors.Colors.warning },
];

export default function DesignStudioScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    currentProject,
    selectedScreen,
    selectedComponent,
    previewMode,
    setPreviewMode,
    addComponent,
    updateComponent,
    deleteComponent,
    setSelectedComponent,
    generateScreenFromPrompt,
    isGenerating,
  } = useNoCodeBuilder();

  const [showAIPrompt, setShowAIPrompt] = useState<boolean>(false);
  const [aiPrompt, setAIPrompt] = useState<string>('');


  const handleAddComponent = useCallback(async (type: string) => {
    if (!currentProject || !selectedScreen) {
      Alert.alert('Error', 'Please select a project and screen first');
      return;
    }

    const newComponent: Omit<ComponentDefinition, 'id'> = {
      type: type as any,
      label: `${type} ${selectedScreen.components.length + 1}`,
      props: {},
      style: {
        padding: 16,
        backgroundColor: type === 'View' ? Colors.Colors.background.card : 'transparent',
        borderRadius: 8,
      },
      children: [],
      position: { x: 20, y: 20 + (selectedScreen.components.length * 80) },
      size: { width: width - 80, height: 60 },
    };

    await addComponent(currentProject.id, selectedScreen.id, newComponent);
    Alert.alert('Success', `${type} component added`);
  }, [currentProject, selectedScreen, addComponent]);

  const handleDeleteComponent = useCallback(async () => {
    if (!currentProject || !selectedScreen || !selectedComponent) return;

    Alert.alert(
      'Delete Component',
      'Are you sure you want to delete this component?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteComponent(currentProject.id, selectedScreen.id, selectedComponent.id);
            Alert.alert('Success', 'Component deleted');
          },
        },
      ]
    );
  }, [currentProject, selectedScreen, selectedComponent, deleteComponent]);

  const handleAIGenerate = useCallback(async () => {
    if (!currentProject || !aiPrompt.trim()) {
      Alert.alert('Error', 'Please enter a prompt');
      return;
    }

    try {
      await generateScreenFromPrompt(currentProject.id, aiPrompt);
      setShowAIPrompt(false);
      setAIPrompt('');
      Alert.alert('Success', 'Screen generated successfully!');
    } catch {
      Alert.alert('Error', 'Failed to generate screen');
    }
  }, [currentProject, aiPrompt, generateScreenFromPrompt]);

  const handlePreview = useCallback(() => {
    Alert.alert(
      'Preview',
      'Preview mode would show a live rendering of your design. This is a demo.',
      [{ text: 'OK' }]
    );
  }, []);

  const handleExport = useCallback(() => {
    router.push('/builder/export' as any);
  }, [router]);

  if (!currentProject || !selectedScreen) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Stack.Screen
          options={{
            title: 'Design Studio',
            headerShown: true,
            headerStyle: { backgroundColor: Colors.Colors.background.primary },
            headerTintColor: Colors.Colors.text.primary,
          }}
        />
        <View style={styles.emptyState}>
          <Sparkles color={Colors.Colors.cyan.primary} size={48} />
          <Text style={styles.emptyStateText}>No project selected</Text>
          <Text style={styles.emptyStateSubtext}>
            Create a project from the dashboard to start designing
          </Text>
          <TouchableOpacity
            style={styles.emptyStateButton}
            onPress={() => router.back()}
          >
            <Text style={styles.emptyStateButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen
        options={{
          title: 'Design Studio',
          headerShown: true,
          headerStyle: { backgroundColor: Colors.Colors.background.primary },
          headerTintColor: Colors.Colors.text.primary,
        }}
      />

      <View style={styles.toolbar}>
        <View style={styles.toolbarLeft}>
          <TouchableOpacity
            style={[styles.toolbarButton, previewMode === 'mobile' && styles.toolbarButtonActive]}
            onPress={() => setPreviewMode('mobile')}
          >
            <Smartphone color={Colors.Colors.text.primary} size={20} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toolbarButton, previewMode === 'tablet' && styles.toolbarButtonActive]}
            onPress={() => setPreviewMode('tablet')}
          >
            <Tablet color={Colors.Colors.text.primary} size={20} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toolbarButton, previewMode === 'desktop' && styles.toolbarButtonActive]}
            onPress={() => setPreviewMode('desktop')}
          >
            <Monitor color={Colors.Colors.text.primary} size={20} />
          </TouchableOpacity>
        </View>

        <View style={styles.toolbarRight}>
          <TouchableOpacity
            style={styles.toolbarButton}
            onPress={() => setShowAIPrompt(true)}
          >
            <Sparkles color={Colors.Colors.cyan.primary} size={20} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolbarButton} onPress={handlePreview}>
            <Play color={Colors.Colors.success} size={20} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolbarButton} onPress={handleExport}>
            <Code color={Colors.Colors.warning} size={20} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.sidebar}>
          <Text style={styles.sidebarTitle}>Components</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {COMPONENT_LIBRARY.map((component) => (
              <TouchableOpacity
                key={component.type}
                style={styles.componentItem}
                onPress={() => handleAddComponent(component.type)}
              >
                <View style={[styles.componentIcon, { backgroundColor: component.color + '20' }]}>
                  {component.icon}
                </View>
                <Text style={styles.componentLabel}>{component.label}</Text>
                <Plus color={Colors.Colors.text.muted} size={16} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.canvas}>
          <View style={styles.canvasHeader}>
            <Text style={styles.canvasTitle}>{selectedScreen.name}</Text>
            <Text style={styles.canvasSubtitle}>
              {selectedScreen.components.length} component{selectedScreen.components.length !== 1 ? 's' : ''}
            </Text>
          </View>

          <ScrollView style={styles.canvasContent} showsVerticalScrollIndicator={false}>
            <View style={styles.canvasGrid}>
              {selectedScreen.components.map((component) => (
                <TouchableOpacity
                  key={component.id}
                  style={[
                    styles.canvasComponent,
                    {
                      left: component.position.x,
                      top: component.position.y,
                      width: component.size.width,
                      height: component.size.height,
                    },
                    selectedComponent?.id === component.id && styles.canvasComponentSelected,
                  ]}
                  onPress={() => setSelectedComponent(component)}
                >
                  <View style={styles.canvasComponentHeader}>
                    <Text style={styles.canvasComponentType}>{component.type}</Text>
                    <Text style={styles.canvasComponentLabel}>{component.label}</Text>
                  </View>
                  <View style={[styles.canvasComponentPreview, component.style]}>
                    <Text style={styles.canvasComponentPreviewText}>
                      {component.type}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}

              {selectedScreen.components.length === 0 && (
                <View style={styles.canvasEmpty}>
                  <Layout color={Colors.Colors.text.muted} size={48} />
                  <Text style={styles.canvasEmptyText}>
                    Drag components from the library to start designing
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        </View>

        <View style={styles.properties}>
          <Text style={styles.propertiesTitle}>Properties</Text>
          {selectedComponent ? (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.propertySection}>
                <Text style={styles.propertyLabel}>Component</Text>
                <Text style={styles.propertyValue}>{selectedComponent.type}</Text>
              </View>

              <View style={styles.propertySection}>
                <Text style={styles.propertyLabel}>Label</Text>
                <TextInput
                  style={styles.propertyInput}
                  value={selectedComponent.label}
                  onChangeText={(text) => {
                    if (currentProject && selectedScreen) {
                      updateComponent(currentProject.id, selectedScreen.id, selectedComponent.id, {
                        label: text,
                      });
                    }
                  }}
                  placeholderTextColor={Colors.Colors.text.muted}
                />
              </View>

              <View style={styles.propertySection}>
                <Text style={styles.propertyLabel}>Position</Text>
                <View style={styles.propertyRow}>
                  <View style={styles.propertyInputGroup}>
                    <Text style={styles.propertyInputLabel}>X</Text>
                    <TextInput
                      style={styles.propertyInputSmall}
                      value={selectedComponent.position.x.toString()}
                      keyboardType="numeric"
                      placeholderTextColor={Colors.Colors.text.muted}
                    />
                  </View>
                  <View style={styles.propertyInputGroup}>
                    <Text style={styles.propertyInputLabel}>Y</Text>
                    <TextInput
                      style={styles.propertyInputSmall}
                      value={selectedComponent.position.y.toString()}
                      keyboardType="numeric"
                      placeholderTextColor={Colors.Colors.text.muted}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.propertySection}>
                <Text style={styles.propertyLabel}>Size</Text>
                <View style={styles.propertyRow}>
                  <View style={styles.propertyInputGroup}>
                    <Text style={styles.propertyInputLabel}>W</Text>
                    <TextInput
                      style={styles.propertyInputSmall}
                      value={selectedComponent.size.width.toString()}
                      keyboardType="numeric"
                      placeholderTextColor={Colors.Colors.text.muted}
                    />
                  </View>
                  <View style={styles.propertyInputGroup}>
                    <Text style={styles.propertyInputLabel}>H</Text>
                    <TextInput
                      style={styles.propertyInputSmall}
                      value={selectedComponent.size.height.toString()}
                      keyboardType="numeric"
                      placeholderTextColor={Colors.Colors.text.muted}
                    />
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDeleteComponent}
              >
                <Trash2 color={Colors.Colors.error} size={20} />
                <Text style={styles.deleteButtonText}>Delete Component</Text>
              </TouchableOpacity>
            </ScrollView>
          ) : (
            <View style={styles.propertiesEmpty}>
              <Settings color={Colors.Colors.text.muted} size={32} />
              <Text style={styles.propertiesEmptyText}>
                Select a component to edit its properties
              </Text>
            </View>
          )}
        </View>
      </View>

      <Modal
        visible={showAIPrompt}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAIPrompt(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>AI Screen Generator</Text>
            <Text style={styles.modalSubtitle}>
              Describe the screen you want to create
            </Text>

            <TextInput
              style={styles.modalInput}
              value={aiPrompt}
              onChangeText={setAIPrompt}
              placeholder="E.g., Create a login screen with email and password fields..."
              placeholderTextColor={Colors.Colors.text.muted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => setShowAIPrompt(false)}
              >
                <Text style={styles.modalButtonTextSecondary}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleAIGenerate}
                disabled={isGenerating}
              >
                <Sparkles color={Colors.Colors.text.inverse} size={20} />
                <Text style={styles.modalButtonText}>
                  {isGenerating ? 'Generating...' : 'Generate'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.Colors.background.primary,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.Colors.background.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.Colors.border.muted,
  },
  toolbarLeft: {
    flexDirection: 'row',
    gap: 8,
  },
  toolbarRight: {
    flexDirection: 'row',
    gap: 8,
  },
  toolbarButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: Colors.Colors.background.secondary,
  },
  toolbarButtonActive: {
    backgroundColor: Colors.Colors.cyan.primary + '20',
    borderWidth: 1,
    borderColor: Colors.Colors.cyan.primary,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 200,
    backgroundColor: Colors.Colors.background.card,
    borderRightWidth: 1,
    borderRightColor: Colors.Colors.border.muted,
    padding: 16,
  },
  sidebarTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.Colors.text.primary,
    marginBottom: 16,
  },
  componentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    backgroundColor: Colors.Colors.background.secondary,
    borderRadius: 8,
    gap: 8,
  },
  componentIcon: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  componentLabel: {
    flex: 1,
    fontSize: 14,
    color: Colors.Colors.text.primary,
  },
  canvas: {
    flex: 1,
    backgroundColor: Colors.Colors.background.primary,
  },
  canvasHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.Colors.border.muted,
  },
  canvasTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.Colors.text.primary,
    marginBottom: 4,
  },
  canvasSubtitle: {
    fontSize: 12,
    color: Colors.Colors.text.muted,
  },
  canvasContent: {
    flex: 1,
  },
  canvasGrid: {
    flex: 1,
    minHeight: 600,
    position: 'relative',
  },
  canvasComponent: {
    position: 'absolute',
    backgroundColor: Colors.Colors.background.card,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
    borderRadius: 8,
    padding: 8,
  },
  canvasComponentSelected: {
    borderColor: Colors.Colors.cyan.primary,
    borderWidth: 2,
  },
  canvasComponentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  canvasComponentType: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.Colors.cyan.primary,
  },
  canvasComponentLabel: {
    fontSize: 10,
    color: Colors.Colors.text.muted,
  },
  canvasComponentPreview: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  canvasComponentPreviewText: {
    fontSize: 12,
    color: Colors.Colors.text.secondary,
  },
  canvasEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  canvasEmptyText: {
    fontSize: 14,
    color: Colors.Colors.text.muted,
    textAlign: 'center',
    marginTop: 16,
  },
  properties: {
    width: 250,
    backgroundColor: Colors.Colors.background.card,
    borderLeftWidth: 1,
    borderLeftColor: Colors.Colors.border.muted,
    padding: 16,
  },
  propertiesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.Colors.text.primary,
    marginBottom: 16,
  },
  propertySection: {
    marginBottom: 16,
  },
  propertyLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.Colors.text.secondary,
    marginBottom: 8,
  },
  propertyValue: {
    fontSize: 14,
    color: Colors.Colors.text.primary,
  },
  propertyInput: {
    backgroundColor: Colors.Colors.background.secondary,
    borderRadius: 8,
    padding: 12,
    color: Colors.Colors.text.primary,
    fontSize: 14,
  },
  propertyRow: {
    flexDirection: 'row',
    gap: 8,
  },
  propertyInputGroup: {
    flex: 1,
  },
  propertyInputLabel: {
    fontSize: 10,
    color: Colors.Colors.text.muted,
    marginBottom: 4,
  },
  propertyInputSmall: {
    backgroundColor: Colors.Colors.background.secondary,
    borderRadius: 8,
    padding: 8,
    color: Colors.Colors.text.primary,
    fontSize: 14,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: Colors.Colors.error + '20',
    borderRadius: 8,
    gap: 8,
    marginTop: 16,
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.Colors.error,
  },
  propertiesEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  propertiesEmptyText: {
    fontSize: 12,
    color: Colors.Colors.text.muted,
    textAlign: 'center',
    marginTop: 12,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.Colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: Colors.Colors.text.muted,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyStateButton: {
    backgroundColor: Colors.Colors.cyan.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.Colors.text.inverse,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 500,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.Colors.text.primary,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.Colors.text.secondary,
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: Colors.Colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    color: Colors.Colors.text.primary,
    fontSize: 14,
    minHeight: 120,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    gap: 8,
  },
  modalButtonPrimary: {
    backgroundColor: Colors.Colors.cyan.primary,
  },
  modalButtonSecondary: {
    backgroundColor: Colors.Colors.background.secondary,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.Colors.text.inverse,
  },
  modalButtonTextSecondary: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.Colors.text.primary,
  },
});
