import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ComponentDefinition {
  id: string;
  type: 'View' | 'Text' | 'Button' | 'TextInput' | 'Image' | 'ScrollView' | 'FlatList' | 'TouchableOpacity';
  label: string;
  props: Record<string, any>;
  style: Record<string, any>;
  children: ComponentDefinition[];
  position: { x: number; y: number };
  size: { width: number; height: number };
}

export interface Screen {
  id: string;
  name: string;
  route: string;
  components: ComponentDefinition[];
  navigation: {
    headerShown: boolean;
    headerTitle: string;
    headerStyle: Record<string, any>;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface DesignSystem {
  colors: Record<string, string>;
  typography: Record<string, any>;
  spacing: Record<string, number>;
  borderRadius: Record<string, number>;
}

export interface NoCodeProject {
  id: string;
  name: string;
  description: string;
  screens: Screen[];
  designSystem: DesignSystem;
  navigation: {
    type: 'stack' | 'tabs' | 'drawer';
    initialRoute: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const DEFAULT_DESIGN_SYSTEM: DesignSystem = {
  colors: {
    primary: '#00FFFF',
    secondary: '#FF0040',
    background: '#000000',
    surface: '#1a1a1a',
    text: '#FFFFFF',
    textSecondary: '#999999',
    border: '#333333',
    success: '#00FF00',
    warning: '#FFA500',
    error: '#FF0000',
  },
  typography: {
    h1: { fontSize: 32, fontWeight: 'bold' },
    h2: { fontSize: 24, fontWeight: 'bold' },
    h3: { fontSize: 20, fontWeight: '600' },
    body: { fontSize: 16, fontWeight: 'normal' },
    caption: { fontSize: 12, fontWeight: 'normal' },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
  },
};

const STORAGE_KEY = 'nocode-builder-projects';

export const [NoCodeBuilderProvider, useNoCodeBuilder] = createContextHook(() => {
  const [projects, setProjects] = useState<NoCodeProject[]>([]);
  const [currentProject, setCurrentProject] = useState<NoCodeProject | null>(null);
  const [selectedScreen, setSelectedScreen] = useState<Screen | null>(null);
  const [selectedComponent, setSelectedComponent] = useState<ComponentDefinition | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [previewMode, setPreviewMode] = useState<'mobile' | 'tablet' | 'desktop'>('mobile');

  const loadProjects = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored).map((p: any) => ({
          ...p,
          createdAt: new Date(p.createdAt),
          updatedAt: new Date(p.updatedAt),
          screens: p.screens.map((s: any) => ({
            ...s,
            createdAt: new Date(s.createdAt),
            updatedAt: new Date(s.updatedAt),
          })),
        }));
        setProjects(parsed);
        console.log(`[NoCodeBuilder] Loaded ${parsed.length} projects`);
      }
    } catch (error) {
      console.error('[NoCodeBuilder] Failed to load projects:', error);
    }
  }, []);

