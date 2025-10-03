import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';


interface Project {
  id: string;
  name: string;
  type: 'react-native' | 'web' | 'api' | 'mobile';
  status: 'active' | 'completed' | 'paused';
  progress: number;
  lastModified: Date;
  files: ProjectFile[];
}

interface ProjectFile {
  id: string;
  name: string;
  path: string;
  content: string;
  language: string;
  size: number;
}

interface CodeAnalysis {
  quality: number;
  coverage: number;
  performance: number;
  security: number;
  issues: CodeIssue[];
}

interface CodeIssue {
  id: string;
  type: 'error' | 'warning' | 'info';
  file: string;
  line: number;
  message: string;
  severity: 'high' | 'medium' | 'low';
}



export const [AgentProvider, useAgent] = createContextHook(() => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [analysis, setAnalysis] = useState<CodeAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const loadProjects = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('gnidoc-projects');
      if (stored) {
        const parsedProjects = JSON.parse(stored).map((p: any) => ({
          ...p,
          lastModified: new Date(p.lastModified)
        }));
        setProjects(parsedProjects);
        if (parsedProjects.length > 0) {
          setCurrentProject(parsedProjects[0]);
        }
      } else {
        // Initialize with sample project for demonstration
        const sampleProject: Project = {
          id: 'sample-1',
          name: 'Welcome Project',
          type: 'react-native',
          status: 'active',
          progress: 25,
          lastModified: new Date(),
          files: [
            {
              id: 'welcome-tsx',
              name: 'Welcome.tsx',
              path: '/src/components/Welcome.tsx',
              content: `import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function Welcome() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to gnidoC Terces!</Text>
      <Text style={styles.subtitle}>Start building amazing apps</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00FFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#FF0040',
  },
});`,
              language: 'typescript',
              size: 512
            }
          ]
        };
        setProjects([sampleProject]);
        setCurrentProject(sampleProject);
        await AsyncStorage.setItem('gnidoc-projects', JSON.stringify([sampleProject]));
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  }, []);

  // Load projects from storage
  useEffect(() => {
    loadProjects();
  }, [loadProjects]);



  const saveProjects = useCallback(async (updatedProjects: Project[]) => {
    try {
      await AsyncStorage.setItem('gnidoc-projects', JSON.stringify(updatedProjects));
      setProjects(updatedProjects);
    } catch (error) {
      console.error('Failed to save projects:', error);
    }
  }, []);

  const createProject = useCallback(async (name: string, type: Project['type']) => {
    const newProject: Project = {
      id: Date.now().toString(),
      name,
      type,
      status: 'active',
      progress: 0,
      lastModified: new Date(),
      files: []
    };

    const updatedProjects = [...projects, newProject];
    await saveProjects(updatedProjects);
    setCurrentProject(newProject);
    return newProject;
  }, [projects, saveProjects]);

  const updateProject = useCallback(async (projectId: string, updates: Partial<Project>) => {
    const updatedProjects = projects.map(project =>
      project.id === projectId
        ? { ...project, ...updates, lastModified: new Date() }
        : project
    );
    await saveProjects(updatedProjects);
    
    if (currentProject?.id === projectId) {
      setCurrentProject(updatedProjects.find(p => p.id === projectId) || null);
    }
  }, [projects, currentProject, saveProjects]);

  const deleteProject = useCallback(async (projectId: string) => {
    const updatedProjects = projects.filter(project => project.id !== projectId);
    await saveProjects(updatedProjects);
    
    if (currentProject?.id === projectId) {
      setCurrentProject(updatedProjects[0] || null);
    }
  }, [projects, currentProject, saveProjects]);

  const analyzeProject = useCallback(async (projectId: string) => {
    setIsAnalyzing(true);
    console.log(`[AgentContext] Starting project analysis for: ${projectId}`);
    
    try {
      const project = projects.find(p => p.id === projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      const totalLines = project.files.reduce((acc, file) => acc + file.content.split('\n').length, 0);
      const totalFiles = project.files.length;
      const hasTests = project.files.some(file => file.name.includes('.test.') || file.name.includes('.spec.'));
      const hasTypeScript = project.files.some(file => file.language === 'typescript');
      const hasErrorHandling = project.files.some(file => file.content.includes('try') && file.content.includes('catch'));
      
      const issues: CodeIssue[] = [];
      let securityIssues = 0;
      let performanceIssues = 0;
      let qualityIssues = 0;
      
      project.files.forEach(file => {
        const lines = file.content.split('\n');
        
        lines.forEach((line, index) => {
          if (line.includes('console.log') && !line.includes('//') && !line.includes('/*')) {
            issues.push({
              id: `${file.id}-${index}-console`,
              type: 'warning',
              file: file.name,
              line: index + 1,
              message: 'Remove console.log statements in production code',
              severity: 'low'
            });
            qualityIssues++;
          }
          
          if (line.includes('any') && file.language === 'typescript') {
            issues.push({
              id: `${file.id}-${index}-any`,
              type: 'warning',
              file: file.name,
              line: index + 1,
              message: 'Avoid using "any" type, use specific types instead',
              severity: 'medium'
            });
            qualityIssues++;
          }
          
          if (line.includes('eval(') || line.includes('dangerouslySetInnerHTML')) {
            issues.push({
              id: `${file.id}-${index}-security`,
              type: 'error',
              file: file.name,
              line: index + 1,
              message: 'Security risk: Avoid using eval() or dangerouslySetInnerHTML',
              severity: 'high'
            });
            securityIssues++;
          }
          
          if (line.includes('setState') && line.includes('for') || line.includes('while')) {
            issues.push({
              id: `${file.id}-${index}-perf`,
              type: 'warning',
              file: file.name,
              line: index + 1,
              message: 'Performance: Avoid calling setState in loops',
              severity: 'medium'
            });
            performanceIssues++;
          }
          
          if (line.includes('require(') && !line.includes('//')) {
            issues.push({
              id: `${file.id}-${index}-import`,
              type: 'info',
              file: file.name,
              line: index + 1,
              message: 'Consider using ES6 import instead of require()',
              severity: 'low'
            });
          }
        });
      });
      
      const qualityScore = Math.max(50, 100 - (qualityIssues * 2) - (!hasTypeScript ? 10 : 0) - (!hasErrorHandling ? 5 : 0));
      const coverageScore = hasTests ? Math.min(95, 60 + (totalFiles * 5)) : Math.min(50, totalFiles * 3);
      const performanceScore = Math.max(60, 100 - (performanceIssues * 5) - (totalLines > 2000 ? 10 : 0));
      const securityScore = Math.max(70, 100 - (securityIssues * 15));
      
      const analysis: CodeAnalysis = {
        quality: Math.round(qualityScore),
        coverage: Math.round(coverageScore),
        performance: Math.round(performanceScore),
        security: Math.round(securityScore),
        issues: issues.slice(0, 50)
      };
      
      console.log(`[AgentContext] Analysis completed. Found ${issues.length} issues. Quality: ${analysis.quality}%, Coverage: ${analysis.coverage}%, Performance: ${analysis.performance}%, Security: ${analysis.security}%`);
      setAnalysis(analysis);
    } catch (error) {
      console.error('[AgentContext] Analysis failed:', error);
      throw new Error(`Failed to analyze project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsAnalyzing(false);
    }
  }, [projects]);

  const generateCode = useCallback(async (prompt: string, language: string = 'typescript') => {
    setIsGenerating(true);
    console.log(`[AgentContext] Starting code generation for: ${prompt.substring(0, 50)}...`);
    
    try {
      const { generateText } = await import('@rork/toolkit-sdk');
      
      const systemPrompt = `You are a professional React Native developer with 25+ years of experience. Generate clean, production-ready code based on the user's request.

Follow these guidelines:
- Use TypeScript with proper typing and interfaces
- Follow React Native best practices and performance optimization
- Use StyleSheet for styling (never inline styles)
- Include proper imports from correct packages
- Add meaningful JSDoc comments for complex logic
- Use the cyan/red/black color scheme: #00FFFF (cyan), #FF0040 (red), #000000 (black)
- Make components reusable, well-structured, and maintainable
- Include proper error handling and loading states
- Use React hooks correctly (useState, useEffect, useCallback, useMemo)
- Add console.log statements for debugging
- Follow accessibility best practices
- Ensure web compatibility (avoid native-only APIs without Platform checks)

IMPORTANT: Generate ONLY the code, no explanations or markdown formatting.`;
      
      const generatedCode = await generateText({
        messages: [
          { role: 'user', content: `${systemPrompt}\n\nGenerate ${language} code for: ${prompt}` }
        ]
      });

      console.log(`[AgentContext] Code generation completed. Generated ${generatedCode.length} characters`);
      return generatedCode;
    } catch (error) {
      console.error('[AgentContext] Code generation failed:', error);
      throw new Error(`Failed to generate code: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const addFileToProject = useCallback(async (projectId: string, file: Omit<ProjectFile, 'id'>) => {
    console.log(`[AgentContext] Adding file ${file.name} to project ${projectId}`);
    
    try {
      const project = projects.find(p => p.id === projectId);
      if (!project) {
        throw new Error('Project not found');
      }
      
      const existingFile = project.files.find(f => f.path === file.path);
      if (existingFile) {
        console.log(`[AgentContext] File ${file.name} already exists, updating...`);
        const updatedProjects = projects.map(p =>
          p.id === projectId
            ? {
                ...p,
                files: p.files.map(f => f.path === file.path ? { ...file, id: f.id } : f),
                lastModified: new Date()
              }
            : p
        );
        await saveProjects(updatedProjects);
        
        if (currentProject?.id === projectId) {
          setCurrentProject(updatedProjects.find(p => p.id === projectId) || null);
        }
        
        return existingFile;
      }
      
      const newFile: ProjectFile = {
        ...file,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };

      const updatedProjects = projects.map(project =>
        project.id === projectId
          ? { ...project, files: [...project.files, newFile], lastModified: new Date() }
          : project
      );

      await saveProjects(updatedProjects);
      
      if (currentProject?.id === projectId) {
        setCurrentProject(updatedProjects.find(p => p.id === projectId) || null);
      }

      console.log(`[AgentContext] File ${file.name} added successfully`);
      return newFile;
    } catch (error) {
      console.error('[AgentContext] Failed to add file:', error);
      throw new Error(`Failed to add file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [projects, currentProject, saveProjects]);

  const uploadFileToProject = useCallback(async (projectId: string) => {
    console.log(`[AgentContext] Starting file upload for project ${projectId}`);
    
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['*/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled) {
        console.log('[AgentContext] File upload cancelled');
        return null;
      }

      const asset = result.assets[0];
      if (!asset) {
        throw new Error('No file selected');
      }

      console.log(`[AgentContext] File selected: ${asset.name}, size: ${asset.size} bytes`);

      let content = '';
      const isTextFile = /\.(txt|js|jsx|ts|tsx|json|md|css|html|xml|yaml|yml|toml|env|gitignore|sh|py|java|c|cpp|h|hpp|cs|go|rs|rb|php|swift|kt|sql)$/i.test(asset.name);
      
      if (isTextFile && asset.uri) {
        try {
          if (Platform.OS === 'web') {
            const response = await fetch(asset.uri);
            content = await response.text();
          } else {
            content = await FileSystem.readAsStringAsync(asset.uri, {
              encoding: FileSystem.EncodingType.UTF8,
            });
          }
          console.log(`[AgentContext] File content read successfully: ${content.length} characters`);
        } catch (readError) {
          console.warn('[AgentContext] Could not read file content, treating as binary:', readError);
          content = `// Binary file: ${asset.name}\n// Size: ${asset.size} bytes\n// Type: ${asset.mimeType || 'unknown'}`;
        }
      } else {
        content = `// Binary file: ${asset.name}\n// Size: ${asset.size} bytes\n// Type: ${asset.mimeType || 'unknown'}`;
      }

      const language = getLanguageFromFileName(asset.name);
      const path = `/uploaded/${asset.name}`;

      const newFile = await addFileToProject(projectId, {
        name: asset.name,
        path,
        content,
        language,
        size: asset.size || content.length,
      });

      console.log(`[AgentContext] File uploaded successfully: ${asset.name}`);
      return newFile;
    } catch (error) {
      console.error('[AgentContext] File upload failed:', error);
      throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [addFileToProject]);

  const uploadMultipleFiles = useCallback(async (projectId: string) => {
    console.log(`[AgentContext] Starting multiple file upload for project ${projectId}`);
    
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['*/*'],
        copyToCacheDirectory: true,
        multiple: true,
      });

      if (result.canceled) {
        console.log('[AgentContext] Multiple file upload cancelled');
        return [];
      }

      const uploadedFiles: ProjectFile[] = [];

      for (const asset of result.assets) {
        try {
          let content = '';
          const isTextFile = /\.(txt|js|jsx|ts|tsx|json|md|css|html|xml|yaml|yml|toml|env|gitignore|sh|py|java|c|cpp|h|hpp|cs|go|rs|rb|php|swift|kt|sql)$/i.test(asset.name);
          
          if (isTextFile && asset.uri) {
            try {
              if (Platform.OS === 'web') {
                const response = await fetch(asset.uri);
                content = await response.text();
              } else {
                content = await FileSystem.readAsStringAsync(asset.uri, {
                  encoding: FileSystem.EncodingType.UTF8,
                });
              }
            } catch (readError) {
              console.warn(`[AgentContext] Could not read ${asset.name}, treating as binary:`, readError);
              content = `// Binary file: ${asset.name}\n// Size: ${asset.size} bytes\n// Type: ${asset.mimeType || 'unknown'}`;
            }
          } else {
            content = `// Binary file: ${asset.name}\n// Size: ${asset.size} bytes\n// Type: ${asset.mimeType || 'unknown'}`;
          }

          const language = getLanguageFromFileName(asset.name);
          const path = `/uploaded/${asset.name}`;

          const newFile = await addFileToProject(projectId, {
            name: asset.name,
            path,
            content,
            language,
            size: asset.size || content.length,
          });

          uploadedFiles.push(newFile);
          console.log(`[AgentContext] File uploaded: ${asset.name}`);
        } catch (fileError) {
          console.error(`[AgentContext] Failed to upload ${asset.name}:`, fileError);
        }
      }

      console.log(`[AgentContext] Multiple file upload completed: ${uploadedFiles.length} files`);
      return uploadedFiles;
    } catch (error) {
      console.error('[AgentContext] Multiple file upload failed:', error);
      throw new Error(`Failed to upload files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [addFileToProject]);

  const deleteFileFromProject = useCallback(async (projectId: string, fileId: string) => {
    console.log(`[AgentContext] Deleting file ${fileId} from project ${projectId}`);
    
    try {
      const project = projects.find(p => p.id === projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      const updatedProjects = projects.map(p =>
        p.id === projectId
          ? {
              ...p,
              files: p.files.filter(f => f.id !== fileId),
              lastModified: new Date()
            }
          : p
      );

      await saveProjects(updatedProjects);
      
      if (currentProject?.id === projectId) {
        setCurrentProject(updatedProjects.find(p => p.id === projectId) || null);
      }

      console.log(`[AgentContext] File deleted successfully`);
    } catch (error) {
      console.error('[AgentContext] Failed to delete file:', error);
      throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [projects, currentProject, saveProjects]);

  return useMemo(() => ({
    // State
    projects,
    currentProject,
    analysis,
    isAnalyzing,
    isGenerating,
    
    // Actions
    createProject,
    updateProject,
    deleteProject,
    setCurrentProject,
    analyzeProject,
    generateCode,
    addFileToProject,
    uploadFileToProject,
    uploadMultipleFiles,
    deleteFileFromProject,
    loadProjects,
  }), [
    projects,
    currentProject,
    analysis,
    isAnalyzing,
    isGenerating,
    createProject,
    updateProject,
    deleteProject,
    analyzeProject,
    generateCode,
    addFileToProject,
    uploadFileToProject,
    uploadMultipleFiles,
    deleteFileFromProject,
    loadProjects,
  ]);
});

export function useProjectAnalysis() {
  const { analysis, analyzeProject, isAnalyzing, currentProject } = useAgent();
  
  const runAnalysis = () => {
    if (currentProject) {
      analyzeProject(currentProject.id);
    }
  };

  return {
    analysis,
    runAnalysis,
    isAnalyzing,
  };
}

export function useCodeGeneration() {
  const { generateCode, isGenerating, addFileToProject, currentProject } = useAgent();
  
  const generateAndSave = async (prompt: string, language: string = 'typescript') => {
    try {
      const code = await generateCode(prompt, language);
      
      if (currentProject) {
        const fileName = `generated_${Date.now()}.${language === 'typescript' ? 'tsx' : 'js'}`;
        await addFileToProject(currentProject.id, {
          name: fileName,
          path: `/src/generated/${fileName}`,
          content: code,
          language,
          size: code.length,
        });
      }
      
      return code;
    } catch (error) {
      console.error('Failed to generate and save code:', error);
      throw error;
    }
  };

  return {
    generateCode,
    generateAndSave,
    isGenerating,
  };
}

function getLanguageFromFileName(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  
  const languageMap: Record<string, string> = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'json': 'json',
    'md': 'markdown',
    'css': 'css',
    'scss': 'scss',
    'html': 'html',
    'xml': 'xml',
    'yaml': 'yaml',
    'yml': 'yaml',
    'toml': 'toml',
    'py': 'python',
    'java': 'java',
    'c': 'c',
    'cpp': 'cpp',
    'h': 'c',
    'hpp': 'cpp',
    'cs': 'csharp',
    'go': 'go',
    'rs': 'rust',
    'rb': 'ruby',
    'php': 'php',
    'swift': 'swift',
    'kt': 'kotlin',
    'sql': 'sql',
    'sh': 'shell',
  };
  
  return languageMap[ext || ''] || 'text';
}