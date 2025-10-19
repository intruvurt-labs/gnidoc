export interface ParsedFile {
  name: string;
  content: string;
  language: string;
  path: string;
}

export function parseGeneratedCode(raw: string, appType: string): ParsedFile[] {
  console.log(`[CodeParser] Parsing code for ${appType}, ${raw.length} chars`);

  const files: ParsedFile[] = [];

  const codeBlockRegex = /```(\w+)?\s*\n([\s\S]*?)```/g;
  let match;
  let blockIndex = 0;

  while ((match = codeBlockRegex.exec(raw)) !== null) {
    blockIndex++;
    const language = match[1] || detectLanguage(match[2], appType);
    const content = match[2].trim();

    if (content.length > 0) {
      const filename = extractFilename(content, language, blockIndex);
      const path = generatePath(filename, appType);

      files.push({
        name: filename,
        content,
        language,
        path,
      });

      console.log(`[CodeParser] Extracted: ${filename} (${language}, ${content.length} chars)`);
    }
  }

  if (files.length === 0) {
    console.log('[CodeParser] No code blocks found, trying JSON extraction');
    
    try {
      const jsonMatch = raw.match(/\{[\s\S]*"files"[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        if (Array.isArray(parsed.files)) {
          parsed.files.forEach((file: any, i: number) => {
            files.push({
              name: String(file.name || file.path?.split('/').pop() || `file-${i + 1}.tsx`),
              content: String(file.content || ''),
              language: String(file.language || 'typescript'),
              path: String(file.path || `/src/file-${i + 1}.tsx`),
            });
          });
          
          console.log(`[CodeParser] Extracted ${files.length} files from JSON`);
          return files;
        }
      }
    } catch (error) {
      console.warn('[CodeParser] JSON extraction failed:', error);
    }
  }

  if (files.length === 0) {
    console.log('[CodeParser] No structured format found, treating as single file');
    
    const cleaned = raw.replace(/```[\w-]*\s*\n?/g, '').replace(/\n?```/g, '').trim();
    
    if (cleaned.length > 0) {
      const language = detectLanguage(cleaned, appType);
      const ext = getExtensionForLanguage(language);
      
      files.push({
        name: `App.${ext}`,
        content: cleaned,
        language,
        path: `/src/App.${ext}`,
      });
      
      console.log(`[CodeParser] Created single file: App.${ext}`);
    }
  }

  console.log(`[CodeParser] Parsing complete: ${files.length} files`);
  return files;
}

function detectLanguage(content: string, appType: string): string {
  if (content.includes('interface ') || content.includes('type ') || content.includes(': ')) {
    return 'typescript';
  }
  
  if (content.includes('import ') && (content.includes('<') || content.includes('React'))) {
    return 'typescript';
  }
  
  if (content.includes('def ') || content.includes('import ') && content.includes('from ')) {
    return 'python';
  }
  
  if (content.includes('package ') || content.includes('public class ')) {
    return 'java';
  }
  
  if (content.includes('func ') || content.includes('package main')) {
    return 'go';
  }
  
  if (content.includes('fn ') || content.includes('let mut ')) {
    return 'rust';
  }
  
  if (content.includes('#include') || content.includes('std::')) {
    return 'cpp';
  }
  
  if (content.includes('import Foundation') || content.includes('struct ') && content.includes('var ')) {
    return 'swift';
  }
  
  if (content.includes('fun ') || content.includes('val ') || content.includes('var ') && content.includes('kotlin')) {
    return 'kotlin';
  }
  
  if (content.includes('SELECT') || content.includes('CREATE TABLE')) {
    return 'sql';
  }
  
  if (appType === 'expo' || appType === 'react-native') {
    return 'typescript';
  }
  
  return 'javascript';
}

function extractFilename(content: string, language: string, index: number): string {
  const pathCommentRegex = /^\/\/\s*(.+\.(?:tsx?|jsx?|py|java|go|rs|cpp|swift|kt|sql))/m;
  const match = content.match(pathCommentRegex);
  
  if (match) {
    const fullPath = match[1].trim();
    return fullPath.split('/').pop() || `file-${index}.${getExtensionForLanguage(language)}`;
  }

  const componentMatch = content.match(/(?:export\s+)?(?:default\s+)?(?:function|const|class)\s+(\w+)/);
  if (componentMatch) {
    const name = componentMatch[1];
    return `${name}.${getExtensionForLanguage(language)}`;
  }

  const classMatch = content.match(/(?:public\s+)?class\s+(\w+)/);
  if (classMatch) {
    const name = classMatch[1];
    return `${name}.${getExtensionForLanguage(language)}`;
  }

  return `file-${index}.${getExtensionForLanguage(language)}`;
}

function generatePath(filename: string, appType: string): string {
  const isComponent = /^[A-Z]/.test(filename);
  const isScreen = /Screen|Page/.test(filename);
  const isUtil = /utils?|helper|config|constant/i.test(filename);
  const isHook = /^use[A-Z]/.test(filename);
  const isContext = /Context/.test(filename);
  const isType = /types?|interface/i.test(filename);

  if (isScreen) {
    return `/src/screens/${filename}`;
  }
  
  if (isComponent && !isContext) {
    return `/src/components/${filename}`;
  }
  
  if (isHook) {
    return `/src/hooks/${filename}`;
  }
  
  if (isContext) {
    return `/src/contexts/${filename}`;
  }
  
  if (isType) {
    return `/src/types/${filename}`;
  }
  
  if (isUtil) {
    return `/src/utils/${filename}`;
  }

  return `/src/${filename}`;
}

function getExtensionForLanguage(language: string): string {
  const extensionMap: Record<string, string> = {
    'typescript': 'tsx',
    'javascript': 'jsx',
    'python': 'py',
    'java': 'java',
    'go': 'go',
    'rust': 'rs',
    'cpp': 'cpp',
    'c': 'c',
    'swift': 'swift',
    'kotlin': 'kt',
    'ruby': 'rb',
    'php': 'php',
    'sql': 'sql',
    'shell': 'sh',
    'json': 'json',
    'yaml': 'yaml',
    'markdown': 'md',
  };

  return extensionMap[language.toLowerCase()] || 'txt';
}

export function formatParsedFiles(files: ParsedFile[]): string {
  return files.map(file => {
    const separator = '='.repeat(60);
    return `${separator}\nFile: ${file.path}\nLanguage: ${file.language}\n${separator}\n${file.content}\n`;
  }).join('\n\n');
}

export function extractDependencies(files: ParsedFile[]): string[] {
  const dependencies = new Set<string>();

  files.forEach(file => {
    const content = file.content;

    const importRegex = /import\s+(?:.*\s+from\s+)?['"]([^'"]+)['"]/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      const pkg = match[1];
      
      if (!pkg.startsWith('.') && !pkg.startsWith('/')) {
        const pkgName = pkg.startsWith('@') ? 
          pkg.split('/').slice(0, 2).join('/') : 
          pkg.split('/')[0];
        
        dependencies.add(pkgName);
      }
    }

    const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    while ((match = requireRegex.exec(content)) !== null) {
      const pkg = match[1];
      
      if (!pkg.startsWith('.') && !pkg.startsWith('/')) {
        const pkgName = pkg.startsWith('@') ? 
          pkg.split('/').slice(0, 2).join('/') : 
          pkg.split('/')[0];
        
        dependencies.add(pkgName);
      }
    }
  });

  return Array.from(dependencies).sort();
}
