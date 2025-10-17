#!/bin/bash

# Production Setup Script for gnidoC terceS
# This script installs dependencies and validates configuration

set -e

echo "🚀 gnidoC terceS - Production Setup"
echo "======================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo -e "${YELLOW}⚠️  .env.production not found${NC}"
    echo "Creating from template..."
    cp .env.production.example .env.production
    echo -e "${GREEN}✅ Created .env.production${NC}"
    echo ""
    echo -e "${YELLOW}📝 IMPORTANT: Edit .env.production and fill in real values!${NC}"
    echo ""
fi

# Install Sentry
echo "📦 Installing Sentry for error monitoring..."
npm install --save @sentry/react-native || echo -e "${YELLOW}⚠️  Sentry installation failed (optional)${NC}"

# Install OAuth dependencies
echo "📦 Installing OAuth dependencies..."
npx expo install expo-auth-session expo-web-browser

# Install database dependencies (should already be installed)
echo "📦 Checking database dependencies..."
npm list pg || npm install --save pg @types/pg

# Install JWT
echo "📦 Checking JWT dependencies..."
npm list jsonwebtoken || npm install --save jsonwebtoken @types/jsonwebtoken

echo ""
echo "✅ Dependencies installed!"
echo ""

# Validate package.json
echo "🔍 Validating package.json..."
if [ -f package.json ]; then
    if grep -q "@sentry/react-native" package.json; then
        echo -e "${GREEN}✅ Sentry configured${NC}"
    else
        echo -e "${YELLOW}⚠️  Sentry not in package.json (optional)${NC}"
    fi
    
    if grep -q "pg" package.json; then
        echo -e "${GREEN}✅ PostgreSQL driver installed${NC}"
    else
        echo -e "${RED}❌ PostgreSQL driver missing${NC}"
    fi
    
    if grep -q "jsonwebtoken" package.json; then
        echo -e "${GREEN}✅ JWT library installed${NC}"
    else
        echo -e "${RED}❌ JWT library missing${NC}"
    fi
fi

echo ""
echo "🔐 Security Checklist:"
echo "----------------------"

# Check JWT_SECRET length
if [ -f .env.production ]; then
    JWT_SECRET=$(grep "^JWT_SECRET=" .env.production | cut -d '=' -f2)
    if [ ${#JWT_SECRET} -lt 32 ]; then
        echo -e "${RED}❌ JWT_SECRET too short (min 32 chars)${NC}"
        echo "   Generate with: openssl rand -base64 64"
    else
        echo -e "${GREEN}✅ JWT_SECRET length OK${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  .env.production not found${NC}"
fi

echo ""
echo "📋 Next Steps:"
echo "--------------"
echo "1. Edit .env.production with real API keys"
echo "2. Get Google OAuth credentials: https://console.cloud.google.com"
echo "3. Sign up for OpenRouter: https://openrouter.ai"
echo "4. Sign up for Sentry: https://sentry.io"
echo "5. Run: NODE_ENV=production npm start"
echo "6. Test all OAuth flows"
echo "7. Deploy: vercel --prod"
echo ""

# Test if we can start
echo "🧪 Testing TypeScript compilation..."
npx tsc --noEmit || echo -e "${YELLOW}⚠️  TypeScript errors found (check above)${NC}"

echo ""
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "📚 Read PRODUCTION_FIXES_SUMMARY.md for details"