  const saveProjects = useCallback(async (updatedProjects: NoCodeProject[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedProjects));
      setProjects(updatedProjects);
    } catch (error) {
      console.error('[NoCodeBuilder] Failed to save projects:', error);
    }
  }, []);

  const createProject = useCallback(async (name: string, description: string = '') => {
    const newProject: NoCodeProject = {
      id: `project-${Date.now()}`,
      name,
      description,
      screens: [],
      designSystem: DEFAULT_DESIGN_SYSTEM,
      navigation: {
        type: 'stack',
        initialRoute: 'home',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const homeScreen: Screen = {
      id: `screen-${Date.now()}`,
      name: 'Home',
      route: 'home',
      components: [],
      navigation: {
        headerShown: true,
        headerTitle: 'Home',
        headerStyle: {},
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    newProject.screens.push(homeScreen);

    const updatedProjects = [...projects, newProject];
    await saveProjects(updatedProjects);
    setCurrentProject(newProject);
    setSelectedScreen(homeScreen);

    console.log(`[NoCodeBuilder] Created project: ${name}`);
    return newProject;
  }, [projects, saveProjects]);

  const updateProject = useCallback(async (projectId: string, updates: Partial<NoCodeProject>) => {
    const updatedProjects = projects.map(p =>
      p.id === projectId
        ? { ...p, ...updates, updatedAt: new Date() }
        : p
    );
    await saveProjects(updatedProjects);
    
    if (currentProject?.id === projectId) {
      setCurrentProject(updatedProjects.find(p => p.id === projectId) || null);
    }
  }, [projects, currentProject, saveProjects]);

  const deleteProject = useCallback(async (projectId: string) => {
    const updatedProjects = projects.filter(p => p.id !== projectId);
    await saveProjects(updatedProjects);
    
    if (currentProject?.id === projectId) {
      setCurrentProject(null);
      setSelectedScreen(null);
    }
  }, [projects, currentProject, saveProjects]);

  const addScreen = useCallback(async (projectId: string, name: string, route: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    const newScreen: Screen = {
      id: `screen-${Date.now()}`,
      name,
      route,
      components: [],
      navigation: {
        headerShown: true,
        headerTitle: name,
        headerStyle: {},
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await updateProject(projectId, {
      screens: [...project.screens, newScreen],
    });

    setSelectedScreen(newScreen);
    console.log(`[NoCodeBuilder] Added screen: ${name}`);
  }, [projects, updateProject]);

  const updateScreen = useCallback(async (projectId: string, screenId: string, updates: Partial<Screen>) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    const updatedScreens = project.screens.map(s =>
      s.id === screenId
        ? { ...s, ...updates, updatedAt: new Date() }
        : s
    );

    await updateProject(projectId, { screens: updatedScreens });

    if (selectedScreen?.id === screenId) {
      setSelectedScreen(updatedScreens.find(s => s.id === screenId) || null);
    }
  }, [projects, selectedScreen, updateProject]);

  const deleteScreen = useCallback(async (projectId: string, screenId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    const updatedScreens = project.screens.filter(s => s.id !== screenId);
    await updateProject(projectId, { screens: updatedScreens });

    if (selectedScreen?.id === screenId) {
      setSelectedScreen(updatedScreens[0] || null);
    }
  }, [projects, selectedScreen, updateProject]);

  const addComponent = useCallback(async (
    projectId: string,
    screenId: string,
    component: Omit<ComponentDefinition, 'id'>
  ) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    const screen = project.screens.find(s => s.id === screenId);
    if (!screen) return;

    const newComponent: ComponentDefinition = {
      ...component,
      id: `component-${Date.now()}`,
    };

    await updateScreen(projectId, screenId, {
      components: [...screen.components, newComponent],
    });

    console.log(`[NoCodeBuilder] Added component: ${component.type}`);
    return newComponent;
  }, [projects, updateScreen]);

  const updateComponent = useCallback(async (
    projectId: string,
    screenId: string,
    componentId: string,
    updates: Partial<ComponentDefinition>
  ) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    const screen = project.screens.find(s => s.id === screenId);
    if (!screen) return;

    const updateComponentRecursive = (components: ComponentDefinition[]): ComponentDefinition[] => {
      return components.map(c => {
        if (c.id === componentId) {
          return { ...c, ...updates };
        }
        if (c.children.length > 0) {
          return { ...c, children: updateComponentRecursive(c.children) };
        }
        return c;
      });
    };

    const updatedComponents = updateComponentRecursive(screen.components);
    await updateScreen(projectId, screenId, { components: updatedComponents });
  }, [projects, updateScreen]);

  const deleteComponent = useCallback(async (
    projectId: string,
    screenId: string,
    componentId: string
  ) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    const screen = project.screens.find(s => s.id === screenId);
    if (!screen) return;

    const deleteComponentRecursive = (components: ComponentDefinition[]): ComponentDefinition[] => {
      return components
        .filter(c => c.id !== componentId)
        .map(c => ({
          ...c,
          children: deleteComponentRecursive(c.children),
        }));
    };

    const updatedComponents = deleteComponentRecursive(screen.components);
    await updateScreen(projectId, screenId, { components: updatedComponents });

    if (selectedComponent?.id === componentId) {
      setSelectedComponent(null);
    }
  }, [projects, selectedComponent, updateScreen]);

  const generateScreenFromPrompt = useCallback(async (
    projectId: string,
    prompt: string
  ): Promise<Screen> => {
    setIsGenerating(true);
    console.log(`[NoCodeBuilder] Generating screen from prompt: ${prompt}`);

    try {
      const { generateText } = await import('@rork/toolkit-sdk');
      
      const systemPrompt = `You are an expert mobile UI/UX designer. Generate a complete screen definition based on the user's request.

Return a JSON object with this structure:
{
  "name": "Screen Name",
  "route": "screen-route",
  "components": [
    {
      "type": "View",
      "label": "Container",
      "props": {},
      "style": { "flex": 1, "padding": 16 },
      "children": [],
      "position": { "x": 0, "y": 0 },
      "size": { "width": 100, "height": 100 }
    }
  ]
}

Use these component types: View, Text, Button, TextInput, Image, ScrollView, FlatList, TouchableOpacity
Use the color scheme: primary #00FFFF, secondary #FF0040, background #000000`;

      const response = await generateText({
        messages: [
          { role: 'user', content: `${systemPrompt}\n\nUser Request: ${prompt}` }
        ]
      });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to parse screen definition');
      }

      const screenData = JSON.parse(jsonMatch[0]);
      
      const newScreen: Screen = {
        id: `screen-${Date.now()}`,
        name: screenData.name,
        route: screenData.route,
        components: screenData.components.map((c: any, index: number) => ({
          ...c,
          id: `component-${Date.now()}-${index}`,
        })),
        navigation: {
          headerShown: true,
          headerTitle: screenData.name,
          headerStyle: {},
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const project = projects.find(p => p.id === projectId);
      if (project) {
        await updateProject(projectId, {
          screens: [...project.screens, newScreen],
        });
      }

      setSelectedScreen(newScreen);
      console.log(`[NoCodeBuilder] Generated screen: ${newScreen.name}`);
      return newScreen;
    } catch (error) {
      console.error('[NoCodeBuilder] Screen generation failed:', error);
      throw error;
    } finally {
      setIsGenerating(false);
    }
  }, [projects, updateProject]);

  const exportToCode = useCallback((projectId: string): string => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return '';

    const generateComponentCode = (component: ComponentDefinition, indent: number = 2): string => {
      const indentStr = ' '.repeat(indent);
      const propsStr = Object.entries(component.props)
        .map(([key, value]) => `${key}={${JSON.stringify(value)}}`)
        .join(' ');
      
      const styleStr = `style={${JSON.stringify(component.style)}}`;
      
      if (component.children.length === 0) {
        return `${indentStr}<${component.type} ${propsStr} ${styleStr} />`;
      }

      const childrenCode = component.children
        .map(child => generateComponentCode(child, indent + 2))
        .join('\n');

      return `${indentStr}<${component.type} ${propsStr} ${styleStr}>\n${childrenCode}\n${indentStr}</${component.type}>`;
    };

    const screensCode = project.screens.map(screen => {
      const componentsCode = screen.components
        .map(c => generateComponentCode(c))
        .join('\n');

      return `
export function ${screen.name}Screen() {
  return (
    <View style={styles.container}>
${componentsCode}
    </View>
  );
}`;
    }).join('\n\n');

    return `import React from 'react';
import { View, Text, StyleSheet, Button, TextInput, Image, ScrollView, FlatList, TouchableOpacity } from 'react-native';

${screensCode}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '${project.designSystem.colors.background}',
  },
});
`;
  }, [projects]);

  return useMemo(() => ({
    projects,
    currentProject,
    selectedScreen,
    selectedComponent,
    isGenerating,
    previewMode,
    loadProjects,
    createProject,
    updateProject,
    deleteProject,
    setCurrentProject,
    addScreen,
    updateScreen,
    deleteScreen,
    setSelectedScreen,
    addComponent,
    updateComponent,
    deleteComponent,
    setSelectedComponent,
    generateScreenFromPrompt,
    exportToCode,
    setPreviewMode,
  }), [
    projects,
    currentProject,
    selectedScreen,
    selectedComponent,
    isGenerating,
    previewMode,
    loadProjects,
    createProject,
    updateProject,
    deleteProject,
    addScreen,
    updateScreen,
    deleteScreen,
    addComponent,
    updateComponent,
    deleteComponent,
    generateScreenFromPrompt,
    exportToCode,
  ]);
});
