# Multi-Model Full-Stack App Generator

Production-ready system that orchestrates **9 AI providers** to generate complete, functional applications with database, auth, and payment systems.

## 🚀 Features

- **Multi-Model Orchestration**: OpenAI, Anthropic, Gemini, xAI, DeepSeek, HuggingFace, Ollama, Replicate, Runway
- **Complete Full-Stack Generation**: Backend, frontend, database, auth, payments
- **Automatic Validation**: Code quality checks, dependency inference
- **ZIP Packaging**: Ready-to-deploy artifacts
- **Streaming Progress**: Real-time generation updates
- **Template System**: OAuth, Stripe, Prisma schemas

## 📁 Architecture

```
backend/
├── lib/
│   ├── providers/
│   │   ├── registry.ts          # Model capabilities & routing
│   │   ├── router.ts             # Provider orchestration
│   │   ├── types.ts              # TypeScript interfaces
│   │   └── adapters/             # Per-provider clients
│   │       ├── openai.ts
│   │       ├── anthropic.ts
│   │       ├── gemini.ts
│   │       ├── xai.ts
│   │       ├── deepseek.ts
│   │       ├── huggingface.ts
│   │       ├── ollama.ts
│   │       ├── replicate.ts
│   │       └── runway.ts
│   └── code-generator/
│       ├── orchestrator.ts       # Main generation logic
│       ├── parser.ts             # Code extraction & validation
│       ├── packager.ts           # ZIP streaming
│       └── templates/
│           ├── database.ts       # Prisma schemas
│           ├── auth.ts           # JWT + OAuth templates
│           └── payments.ts       # Stripe integration
└── trpc/routes/generation/
    └── generate/route.ts         # tRPC API endpoints
```

## 🔧 Setup

### 1. Install Dependencies

```bash
bun install
```

### 2. Configure API Keys

Copy `backend/.env.example` to `backend/.env` and add your keys:

```bash
# Required for basic generation
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=...

# Optional (use specific models)
GOOGLE_API_KEY=...
XAI_API_KEY=...
DEEPSEEK_API_KEY=...
HF_API_KEY=...
REPLICATE_API_TOKEN=...
RUNWAY_API_KEY=...

# Local Ollama (free)
# brew install ollama && ollama serve && ollama pull llama3.2
```

### 3. Database (Optional - for auth/payments)

```bash
# PostgreSQL
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=password postgres

# Update .env
DATABASE_URL=postgresql://postgres:password@localhost:5432/myapp
```

### 4. Run Server

```bash
bun run backend/hono.ts
# or
npm run dev
```

## 📡 API Usage

### Basic Generation

```typescript
import { trpcClient } from '@/lib/trpc';

const result = await trpcClient.generation.generate.mutate({
  prompt: 'Build a todo app with user authentication',
  models: ['gpt-4o', 'claude-3-5-sonnet-20241022'],
  framework: 'nextjs',
  requireAuth: true,
  requireDatabase: true,
});

// Download ZIP
const zipBuffer = Buffer.from(result.zip, 'base64');
fs.writeFileSync('generated-app.zip', zipBuffer);
```

### Streaming Progress

```typescript
const stream = await trpcClient.generation.stream.query({
  prompt: 'E-commerce platform with Stripe payments',
  models: ['gpt-4o', 'claude-3-opus-20240229', 'gemini-1.5-pro'],
  framework: 'react-native',
  requireAuth: true,
  requireDatabase: true,
  requirePayments: true,
  features: [
    'Product catalog',
    'Shopping cart',
    'Checkout flow',
    'Order history',
  ],
});

for await (const event of stream) {
  console.log(event.data.message, `${event.data.progress}%`);
}
```

### React Hook Example

```tsx
import { trpc } from '@/lib/trpc';

export function AppGenerator() {
  const [prompt, setPrompt] = useState('');
  
  const generate = trpc.generation.generate.useMutation({
    onSuccess: (data) => {
      const zipBlob = new Blob(
        [Buffer.from(data.zip, 'base64')],
        { type: 'application/zip' }
      );
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${data.app.name}.zip`;
      a.click();
    },
  });

  return (
    <div>
      <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} />
      <button
        onClick={() => generate.mutate({
          prompt,
          models: ['gpt-4o', 'claude-3-5-sonnet-20241022'],
          framework: 'nextjs',
          requireAuth: true,
          requireDatabase: true,
        })}
      >
        Generate App
      </button>
      {generate.isLoading && <p>Generating...</p>}
    </div>
  );
}
```

## 🎯 Model Selection

### Speed vs Quality

```typescript
// Fast & Cheap (10-20s)
models: ['gpt-4o-mini', 'gemini-1.5-flash', 'deepseek-coder']

// Balanced (30-60s)
models: ['gpt-4o', 'claude-3-5-sonnet-20241022', 'gemini-1.5-pro']

// Best Quality (60-120s)
models: ['o1-preview', 'claude-3-opus-20240229', 'gpt-4o']

