#!/bin/bash

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔧 Aurebix Bundling Error Fix${NC}"
echo "=================================="
echo ""

# Step 1: Clear caches
echo -e "${YELLOW}Step 1/4:${NC} Clearing Metro and Expo caches..."
rm -rf .expo
rm -rf .expo-shared
rm -rf node_modules/.cache
rm -rf node_modules/.vite
echo -e "${GREEN}✓${NC} Caches cleared"
echo ""

# Step 2: Verify dependencies
echo -e "${YELLOW}Step 2/4:${NC} Verifying dependencies..."
if ! command -v bun &> /dev/null; then
    echo -e "${RED}✗${NC} Bun is not installed. Please install it first."
    exit 1
fi
echo -e "${GREEN}✓${NC} Bun is installed"
echo ""

# Step 3: Reinstall dependencies
echo -e "${YELLOW}Step 3/4:${NC} Reinstalling dependencies..."
bun install
echo -e "${GREEN}✓${NC} Dependencies installed"
echo ""

# Step 4: Instructions
echo -e "${YELLOW}Step 4/4:${NC} Next steps"
echo ""
echo "Now run one of these commands:"
echo ""
echo -e "${GREEN}For development:${NC}"
echo "  bunx expo start --clear"
echo ""
echo -e "${GREEN}To reset everything:${NC}"
echo "  bunx expo start --clear --reset-cache"
echo ""
echo -e "${YELLOW}If TypeScript errors persist:${NC}"
echo "  1. Restart your IDE/editor"
echo "  2. In VS Code: Cmd/Ctrl+Shift+P → 'TypeScript: Restart TS Server'"
echo ""
echo -e "${GREEN}✅ Fix complete!${NC}"
