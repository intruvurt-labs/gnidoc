import { orchestrateMultiModel } from '../providers/router';
import { 
  extractCodeBlocks, 
  normalizeCodeBlocks, 
  extractDependencies, 
  extractEnvVars, 
  validateGeneratedCode,
  generateAPISpec,
  generateDatabaseSchema,
  generateComponentTree 
} from './parser';
import { getModelInfo } from '../providers/registry';
import type { 
  GenerationRequest, 
  GenerationResult, 
  GeneratedApp, 
  ModelResult, 
  ArtifactFile,
  ProjectType,
  DeploymentTarget 
} from '../providers/types';

export interface EnterpriseGenerationOptions {
  projectType: ProjectType;
  name: string;
  description: string;
  
  // Frontend
  frontend: {
    framework: 'react' | 'vue' | 'svelte' | 'solid' | 'nextjs' | 'nuxt';
    styling: 'tailwind' | 'css' | 'styled-components' | 'chakra' | 'material';
    responsive: boolean;
    pwa: boolean;
    mobileApp: boolean; // Generates React Native/Capacitor
  };
  
  // Backend
  backend: {
    framework: 'node' | 'express' | 'fastify' | 'hono' | 'nextjs' | 'python' | 'fastapi' | 'go';
    database: 'postgres' | 'mongodb' | 'sqlite' | 'firebase' | 'supabase';
    auth: 'none' | 'jwt' | 'oauth' | 'supabase' | 'clerk' | 'auth0';
    realtime: boolean;
  };
  
  // Business Features
  features: {
    payments: 'none' | 'stripe' | 'lemon-squeezy' | 'paddle';
    subscriptions: boolean;
    analytics: 'none' | 'plausible' | 'google' | 'mixpanel';
    email: 'none' | 'resend' | 'sendgrid' | 'postmark';
    cms: 'none' | 'contentful' | 'sanity' | 'custom';
  };
  
  // AI/Advanced
  ai: {
    agents: boolean;
    workflows: boolean;
    mcp: boolean;
    rag: boolean;
  };
  
  // Deployment
  deployment: {
    targets: DeploymentTarget[];
    domains: string[];
    ssl: boolean;
    cdn: boolean;
  };
  
  // Integration
  integrations: {
    crms: string[];
    marketing: string[];
    support: string[];
    monitoring: string[];
  };
}

export class EnterpriseCodeOrchestrator {
  private options: EnterpriseGenerationOptions;

  constructor(options: EnterpriseGenerationOptions) {
    this.options = options;
  }

  async generateFullStack(): Promise<GeneratedApp> {
    console.log('[Orchestrator] Starting full-stack generation...', this.options);

    // Generate in parallel for speed
    const [frontendResult, backendResult, databaseResult, deploymentResult] = await Promise.all([
      this.generateFrontend(),
      this.generateBackend(),
      this.generateDatabase(),
      this.generateDeployment()
    ]);

    const app = this.assembleFullStackApp(frontendResult, backendResult, databaseResult, deploymentResult);
    
    console.log('[Orchestrator] Full-stack generation complete', {
      files: app.files.length,
      endpoints: app.api?.endpoints?.length || 0,
      components: app.frontend?.components?.length || 0,
    });

    return app;
  }

  private async generateFrontend(): Promise<GenerationResult> {
    const prompt = this.buildFrontendPrompt();
    
    const request: GenerationRequest = {
      prompt,
      models: ['gpt-4', 'claude-3-sonnet'], // Prefer visual/UI models
      systemPrompt: this.getSystemPrompt('frontend'),
      temperature: 0.2, // More deterministic for UI
      maxTokens: 12000,
    };

    return this.generateWithFallback(request);
  }

