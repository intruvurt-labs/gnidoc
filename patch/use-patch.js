import React from "react";
const fs = require('fs');
const path = require('path');

function tryPatch(target) {
  try {
    if (!fs.existsSync(target)) return false;
    const original = fs.readFileSync(target, 'utf8');
    let content = original;

    content = content.replace(
      /const server = React\.use\(serverLocationContext_1\.ServerContext\);/,
      'const server = React.useContext(serverLocationContext_1.ServerContext);'
    );

    content = content.replace(/React\.use\(/g, 'React.useContext(');

    if (content !== original) {
      fs.writeFileSync(target, content);
      console.log(`✅ Patched expo-router in ${target}`);
      return true;
    }
  } catch (e) {
    console.warn(`⚠️ Failed to patch ${target}:`, e && e.message ? e.message : e);
  }
  return false;
}

(function main() {
  const candidates = [
    path.join(process.cwd(), 'node_modules/expo-router/build/fork/useLinking.js'),
    path.join(process.cwd(), 'node_modules/expo-router/build/fork/useLinking.cjs'),
    path.join(process.cwd(), 'node_modules/expo-router/build/fork/useLinking.mjs'),
    path.join(process.cwd(), 'node_modules/expo-router/dist/fork/useLinking.js'),
  ];

  const patched = candidates.some(tryPatch);
  if (!patched) {
    console.log('ℹ️ expo-router useLinking file not found or already patched. Skipping.');
  }
})();
