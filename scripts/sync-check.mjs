#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const cfg = JSON.parse(fs.readFileSync('rork_prompts_v1_1.json', 'utf8'));

const navRoutes = new Set([
  ...cfg.app.navigation.footer.map(x => x.route),
  ...cfg.app.navigation.logoRadial.map(x => x.route),
  ...cfg.app.navigation.overflow.map(x => x.route)
]);

const routeToScreenMap = {
  '/': 'app/(tabs)/index.tsx',
  '/dashboard': 'app/(tabs)/dashboard.tsx',
  '/agent': 'app/(tabs)/agent.tsx',
  '/workflow': 'app/(tabs)/workflow.tsx',
  '/orchestration': 'app/(tabs)/orchestration.tsx',
  '/research': 'app/(tabs)/research.tsx',
  '/database': 'app/(tabs)/database.tsx',
  '/code': 'app/(tabs)/code.tsx',
  '/terminal': 'app/(tabs)/terminal.tsx',
  '/deploy': 'app/deploy.tsx',
  '/security': 'app/(tabs)/security.tsx',
  '/integrations': 'app/(tabs)/integrations.tsx',
  '/analysis': 'app/(tabs)/analysis.tsx',
  '/leaderboard': 'app/(tabs)/leaderboard.tsx',
  '/referrals': 'app/(tabs)/referrals.tsx',
  '/themes': 'app/themes.tsx',
  '/ai-models': 'app/(tabs)/ai-models.tsx',
  '/api-keys': 'app/(tabs)/api-keys.tsx',
  '/subscription': 'app/(tabs)/subscription.tsx',
  '/preferences': 'app/(tabs)/preferences.tsx',
};

console.log('🔍 Checking screen sync...\n');

const missing = [];
for (const route of navRoutes) {
  const screenPath = routeToScreenMap[route];
  if (!screenPath) {
    console.warn(`⚠️  No mapping for route: ${route}`);
    missing.push(route);
    continue;
  }
  
  if (!fs.existsSync(screenPath)) {
    console.error(`❌ Missing screen file: ${screenPath} for route ${route}`);
    missing.push(route);
  } else {
    console.log(`✅ ${route} → ${screenPath}`);
  }
}

console.log('\n🔍 Checking quick-action assets...\n');

const assetsMissing = [];
for (const qa of cfg.app.quickActions) {
  if (!fs.existsSync(qa.asset)) {
    console.error(`❌ Missing asset: ${qa.asset} for ${qa.name}`);
    assetsMissing.push(qa.asset);
  } else {
    console.log(`✅ ${qa.name} → ${qa.asset}`);
  }
}

console.log('\n🔍 Checking app assets...\n');

for (const [key, assetPath] of Object.entries(cfg.app.assets)) {
  if (!fs.existsSync(assetPath)) {
    console.error(`❌ Missing ${key}: ${assetPath}`);
    assetsMissing.push(assetPath);
  } else {
    console.log(`✅ ${key} → ${assetPath}`);
  }
}

console.log('\n📊 Summary:\n');
console.log(`Total routes: ${navRoutes.size}`);
console.log(`Missing screens: ${missing.length}`);
console.log(`Missing assets: ${assetsMissing.length}`);

if (missing.length > 0 || assetsMissing.length > 0) {
  console.error('\n❌ Sync check failed');
  process.exit(1);
}

console.log('\n✅ All screens and assets are synced!');

const report = {
  timestamp: new Date().toISOString(),
  routes: Array.from(navRoutes),
  screens: Object.entries(routeToScreenMap).map(([route, screen]) => ({
    route,
    screen,
    exists: fs.existsSync(screen)
  })),
  assets: [
    ...cfg.app.quickActions.map(qa => ({
      name: qa.name,
      path: qa.asset,
      exists: fs.existsSync(qa.asset)
    })),
    ...Object.entries(cfg.app.assets).map(([key, path]) => ({
      name: key,
      path,
      exists: fs.existsSync(path)
    }))
  ]
};

fs.mkdirSync('artifacts', { recursive: true });
fs.writeFileSync('artifacts/screen-sync-report.md', `# Screen Sync Report

Generated: ${report.timestamp}

## Routes (${report.routes.length})

${report.routes.map(r => `- ${r}`).join('\n')}

## Screens

${report.screens.map(s => `${s.exists ? '✅' : '❌'} ${s.route} → ${s.screen}`).join('\n')}

## Assets

${report.assets.map(a => `${a.exists ? '✅' : '❌'} ${a.name} → ${a.path}`).join('\n')}

## Status

${missing.length === 0 && assetsMissing.length === 0 ? '✅ All checks passed' : '❌ Issues found'}
`);

fs.writeFileSync('artifacts/nav-matrix.json', JSON.stringify({
  footer: cfg.app.navigation.footer,
  logoRadial: cfg.app.navigation.logoRadial,
  overflow: cfg.app.navigation.overflow,
  quickActions: cfg.app.quickActions
}, null, 2));

fs.writeFileSync('artifacts/asset-usage.json', JSON.stringify(report.assets, null, 2));

fs.writeFileSync('artifacts/persistence-matrix.json', JSON.stringify({
  storageLib: cfg.app.persistence.storageLib,
  keys: cfg.app.persistence.keys,
  usage: cfg.app.persistence.keys.map(key => ({
    key,
    description: key.split('.').join(' → ')
  }))
}, null, 2));

console.log('\n📝 Reports generated in artifacts/');
