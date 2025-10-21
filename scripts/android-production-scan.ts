#!/usr/bin/env bun
/**
 * Android Production Readiness Scan
 * Comprehensive audit for Android-specific production issues
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

interface AndroidIssue {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;
  issue: string;
  fix: string;
  file?: string;
}

interface AndroidScanReport {
  timestamp: string;
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
    total: number;
  };
  categories: {
    security: AndroidIssue[];
    performance: AndroidIssue[];
    configuration: AndroidIssue[];
    permissions: AndroidIssue[];
    compatibility: AndroidIssue[];
    assets: AndroidIssue[];
    code: AndroidIssue[];
  };
  checks: {
    name: string;
    passed: boolean;
    details: string;
  }[];
  recommendations: string[];
}

const report: AndroidScanReport = {
  timestamp: new Date().toISOString(),
  summary: { critical: 0, high: 0, medium: 0, low: 0, info: 0, total: 0 },
  categories: {
    security: [],
    performance: [],
    configuration: [],
    permissions: [],
    compatibility: [],
    assets: [],
    code: [],
  },
  checks: [],
  recommendations: [],
};

function addIssue(category: keyof typeof report.categories, issue: AndroidIssue) {
  report.categories[category].push(issue);
  report.summary[issue.severity]++;
  report.summary.total++;
}

function addCheck(name: string, passed: boolean, details: string) {
  report.checks.push({ name, passed, details });
}

// ===== SECURITY CHECKS =====
function checkSecurity() {
  console.log('\n🔒 Checking Android Security...');

  const appJson = JSON.parse(readFileSync('app.json', 'utf-8'));
  const androidConfig = appJson.expo?.android || {};

  // Check for allowBackup flag
  if (!androidConfig.allowBackup || androidConfig.allowBackup !== false) {
    addIssue('security', {
      severity: 'critical',
      category: 'security',
      issue: 'allowBackup not explicitly set to false',
      fix: 'Add "allowBackup": false to android config in app.json to prevent backup extraction',
      file: 'app.json',
    });
    addCheck('allowBackup disabled', false, 'Missing allowBackup=false in Android config');
  } else {
    addCheck('allowBackup disabled', true, 'allowBackup is properly disabled');
  }

  // Check for cleartext traffic
  if (!androidConfig.usesCleartextTraffic || androidConfig.usesCleartextTraffic !== false) {
    addIssue('security', {
      severity: 'high',
      category: 'security',
      issue: 'usesCleartextTraffic not explicitly set to false',
      fix: 'Add "usesCleartextTraffic": false to android config to enforce HTTPS',
      file: 'app.json',
    });
    addCheck('Cleartext traffic disabled', false, 'Missing usesCleartextTraffic=false');
  } else {
    addCheck('Cleartext traffic disabled', true, 'Cleartext traffic is properly disabled');
  }

  // Check for network security config
  if (!androidConfig.networkSecurityConfig) {
    addIssue('security', {
      severity: 'medium',
      category: 'security',
      issue: 'No network security config specified',
      fix: 'Add network security config to enforce certificate pinning and disable cleartext',
      file: 'app.json',
    });
  }

  // Check for debuggable flag in production
  if (androidConfig.debuggable === true) {
    addIssue('security', {
      severity: 'critical',
      category: 'security',
      issue: 'App is debuggable in production config',
      fix: 'Remove debuggable flag or set to false for production builds',
      file: 'app.json',
    });
  }
}

// ===== PERMISSIONS CHECKS =====
function checkPermissions() {
  console.log('\n🔐 Checking Android Permissions...');

  const appJson = JSON.parse(readFileSync('app.json', 'utf-8'));
  const permissions = appJson.expo?.android?.permissions || [];

  // Deprecated permissions
  const deprecatedPerms = [
    'READ_EXTERNAL_STORAGE',
    'WRITE_EXTERNAL_STORAGE',
    'READ_PHONE_STATE',
    'WRITE_SETTINGS',
  ];

  deprecatedPerms.forEach((perm) => {
    if (permissions.includes(perm)) {
      addIssue('permissions', {
        severity: 'high',
        category: 'permissions',
        issue: `Deprecated permission: ${perm}`,
        fix: `Remove ${perm} and use scoped storage (Android 10+) or update to modern alternatives`,
        file: 'app.json',
      });
    }
  });

  addCheck(
    'No deprecated permissions',
    !deprecatedPerms.some((p) => permissions.includes(p)),
    `Found ${deprecatedPerms.filter((p) => permissions.includes(p)).length} deprecated permissions`
  );

  // Dangerous permissions without justification
  const dangerousPerms = [
    'CAMERA',
    'RECORD_AUDIO',
    'ACCESS_FINE_LOCATION',
    'ACCESS_COARSE_LOCATION',
    'READ_CONTACTS',
    'WRITE_CONTACTS',
  ];

  dangerousPerms.forEach((perm) => {
    if (permissions.includes(perm) || permissions.includes(`android.permission.${perm}`)) {
      addIssue('permissions', {
        severity: 'medium',
        category: 'permissions',
        issue: `Dangerous permission declared: ${perm}`,
        fix: `Ensure ${perm} is necessary and runtime permission handling is implemented`,
        file: 'app.json',
      });
    }
  });

  // SCHEDULE_EXACT_ALARM requires special handling on Android 12+
  if (permissions.includes('android.permission.SCHEDULE_EXACT_ALARM')) {
    addIssue('permissions', {
      severity: 'medium',
      category: 'permissions',
      issue: 'SCHEDULE_EXACT_ALARM requires user consent on Android 12+',
      fix: 'Check if exact alarms are needed; use SCHEDULE_EXACT_ALARM with proper user consent flow',
      file: 'app.json',
    });
  }
}

// ===== CONFIGURATION CHECKS =====
function checkConfiguration() {
  console.log('\n⚙️  Checking Android Configuration...');

  const appJson = JSON.parse(readFileSync('app.json', 'utf-8'));
  const androidConfig = appJson.expo?.android || {};

  // Package name validation
  if (!androidConfig.package) {
    addIssue('configuration', {
      severity: 'critical',
      category: 'configuration',
      issue: 'Missing Android package name',
      fix: 'Add "package" field to android config (e.g., "com.company.appname")',
      file: 'app.json',
    });
  } else if (!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(androidConfig.package)) {
    addIssue('configuration', {
      severity: 'high',
      category: 'configuration',
      issue: 'Invalid package name format',
      fix: 'Use lowercase reverse domain notation (e.g., com.company.appname)',
      file: 'app.json',
    });
  }

  addCheck(
    'Valid package name',
    androidConfig.package && /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(androidConfig.package),
    androidConfig.package || 'No package name'
  );

  // versionCode check
  if (!androidConfig.versionCode) {
    addIssue('configuration', {
      severity: 'high',
      category: 'configuration',
      issue: 'Missing versionCode',
      fix: 'Add "versionCode" to android config (integer that increments with each release)',
      file: 'app.json',
    });
  }

  // Adaptive icon check
  if (!androidConfig.adaptiveIcon) {
    addIssue('configuration', {
      severity: 'medium',
      category: 'configuration',
      issue: 'Missing adaptive icon configuration',
      fix: 'Add adaptive icon with foreground and background for Android 8.0+',
      file: 'app.json',
    });
  } else {
    const { foregroundImage, backgroundColor } = androidConfig.adaptiveIcon;
    if (!foregroundImage || !backgroundColor) {
      addIssue('configuration', {
        severity: 'medium',
        category: 'configuration',
        issue: 'Incomplete adaptive icon configuration',
        fix: 'Ensure both foregroundImage and backgroundColor are set',
        file: 'app.json',
      });
    }
  }

  // Google Services check
  if (!androidConfig.googleServicesFile) {
    addIssue('configuration', {
      severity: 'info',
      category: 'configuration',
      issue: 'No google-services.json configured',
      fix: 'Add googleServicesFile if using Firebase/Google services',
      file: 'app.json',
    });
  }
}

// ===== PERFORMANCE CHECKS =====
function checkPerformance() {
  console.log('\n⚡ Checking Android Performance...');

  const appJson = JSON.parse(readFileSync('app.json', 'utf-8'));
  const androidConfig = appJson.expo?.android || {};

  // Hermes check (should be enabled for production)
  if (androidConfig.jsEngine && androidConfig.jsEngine !== 'hermes') {
    addIssue('performance', {
      severity: 'high',
      category: 'performance',
      issue: 'Hermes engine not enabled',
      fix: 'Set "jsEngine": "hermes" for better performance and smaller bundle size',
      file: 'app.json',
    });
  }

  addCheck('Hermes enabled', androidConfig.jsEngine === 'hermes' || !androidConfig.jsEngine, 'Hermes improves startup time');

  // ProGuard/R8 check
  if (!androidConfig.enableProguardInReleaseBuilds && androidConfig.enableProguardInReleaseBuilds !== false) {
    addIssue('performance', {
      severity: 'medium',
      category: 'performance',
      issue: 'ProGuard/R8 minification not explicitly configured',
      fix: 'Set "enableProguardInReleaseBuilds": true for code shrinking and obfuscation',
      file: 'app.json',
    });
  }

  // Multidex check
  if (!androidConfig.enableDex && androidConfig.enableDex !== false) {
    addIssue('performance', {
      severity: 'low',
      category: 'performance',
      issue: 'Multidex configuration not explicit',
      fix: 'Consider setting "enableDex": true if method count exceeds 64K',
      file: 'app.json',
    });
  }
}

// ===== ASSETS CHECKS =====
function checkAssets() {
  console.log('\n🎨 Checking Android Assets...');

  const appJson = JSON.parse(readFileSync('app.json', 'utf-8'));
  const androidConfig = appJson.expo?.android || {};

  // Check adaptive icon files
  if (androidConfig.adaptiveIcon?.foregroundImage) {
    const path = androidConfig.adaptiveIcon.foregroundImage.replace('./', '');
    if (!existsSync(path)) {
      addIssue('assets', {
        severity: 'high',
        category: 'assets',
        issue: `Adaptive icon foreground image not found: ${path}`,
        fix: `Create adaptive icon at ${path} or update path`,
        file: 'app.json',
      });
    }
  }

  // Check notification icon
  const notificationConfig = appJson.expo?.plugins?.find(
    (p: any) => Array.isArray(p) && p[0] === 'expo-notifications'
  );
  
  if (notificationConfig && notificationConfig[1]?.icon) {
    const iconPath = notificationConfig[1].icon.replace('./', '');
    if (!existsSync(iconPath)) {
      addIssue('assets', {
        severity: 'high',
        category: 'assets',
        issue: `Notification icon not found: ${iconPath}`,
        fix: `Create notification icon at ${iconPath} or remove reference`,
        file: 'app.json',
      });
    }
  }

  // Check for large assets
  const assetsDir = 'assets';
  if (existsSync(assetsDir)) {
    const largeAssets: string[] = [];
    
    function scanDir(dir: string) {
      try {
        const items = readdirSync(dir);
        items.forEach((item) => {
          const fullPath = join(dir, item);
          const stat = statSync(fullPath);
          
          if (stat.isDirectory()) {
            scanDir(fullPath);
          } else if (stat.size > 1024 * 1024) { // 1MB
            largeAssets.push(`${fullPath} (${(stat.size / 1024 / 1024).toFixed(2)}MB)`);
          }
        });
      } catch (e) {
        // Skip inaccessible dirs
      }
    }
    
    scanDir(assetsDir);
    
    if (largeAssets.length > 0) {
      addIssue('assets', {
        severity: 'medium',
        category: 'assets',
        issue: `Found ${largeAssets.length} large assets (>1MB)`,
        fix: 'Optimize images, use WebP format, or load from CDN: ' + largeAssets.slice(0, 3).join(', '),
        file: 'assets/',
      });
    }
  }
}

// ===== CODE CHECKS =====
function checkCode() {
  console.log('\n💻 Checking Android-specific Code...');

  // Check for Platform-specific code
  const platformChecks = [
    'contexts/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'app/**/*.{ts,tsx}',
    'lib/**/*.{ts,tsx}',
  ];

  let hasBackHandler = false;
  let hasPlatformSelect = false;
  let hasAndroidSpecificImports = false;

  try {
    const files = readdirSync('app', { recursive: true }) as string[];
    
    files.forEach((file) => {
      if (!file.endsWith('.ts') && !file.endsWith('.tsx')) return;
      
      try {
        const content = readFileSync(join('app', file), 'utf-8');
        
        // Check for BackHandler usage
        if (content.includes('BackHandler')) hasBackHandler = true;
        
        // Check for Platform.select or Platform.OS
        if (content.includes('Platform.select') || content.includes('Platform.OS')) {
          hasPlatformSelect = true;
        }
        
        // Check for Android-specific imports
        if (content.includes('react-native-permissions') || 
            content.includes('AndroidNotificationChannelSettings')) {
          hasAndroidSpecificImports = true;
        }
      } catch (e) {
        // Skip problematic files
      }
    });
  } catch (e) {
    console.log('Could not scan app directory');
  }

  if (!hasBackHandler) {
    addIssue('code', {
      severity: 'low',
      category: 'code',
      issue: 'No BackHandler detected',
      fix: 'Consider implementing BackHandler for Android back button navigation',
    });
  }

  addCheck('Platform-specific code', hasPlatformSelect, 'Platform.select or Platform.OS usage detected');
}

