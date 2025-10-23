import React from "react";
const fs = require('fs');
const path = require('path');

try {
  const filePath = path.join(process.cwd(), 'node_modules/expo-router/build/fork/useLinking.js');
  if (!fs.existsSync(filePath)) {
    console.log('expo-router useLinking.js not found, skipping patch');
    process.exit(0);
  }
  let content = fs.readFileSync(filePath, 'utf8');

  const before = content;

  content = content.replace(
    /const server = React\.use\(serverLocationContext_1\.ServerContext\);/,
    'const server = React.useContext(serverLocationContext_1.ServerContext);'
  );

  content = content.replace(/React\.use\(/g, 'React.useContext(');

  if (content !== before) {
    fs.writeFileSync(filePath, content);
    console.log('✅ Patched expo-router React.use hooks in useLinking.js');
  } else {
    console.log('No changes applied; patch already present');
  }
} catch (e) {
  console.error('expo-router patch failed:', e?.message ?? e);
  process.exit(0);
}
