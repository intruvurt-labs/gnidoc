import type { ArtifactFile, CodeBlock } from '../providers/types';

export function extractCodeBlocks(text: string): CodeBlock[] {
  const blocks: CodeBlock[] = [];
  const regex = /```(\w+)?\s*(?:\/\/\s*(.+?))?\n([\s\S]*?)```/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const language = match[1] || 'plaintext';
    const filename = match[2]?.trim() || `file.${language}`;
    const content = match[3]?.trim() || '';

    if (content) {
      blocks.push({ language, filename, content });
    }
  }

  return blocks;
}

export function extractFilenameFromComment(content: string): string | null {
  const lines = content.split('\n');
  const firstLine = lines[0]?.trim();
  
  if (firstLine?.startsWith('//')) {
    const filename = firstLine.replace('//', '').trim();
    if (filename && filename.includes('.')) {
      return filename;
    }
  }
  
  if (firstLine?.startsWith('#')) {
    const filename = firstLine.replace('#', '').trim();
    if (filename && filename.includes('.')) {
      return filename;
    }
  }

  return null;
}

export function inferFilename(language: string, content: string): string {
  const extractedName = extractFilenameFromComment(content);
  if (extractedName) return extractedName;

  const hasReact = content.includes('React') || content.includes('useState') || content.includes('useEffect');
  const hasExport = content.includes('export default') || content.includes('export const');
  const hasInterface = content.includes('interface ') || content.includes('type ');
  
  const extensions: Record<string, string> = {
    typescript: hasReact ? '.tsx' : '.ts',
    javascript: hasReact ? '.jsx' : '.js',
    tsx: '.tsx',
    jsx: '.jsx',
    ts: '.ts',
    js: '.js',
    python: '.py',
    rust: '.rs',
    go: '.go',
    java: '.java',
    cpp: '.cpp',
    c: '.c',
    sql: '.sql',
    css: '.css',
    scss: '.scss',
    html: '.html',
    json: '.json',
    yaml: '.yaml',
    yml: '.yml',
    sh: '.sh',
    bash: '.sh',
    dockerfile: 'Dockerfile',
    env: '.env',
  };

  const ext = extensions[language.toLowerCase()] || `.${language}`;
  
  if (content.includes('package.json')) return 'package.json';
  if (content.includes('tsconfig.json')) return 'tsconfig.json';
  if (content.includes('"name":') && language === 'json') return 'package.json';
  
  if (hasInterface && !hasExport) return `types${ext}`;
  if (hasExport) {
    const match = content.match(/export\s+(?:default\s+)?(?:function|const|class)\s+(\w+)/);
    if (match?.[1]) return `${match[1]}${ext}`;
  }

  return `generated${ext}`;
}

export function normalizeCodeBlocks(blocks: CodeBlock[]): ArtifactFile[] {
  const files: ArtifactFile[] = [];
  const filenames = new Set<string>();

  for (const block of blocks) {
    let filename = block.filename;
    
    if (!filename || filename === `file.${block.language}`) {
      filename = inferFilename(block.language, block.content);
    }

    if (filenames.has(filename)) {
      const ext = filename.substring(filename.lastIndexOf('.'));
      const base = filename.substring(0, filename.lastIndexOf('.'));
      let counter = 1;
      while (filenames.has(`${base}-${counter}${ext}`)) {
        counter++;
      }
      filename = `${base}-${counter}${ext}`;
    }

    filenames.add(filename);
    files.push({
      path: filename,
      content: block.content,
      language: block.language,
    });
  }

  return files;
}

export function extractDependencies(content: string): Record<string, string> {
  const packageJsonMatch = content.match(/```json[\s\S]*?"dependencies":\s*{([^}]+)}/i);
  if (!packageJsonMatch) return {};

  try {
    const depsJson = `{${packageJsonMatch[1]}}`;
    return JSON.parse(depsJson);
  } catch {
    return {};
  }
}

export function extractEnvVars(content: string): string[] {
  const envVars = new Set<string>();
  const regex = /process\.env\.(\w+)/g;
  let match;

  while ((match = regex.exec(content)) !== null) {
    if (match[1]) {
      envVars.add(match[1]);
    }
  }

  const envBlockMatch = content.match(/```(?:env|bash)\n([\s\S]*?)```/);
  if (envBlockMatch) {
    const lines = envBlockMatch[1].split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const key = trimmed.split('=')[0]?.trim();
        if (key) envVars.add(key);
      }
    }
  }

  return Array.from(envVars);
}

export function validateGeneratedCode(files: ArtifactFile[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (files.length === 0) {
    errors.push('No files generated');
    return { valid: false, errors };
  }

  const hasSourceFiles = files.some(f => /\.(ts|tsx|js|jsx|py|rs|go)$/.test(f.path));

  if (!hasSourceFiles) {
    errors.push('No source code files found');
  }

  for (const file of files) {
    if (file.content.length < 10) {
      errors.push(`File ${file.path} is too short (${file.content.length} chars)`);
    }

    if (file.content.includes('YOUR_API_KEY_HERE') || file.content.includes('TODO:')) {
      errors.push(`File ${file.path} contains placeholder values`);
    }
  }

  return { valid: errors.length === 0, errors };
}