// ===== COMPATIBILITY CHECKS =====
function checkCompatibility() {
  console.log('\n📱 Checking Android Compatibility...');

  const appJson = JSON.parse(readFileSync('app.json', 'utf-8'));
  const androidConfig = appJson.expo?.android || {};

  // Min SDK version
  const minSdkVersion = androidConfig.minSdkVersion || 21;
  if (minSdkVersion < 23) {
    addIssue('compatibility', {
      severity: 'high',
      category: 'compatibility',
      issue: `minSdkVersion ${minSdkVersion} is very old (Android 5.x)`,
      fix: 'Consider bumping to 23 (Android 6.0) or 26 (Android 8.0) for modern APIs',
      file: 'app.json',
    });
  }

  addCheck('Modern minSdkVersion', minSdkVersion >= 23, `minSdkVersion: ${minSdkVersion}`);

  // Target SDK version
  const targetSdkVersion = androidConfig.targetSdkVersion || 34;
  const currentYear = new Date().getFullYear();
  const expectedTargetSdk = currentYear === 2025 ? 35 : 34; // Android 15 = 35

  if (targetSdkVersion < expectedTargetSdk) {
    addIssue('compatibility', {
      severity: 'high',
      category: 'compatibility',
      issue: `targetSdkVersion ${targetSdkVersion} is outdated`,
      fix: `Update to targetSdkVersion ${expectedTargetSdk} for Play Store compliance`,
      file: 'app.json',
    });
  }

  addCheck('Current targetSdkVersion', targetSdkVersion >= expectedTargetSdk, `targetSdkVersion: ${targetSdkVersion}`);

  // Check for 64-bit support
  const use64BitMode = androidConfig.use64BitMode !== false;
  if (!use64BitMode) {
    addIssue('compatibility', {
      severity: 'critical',
      category: 'compatibility',
      issue: '64-bit support disabled',
      fix: 'Enable 64-bit support - required by Play Store since August 2019',
      file: 'app.json',
    });
  }

  // Check for new arch
  const newArchEnabled = appJson.expo?.newArchEnabled;
  if (!newArchEnabled) {
    addIssue('compatibility', {
      severity: 'info',
      category: 'compatibility',
      issue: 'New Architecture not enabled',
      fix: 'Consider enabling "newArchEnabled": true for React Native New Architecture (better performance)',
      file: 'app.json',
    });
  }
}