  private async generateBackend(): Promise<GenerationResult> {
    const prompt = this.buildBackendPrompt();
    
    const request: GenerationRequest = {
      prompt,
      models: ['claude-3-sonnet', 'gpt-4'], // Prefer logic/architecture models
      systemPrompt: this.getSystemPrompt('backend'),
      temperature: 0.1, // Very deterministic for APIs
      maxTokens: 16000,
    };

    return this.generateWithFallback(request);
  }

  private buildFrontendPrompt(): string {
    const { frontend, features, name, description } = this.options;
    
    return `
Generate a complete, production-ready ${frontend.framework} application for: ${name}

DESCRIPTION: ${description}

FRONTEND REQUIREMENTS:
- Framework: ${frontend.framework}
- Styling: ${frontend.styling}
- Fully responsive: ${frontend.responsive}
- PWA: ${frontend.pwa}
- Mobile app: ${frontend.mobileApp}

BUSINESS FEATURES:
${features.payments !== 'none' ? `- Payments: ${features.payments} integration` : ''}
${features.subscriptions ? `- Subscription management with tiers` : ''}
${features.analytics !== 'none' ? `- Analytics: ${features.analytics}` : ''}

SPECIFIC COMPONENTS NEEDED:
1. Responsive navigation with auth states
2. Hero section with value proposition
3. Feature/pricing sections
4. Dashboard layout (if authenticated)
5. Payment/checkout flows
6. Mobile-optimized components

Generate ALL files including:
- Main layout/components
- Routing configuration
- State management
- Responsive design system
- Mobile-specific components if needed
- PWA manifest/service worker if needed
    `.trim();
  }

  private buildBackendPrompt(): string {
    const { backend, features, ai, name } = this.options;
    
    return `
Generate a complete, production-ready ${backend.framework} backend API for: ${name}

BACKEND REQUIREMENTS:
- Framework: ${backend.framework}
- Database: ${backend.database}
- Authentication: ${backend.auth}
- Realtime: ${backend.realtime}

BUSINESS LOGIC:
${features.payments !== 'none' ? `- Payment processing with ${features.payments}` : ''}
${features.subscriptions ? `- Subscription management with webhooks` : ''}
${features.email !== 'none' ? `- Email system with ${features.email}` : ''}

AI CAPABILITIES:
${ai.agents ? `- AI agent system with tool calling` : ''}
${ai.workflows ? `- Workflow engine for multi-step processes` : ''}
${ai.mcp ? `- MCP (Model Context Protocol) server integration` : ''}
${ai.rag ? `- RAG system for knowledge retrieval` : ''}

GENERATE COMPLETE:
- API routes with proper REST/GraphQL
- Database models and migrations
- Authentication middleware
- Payment webhook handlers
- AI agent endpoints
- Error handling and validation
- Security best practices
    `.trim();
  }

  private getSystemPrompt(type: 'frontend' | 'backend' | 'database' | 'deployment'): string {
    const prompts = {
      frontend: `You are an expert frontend architect. Generate:
- Production-ready, responsive components
- Mobile-first design with tablet/desktop breakpoints
- Accessible, semantic HTML
- Optimized performance (lazy loading, code splitting)
- PWA capabilities if requested
- Payment UI components if needed
- Clean, maintainable component structure`,

      backend: `You are an expert backend architect. Generate:
- Scalable, secure API architecture
- Proper database models and relationships
- Authentication/authorization middleware
- Payment processing with webhook security
- AI agent workflows with proper tooling
- Real-time capabilities if needed
- Comprehensive error handling and logging
- Type-safe throughout`,

      database: `You are a database architect. Generate:
- Optimized schema design with proper indexes
- Migration files for version control
- Seed data for development
- Relationships and constraints
- Performance considerations`,

      deployment: `You are a DevOps engineer. Generate:
- Docker configurations
- CI/CD pipeline files
- Environment configurations
- Deployment scripts
- Monitoring setup`
    };

    return prompts[type];
  }

