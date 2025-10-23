
const fs = require('fs'); const p = 'App.tsx';
if (!fs.existsSync(p)) {
  fs.writeFileSync(p, "export { default } from 'expo-router/entry';\n", 'utf8');
  console.log('Created App.tsx for expo-router entry');
} else {
  const s = fs.readFileSync(p, 'utf8');
  if (!s.includes("expo-router/entry")) {
    console.warn('App.tsx exists but does not export expo-router/entry');
  }
}
