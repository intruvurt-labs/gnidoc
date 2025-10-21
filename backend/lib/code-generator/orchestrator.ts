import { orchestrateMultiModel } from '../providers/router';
import { extractCodeBlocks, normalizeCodeBlocks, extractDependencies, extractEnvVars, validateGeneratedCode } from './parser';
import { getModelInfo } from '../providers/registry';
import type { GenerationRequest, GenerationResult, GeneratedApp, ModelResult, ArtifactFile } from '../providers/types';

export interface CodeGenerationOptions {
  models: string[];
  prompt: string;
  context?: string;
  framework?: 'react-native' | 'nextjs' | 'express' | 'fastapi' | 'django';
  features?: string[];
  maxParallel?: number;
  requireDatabase?: boolean;
  requireAuth?: boolean;
  requirePayments?: boolean;
}

const SYSTEM_PROMPTS = {
  code: `You are an expert full-stack developer. Generate complete, production-ready code with:
- All necessary files organized in proper directory structure
- Complete implementations (no TODOs or placeholders)
- Error handling and validation
- TypeScript with proper types
- Modern best practices
- Clear comments explaining complex logic

Format each file as:
\`\`\`language // filename.ext
code here
\`\`\``,

  database: `Generate a complete database schema with:
- Well-designed tables with proper relationships
- Indexes for performance
- Migrations for version control
- Type-safe ORM models
- Seed data for testing`,

  auth: `Implement secure authentication with:
- JWT or session-based auth
- Password hashing (bcrypt/argon2)
- OAuth providers (Google, GitHub)
- Email verification
- Password reset flow
- Rate limiting
- CSRF protection`,

  payments: `Implement payment integration with:
- Stripe integration
- Webhook handling
- Subscription management
- Invoice generation
- Payment retry logic
- Idempotency for safety`,
};

export class CodeOrchestrator {
  private options: CodeGenerationOptions;

  constructor(options: CodeGenerationOptions) {
    this.options = options;
  }

  async generate(): Promise<GeneratedApp> {
    console.log('[CodeOrchestrator] Starting generation...', {
      models: this.options.models,
      features: this.options.features,
    });

    const results = await this.generateWithModels();
    const bestResult = this.selectBestResult(results);
    
    if (!bestResult.output) {
      throw new Error('No valid output generated from any model');
    }

    const app = this.parseIntoApp(bestResult, results);
    
    console.log('[CodeOrchestrator] Generation complete', {
      files: app.files.length,
      dependencies: Object.keys(app.dependencies).length,
    });

    return app;
  }

  private async generateWithModels(): Promise<GenerationResult[]> {
    const request: GenerationRequest = {
      prompt: this.buildPrompt(),
      context: this.options.context,
      models: this.options.models,
      systemPrompt: SYSTEM_PROMPTS.code,
      temperature: 0.3,
      maxTokens: 16000,
    };

    const rawResults = await orchestrateMultiModel(request, this.options.maxParallel || 3);
    
    return rawResults.map((result: ModelResult) => {
      const modelInfo = getModelInfo(result.model);
      const costPerToken = modelInfo?.capabilities.cost || 1;
      
      return {
        model: result.model,
        provider: modelInfo?.provider || 'unknown',
        output: result.output,
        score: result.score,
        responseTime: result.responseTime,
        tokensUsed: result.tokensUsed,
        cost: (result.tokensUsed / 1000) * costPerToken,
        error: result.error,
      };
    });
  }

  private buildPrompt(): string {
    const { framework, features, requireDatabase, requireAuth, requirePayments } = this.options;

    let prompt = this.options.prompt + '\n\n';
    
    prompt += `Generate a complete ${framework || 'full-stack'} application.\n\n`;
    
    prompt += 'Requirements:\n';
    if (framework) prompt += `- Framework: ${framework}\n`;
    if (features && features.length > 0) {
      prompt += '- Features:\n';
      features.forEach(f => prompt += `  * ${f}\n`);
    }
    if (requireDatabase) prompt += '- Include database schema and migrations\n';
    if (requireAuth) prompt += '- Include authentication (OAuth + JWT)\n';
    if (requirePayments) prompt += '- Include Stripe payment integration\n';
    
    prompt += '\nDeliver all files with proper structure. Use code blocks with filenames.';
    
    return prompt;
  }

  private selectBestResult(results: GenerationResult[]): GenerationResult {
    const validResults = results.filter(r => !r.error && r.output.length > 100);
    
    if (validResults.length === 0) {
      console.warn('[CodeOrchestrator] No valid results, using best available');
      return results.sort((a, b) => b.score - a.score)[0] || results[0];
    }

    validResults.sort((a, b) => {
      const aCodeBlocks = (a.output.match(/```/g) || []).length;
      const bCodeBlocks = (b.output.match(/```/g) || []).length;
      
      if (aCodeBlocks !== bCodeBlocks) return bCodeBlocks - aCodeBlocks;
      
      return b.score - a.score;
    });

    return validResults[0];
  }

