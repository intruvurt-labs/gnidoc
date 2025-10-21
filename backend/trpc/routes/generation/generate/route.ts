import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { generateFullStackApp, type CodeGenerationOptions } from '../../../../lib/code-generator/orchestrator';
import { packageAsZip, createProgressStream } from '../../../../lib/code-generator/packager';


const GenerateInputSchema = z.object({
  prompt: z.string().min(10, 'Prompt must be at least 10 characters'),
  context: z.string().optional(),
  models: z.array(z.string()).min(1, 'At least one model required').max(5, 'Maximum 5 models allowed'),
  framework: z.enum(['react-native', 'nextjs', 'express', 'fastapi', 'django']).optional(),
  features: z.array(z.string()).optional(),
  maxParallel: z.number().min(1).max(5).optional(),
  requireDatabase: z.boolean().optional(),
  requireAuth: z.boolean().optional(),
  requirePayments: z.boolean().optional(),
  stream: z.boolean().optional(),
});

export const generateProcedure = publicProcedure
  .input(GenerateInputSchema)
  .mutation(async ({ input }) => {
    console.log('[Generate] Starting generation', {
      prompt: input.prompt.slice(0, 100),
      models: input.models,
      framework: input.framework,
    });

    const options: CodeGenerationOptions = {
      prompt: input.prompt,
      context: input.context,
      models: input.models,
      framework: input.framework,
      features: input.features,
      maxParallel: input.maxParallel || 3,
      requireDatabase: input.requireDatabase,
      requireAuth: input.requireAuth,
      requirePayments: input.requirePayments,
    };

    try {
      const app = await generateFullStackApp(options);

      console.log('[Generate] Generation complete', {
        files: app.files.length,
        dependencies: Object.keys(app.dependencies).length,
        totalCost: app.meta.totalCost,
      });

      const zipBuffer = await packageAsZip(app);

      return {
        success: true,
        app: {
          name: app.name,
          description: app.description,
          framework: app.framework,
          filesCount: app.files.length,
          dependenciesCount: Object.keys(app.dependencies).length,
          envVarsCount: app.envVars.length,
          meta: app.meta,
        },
        zip: zipBuffer.toString('base64'),
      };
    } catch (error: any) {
      console.error('[Generate] Generation failed:', error);
      throw new Error(`Generation failed: ${error.message}`);
    }
  });

export const generateStreamProcedure = publicProcedure
  .input(GenerateInputSchema)
  .query(async function* ({ input }) {
    const { emit, end } = createProgressStream();

    emit({
      stage: 'initializing',
      progress: 0,
      message: 'Starting code generation...',
    });

    yield { event: 'progress', data: { stage: 'initializing', progress: 10, message: 'Initializing models...' } };

    const options: CodeGenerationOptions = {
      prompt: input.prompt,
      context: input.context,
      models: input.models,
      framework: input.framework,
      features: input.features,
      maxParallel: input.maxParallel || 3,
      requireDatabase: input.requireDatabase,
      requireAuth: input.requireAuth,
      requirePayments: input.requirePayments,
    };

    try {
      yield { event: 'progress', data: { stage: 'generating', progress: 30, message: 'Generating code with AI models...' } };

      const app = await generateFullStackApp(options);

      yield { event: 'progress', data: { stage: 'validating', progress: 70, message: 'Validating generated code...' } };

      yield { event: 'progress', data: { stage: 'packaging', progress: 90, message: 'Packaging files...' } };

      const zipBuffer = await packageAsZip(app);

      yield {
        event: 'complete',
        data: {
          stage: 'complete',
          progress: 100,
          message: 'Generation complete!',
          app: {
            name: app.name,
            description: app.description,
            framework: app.framework,
            filesCount: app.files.length,
            dependenciesCount: Object.keys(app.dependencies).length,
            meta: app.meta,
          },
          zip: zipBuffer.toString('base64'),
        },
      };
    } catch (error: any) {
      yield {
        event: 'error',
        data: {
          stage: 'complete',
          progress: 100,
          message: `Error: ${error.message}`,
          error: error.message,
        },
      };
    } finally {
      end();
    }
  });

export const getGenerationStatusProcedure = publicProcedure
  .input(z.object({ id: z.string() }))
  .query(async ({ input }) => {
    return {
      id: input.id,
      status: 'completed',
      progress: 100,
    };
  });
