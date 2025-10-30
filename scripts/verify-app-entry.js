// scripts/verify-app-entry.js
import fs from "fs";
import path from "path";

const file = path.resolve("App.tsx");
const entry = "export { default } from 'expo-router/entry';\n";

try {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, entry, "utf8");
    console.log("✅ Created App.tsx for expo-router entry");
  } else {
    const content = fs.readFileSync(file, "utf8");
    if (!content.includes("expo-router/entry")) {
      console.warn("⚠️  App.tsx exists but does not export expo-router/entry");
    } else {
      console.log("✅ App.tsx already exports expo-router/entry");
    }
  }
} catch (err) {
  console.error("❌ Failed to verify or create App.tsx:", err);
  process.exit(1);
}
