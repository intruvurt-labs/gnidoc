// NoCodeBuilderContext.tsx
import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/** ───────────────────────── Types ───────────────────────── **/
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

/** ───────────────────────── Constants ───────────────────────── **/
const STORAGE_KEY = 'nocode-builder-projects';
const SAVE_DEBOUNCE_MS = 160;
const GRID_SIZE = 4;

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
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  borderRadius: { sm: 4, md: 8, lg: 12, xl: 16 },
};

/** ───────────────────────── Utils ───────────────────────── **/
const logger = {
  info: (...a: any[]) => { if (typeof __DEV__ === 'undefined' || __DEV__) console.log(...a); },
  warn: (...a: any[]) => { if (typeof __DEV__ === 'undefined' || __DEV__) console.warn(...a); },
  error: (...a: any[]) => console.error(...a),
};

const now = () => new Date();
const toDate = (v: any) => (v ? new Date(v) : undefined);
const id = (p: string) => `${p}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const snap = (n: number) => Math.round(n / GRID_SIZE) * GRID_SIZE;

function debounce<T extends (...args: any[]) => void>(fn: T, ms = 200) {
  let t: any; return (...args: Parameters<T>) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

function deepClone<T>(x: T): T { return JSON.parse(JSON.stringify(x)); }
function ensureArray<T>(x: T | T[] | undefined): T[] { return Array.isArray(x) ? x : (x ? [x] : []); }

function sanitizeStyle(style: Record<string, any> = {}) {
  const allowed = [
    // Layout
    'flex','flexGrow','flexShrink','flexBasis','flexDirection','alignItems','justifyContent','alignSelf','gap',
    // Positioning/size
    'position','top','left','right','bottom','width','height','minWidth','minHeight','maxWidth','maxHeight',
    // Spacing
    'margin','marginTop','marginLeft','marginRight','marginBottom','padding','paddingTop','paddingLeft','paddingRight','paddingBottom',
    // Visual
    'backgroundColor','borderColor','borderWidth','borderRadius','opacity',
    // Text
    'color','fontSize','fontWeight','textAlign','lineHeight',
  ];
  const out: Record<string, any> = {};
  for (const k of Object.keys(style || {})) if (allowed.includes(k)) out[k] = style[k];
  return out;
}

function uniqueRoute(route: string, screens: Screen[], exceptId?: string) {
  const r = route.trim().toLowerCase();
  const dup = screens.find(s => s.route.toLowerCase() === r && s.id !== exceptId);
  if (dup) throw new Error(`Route "${route}" already exists (screen "${dup.name}")`);
  return r;
}

function migrateProject(raw: any): NoCodeProject {
  const project: NoCodeProject = {
    id: raw.id || id('project'),
    name: raw.name || 'Untitled',
    description: raw.description || '',
    designSystem: raw.designSystem || DEFAULT_DESIGN_SYSTEM,
    screens: ensureArray(raw.screens).map((s: any) => ({
      id: s.id || id('screen'),
      name: s.name || 'Screen',
      route: s.route || 'screen',
      components: ensureArray(s.components).map(migrateComponent),
      navigation: {
        headerShown: s.navigation?.headerShown ?? true,
        headerTitle: s.navigation?.headerTitle ?? (s.name || 'Screen'),
        headerStyle: s.navigation?.headerStyle ?? {},
      },
      createdAt: toDate(s.createdAt) || now(),
      updatedAt: toDate(s.updatedAt) || now(),
    })),
    navigation: {
      type: raw.navigation?.type || 'stack',
      initialRoute: raw.navigation?.initialRoute || 'home',
    },
    createdAt: toDate(raw.createdAt) || now(),
    updatedAt: toDate(raw.updatedAt) || now(),
  };

  if (project.screens.length === 0) {
    const home: Screen = {
      id: id('screen'),
      name: 'Home',
      route: 'home',
      components: [],
      navigation: { headerShown: true, headerTitle: 'Home', headerStyle: {} },
      createdAt: now(),
      updatedAt: now(),
    };
    project.screens.push(home);
  }
  // enforce unique routes
  const seen = new Set<string>();
  project.screens.forEach(s => {
    const r = s.route.toLowerCase();
    if (seen.has(r)) s.route = `${s.route}-${s.id.slice(-4)}`;
    seen.add(s.route.toLowerCase());
  });
  return project;
}

function migrateComponent(c: any): ComponentDefinition {
  const comp: ComponentDefinition = {
    id: c.id || id('component'),
    type: c.type || 'View',
    label: c.label || c.type || 'View',
    props: c.props || {},
    style: sanitizeStyle(c.style || {}),
    children: ensureArray(c.children).map(migrateComponent),
    position: { x: snap(c.position?.x ?? 0), y: snap(c.position?.y ?? 0) },
    size: { width: snap(c.size?.width ?? 100), height: snap(c.size?.height ?? 40) },
  };
  return comp;
}

function safeParseJSONBlock(s: string): any {
  // Try to extract the largest JSON object
  const match = s.match(/\{[\s\S]*\}$/m) || s.match(/\{[\s\S]*\}/m);
  const raw = match ? match[0] : s;
  try { return JSON.parse(raw); } catch { return null; }
}

/** ───────────────────────── Undo/Redo ───────────────────────── **/
type HistoryEntry = NoCodeProject[];
class History {
  private past: HistoryEntry[] = [];
  private future: HistoryEntry[] = [];
  push(state: NoCodeProject[]) { this.past.push(deepClone(state)); this.future = []; }
  undo(current: NoCodeProject[]) { if (!this.past.length) return null; this.future.push(deepClone(current)); return this.past.pop() || null; }
  redo(current: NoCodeProject[]) { if (!this.future.length) return null; this.past.push(deepClone(current)); return this.future.pop() || null; }
}

/** ───────────────────────── Context ───────────────────────── **/
export const [NoCodeBuilderProvider, useNoCodeBuilder] = createContextHook(() => {
  const [projects, setProjects] = useState<NoCodeProject[]>([]);
  const [currentProject, setCurrentProject] = useState<NoCodeProject | null>(null);
  const [selectedScreen, setSelectedScreen] = useState<Screen | null>(null);
  const [selectedComponent, setSelectedComponent] = useState<ComponentDefinition | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [previewMode, setPreviewMode] = useState<'mobile' | 'tablet' | 'desktop'>('mobile');

  const historyRef = useRef(new History());
  const saveQueued = useRef(false);

  /** Debounced persistence */
  const persist = useCallback(
    debounce(async (state: NoCodeProject[]) => {
      try {
        await AsyncStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(
            state.map(p => ({
              ...p,
              createdAt: p.createdAt.toISOString(),
              updatedAt: p.updatedAt.toISOString(),
              screens: p.screens.map(s => ({
                ...s,
                createdAt: s.createdAt.toISOString(),
                updatedAt: s.updatedAt.toISOString(),
              })),
            }))
          )
        );
      } catch (e) { logger.error('[NoCodeBuilder] Save failed:', e); }
      finally { saveQueued.current = false; }
    }, SAVE_DEBOUNCE_MS),
    []
  );

  const saveProjects = useCallback(async (updated: NoCodeProject[], pushHistory = true) => {
    setProjects(updated);
    if (pushHistory) historyRef.current.push(updated);
    if (!saveQueued.current) { saveQueued.current = true; persist(updated); }
  }, [persist]);

  /** Load persisted projects */
  const loadProjects = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const migrated: NoCodeProject[] = parsed.map((p: any) => migrateProject(p));
        await saveProjects(migrated, false);
        if (migrated.length) {
          setCurrentProject(migrated[0]);
          setSelectedScreen(migrated[0].screens[0]);
        }
        logger.info(`[NoCodeBuilder] Loaded ${migrated.length} projects`);
      }
    } catch (error) {
      logger.error('[NoCodeBuilder] Failed to load projects:', error);
    }
  }, [saveProjects]);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  /** ───────── Project CRUD ───────── **/
  const createProject = useCallback(async (name: string, description: string = '') => {
    const project: NoCodeProject = {
      id: id('project'),
      name,
      description,
      screens: [],
      designSystem: DEFAULT_DESIGN_SYSTEM,
      navigation: { type: 'stack', initialRoute: 'home' },
      createdAt: now(),
      updatedAt: now(),
    };
    const home: Screen = {
      id: id('screen'),
      name: 'Home',
      route: 'home',
      components: [],
      navigation: { headerShown: true, headerTitle: 'Home', headerStyle: {} },
      createdAt: now(),
      updatedAt: now(),
    };
    project.screens.push(home);

    const updated = [...projects, project];
    await saveProjects(updated);
    setCurrentProject(project);
    setSelectedScreen(home);
    logger.info('[NoCodeBuilder] Created project:', name);
    return project;
  }, [projects, saveProjects]);

  const updateProject = useCallback(async (projectId: string, updates: Partial<NoCodeProject>) => {
    const updated = projects.map(p => p.id === projectId ? { ...p, ...updates, updatedAt: now() } : p);
    await saveProjects(updated);
    if (currentProject?.id === projectId) {
      const refreshed = updated.find(p => p.id === projectId) || null;
      setCurrentProject(refreshed);
    }
  }, [projects, currentProject, saveProjects]);

  const deleteProject = useCallback(async (projectId: string) => {
    const updated = projects.filter(p => p.id !== projectId);
    await saveProjects(updated);
    if (currentProject?.id === projectId) {
      setCurrentProject(updated[0] || null);
      setSelectedScreen(updated[0]?.screens[0] || null);
    }
  }, [projects, currentProject, saveProjects]);

  /** ───────── Screen CRUD ───────── **/
  const addScreen = useCallback(async (projectId: string, name: string, route: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    const safeRoute = uniqueRoute(route, project.screens);
    const screen: Screen = {
      id: id('screen'),
      name,
      route: safeRoute,
      components: [],
      navigation: { headerShown: true, headerTitle: name, headerStyle: {} },
      createdAt: now(),
      updatedAt: now(),
    };
    await updateProject(projectId, { screens: [...project.screens, screen] });
    setSelectedScreen(screen);
    logger.info('[NoCodeBuilder] Added screen:', name);
  }, [projects, updateProject]);

  const updateScreen = useCallback(async (projectId: string, screenId: string, updates: Partial<Screen>) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    const updatedScreens = project.screens.map(s => {
      let next = s.id === screenId ? { ...s, ...updates } : s;
      if (next.id === screenId && updates.route) {
        next.route = uniqueRoute(updates.route, project.screens, screenId);
      }
      return next.id === screenId ? { ...next, updatedAt: now() } : next;
    });

    await updateProject(projectId, { screens: updatedScreens });
    if (selectedScreen?.id === screenId) setSelectedScreen(updatedScreens.find(s => s.id === screenId) || null);
  }, [projects, selectedScreen, updateProject]);

  const deleteScreen = useCallback(async (projectId: string, screenId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    const updatedScreens = project.screens.filter(s => s.id !== screenId);
    await updateProject(projectId, { screens: updatedScreens });
    if (selectedScreen?.id === screenId) setSelectedScreen(updatedScreens[0] || null);
  }, [projects, selectedScreen, updateProject]);

  /** ───────── Component Tree utilities ───────── **/
  const updateComponentTree = (components: ComponentDefinition[], componentId: string, fn: (c: ComponentDefinition) => ComponentDefinition): ComponentDefinition[] =>
    components.map(c => {
      if (c.id === componentId) return fn(c);
      if (c.children?.length) return { ...c, children: updateComponentTree(c.children, componentId, fn) };
      return c;
    });

  const mapTree = (components: ComponentDefinition[], fn: (c: ComponentDefinition) => ComponentDefinition): ComponentDefinition[] =>
    components.map(c => ({ ...fn(c), children: c.children?.length ? mapTree(c.children, fn) : [] }));

  const removeFromTree = (components: ComponentDefinition[], componentId: string): ComponentDefinition[] =>
    components.filter(c => c.id !== componentId).map(c => ({ ...c, children: removeFromTree(c.children, componentId) }));

  const addComponent = useCallback(async (projectId: string, screenId: string, component: Omit<ComponentDefinition, 'id'>) => {
    const project = projects.find(p => p.id === projectId); if (!project) return;
    const screen = project.screens.find(s => s.id === screenId); if (!screen) return;

    const newComp: ComponentDefinition = migrateComponent({ ...component, id: id('component') });
    const updated = screen.components.concat(newComp);
    await updateScreen(projectId, screenId, { components: updated });
    logger.info('[NoCodeBuilder] Added component:', component.type);
    return newComp;
  }, [projects, updateScreen]);

  const updateComponent = useCallback(async (projectId: string, screenId: string, componentId: string, updates: Partial<ComponentDefinition>) => {
    const project = projects.find(p => p.id === projectId); if (!project) return;
    const screen = project.screens.find(s => s.id === screenId); if (!screen) return;

    const updatedComponents = updateComponentTree(screen.components, componentId, c => {
      const next = { ...c, ...updates };
      if (updates.style) next.style = sanitizeStyle({ ...c.style, ...updates.style });
      if (updates.position) next.position = { x: snap(updates.position.x ?? c.position.x), y: snap(updates.position.y ?? c.position.y) };
      if (updates.size) next.size = { width: snap(updates.size.width ?? c.size.width), height: snap(updates.size.height ?? c.size.height) };
      return next;
    });
    await updateScreen(projectId, screenId, { components: updatedComponents });
  }, [projects, updateScreen]);

  const deleteComponent = useCallback(async (projectId: string, screenId: string, componentId: string) => {
    const project = projects.find(p => p.id === projectId); if (!project) return;
    const screen = project.screens.find(s => s.id === screenId); if (!screen) return;

    const updated = removeFromTree(screen.components, componentId);
    await updateScreen(projectId, screenId, { components: updated });
    if (selectedComponent?.id === componentId) setSelectedComponent(null);
  }, [projects, selectedComponent, updateScreen]);

  const duplicateComponent = useCallback(async (projectId: string, screenId: string, componentId: string) => {
    const project = projects.find(p => p.id === projectId); if (!project) return;
    const screen = project.screens.find(s => s.id === screenId); if (!screen) return;

    const withNewIds = (c: ComponentDefinition): ComponentDefinition => ({
      ...c,
      id: id('component'),
      position: { x: snap(c.position.x + GRID_SIZE), y: snap(c.position.y + GRID_SIZE) },
      children: c.children.map(withNewIds),
    });

    let cloned: ComponentDefinition | null = null;
    const findAndClone = (nodes: ComponentDefinition[]): ComponentDefinition[] => nodes.flatMap(n => {
      if (n.id === componentId) { cloned = withNewIds(deepClone(n)); return [n, cloned]; }
      return [{ ...n, children: findAndClone(n.children) }];
    });

    const updated = findAndClone(screen.components);
    await updateScreen(projectId, screenId, { components: updated });
    return cloned;
  }, [projects, updateScreen]);

  const reorderComponent = useCallback(async (projectId: string, screenId: string, componentId: string, direction: 'forward' | 'backward') => {
    const project = projects.find(p => p.id === projectId); if (!project) return;
    const screen = project.screens.find(s => s.id === screenId); if (!screen) return;

    const arr = [...screen.components];
    const idx = arr.findIndex(c => c.id === componentId);
    if (idx === -1) return;

    if (direction === 'forward' && idx < arr.length - 1) [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
    if (direction === 'backward' && idx > 0) [arr[idx], arr[idx - 1]] = [arr[idx - 1], arr[idx]];

    await updateScreen(projectId, screenId, { components: arr });
  }, [projects, updateScreen]);

  /** Clipboard (in-memory) */
  const clipboardRef = useRef<ComponentDefinition | null>(null);
  const copyComponent = useCallback((c: ComponentDefinition) => { clipboardRef.current = deepClone(c); }, []);
  const pasteComponent = useCallback(async (projectId: string, screenId: string) => {
    const clip = clipboardRef.current; if (!clip) return null;
    const pasted = migrateComponent({ ...clip, id: id('component'), position: { x: snap(clip.position.x + 16), y: snap(clip.position.y + 16) } });
    return addComponent(projectId, screenId, pasted);
  }, [addComponent]);

  /** Undo/Redo */
  const undo = useCallback(async () => {
    const prev = historyRef.current.undo(projects);
    if (prev) { setProjects(prev); persist(prev); }
  }, [projects, persist]);

  const redo = useCallback(async () => {
    const next = historyRef.current.redo(projects);
    if (next) { setProjects(next); persist(next); }
  }, [projects, persist]);

  /** ───────── AI: Generate Screen ───────── **/
  const generateScreenFromPrompt = useCallback(async (projectId: string, prompt: string): Promise<Screen> => {
    setIsGenerating(true);
    logger.info('[NoCodeBuilder] Generating from prompt:', prompt);
    try {
      const { generateText } = await import('@rork/toolkit-sdk');

      const systemPrompt = `You are an expert mobile UI/UX designer. Generate a complete screen definition.