// Local (Free, but slower)
models: ['llama3.2', 'qwen2.5-coder', 'codellama']
```

### Use Cases

**Web Apps**: `gpt-4o`, `claude-3-5-sonnet-20241022`  
**Mobile Apps**: `gpt-4o`, `gemini-1.5-pro`  
**APIs/Backend**: `deepseek-coder`, `claude-3-5-sonnet`  
**Complex Logic**: `o1-preview`, `claude-3-opus`  
**Cost-Sensitive**: `deepseek-chat`, `gemini-1.5-flash`, `ollama`

## 🏗️ Generated Output Structure

```
generated-app.zip
├── backend/
│   ├── server.ts
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── payments.ts
│   │   └── api.ts
│   ├── middleware/
│   │   └── auth.ts
│   ├── config/
│   │   └── stripe.ts
│   └── db/
│       ├── schema.prisma
│       └── migrations/
├── frontend/
│   ├── app/
│   ├── components/
│   └── lib/
├── package.json
├── .env.example
├── README.md
└── .meta.json          # Generation metadata
```

## 🔐 Security Best Practices

1. **Never commit API keys** - Use `.env` files
2. **Validate generated code** - Review before deploying
3. **Use webhook secrets** - Verify Stripe webhooks
4. **Hash passwords** - Use bcrypt/argon2
5. **Rate limit** - Add rate limiting to APIs
6. **HTTPS only** - Use SSL in production

## 💰 Cost Estimation

Per 10K tokens (~7,500 words of code):

| Provider | Cost | Speed | Quality |
|----------|------|-------|---------|
| OpenAI GPT-4o | $0.05 | Fast | Excellent |
| Claude 3.5 Sonnet | $0.04 | Fast | Excellent |
| Claude 3 Opus | $0.06 | Medium | Best |
| Gemini 1.5 Pro | $0.03 | Fast | Very Good |
| DeepSeek | $0.01 | Fast | Good |
| Ollama | Free | Medium | Good |

**Example**: Generating a full-stack app (50K tokens output) with `gpt-4o` + `claude-3-5-sonnet`:
- Tokens: 50,000
- Cost: ~$0.25-0.50
- Time: 45-90 seconds

## 🧪 Testing

```bash
# Test single provider
curl -X POST http://localhost:3000/api/trpc/generation.generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Simple REST API with auth",
    "models": ["gpt-4o-mini"],
    "framework": "express"
  }'

# Test multi-model
bun test backend/__tests__/generation.test.ts
```

## 🐛 Troubleshooting

### "API key not configured"
- Check `backend/.env` has the correct key
- Restart server after updating `.env`

### "Ollama request failed"
```bash
# Install & start Ollama
brew install ollama
ollama serve
ollama pull llama3.2
```

### "Generation timeout"
- Increase timeout in `router.ts`:
  ```typescript
  timeoutMs = 180000  // 3 minutes
  ```
- Use faster models (`-mini`, `-flash` variants)

### "ZIP download fails"
- Check browser console for errors
- Verify base64 decode:
  ```typescript
  const buffer = Buffer.from(zip, 'base64');
  ```

## 🚀 Production Deployment

### Environment Variables

```bash
# Production
NODE_ENV=production
DATABASE_URL=postgresql://...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
JWT_SECRET=<secure-random-string>
```

### Scaling

1. **Rate Limiting**: Add Redis-based rate limits
2. **Queue System**: Use BullMQ for async generation
3. **Caching**: Cache generated templates
4. **Load Balancing**: Multiple instances behind nginx
5. **Monitoring**: Add Sentry/DataDog

## 📚 Advanced Usage

### Custom Templates

```typescript
// backend/lib/code-generator/templates/custom.ts
export const customTemplates = {
  graphql: {
    schema: `...`,
    resolvers: `...`,
  },
};

// Use in orchestrator
import { customTemplates } from './templates/custom';
```

### Model Routing Logic

```typescript
// backend/lib/providers/router.ts
export function selectBestModel(task: string): string {
  if (task.includes('image')) return 'gen-3-alpha';
  if (task.includes('code')) return 'deepseek-coder';
  if (task.includes('creative')) return 'claude-3-opus';
  return 'gpt-4o';
}
```

### Consensus Scoring

```typescript
// Compare outputs from multiple models
const results = await orchestrateMultiModel({ ... });
const winner = results.reduce((best, curr) =>
  curr.score > best.score ? curr : best
);
```

## 🎓 Examples

### Todo App

```typescript
await trpcClient.generation.generate.mutate({
  prompt: 'Todo app with categories and due dates',
  models: ['gpt-4o-mini'],
  framework: 'react-native',
  requireDatabase: true,
  requireAuth: true,
});
```

### SaaS Dashboard

```typescript
await trpcClient.generation.generate.mutate({
  prompt: 'Analytics dashboard with charts, user management, and billing',
  models: ['claude-3-5-sonnet-20241022', 'gpt-4o'],
  framework: 'nextjs',
  requireAuth: true,
  requireDatabase: true,
  requirePayments: true,
  features: ['Charts', 'User roles', 'Billing portal'],
});
```

### Mobile Game

```typescript
await trpcClient.generation.generate.mutate({
  prompt: '2D platformer game with physics and leaderboard',
  models: ['gpt-4o', 'gemini-1.5-pro'],
  framework: 'react-native',
  features: ['Touch controls', 'Level system', 'Global leaderboard'],
});
```

## 📞 Support

- Docs: `/docs/generation`
- Issues: GitHub Issues
- Discord: [Your Discord]

## 📄 License

MIT - See LICENSE file
