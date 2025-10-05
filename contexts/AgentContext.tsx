import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { SUPPORTED_LANGUAGES, formatCode } from '@/lib/languages';


export interface Project {
  id: string;
  name: string;
  type: 'react-native' | 'web' | 'api' | 'mobile' | 'fullstack' | 'backend' | 'cli' | 'library';
  status: 'active' | 'completed' | 'paused';
  progress: number;
  lastModified: Date;
  files: ProjectFile[];
  primaryLanguage?: string;
  frameworks?: string[];
  dependencies?: Record<string, string>;
}

export interface ProjectFile {
  id: string;
  name: string;
  path: string;
  content: string;
  language: string;
  size: number;
  lastModified?: Date;
  isReadOnly?: boolean;
}

export interface CodeAnalysis {
  quality: number;
  coverage: number;
  performance: number;
  security: number;
  maintainability: number;
  complexity: number;
  issues: CodeIssue[];
  suggestions: string[];
  metrics: {
    linesOfCode: number;
    filesCount: number;
    functionsCount: number;
    classesCount: number;
  };
}

export interface CodeIssue {
  id: string;
  type: 'error' | 'warning' | 'info' | 'suggestion';
  file: string;
  line: number;
  column?: number;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'syntax' | 'logic' | 'performance' | 'security' | 'style' | 'best-practice';
  fixable: boolean;
  suggestedFix?: string;
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
        if (parsedProjects.length > 0 && !currentProject) {
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
  }, [currentProject]);

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
              severity: 'low',
              category: 'best-practice',
              fixable: true,
              suggestedFix: 'Remove or replace with proper logging'
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
              severity: 'medium',
              category: 'style',
              fixable: false
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
              severity: 'critical',
              category: 'security',
              fixable: false
            });
            securityIssues++;
          }
          
          if (line.includes('setState') && (line.includes('for') || line.includes('while'))) {
            issues.push({
              id: `${file.id}-${index}-perf`,
              type: 'warning',
              file: file.name,
              line: index + 1,
              message: 'Performance: Avoid calling setState in loops',
              severity: 'medium',
              category: 'performance',
              fixable: false
            });
            performanceIssues++;
          }
          
          if (line.includes('require(') && !line.includes('//')) {
            issues.push({
              id: `${file.id}-${index}-import`,
              type: 'suggestion',
              file: file.name,
              line: index + 1,
              message: 'Consider using ES6 import instead of require()',
              severity: 'low',
              category: 'style',
              fixable: true,
              suggestedFix: 'Convert to ES6 import statement'
            });
          }
        });
      });
      
      const qualityScore = Math.max(50, 100 - (qualityIssues * 2) - (!hasTypeScript ? 10 : 0) - (!hasErrorHandling ? 5 : 0));
      const coverageScore = hasTests ? Math.min(95, 60 + (totalFiles * 5)) : Math.min(50, totalFiles * 3);
      const performanceScore = Math.max(60, 100 - (performanceIssues * 5) - (totalLines > 2000 ? 10 : 0));
      const securityScore = Math.max(70, 100 - (securityIssues * 15));
      const maintainabilityScore = Math.max(60, 100 - (totalLines / 100) - (totalFiles > 50 ? 10 : 0));
      const complexityScore = Math.max(50, 100 - (totalLines / 50));
      
      const functionsCount = project.files.reduce((acc, file) => 
        acc + (file.content.match(/function\s+\w+|const\s+\w+\s*=\s*\(/g) || []).length, 0
      );
      const classesCount = project.files.reduce((acc, file) => 
        acc + (file.content.match(/class\s+\w+/g) || []).length, 0
      );
      
      const analysis: CodeAnalysis = {
        quality: Math.round(qualityScore),
        coverage: Math.round(coverageScore),
        performance: Math.round(performanceScore),
        security: Math.round(securityScore),
        maintainability: Math.round(maintainabilityScore),
        complexity: Math.round(complexityScore),
        issues: issues.slice(0, 50),
        suggestions: [
          !hasTests && 'Add unit tests to improve code coverage',
          !hasTypeScript && 'Consider migrating to TypeScript for better type safety',
          !hasErrorHandling && 'Implement comprehensive error handling',
          totalLines > 2000 && 'Consider breaking down large files into smaller modules',
          qualityIssues > 10 && 'Address code quality issues to improve maintainability'
        ].filter(Boolean) as string[],
        metrics: {
          linesOfCode: totalLines,
          filesCount: totalFiles,
          functionsCount,
          classesCount
        }
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

  const generateCode = useCallback(async (prompt: string, language: string = 'typescript', context?: string) => {
    setIsGenerating(true);
    console.log(`[AgentContext] Starting ${language} code generation for: ${prompt.substring(0, 50)}...`);
    
    try {
      const { generateText } = await import('@rork/toolkit-sdk');
      const langConfig = SUPPORTED_LANGUAGES[language] || SUPPORTED_LANGUAGES.typescript;
      
      const languageSpecificGuidelines: Record<string, string> = {
        typescript: `- Use TypeScript with strict typing and interfaces
- Follow React Native/React best practices
- Use modern ES6+ features
- Include proper error handling with try-catch
- Use async/await for asynchronous operations
- Add JSDoc comments for complex functions`,
        javascript: `- Use modern ES6+ syntax
- Follow JavaScript best practices
- Include proper error handling
- Use const/let instead of var
- Implement proper async/await patterns`,
        python: `- Follow PEP 8 style guide
- Use type hints where appropriate
- Include docstrings for functions and classes
- Use list comprehensions and generators
- Implement proper exception handling
- Follow Pythonic idioms`,
        java: `- Follow Java naming conventions
- Use proper access modifiers
- Implement interfaces where appropriate
- Include JavaDoc comments
- Use try-with-resources for resource management
- Follow SOLID principles`,
        go: `- Follow Go conventions and idioms
- Use proper error handling (return error)
- Keep functions small and focused
- Use goroutines and channels appropriately
- Include package documentation
- Follow effective Go guidelines`,
        rust: `- Follow Rust ownership and borrowing rules
- Use Result and Option types properly
- Include comprehensive error handling
- Write idiomatic Rust code
- Use pattern matching effectively
- Follow Rust API guidelines`,
        cpp: `- Follow modern C++ (C++17/20) standards
- Use RAII principles
- Prefer smart pointers over raw pointers
- Include proper const correctness
- Use STL containers and algorithms
- Follow C++ Core Guidelines`,
        swift: `- Follow Swift API design guidelines
- Use optionals properly
- Implement protocol-oriented programming
- Use value types where appropriate
- Include proper error handling with Result
- Follow Swift naming conventions`,
        kotlin: `- Follow Kotlin coding conventions
- Use null safety features
- Leverage extension functions
- Use data classes appropriately
- Implement coroutines for async operations
- Follow idiomatic Kotlin patterns`,
        ruby: `- Follow Ruby style guide
- Use blocks and iterators effectively
- Implement proper metaprogramming
- Use symbols and hashes appropriately
- Follow Ruby idioms and conventions`,
        php: `- Follow PSR standards (PSR-1, PSR-12)
- Use type declarations
- Implement proper namespacing
- Use composer for dependencies
- Follow modern PHP (8.x) practices`,
        sql: `- Use proper SQL formatting
- Implement parameterized queries
- Use appropriate indexes
- Follow database normalization
- Include proper constraints
- Write efficient queries`,
      };
      
      const systemPrompt = `You are a world-class ${langConfig.displayName} developer with 25+ years of experience. Generate clean, production-ready, idiomatic ${langConfig.displayName} code based on the user's request.

Language: ${langConfig.displayName}

Follow these ${langConfig.displayName}-specific guidelines:
${languageSpecificGuidelines[language] || '- Follow language best practices\n- Write clean, maintainable code\n- Include proper error handling'}

General guidelines:
- Write production-quality code
- Include comprehensive error handling
- Add meaningful comments for complex logic
- Make code modular and reusable
- Follow industry best practices
- Optimize for performance and readability
- Include proper logging/debugging statements
- Consider edge cases and validation

${context ? `\nAdditional Context:\n${context}` : ''}

IMPORTANT: Generate ONLY valid ${langConfig.displayName} code without any markdown formatting, code blocks, or explanations. Return pure code that can be directly executed.`;
      
      let generatedCode = await generateText({
        messages: [
          { role: 'user', content: `${systemPrompt}\n\nTask: ${prompt}` }
        ]
      });
      
      if (!generatedCode || typeof generatedCode !== 'string') {
        throw new Error('Invalid response from AI: No code generated');
      }
      
      generatedCode = generatedCode.trim();
      
      if (generatedCode.startsWith('```')) {
        const codeBlockMatch = generatedCode.match(/```(?:[a-z]+)?\n([\s\S]*?)```/);
        if (codeBlockMatch && codeBlockMatch[1]) {
          generatedCode = codeBlockMatch[1].trim();
        } else {
          generatedCode = generatedCode.replace(/^```[a-z]*\n?/gm, '').replace(/\n?```$/gm, '').trim();
        }
      }
      
      if (generatedCode.startsWith('{') || generatedCode.startsWith('[')) {
        try {
          JSON.parse(generatedCode);
          console.warn('[AgentContext] AI returned JSON instead of code. Extracting code from JSON...');
          const jsonData = JSON.parse(generatedCode);
          if (jsonData.code) {
            generatedCode = jsonData.code;
          } else if (jsonData.content) {
            generatedCode = jsonData.content;
          }
        } catch {
          console.log('[AgentContext] Not valid JSON, treating as code');
        }
      }

      const formattedCode = formatCode(generatedCode, language);
      
      console.log(`[AgentContext] ${language} code generation completed. Generated ${formattedCode.length} characters`);
      return formattedCode;
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