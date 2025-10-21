import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

interface AuditIssue {
  severity: 'error' | 'warning' | 'info';
  file: string;
  line?: number;
  message: string;
  rule: string;
}

interface AuditResult {
  timestamp: string;
  totalFiles: number;
  totalIssues: number;
  errors: number;
  warnings: number;
  infos: number;
  issues: AuditIssue[];
}

const MOBILE_PATTERNS = {
  textInView: {
    pattern: /<View[^>]*>[\s\n]*(?!<)([\w\s,.'";:!?-]+)(?!>)/g,
    message: 'Text content must be wrapped in <Text> component',
    severity: 'error' as const,
    rule: 'text-in-view',
  },
  missingPlatformCheck: {
    pattern: /(expo-haptics|expo-sensors|expo-local-authentication)/,
    message: 'Missing Platform.OS check for mobile-only API',
    severity: 'warning' as const,
    rule: 'platform-check',
  },
  unsafeTypeCast: {
    pattern: /as\s+(any|unknown)\s*[;\)]/g,
    message: 'Unsafe type casting detected',
    severity: 'warning' as const,
    rule: 'unsafe-cast',
  },
  missingTestId: {
    pattern: /<(Pressable|TouchableOpacity|Button)[^>]*(?!testID)/g,
    message: 'Interactive component missing testID prop',
    severity: 'info' as const,
    rule: 'missing-testid',
  },
  hardcodedColors: {
    pattern: /(backgroundColor|color):\s*['"]#[0-9a-fA-F]{3,8}['"]/g,
    message: 'Hardcoded color values should use theme constants',
    severity: 'info' as const,
    rule: 'hardcoded-colors',
  },
};

function auditFile(filePath: string, content: string): AuditIssue[] {
  const issues: AuditIssue[] = [];

  for (const check of Object.values(MOBILE_PATTERNS)) {
    const matches = content.matchAll(check.pattern);
    for (const match of matches) {
      const position = match.index || 0;
      const lineNumber = content.substring(0, position).split('\n').length;
      
      issues.push({
        severity: check.severity,
        file: filePath,
        line: lineNumber,
        message: check.message,
        rule: check.rule,
      });
    }
  }

  return issues;
}

function scanDirectory(dir: string, extensions: string[] = ['.tsx', '.ts']): string[] {
  const files: string[] = [];
  
  try {
    const entries = readdirSync(dir);

    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        if (!entry.startsWith('.') && entry !== 'node_modules' && entry !== 'dist') {
          files.push(...scanDirectory(fullPath, extensions));
        }
      } else if (extensions.some(ext => entry.endsWith(ext))) {
        files.push(fullPath);
      }
    }
  } catch (e) {
    console.error(`Error scanning directory ${dir}:`, e);
  }

  return files;
}

function generateMarkdownReport(result: AuditResult): string {
  const { totalFiles, totalIssues, errors, warnings, infos, issues } = result;

  let md = `# 📱 Mobile Audit Report\n\n`;
  md += `**Generated:** ${result.timestamp}\n\n`;
  md += `## Summary\n\n`;
  md += `- 📂 Files scanned: ${totalFiles}\n`;
  md += `- 🔍 Total issues: ${totalIssues}\n`;
  md += `- ❌ Errors: ${errors}\n`;
  md += `- ⚠️ Warnings: ${warnings}\n`;
  md += `- ℹ️ Info: ${infos}\n\n`;

  if (totalIssues === 0) {
    md += `✅ **No issues found!**\n`;
    return md;
  }

  md += `## Issues\n\n`;

  const issuesBySeverity = {
    error: issues.filter(i => i.severity === 'error'),
    warning: issues.filter(i => i.severity === 'warning'),
    info: issues.filter(i => i.severity === 'info'),
  };

  for (const [severity, items] of Object.entries(issuesBySeverity)) {
    if (items.length === 0) continue;

    const icon = severity === 'error' ? '❌' : severity === 'warning' ? '⚠️' : 'ℹ️';
    md += `### ${icon} ${severity.charAt(0).toUpperCase() + severity.slice(1)}s (${items.length})\n\n`;

    for (const issue of items) {
      md += `- **${issue.file}**:${issue.line || '?'}\n`;
      md += `  - ${issue.message}\n`;
      md += `  - Rule: \`${issue.rule}\`\n\n`;
    }
  }

  return md;
}

async function main() {
  console.log('🔍 Starting mobile audit...\n');

  const rootDir = process.cwd();
  const auditDir = join(rootDir, 'audit');

  if (!existsSync(auditDir)) {
    mkdirSync(auditDir, { recursive: true });
  }

  const dirsToScan = ['app', 'components', 'contexts', 'lib'];
  let allFiles: string[] = [];

  for (const dir of dirsToScan) {
    const fullPath = join(rootDir, dir);
    if (existsSync(fullPath)) {
      console.log(`Scanning ${dir}/...`);
      allFiles.push(...scanDirectory(fullPath));
    }
  }

  console.log(`\nFound ${allFiles.length} files to audit\n`);

  const allIssues: AuditIssue[] = [];

  for (const file of allFiles) {
    try {
      const content = readFileSync(file, 'utf8');
      const issues = auditFile(file.replace(rootDir, ''), content);
      allIssues.push(...issues);
    } catch (e) {
      console.error(`Error reading ${file}:`, e);
    }
  }

  const result: AuditResult = {
    timestamp: new Date().toISOString(),
    totalFiles: allFiles.length,
    totalIssues: allIssues.length,
    errors: allIssues.filter(i => i.severity === 'error').length,
    warnings: allIssues.filter(i => i.severity === 'warning').length,
    infos: allIssues.filter(i => i.severity === 'info').length,
    issues: allIssues,
  };

  const jsonPath = join(auditDir, 'mobile-audit.json');
  const mdPath = join(auditDir, 'mobile-audit.md');

  writeFileSync(jsonPath, JSON.stringify(result, null, 2));
  console.log(`✅ JSON report saved: ${jsonPath}`);

  const markdown = generateMarkdownReport(result);
  writeFileSync(mdPath, markdown);
  console.log(`✅ Markdown report saved: ${mdPath}`);

  console.log('\n📊 Audit Summary:');
  console.log(`   Files: ${result.totalFiles}`);
  console.log(`   Issues: ${result.totalIssues}`);
  console.log(`   Errors: ${result.errors}`);
  console.log(`   Warnings: ${result.warnings}`);
  console.log(`   Info: ${result.infos}`);

  if (result.errors > 0) {
    console.log('\n❌ Audit failed with errors');
    process.exit(1);
  } else {
    console.log('\n✅ Audit completed successfully');
    process.exit(0);
  }
}

main();
