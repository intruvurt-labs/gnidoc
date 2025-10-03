import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { 
  Code, 
  Play, 
  Save, 
  Download, 
  Folder, 
  Settings, 
  Zap, 
  FileText, 
  Database, 
  Globe, 
  Smartphone, 
  Monitor,
  FolderOpen,
  File,
  X,
  Plus,
  Search,
  MoreHorizontal,
  Terminal,
  GitBranch,
  Bug,
  Package,
  Menu,
  Maximize2,
  Minimize2,
  Copy,
  Scissors,
  ClipboardPaste,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAgent } from '@/contexts/AgentContext';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');
const isSmallDevice = width < 768;

interface FileTab {
  id: string;
  name: string;
  content: string;
  language: string;
  modified: boolean;
}

interface FileTreeItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  children?: FileTreeItem[];
  content?: string;
  language?: string;
}

export default function CodeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { generateCode, isGenerating, addFileToProject, uploadFileToProject, uploadMultipleFiles, deleteFileFromProject, currentProject, projects } = useAgent();
  
  // IDE State
  const [showSidebar, setShowSidebar] = useState<boolean>(!isSmallDevice);
  const [showFloatingToolbar, setShowFloatingToolbar] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [tooltipVisible, setTooltipVisible] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('explorer');
  const [openTabs, setOpenTabs] = useState<FileTab[]>([
    {
      id: 'welcome',
      name: 'Welcome.tsx',
      content: `// Welcome to gnidoC Terces Mobile IDE
// Professional development environment on your mobile device

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function Welcome() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>gnidoC Terces</Text>
      <Text style={styles.subtitle}>Master Coding Agent</Text>
      <Text style={styles.description}>
        Start building amazing apps with AI-powered code generation,
        real-time analysis, and professional development tools.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#1a1a1a',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#00d4ff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#ff4757',
    marginBottom: 20,
  },
  description: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 24,
  },
});`,
      language: 'typescript',
      modified: false,
    },
  ]);
  const [activeTabId, setActiveTabId] = useState<string>('welcome');
  const [prompt, setPrompt] = useState<string>('');
  
  // File tree structure
  const fileTree = useMemo((): FileTreeItem[] => {
    if (!currentProject) {
      return [
        {
          id: 'src',
          name: 'src',
          type: 'folder',
          children: [
            {
              id: 'components',
              name: 'components',
              type: 'folder',
              children: [
                { id: 'Button.tsx', name: 'Button.tsx', type: 'file', language: 'typescript' },
                { id: 'Header.tsx', name: 'Header.tsx', type: 'file', language: 'typescript' },
              ],
            },
            {
              id: 'screens',
              name: 'screens',
              type: 'folder',
              children: [
                { id: 'HomeScreen.tsx', name: 'HomeScreen.tsx', type: 'file', language: 'typescript' },
                { id: 'ProfileScreen.tsx', name: 'ProfileScreen.tsx', type: 'file', language: 'typescript' },
              ],
            },
            { id: 'App.tsx', name: 'App.tsx', type: 'file', language: 'typescript' },
          ],
        },
        {
          id: 'assets',
          name: 'assets',
          type: 'folder',
          children: [
            { id: 'images', name: 'images', type: 'folder' },
            { id: 'fonts', name: 'fonts', type: 'folder' },
          ],
        },
        { id: 'package.json', name: 'package.json', type: 'file', language: 'json' },
        { id: 'README.md', name: 'README.md', type: 'file', language: 'markdown' },
      ];
    }
    
    return currentProject.files.map(file => ({
      id: file.id,
      name: file.name,
      type: 'file' as const,
      content: file.content,
      language: file.language,
    }));
  }, [currentProject]);
  
  const activeTabContent = openTabs.find(tab => tab.id === activeTabId)?.content || '';
  
  const sidebarTabs = [
    { id: 'explorer', name: 'Explorer', icon: <FolderOpen color={Colors.Colors.text.muted} size={20} /> },
    { id: 'search', name: 'Search', icon: <Search color={Colors.Colors.text.muted} size={20} /> },
    { id: 'git', name: 'Git', icon: <GitBranch color={Colors.Colors.text.muted} size={20} /> },
    { id: 'debug', name: 'Debug', icon: <Bug color={Colors.Colors.text.muted} size={20} /> },
    { id: 'extensions', name: 'Extensions', icon: <Package color={Colors.Colors.text.muted} size={20} /> },
  ];

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      Alert.alert('Error', 'Please enter a description for code generation');
      return;
    }

    try {
      const generatedCode = await generateCode(prompt, 'typescript');
      const newTab: FileTab = {
        id: `generated_${Date.now()}`,
        name: 'Generated.tsx',
        content: generatedCode,
        language: 'typescript',
        modified: false,
      };
      setOpenTabs(prev => [...prev, newTab]);
      setActiveTabId(newTab.id);
      setPrompt('');
    } catch (error) {
      Alert.alert('Error', 'Failed to generate code. Please try again.');
      console.error('Code generation error:', error);
    }
  };

  const handleTabClose = (tabId: string) => {
    if (openTabs.length === 1) return; // Keep at least one tab open
    
    const newTabs = openTabs.filter(tab => tab.id !== tabId);
    setOpenTabs(newTabs);
    
    if (activeTabId === tabId) {
      setActiveTabId(newTabs[0]?.id || '');
    }
  };

  const handleTabContentChange = (content: string) => {
    setOpenTabs(prev => prev.map(tab => 
      tab.id === activeTabId 
        ? { ...tab, content, modified: true }
        : tab
    ));
  };

  const handleFileOpen = (file: FileTreeItem) => {
    if (file.type === 'folder') return;
    
    const existingTab = openTabs.find(tab => tab.id === file.id);
    if (existingTab) {
      setActiveTabId(file.id);
      return;
    }
    
    const newTab: FileTab = {
      id: file.id,
      name: file.name,
      content: file.content || `// ${file.name}\n// Start coding here...`,
      language: file.language || 'typescript',
      modified: false,
    };
    
    setOpenTabs(prev => [...prev, newTab]);
    setActiveTabId(file.id);
  };

  const handleSaveFile = async () => {
    const activeTab = openTabs.find(tab => tab.id === activeTabId);
    if (!activeTab) {
      Alert.alert('Error', 'No active file to save');
      return;
    }
    
    try {
      if (currentProject) {
        await addFileToProject(currentProject.id, {
          name: activeTab.name,
          path: `/src/${activeTab.name}`,
          content: activeTab.content,
          language: activeTab.language,
          size: activeTab.content.length,
        });
      }
      
      setOpenTabs(prev => prev.map(tab => 
        tab.id === activeTabId 
          ? { ...tab, modified: false }
          : tab
      ));
      
      console.log(`[IDE] File saved successfully: ${activeTab.name}`);
      Alert.alert('✓ Saved', `${activeTab.name} saved successfully`);
    } catch (error) {
      console.error('[IDE] Save error:', error);
      Alert.alert('Error', `Failed to save ${activeTab.name}. ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleRunCode = async () => {
    const activeTab = openTabs.find(tab => tab.id === activeTabId);
    if (!activeTab) return;
    
    try {
      console.log(`[IDE] Running code from ${activeTab.name}`);
      Alert.alert(
        'Code Execution',
        `Executing ${activeTab.name}...\n\nIn a production environment, this would:\n• Transpile TypeScript to JavaScript\n• Bundle dependencies\n• Execute in a sandboxed environment\n• Display output in the terminal\n\nCheck the terminal tab for execution logs.`,
        [
          { text: 'OK' },
          { text: 'View Terminal', onPress: () => router.push('/(tabs)/terminal' as any) }
        ]
      );
    } catch (error) {
      console.error('[IDE] Execution error:', error);
      Alert.alert('Execution Error', error instanceof Error ? error.message : 'Failed to execute code');
    }
  };

  const handleFormatCode = () => {
    const activeTab = openTabs.find(tab => tab.id === activeTabId);
    if (!activeTab) return;
    
    try {
      let formatted = activeTab.content;
      formatted = formatted.replace(/\t/g, '  ');
      const lines = formatted.split('\n');
      let indentLevel = 0;
      const formattedLines = lines.map(line => {
        const trimmed = line.trim();
        if (trimmed.endsWith('{')) {
          const result = '  '.repeat(indentLevel) + trimmed;
          indentLevel++;
          return result;
        } else if (trimmed.startsWith('}')) {
          indentLevel = Math.max(0, indentLevel - 1);
          return '  '.repeat(indentLevel) + trimmed;
        }
        return '  '.repeat(indentLevel) + trimmed;
      });
      
      setOpenTabs(prev => prev.map(tab => 
        tab.id === activeTabId 
          ? { ...tab, content: formattedLines.join('\n'), modified: true }
          : tab
      ));
      
      console.log(`[IDE] Code formatted: ${activeTab.name}`);
    } catch (error) {
      console.error('[IDE] Format error:', error);
      Alert.alert('Format Error', 'Failed to format code');
    }
  };

  const handleUploadFile = async () => {
    if (!currentProject) {
      Alert.alert('No Project', 'Please create or select a project first.');
      return;
    }

    try {
      if (Platform.OS !== 'web') {
        await Haptics.selectionAsync();
      }
      
      console.log('[IDE] Starting file upload...');
      const uploadedFile = await uploadFileToProject(currentProject.id);
      
      if (uploadedFile) {
        const newTab: FileTab = {
          id: uploadedFile.id,
          name: uploadedFile.name,
          content: uploadedFile.content,
          language: uploadedFile.language,
          modified: false,
        };
        
        setOpenTabs(prev => [...prev, newTab]);
        setActiveTabId(uploadedFile.id);
        
        Alert.alert('✓ File Uploaded', `${uploadedFile.name} has been added to your project.`);
        console.log(`[IDE] File uploaded and opened: ${uploadedFile.name}`);
      }
    } catch (error) {
      console.error('[IDE] Upload error:', error);
      Alert.alert('Upload Error', error instanceof Error ? error.message : 'Failed to upload file');
    }
  };

  const handleUploadMultipleFiles = async () => {
    if (!currentProject) {
      Alert.alert('No Project', 'Please create or select a project first.');
      return;
    }

    try {
      if (Platform.OS !== 'web') {
        await Haptics.selectionAsync();
      }
      
      console.log('[IDE] Starting multiple file upload...');
      const uploadedFiles = await uploadMultipleFiles(currentProject.id);
      
      if (uploadedFiles.length > 0) {
        const newTabs: FileTab[] = uploadedFiles.map(file => ({
          id: file.id,
          name: file.name,
          content: file.content,
          language: file.language,
          modified: false,
        }));
        
        setOpenTabs(prev => [...prev, ...newTabs]);
        setActiveTabId(uploadedFiles[0].id);
        
        Alert.alert(
          '✓ Files Uploaded',
          `${uploadedFiles.length} file${uploadedFiles.length > 1 ? 's' : ''} uploaded successfully:\n\n${uploadedFiles.map(f => `• ${f.name}`).join('\n')}`
        );
        console.log(`[IDE] ${uploadedFiles.length} files uploaded`);
      }
    } catch (error) {
      console.error('[IDE] Multiple upload error:', error);
      Alert.alert('Upload Error', error instanceof Error ? error.message : 'Failed to upload files');
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!currentProject) return;

    const file = currentProject.files.find(f => f.id === fileId);
    if (!file) return;

    Alert.alert(
      'Delete File',
      `Are you sure you want to delete ${file.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteFileFromProject(currentProject.id, fileId);
              
              setOpenTabs(prev => prev.filter(tab => tab.id !== fileId));
              
              if (activeTabId === fileId && openTabs.length > 1) {
                const remainingTabs = openTabs.filter(tab => tab.id !== fileId);
                setActiveTabId(remainingTabs[0]?.id || '');
              }
              
              console.log(`[IDE] File deleted: ${file.name}`);
            } catch (error) {
              console.error('[IDE] Delete error:', error);
              Alert.alert('Delete Error', error instanceof Error ? error.message : 'Failed to delete file');
            }
          },
        },
      ]
    );
  };

  const renderFileTreeItem = (item: FileTreeItem, depth: number = 0) => (
    <View key={item.id}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity 
          style={[styles.fileTreeItem, { paddingLeft: 16 + depth * 16, flex: 1 }]}
          onPress={() => handleFileOpen(item)}
        >
          {item.type === 'folder' ? (
            <FolderOpen color={Colors.Colors.warning} size={16} />
          ) : (
            <File color={Colors.Colors.cyan.primary} size={16} />
          )}
          <Text style={styles.fileTreeText}>{item.name}</Text>
        </TouchableOpacity>
        {item.type === 'file' && currentProject?.files.find(f => f.id === item.id) && (
          <TouchableOpacity
            style={{ padding: 8 }}
            onPress={() => handleDeleteFile(item.id)}
          >
            <X color={Colors.Colors.red.primary} size={14} />
          </TouchableOpacity>
        )}
      </View>
      {item.children?.map(child => renderFileTreeItem(child, depth + 1))}
    </View>
  );

  const FloatingToolbarButton = ({ icon, label, onPress, color }: { icon: React.ReactNode; label: string; onPress: () => void; color?: string }) => (
    <TouchableOpacity
      style={styles.floatingToolbarButton}
      onPress={onPress}
      onLongPress={() => setTooltipVisible(label)}
      onPressOut={() => setTooltipVisible(null)}
    >
      {icon}
      {tooltipVisible === label && (
        <View style={styles.tooltip}>
          <Text style={styles.tooltipText}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: isFullscreen ? 0 : insets.top }]}>
      {/* IDE Header */}
      {!isFullscreen && (
        <View style={styles.ideHeader}>
          <TouchableOpacity 
            style={styles.sidebarToggle}
            onPress={() => setShowSidebar(!showSidebar)}
          >
            <Menu color={Colors.Colors.cyan.primary} size={20} />
          </TouchableOpacity>
          <Text style={styles.ideTitle}>gnidoC Terces IDE</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={() => router.push('/(tabs)/terminal' as any)}
            >
              <Terminal color={Colors.Colors.text.muted} size={18} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={() => setIsFullscreen(!isFullscreen)}
            >
              <Maximize2 color={Colors.Colors.text.muted} size={18} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={[styles.ideBody, isSmallDevice && styles.ideBodyMobile]}>
        {/* Sidebar */}
        {showSidebar && (
          <View style={[styles.sidebar, isSmallDevice && styles.sidebarMobile]}>
            {/* Sidebar Tabs */}
            <View style={styles.sidebarTabs}>
              {sidebarTabs.map(tab => (
                <TouchableOpacity
                  key={tab.id}
                  style={[
                    styles.sidebarTab,
                    activeTab === tab.id && styles.activeSidebarTab
                  ]}
                  onPress={() => setActiveTab(tab.id)}
                >
                  {tab.icon}
                </TouchableOpacity>
              ))}
            </View>

            {/* Sidebar Content */}
            <View style={styles.sidebarContent}>
              {activeTab === 'explorer' && (
                <View style={styles.explorerPanel}>
                  <View style={styles.panelHeader}>
                    <Text style={styles.panelTitle}>EXPLORER</Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity onPress={handleUploadFile}>
                        <Plus color={Colors.Colors.cyan.primary} size={16} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={handleUploadMultipleFiles}>
                        <FolderOpen color={Colors.Colors.cyan.primary} size={16} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <ScrollView style={styles.fileTree}>
                    <Text style={styles.projectName}>
                      {currentProject?.name || 'Sample Project'}
                    </Text>
                    {fileTree.map(item => renderFileTreeItem(item))}
                  </ScrollView>
                </View>
              )}
              
              {activeTab === 'search' && (
                <View style={styles.searchPanel}>
                  <View style={styles.panelHeader}>
                    <Text style={styles.panelTitle}>SEARCH</Text>
                  </View>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search in files..."
                    placeholderTextColor={Colors.Colors.text.muted}
                  />
                </View>
              )}
            </View>
          </View>
        )}

        {/* Main Editor Area */}
        <View style={[styles.editorArea, isSmallDevice && showSidebar && styles.editorAreaWithSidebar]}>
          {/* Tab Bar */}
          <View style={styles.tabBar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {openTabs.map(tab => (
                <TouchableOpacity
                  key={tab.id}
                  style={[
                    styles.tab,
                    activeTabId === tab.id && styles.activeTab
                  ]}
                  onPress={() => setActiveTabId(tab.id)}
                >
                  <Text style={[
                    styles.tabText,
                    activeTabId === tab.id && styles.activeTabText,
                    tab.modified && styles.modifiedTabText
                  ]}>
                    {tab.name}{tab.modified ? ' •' : ''}
                  </Text>
                  {openTabs.length > 1 && (
                    <TouchableOpacity
                      style={styles.tabClose}
                      onPress={() => handleTabClose(tab.id)}
                    >
                      <X color={Colors.Colors.text.muted} size={14} />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Editor */}
          <View style={[styles.editor, isSmallDevice && styles.editorMobile]}>
            {!isSmallDevice && (
              <View style={styles.editorToolbar}>
                <TouchableOpacity style={styles.toolbarButton} onPress={handleSaveFile}>
                  <Save color={Colors.Colors.cyan.primary} size={16} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.toolbarButton} onPress={handleRunCode}>
                  <Play color={Colors.Colors.success} size={16} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.toolbarButton} onPress={handleFormatCode}>
                  <Code color={Colors.Colors.warning} size={16} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.toolbarButton}>
                  <Download color={Colors.Colors.text.muted} size={16} />
                </TouchableOpacity>
              </View>
            )}
            
            <ScrollView style={styles.codeEditor}>
              <TextInput
                style={styles.codeInput}
                value={activeTabContent}
                onChangeText={handleTabContentChange}
                multiline
                placeholder="Start coding..."
                placeholderTextColor={Colors.Colors.text.muted}
                textAlignVertical="top"
              />
            </ScrollView>
          </View>
        </View>
      </View>

      {/* Floating Toolbar for Mobile */}
      {isSmallDevice && showFloatingToolbar && (
        <View style={styles.floatingToolbar}>
          <FloatingToolbarButton
            icon={<Save color={Colors.Colors.cyan.primary} size={18} />}
            label="Save"
            onPress={handleSaveFile}
          />
          <FloatingToolbarButton
            icon={<Play color={Colors.Colors.success} size={18} />}
            label="Run"
            onPress={handleRunCode}
          />
          <FloatingToolbarButton
            icon={<Code color={Colors.Colors.warning} size={18} />}
            label="Format"
            onPress={handleFormatCode}
          />
          <FloatingToolbarButton
            icon={<Copy color={Colors.Colors.text.muted} size={18} />}
            label="Copy"
            onPress={() => Alert.alert('Copy', 'Code copied to clipboard')}
          />
          <FloatingToolbarButton
            icon={<Terminal color={Colors.Colors.red.primary} size={18} />}
            label="Terminal"
            onPress={() => router.push('/(tabs)/terminal' as any)}
          />
          {isFullscreen && (
            <FloatingToolbarButton
              icon={<Minimize2 color={Colors.Colors.text.muted} size={18} />}
              label="Exit Fullscreen"
              onPress={() => setIsFullscreen(false)}
            />
          )}
        </View>
      )}

      {/* AI Assistant Panel */}
      <View style={[styles.aiPanel, isSmallDevice && styles.aiPanelMobile]}>
        <View style={styles.aiHeader}>
          <Zap color={Colors.Colors.cyan.primary} size={16} />
          <Text style={styles.aiTitle}>AI Assistant</Text>
        </View>
        <View style={styles.aiInputContainer}>
          <TextInput
            style={styles.aiInput}
            value={prompt}
            onChangeText={setPrompt}
            placeholder="Describe what code you want to generate..."
            placeholderTextColor={Colors.Colors.text.muted}
            multiline
            maxLength={200}
          />
          <TouchableOpacity 
            style={[styles.aiButton, isGenerating && styles.aiButtonDisabled]} 
            onPress={handleGenerate}
            disabled={isGenerating}
          >
            <Text style={styles.aiButtonText}>
              {isGenerating ? 'Generating...' : 'Generate'}
            </Text>
          </TouchableOpacity>
        </View>
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
    gap: 12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.Colors.text.primary,
  },
  settingsButton: {
    padding: 8,
  },
  languageContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
    gap: 6,
  },
  selectedLanguage: {
    backgroundColor: Colors.Colors.cyan.primary,
    borderColor: Colors.Colors.cyan.primary,
  },
  languageText: {
    color: Colors.Colors.text.secondary,
    fontSize: 12,
    fontWeight: '600',
  },
  selectedLanguageText: {
    color: Colors.Colors.text.inverse,
  },
  templatesContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    color: Colors.Colors.text.primary,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  templateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
    gap: 6,
  },
  selectedTemplate: {
    backgroundColor: Colors.Colors.red.primary,
    borderColor: Colors.Colors.red.primary,
  },
  templateText: {
    color: Colors.Colors.text.secondary,
    fontSize: 11,
    fontWeight: '500',
  },
  selectedTemplateText: {
    color: Colors.Colors.text.inverse,
  },
  editorContainer: {
    flex: 1,
    marginHorizontal: 20,
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.Colors.border.primary,
    marginBottom: 16,
  },
  editorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.Colors.border.muted,
  },
  editorTitle: {
    color: Colors.Colors.text.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  editorActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 6,
  },
  codeScrollView: {
    flex: 1,
  },
  codeInput: {
    flex: 1,
    color: Colors.Colors.text.primary,
    fontSize: 14,
    fontFamily: 'monospace',
    padding: 16,
    minHeight: 200,
  },
  bottomActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.Colors.cyan.primary,
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  primaryButtonText: {
    color: Colors.Colors.text.inverse,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
  },
  secondaryButtonText: {
    color: Colors.Colors.text.secondary,
    fontSize: 16,
    fontWeight: '600',
  },
  promptContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  promptInput: {
    backgroundColor: Colors.Colors.background.card,
    borderColor: Colors.Colors.border.muted,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: Colors.Colors.text.primary,
    fontSize: 14,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.Colors.cyan.primary,
    borderRadius: 8,
    paddingVertical: 12,
    gap: 8,
  },
  generateButtonDisabled: {
    opacity: 0.6,
  },
  generateButtonText: {
    color: Colors.Colors.text.inverse,
    fontSize: 14,
    fontWeight: '600',
  },
  // IDE Styles
  ideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.Colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.Colors.border.muted,
  },
  sidebarToggle: {
    padding: 8,
    marginRight: 12,
  },
  ideTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.Colors.text.primary,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    padding: 8,
  },
  ideBody: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 280,
    backgroundColor: Colors.Colors.background.secondary,
    borderRightWidth: 1,
    borderRightColor: Colors.Colors.border.muted,
    flexDirection: 'row',
  },
  sidebarMobile: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 100,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  ideBodyMobile: {
    position: 'relative',
  },
  editorAreaWithSidebar: {
    marginLeft: 0,
  },
  editorMobile: {
    paddingBottom: 80,
  },
  floatingToolbar: {
    position: 'absolute',
    right: 16,
    top: '50%',
    transform: [{ translateY: -150 }],
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 12,
    padding: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.Colors.border.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  floatingToolbarButton: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: Colors.Colors.background.secondary,
    position: 'relative',
  },
  tooltip: {
    position: 'absolute',
    right: 50,
    top: '50%',
    transform: [{ translateY: -12 }],
    backgroundColor: Colors.Colors.background.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.Colors.border.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    minWidth: 80,
  },
  tooltipText: {
    color: Colors.Colors.text.primary,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  aiPanelMobile: {
    paddingBottom: 16,
  },
  sidebarTabs: {
    width: 48,
    backgroundColor: Colors.Colors.background.primary,
    paddingVertical: 8,
  },
  sidebarTab: {
    padding: 12,
    alignItems: 'center',
    marginBottom: 4,
  },
  activeSidebarTab: {
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 4,
  },
  sidebarContent: {
    flex: 1,
    padding: 12,
  },
  explorerPanel: {
    flex: 1,
  },
  searchPanel: {
    flex: 1,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  panelTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.Colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fileTree: {
    flex: 1,
  },
  projectName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.Colors.text.primary,
    marginBottom: 8,
  },
  fileTreeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 8,
  },
  fileTreeText: {
    fontSize: 13,
    color: Colors.Colors.text.secondary,
  },
  searchInput: {
    backgroundColor: Colors.Colors.background.card,
    borderColor: Colors.Colors.border.muted,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: Colors.Colors.text.primary,
    fontSize: 13,
  },
  editorArea: {
    flex: 1,
    flexDirection: 'column',
  },
  tabBar: {
    backgroundColor: Colors.Colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.Colors.border.muted,
    paddingHorizontal: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 4,
    borderRadius: 4,
    gap: 8,
  },
  activeTab: {
    backgroundColor: Colors.Colors.background.card,
  },
  tabText: {
    fontSize: 13,
    color: Colors.Colors.text.secondary,
  },
  activeTabText: {
    color: Colors.Colors.text.primary,
  },
  modifiedTabText: {
    fontWeight: '600',
  },
  tabClose: {
    padding: 2,
  },
  editor: {
    flex: 1,
    backgroundColor: Colors.Colors.background.card,
  },
  editorToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.Colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.Colors.border.muted,
    gap: 8,
  },
  toolbarButton: {
    padding: 6,
  },
  codeEditor: {
    flex: 1,
  },
  aiPanel: {
    backgroundColor: Colors.Colors.background.secondary,
    borderTopWidth: 1,
    borderTopColor: Colors.Colors.border.muted,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  aiTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.Colors.text.primary,
  },
  aiInputContainer: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-end',
  },
  aiInput: {
    flex: 1,
    backgroundColor: Colors.Colors.background.card,
    borderColor: Colors.Colors.border.muted,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: Colors.Colors.text.primary,
    fontSize: 13,
    maxHeight: 80,
  },
  aiButton: {
    backgroundColor: Colors.Colors.cyan.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  aiButtonDisabled: {
    opacity: 0.6,
  },
  aiButtonText: {
    color: Colors.Colors.text.inverse,
    fontSize: 13,
    fontWeight: '600',
  },
});