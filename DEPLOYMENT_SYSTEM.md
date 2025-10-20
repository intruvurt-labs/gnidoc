# Simple Deployment System

## Overview

A simple but functional deployment system that supports multiple deployment methods:

1. **Simple Host** (default) - Local file-based deployment
2. **Netlify** - Deploy to Netlify using their API
3. **Vercel** - Deploy to Vercel using their API

## Configuration

Set the `DEPLOY_METHOD` environment variable to choose your deployment method:

```bash
# Simple local deployment (default)
DEPLOY_METHOD=simple

# Netlify deployment
DEPLOY_METHOD=netlify
NETLIFY_TOKEN=your_netlify_token

# Vercel deployment
DEPLOY_METHOD=vercel
VERCEL_TOKEN=your_vercel_token
```

## How It Works

### Simple Host (Default)

- Writes files to `deployments/{subdomain}/index.html`
- Returns URL: `http://localhost:3000/deployments/{subdomain}/index.html`
- No external dependencies
- Perfect for testing and development

### Netlify Deployment

When `DEPLOY_METHOD=netlify` and `NETLIFY_TOKEN` is set:

1. Creates a new Netlify site with the specified subdomain
2. Uploads the build output as a deployment
3. Returns the live Netlify URL (e.g., `https://your-app.netlify.app`)

**Get your token**: [Netlify Personal Access Tokens](https://app.netlify.com/user/applications/personal)

### Vercel Deployment

When `DEPLOY_METHOD=vercel` and `VERCEL_TOKEN` is set:

1. Creates a new Vercel deployment
2. Uploads files and configures as a static site
3. Returns the live Vercel URL (e.g., `https://your-app.vercel.app`)

**Get your token**: [Vercel Access Tokens](https://vercel.com/account/tokens)

## Usage

### From the UI

1. Navigate to Deploy screen
2. Enter subdomain name
3. Click "Deploy Now"
4. Watch deployment logs in real-time
5. Get your live URL

### From API

```typescript
const result = await trpcClient.deploy.create.mutate({
  projectId: 'proj-123',
  projectName: 'My App',
  subdomain: 'my-app',
  buildOutput: '<html>...</html>',
  tier: 'free'
});

console.log('Deployed to:', result.url);
console.log('Status:', result.status);
console.log('Logs:', result.logs);
```

## Deployment Tiers

- **Free**: 1 deployment, Simple host only
- **Starter**: 5 deployments, Netlify/Vercel support
- **Professional**: 20 deployments, Custom domains, SEO generation
- **Premium**: Unlimited deployments, All features

## Real Deployment Features

✅ Actual file uploads to hosting providers  
✅ Real deployment logs from the server  
✅ Error handling and retry logic  
✅ Subdomain validation and conflict detection  
✅ Tier-based deployment limits  
✅ Custom domain support (Professional+)  
✅ AI-generated SEO content (Professional+)  

## Extending the System

To add a new deployment method:

1. Create a new function in `backend/trpc/routes/deploy/create/route.ts`:

```typescript
async function deployToCustomHost(buildOutput: string, subdomain: string) {
  const logs: string[] = [];
  
  // Your deployment logic here
  logs.push('[Custom] Deploying...');
  
  return {
    url: 'https://your-url.com',
    logs
  };
}
```

2. Add it to the switch statement:

```typescript
case 'custom':
  result = await deployToCustomHost(buildOutput, subdomain);
  break;
```

3. Set environment variable: `DEPLOY_METHOD=custom`

## Testing

Test deployment locally:

```bash
# Start your backend
bun run dev

# Deploy will create files in /deployments folder
# Access at http://localhost:3000/deployments/{subdomain}/index.html
```

## Security Notes

- Never commit API tokens to git
- Use environment variables for all secrets
- Validate subdomain input to prevent path traversal
- Implement rate limiting for production
- Add authentication before allowing public deploys