// ===== SQLITE CHECKS =====
function checkSQLite() {
  console.log('\n🗄️  Checking SQLite Configuration...');

  const appJson = JSON.parse(readFileSync('app.json', 'utf-8'));
  const sqlitePlugin = appJson.expo?.plugins?.find(
    (p: any) => Array.isArray(p) && p[0] === 'expo-sqlite'
  );

  if (sqlitePlugin) {
    const config = sqlitePlugin[1] || {};
    const androidConfig = config.android || {};

    // Check if FTS is disabled for Android (good)
    if (androidConfig.enableFTS !== false) {
      addIssue('configuration', {
        severity: 'medium',
        category: 'configuration',
        issue: 'SQLite FTS enabled on Android may increase binary size',
        fix: 'Consider disabling FTS on Android if not needed: "enableFTS": false',
        file: 'app.json',
      });
    }

    // Check if SQLCipher is disabled (good for performance, bad for security)
    if (androidConfig.useSQLCipher === false) {
      addIssue('security', {
        severity: 'medium',
        category: 'security',
        issue: 'SQLCipher disabled on Android - database is not encrypted',
        fix: 'Enable useSQLCipher: true if storing sensitive data',
        file: 'app.json',
      });
    }
  }
}

// ===== GENERATE RECOMMENDATIONS =====
function generateRecommendations() {
  console.log('\n📋 Generating Recommendations...');

  const { critical, high } = report.summary;

  if (critical > 0) {
    report.recommendations.push('⛔ CRITICAL: Fix all critical issues before production release');
  }

  if (high > 0) {
    report.recommendations.push('🚨 HIGH: Address high-priority issues to ensure Play Store compliance');
  }

  // Security recommendations
  if (report.categories.security.length > 0) {
    report.recommendations.push('🔒 Review and implement all security hardening measures');
    report.recommendations.push('🔐 Test app with Android security best practices checklist');
  }

  // Performance recommendations
  report.recommendations.push('⚡ Enable Hermes engine for optimal performance');
  report.recommendations.push('📦 Enable ProGuard/R8 for code shrinking and obfuscation');
  report.recommendations.push('🎯 Test on multiple Android versions (8.0, 10, 12, 13, 14, 15)');

  // Compatibility
  report.recommendations.push('📱 Ensure targetSdkVersion meets Play Store requirements');
  report.recommendations.push('🧪 Test on devices with different screen sizes and densities');

  // Assets
  report.recommendations.push('🎨 Optimize all images and use WebP format where possible');
  report.recommendations.push('🖼️  Validate adaptive icon displays correctly on all launchers');

  // Testing
  report.recommendations.push('🧪 Perform manual testing on real Android devices');
  report.recommendations.push('🔄 Test app updates and downgrades');
  report.recommendations.push('🌐 Test with airplane mode and poor network conditions');
  report.recommendations.push('🔋 Test battery impact and background behavior');
}