  private async generateWithFallback(request: GenerationRequest): Promise<GenerationResult> {
    try {
      const results = await orchestrateMultiModel(request, 2);
      const best = this.selectBestResult(results);
      
      if (!best.output) {
        throw new Error('No valid output from primary models');
      }
      
      return best;
    } catch (error) {
      console.warn('[EnterpriseOrchestrator] Primary generation failed, using fallback');
      // Fallback to simpler generation
      return this.generateFallback(request);
    }
  }

  private assembleFullStackApp(
    frontend: GenerationResult, 
    backend: GenerationResult,
    database: GenerationResult,
    deployment: GenerationResult
  ): GeneratedApp {
    // Parse all code blocks from all generations
    const allCodeBlocks = [
      ...extractCodeBlocks(frontend.output),
      ...extractCodeBlocks(backend.output),
      ...extractCodeBlocks(database.output),
      ...extractCodeBlocks(deployment.output)
    ];
    
    const files = normalizeCodeBlocks(allCodeBlocks);
    
    // Generate API specification
    const apiSpec = generateAPISpec(backend.output);
    
    // Generate component tree for the frontend
    const componentTree = generateComponentTree(frontend.output);
    
    // Generate database schema
    const databaseSchema = generateDatabaseSchema(database.output);
    
    // Validate everything works together
    const validation = this.validateFullStackIntegration(files, apiSpec, databaseSchema);
    
    return {
      name: this.options.name,
      description: this.options.description,
      type: this.options.projectType,
      
      // Frontend specific
      frontend: {
        framework: this.options.frontend.framework,
        components: componentTree,
        responsive: this.options.frontend.responsive,
        pwa: this.options.frontend.pwa,
        mobileApp: this.options.frontend.mobileApp,
      },
      
      // Backend specific
      backend: {
        framework: this.options.backend.framework,
        database: this.options.backend.database,
        api: apiSpec,
        realtime: this.options.backend.realtime,
      },
      
      // Business features
      features: {
        payments: this.options.features.payments,
        subscriptions: this.options.features.subscriptions,
        analytics: this.options.features.analytics,
        auth: this.options.backend.auth,
      },
      
      // AI capabilities
      ai: {
        agents: this.options.ai.agents,
        workflows: this.options.ai.workflows,
        mcp: this.options.ai.mcp,
        rag: this.options.ai.rag,
      },
      
      // The actual generated artifacts
      files,
      dependencies: this.resolveAllDependencies(files),
      envVars: this.extractAllEnvVars([frontend, backend, database, deployment]),
      database: databaseSchema,
      
      // Deployment ready
      deployment: {
        targets: this.options.deployment.targets,
        configuration: this.generateDeploymentConfig(),
        scripts: this.extractDeploymentScripts(deployment.output),
      },
      
      setupInstructions: this.generateEnterpriseSetupInstructions(),
      meta: {
        generatedAt: new Date().toISOString(),
        generationTime: Date.now(),
        modelsUsed: [frontend.model, backend.model, database.model, deployment.model],
        validation: validation,
      },
    };
  }

  private validateFullStackIntegration(
    files: ArtifactFile[], 
    apiSpec: any, 
    databaseSchema: any
  ): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check frontend-backend integration
    const frontendFiles = files.filter(f => 
      f.path.includes('src/') && (f.path.endsWith('.tsx') || f.path.endsWith('.vue'))
    );
    
    const backendFiles = files.filter(f => 
      f.path.includes('api/') || f.path.includes('server/')
    );

    // Verify API endpoints are called from frontend
    if (apiSpec.endpoints) {
      const frontendCode = frontendFiles.map(f => f.content).join('\n');
      apiSpec.endpoints.forEach((endpoint: any) => {
        if (!frontendCode.includes(endpoint.path) && endpoint.method === 'GET') {
          warnings.push(`Frontend may not be calling endpoint: ${endpoint.method} ${endpoint.path}`);
        }
      });
    }