  private parseIntoApp(best: GenerationResult, allResults: GenerationResult[]): GeneratedApp {
    const codeBlocks = extractCodeBlocks(best.output);
    const files = normalizeCodeBlocks(codeBlocks);
    
    const validation = validateGeneratedCode(files);
    if (!validation.valid) {
      console.warn('[CodeOrchestrator] Validation issues:', validation.errors);
    }

    let dependencies: Record<string, string> = extractDependencies(best.output);
    const packageJsonFile = files.find(f => f.path === 'package.json');
    if (packageJsonFile) {
      try {
        const pkg = JSON.parse(packageJsonFile.content);
        dependencies = { ...dependencies, ...pkg.dependencies, ...pkg.devDependencies };
      } catch {
        console.warn('[CodeOrchestrator] Failed to parse package.json');
      }
    }

    if (Object.keys(dependencies).length === 0) {
      dependencies = this.inferDependencies(files);
    }

    const envVars = extractEnvVars(best.output);
    
    const totalTokens = allResults.reduce((sum, r) => sum + r.tokensUsed, 0);
    const totalCost = allResults.reduce((sum, r) => sum + r.cost, 0);

    return {
      name: this.extractAppName(best.output) || 'generated-app',
      description: this.options.prompt.slice(0, 200),
      framework: this.options.framework || 'unknown',
      files,
      dependencies,
      envVars,
      setupInstructions: this.generateSetupInstructions(files, dependencies, envVars),
      meta: {
        generatedAt: new Date().toISOString(),
        models: allResults.map(r => r.model),
        totalTokens,
        totalCost: Number(totalCost.toFixed(4)),
      },
    };
  }

  private extractAppName(output: string): string | null {
    const nameMatch = output.match(/(?:app|project|name):\s*["`']?([a-z0-9-_]+)["`']?/i);
    if (nameMatch?.[1]) return nameMatch[1];
    
    const pkgMatch = output.match(/"name":\s*"([^"]+)"/);
    if (pkgMatch?.[1]) return pkgMatch[1];
    
    return null;
  }

  private inferDependencies(files: ArtifactFile[]): Record<string, string> {
    const deps: Record<string, string> = {};
    const allContent = files.map(f => f.content).join('\n');

    const commonDeps: Record<string, string> = {
      react: '^18.2.0',
      'react-native': '^0.73.0',
      next: '^14.0.0',
      express: '^4.18.0',
      fastapi: '^0.104.0',
      hono: '^4.0.0',
      '@trpc/server': '^10.45.0',
      '@trpc/client': '^10.45.0',
      zod: '^3.22.0',
      prisma: '^5.7.0',
      '@prisma/client': '^5.7.0',
      stripe: '^14.0.0',
      jsonwebtoken: '^9.0.2',
      bcryptjs: '^2.4.3',
    };

    for (const [pkg, version] of Object.entries(commonDeps)) {
      if (allContent.includes(`from '${pkg}'`) || allContent.includes(`from "${pkg}"`)) {
        deps[pkg] = version;
      }
    }

    return deps;
  }

  private generateSetupInstructions(
    files: ArtifactFile[],
    dependencies: Record<string, string>,
    envVars: string[]
  ): string {
    let instructions = '# Setup Instructions\n\n';
    
    instructions += '## 1. Install Dependencies\n\n';
    if (Object.keys(dependencies).length > 0) {
      instructions += '```bash\nnpm install\n```\n\n';
    } else {
      instructions += 'No dependencies required.\n\n';
    }

    if (envVars.length > 0) {
      instructions += '## 2. Environment Variables\n\n';
      instructions += 'Create a `.env` file with:\n\n```\n';
      envVars.forEach(v => instructions += `${v}=your_value_here\n`);
      instructions += '```\n\n';
    }

    const hasMigrations = files.some(f => f.path.includes('migration'));
    if (hasMigrations) {
      instructions += '## 3. Database Setup\n\n';
      instructions += '```bash\nnpm run migrate\n```\n\n';
    }

    instructions += '## 4. Run the Application\n\n';
    instructions += '```bash\nnpm run dev\n```\n\n';

    instructions += '## Notes\n\n';
    instructions += '- Replace all placeholder API keys with real values\n';
    instructions += '- Review security settings before deploying\n';
    instructions += '- Set up proper error monitoring (Sentry, etc.)\n';

    return instructions;
  }
}

export async function generateFullStackApp(options: CodeGenerationOptions): Promise<GeneratedApp> {
  const orchestrator = new CodeOrchestrator(options);
  return orchestrator.generate();
}