// ===== MAIN =====
async function main() {
  console.log('🤖 Android Production Readiness Scan\n');
  console.log('=' .repeat(60));

  try {
    checkSecurity();
    checkPermissions();
    checkConfiguration();
    checkPerformance();
    checkAssets();
    checkCode();
    checkCompatibility();
    checkSQLite();
    generateRecommendations();

    console.log('\n' + '='.repeat(60));
    console.log('\n📊 SCAN SUMMARY');
    console.log('=' .repeat(60));
    console.log(`Total Issues: ${report.summary.total}`);
    console.log(`  ⛔ Critical: ${report.summary.critical}`);
    console.log(`  🚨 High:     ${report.summary.high}`);
    console.log(`  ⚠️  Medium:   ${report.summary.medium}`);
    console.log(`  ℹ️  Low:      ${report.summary.low}`);
    console.log(`  💡 Info:     ${report.summary.info}`);

    console.log('\n🏁 READINESS CHECKS');
    console.log('=' .repeat(60));
    report.checks.forEach((check) => {
      const icon = check.passed ? '✅' : '❌';
      console.log(`${icon} ${check.name}: ${check.details}`);
    });

    console.log('\n📋 TOP RECOMMENDATIONS');
    console.log('=' .repeat(60));
    report.recommendations.slice(0, 10).forEach((rec, i) => {
      console.log(`${i + 1}. ${rec}`);
    });

    // Print detailed issues by category
    console.log('\n🔍 DETAILED ISSUES BY CATEGORY');
    console.log('=' .repeat(60));
    
    Object.entries(report.categories).forEach(([category, issues]) => {
      if (issues.length > 0) {
        console.log(`\n${category.toUpperCase()} (${issues.length} issues):`);
        issues.forEach((issue, i) => {
          const icons = {
            critical: '⛔',
            high: '🚨',
            medium: '⚠️',
            low: 'ℹ️',
            info: '💡',
          };
          console.log(`  ${i + 1}. ${icons[issue.severity]} [${issue.severity.toUpperCase()}] ${issue.issue}`);
          console.log(`     Fix: ${issue.fix}`);
          if (issue.file) console.log(`     File: ${issue.file}`);
        });
      }
    });

    // Save report
    const reportPath = 'ANDROID_PRODUCTION_SCAN.json';
    Bun.write(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n✅ Full report saved to ${reportPath}`);

    // Generate markdown report
    const mdReport = generateMarkdownReport(report);
    const mdPath = 'ANDROID_PRODUCTION_SCAN.md';
    await Bun.write(mdPath, mdReport);
    console.log(`✅ Markdown report saved to ${mdPath}`);

    // Exit code based on severity
    if (report.summary.critical > 0) {
      console.log('\n⛔ CRITICAL ISSUES FOUND - Fix before production!');
      process.exit(1);
    } else if (report.summary.high > 0) {
      console.log('\n🚨 HIGH PRIORITY ISSUES - Address before release');
      process.exit(1);
    } else {
      console.log('\n✅ Android production scan completed successfully!');
      process.exit(0);
    }
  } catch (error) {
    console.error('\n❌ Scan failed:', error);
    process.exit(1);
  }
}

function generateMarkdownReport(report: AndroidScanReport): string {
  let md = `# Android Production Readiness Scan\n\n`;
  md += `**Timestamp:** ${report.timestamp}\n\n`;
  md += `## Summary\n\n`;
  md += `| Severity | Count |\n`;
  md += `|----------|-------|\n`;
  md += `| ⛔ Critical | ${report.summary.critical} |\n`;
  md += `| 🚨 High | ${report.summary.high} |\n`;
  md += `| ⚠️ Medium | ${report.summary.medium} |\n`;
  md += `| ℹ️ Low | ${report.summary.low} |\n`;
  md += `| 💡 Info | ${report.summary.info} |\n`;
  md += `| **Total** | **${report.summary.total}** |\n\n`;

  md += `## Readiness Checks\n\n`;
  report.checks.forEach((check) => {
    const icon = check.passed ? '✅' : '❌';
    md += `- ${icon} **${check.name}**: ${check.details}\n`;
  });

  md += `\n## Issues by Category\n\n`;
  Object.entries(report.categories).forEach(([category, issues]) => {
    if (issues.length > 0) {
      md += `### ${category.charAt(0).toUpperCase() + category.slice(1)} (${issues.length})\n\n`;
      issues.forEach((issue, i) => {
        const icons = { critical: '⛔', high: '🚨', medium: '⚠️', low: 'ℹ️', info: '💡' };
        md += `#### ${i + 1}. ${icons[issue.severity]} ${issue.issue}\n\n`;
        md += `- **Severity:** ${issue.severity.toUpperCase()}\n`;
        md += `- **Fix:** ${issue.fix}\n`;
        if (issue.file) md += `- **File:** \`${issue.file}\`\n`;
        md += `\n`;
      });
    }
  });

  md += `## Recommendations\n\n`;
  report.recommendations.forEach((rec, i) => {
    md += `${i + 1}. ${rec}\n`;
  });

  md += `\n---\n\n`;
  md += `*Scan completed at ${report.timestamp}*\n`;

  return md;
}

main();