    // Check database models are used in backend
    if (databaseSchema.tables) {
      const backendCode = backendFiles.map(f => f.content).join('\n');
      databaseSchema.tables.forEach((table: any) => {
        if (!backendCode.includes(table.name)) {
          warnings.push(`Database table ${table.name} may not be used in backend`);
        }
      });
    }

    // Check for environment variable consistency
    const envVars = this.extractAllEnvVars([]);
    const hasEnvExample = files.some(f => f.path.includes('.env.example'));
    
    if (!hasEnvExample && envVars.length > 0) {
      errors.push('Missing .env.example file with required environment variables');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  private generateEnterpriseSetupInstructions(): string {
    const { frontend, backend, features, deployment } = this.options;
    
    let instructions = `# ${this.options.name} - Setup Instructions\n\n`;

    instructions += '## Quick Start\n\n';
    instructions += '```bash\n# Clone and install\ngit clone <repository>\ncd ${this.options.name}\nnpm install\n\n# Set up environment\ncp .env.example .env.local\n# Fill in your environment variables\n\n# Start development\nnpm run dev\n```\n\n';

    instructions += '## Full Deployment Guide\n\n';

    if (deployment.targets.includes('vercel')) {
      instructions += '### Vercel Deployment\n';
      instructions += '1. Push code to GitHub\n2. Connect repository in Vercel\n3. Add environment variables\n4. Deploy automatically\n\n';
    }

    if (features.payments !== 'none') {
      instructions += `### ${features.payments.toUpperCase()} Setup\n`;
      instructions += '1. Create account at dashboard\n2. Get API keys\n3. Configure webhooks\n4. Test payments in sandbox\n\n';
    }

    if (backend.auth !== 'none') {
      instructions += `### Authentication Setup (${backend.auth})\n`;
      instructions += '1. Configure auth provider\n2. Set redirect URLs\n3. Test login flow\n4. Set up roles/permissions\n\n';
    }

    instructions += '## Mobile App\n\n';
    if (frontend.mobileApp) {
      instructions += 'This project includes mobile app configuration.\n';
      instructions += '```bash\n# For iOS\nnpm run build:ios\n\n# For Android  \nnpm run build:android\n```\n\n';
    }

    instructions += '## AI Features\n\n';
    if (this.options.ai.agents) {
      instructions += '### AI Agents\n';
      instructions += '1. Set up OpenAI/Anthropic API keys\n2. Configure agent tools\n3. Test workflows in dashboard\n\n';
    }

    return instructions;
  }

  // ... (helper methods for dependency resolution, env var extraction, etc.)
}

// Specialized generators for different project types
export class ProjectTypeGenerator {
  static async generateSaaS(options: EnterpriseGenerationOptions): Promise<GeneratedApp> {
    const orchestrator = new EnterpriseCodeOrchestrator({
      ...options,
      features: {
        ...options.features,
        payments: 'stripe',
        subscriptions: true,
        analytics: 'plausible',
        email: 'resend',
        cms: 'custom'
      },
      backend: {
        ...options.backend,
        auth: 'oauth'
      }
    });
    
    return orchestrator.generateFullStack();
  }

  static async generateAIWorkflow(options: EnterpriseGenerationOptions): Promise<GeneratedApp> {
    const orchestrator = new EnterpriseCodeOrchestrator({
      ...options,
      ai: {
        agents: true,
        workflows: true,
        mcp: true,
        rag: true
      },
      frontend: {
        ...options.frontend,
        framework: 'nextjs'
      }
    });
    
    return orchestrator.generateFullStack();
  }

  static async generateMobileApp(options: EnterpriseGenerationOptions): Promise<GeneratedApp> {
    const orchestrator = new EnterpriseCodeOrchestrator({
      ...options,
      frontend: {
        ...options.frontend,
        framework: 'react',
        mobileApp: true,
        pwa: true
      },
      deployment: {
        ...options.deployment,
        targets: ['app-store', 'play-store', 'web']
      }
    });
    
    return orchestrator.generateFullStack();
  }
}