Return ONLY JSON with:
{
  "name": "Screen Name",
  "route": "screen-route",
  "components": [
    {
      "type": "View|Text|Button|TextInput|Image|ScrollView|FlatList|TouchableOpacity",
      "label": "Readable label",
      "props": {...},
      "style": {...},
      "children": [],
      "position": {"x": 0, "y": 0},
      "size": {"width": 100, "height": 40}
    }
  ]
}

Color scheme: primary #00FFFF, secondary #FF0040, background #000000. Use absolute positions & sizes (px).`;

      const resp = await generateText({ messages: [{ role: 'user', content: `${systemPrompt}\n\nUser Request: ${prompt}` }] });
      const data = safeParseJSONBlock(resp);
      if (!data?.name || !data?.route) throw new Error('Invalid AI response');

      const project = projects.find(p => p.id === projectId);
      if (!project) throw new Error('Project not found');

      const screen: Screen = {
        id: id('screen'),
        name: String(data.name).trim(),
        route: uniqueRoute(String(data.route).trim(), project.screens),
        components: ensureArray(data.components).map((c: any) => migrateComponent(c)),
        navigation: { headerShown: true, headerTitle: String(data.name).trim(), headerStyle: {} },
        createdAt: now(),
        updatedAt: now(),
      };

      await updateProject(projectId, { screens: [...project.screens, screen] });
      setSelectedScreen(screen);
      logger.info('[NoCodeBuilder] Generated screen:', screen.name);
      return screen;
    } catch (e) {
      logger.error('[NoCodeBuilder] Generation failed:', e);
      throw e;
    } finally {
      setIsGenerating(false);
    }
  }, [projects, updateProject]);

  /** ───────── Code Exporter ───────── **/
  const exportToCode = useCallback((projectId: string): string => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return '';

    const ds = project.designSystem || DEFAULT_DESIGN_SYSTEM;

    const jsxProps = (props: Record<string, any>) =>
      Object.entries(props || {})
        .map(([k, v]) => `${k}={${JSON.stringify(v)}}`)
        .join(' ');

    const toJSX = (c: ComponentDefinition, indent = 4): string => {
      const pad = ' '.repeat(indent);
      const style = sanitizeStyle(c.style);
      const styleStr = Object.keys(style).length ? ` style={${JSON.stringify(style)}}` : '';
      const propStr = jsxProps(c.props);
      const open = `${pad}<${c.type}${propStr ? ' ' + propStr : ''}${styleStr}>`;
      if (!c.children?.length && c.type !== 'Text' && c.type !== 'Image' && c.type !== 'TextInput' && c.type !== 'Button') {
        return `${pad}<${c.type}${propStr ? ' ' + propStr : ''}${styleStr} />`;
      }
      const children = (c.children || []).map(child => toJSX(child, indent + 2)).join('\n');
      const labelText = c.type === 'Text' ? `${pad}  ${c.label || ''}\n` : '';
      return `${open}\n${labelText}${children}\n${pad}</${c.type}>`;
    };

    const screensCode = project.screens.map(s => {
      const body = s.components.map(c => toJSX(c)).join('\n');
      return `
export function ${normalizeComponentName(s.name)}Screen() {
  return (
    <View style={styles.screen}>
${body}
    </View>
  );
}`;
    }).join('\n');

    const code = `import React from 'react';
import { View, Text, StyleSheet, Button, TextInput, Image, ScrollView, FlatList, TouchableOpacity } from 'react-native';

${screensCode}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '${ds.colors.background}',
    padding: ${ds.spacing.md},
  },
});

export default {
  initialRoute: '${project.navigation.initialRoute}',
};
`;
    return code.trim();
  }, [projects]);

  function normalizeComponentName(name: string) {
    return name.replace(/[^a-zA-Z0-9]+/g, ' ').trim().split(' ').map(w => w[0]?.toUpperCase() + w.slice(1)).join('');
  }

  /** ───────── Public API ───────── **/
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
    duplicateComponent,
    reorderComponent,
    copyComponent,
    pasteComponent,
    undo,
    redo,
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
    duplicateComponent,
    reorderComponent,
    copyComponent,
    pasteComponent,
    undo,
    redo,
    generateScreenFromPrompt,
    exportToCode,
  ]);
});
