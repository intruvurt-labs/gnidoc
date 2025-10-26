import { Hono } from 'hono';
import { stream } from 'hono/streaming';
import jwt from 'jsonwebtoken';
import { prisma } from '../db';
import { aiOrchestrator } from '../services/ai-orchestrator';
import archiver from 'archiver';
import { Readable } from 'stream';

const appGen = new Hono();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Auth middleware - FIXED: This was misplaced at the bottom
const authMiddleware = async (c: any, next: any) => {
  const authHeader = c.req.header('authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    c.set('user', user);
    await next();
  } catch (error) {
    return c.json({ error: 'Invalid token' }, 401);
  }
};

// POST /api/app-generator/generate - Generate complete app - FIXED: This was incomplete
appGen.post('/generate', authMiddleware, async (c) => {
  const user = c.get('user');
  const { description, template } = await c.req.json();

  if (!description?.trim()) {
    return c.json({ error: 'Description is required' }, 400);
  }

  try {
    console.log(`[AppGen] Generating app for user ${user.id}`);

    // Generate app with AI orchestrator
    const result = await aiOrchestrator.generateApp(description, template);

    // Save generated app to database
    const app = await prisma.generatedApp.create({
      data: {
        userId: user.id,
        name: description.substring(0, 100),
        description,
        template: template || 'custom',
        planning: result.planning.content,
        design: result.design.content,
        backend: result.backend.content,
        database: result.database.content,
        deployment: result.deployment.content,
        status: 'generated',
      },
    });

    return c.json({
      appId: app.id,
      planning: result.planning,
      design: result.design,
      backend: result.backend,
      database: result.database,
      deployment: result.deployment,
    });
  } catch (error) {
    console.error('[AppGen] Error:', error);
    return c.json({ error: 'Failed to generate app' }, 500);
  }
});

// POST /api/app-generator/stream - Stream generation progress
appGen.post('/stream', authMiddleware, (c) => {
  const user = c.get('user');

  return stream(c, async (stream) => {
    try {
      const { description, template } = await c.req.json();

      // Step 1: Planning
      await stream.write(JSON.stringify({ 
        step: 'planning', 
        status: 'in_progress',
        message: '🎯 Planning architecture...' 
      }) + '\n');

      const planning = await aiOrchestrator.executeTask({
        type: 'planning',
        prompt: `Create technical specification for: ${description}`,
      });

      await stream.write(JSON.stringify({ 
        step: 'planning', 
        status: 'completed',
        data: planning.content 
      }) + '\n');

      // Step 2: Design
      await stream.write(JSON.stringify({ 
        step: 'design', 
        status: 'in_progress',
        message: '🎨 Designing UI components...' 
      }) + '\n');

      const design = await aiOrchestrator.executeTask({
        type: 'design',
        prompt: 'Design UI based on architecture',
        context: planning.content,
      });

      await stream.write(JSON.stringify({ 
        step: 'design', 
        status: 'completed',
        data: design.content 
      }) + '\n');

      // Step 3: Backend
      await stream.write(JSON.stringify({ 
        step: 'backend', 
        status: 'in_progress',
        message: '⚙️ Building backend API...' 
      }) + '\n');

      const backend = await aiOrchestrator.executeTask({
        type: 'backend',
        prompt: 'Create backend implementation',
        context: planning.content,
      });

      await stream.write(JSON.stringify({ 
        step: 'backend', 
        status: 'completed',
        data: backend.content 
      }) + '\n');

      // Step 4: Database
      await stream.write(JSON.stringify({ 
        step: 'database', 
        status: 'in_progress',
        message: '🗄️ Setting up database...' 
      }) + '\n');

      const database = await aiOrchestrator.executeTask({
        type: 'database',
        prompt: 'Design database schema',
        context: planning.content,
      });

      await stream.write(JSON.stringify({ 
        step: 'database', 
        status: 'completed',
        data: database.content 
      }) + '\n');

      // Step 5: Deployment
      await stream.write(JSON.stringify({ 
        step: 'deployment', 
        status: 'in_progress',
        message: '🚀 Creating deployment configs...' 
      }) + '\n');

      const deployment = await aiOrchestrator.executeTask({
        type: 'deployment',
        prompt: 'Create deployment configuration',
        context: planning.content,
      });

      await stream.write(JSON.stringify({ 
        step: 'deployment', 
        status: 'completed',
        data: deployment.content 
      }) + '\n');

      // Save to database
      const app = await prisma.generatedApp.create({
        data: {
          userId: user.id,
          name: description.substring(0, 100),
          description,
          template: template || 'custom',
          planning: planning.content,
          design: design.content,
          backend: backend.content,
          database: database.content,
          deployment: deployment.content,
          status: 'generated',
        },
      });

      await stream.write(JSON.stringify({ 
        step: 'complete', 
        status: 'completed',
        appId: app.id,
        message: '✅ App generated successfully!' 
      }) + '\n');

    } catch (error) {
      console.error('[AppGen] Streaming error:', error);
      await stream.write(JSON.stringify({ 
        step: 'error', 
        status: 'failed',
        error: 'Generation failed' 
      }) + '\n');
    }
  });
});

// GET /api/app-generator/apps - List user's generated apps
appGen.get('/apps', authMiddleware, async (c) => {
  const user = c.get('user');

  try {
    const apps = await prisma.generatedApp.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return c.json({ apps });
  } catch (error) {
    console.error('[AppGen] Error fetching apps:', error);
    return c.json({ error: 'Failed to fetch apps' }, 500);
  }
});

// GET /api/app-generator/apps/:appId - Get specific app
appGen.get('/apps/:appId', authMiddleware, async (c) => {
  const user = c.get('user');
  const appId = c.req.param('appId');

  try {
    const app = await prisma.generatedApp.findUnique({
      where: { id: appId, userId: user.id },
    });

    if (!app) {
      return c.json({ error: 'App not found' }, 404);
    }

    return c.json({ app });
  } catch (error) {
    console.error('[AppGen] Error fetching app:', error);
    return c.json({ error: 'Failed to fetch app' }, 500);
  }
});

// POST /api/app-generator/code - Generate specific code
appGen.post('/code', authMiddleware, async (c) => {
  const user = c.get('user');
  const { prompt, language } = await c.req.json();

  if (!prompt?.trim()) {
    return c.json({ error: 'Prompt is required' }, 400);
  }

  try {
    const result = await aiOrchestrator.generateCode(prompt, language || 'typescript');

    return c.json({
      code: result.content,
      model: result.model,
      tokens: result.tokens,
    });
  } catch (error) {
    console.error('[AppGen] Code generation error:', error);
    return c.json({ error: 'Failed to generate code' }, 500);
  }
});

// POST /api/app-generator/review - Review code
appGen.post('/review', authMiddleware, async (c) => {
  const user = c.get('user');
  const { code, context } = await c.req.json();

  if (!code?.trim()) {
    return c.json({ error: 'Code is required' }, 400);
  }

  try {
    const result = await aiOrchestrator.reviewCode(code, context);

    return c.json({
      review: result.content,
      model: result.model,
      tokens: result.tokens,
    });
  } catch (error) {
    console.error('[AppGen] Code review error:', error);
    return c.json({ error: 'Failed to review code' }, 500);
  }
});

// POST /api/app-generator/deploy - Deploy generated app
appGen.post('/deploy', authMiddleware, async (c) => {
  const user = c.get('user');
  const { appId, platform } = await c.req.json();

  if (!appId) {
    return c.json({ error: 'App ID is required' }, 400);
  }

  try {
    const app = await prisma.generatedApp.findUnique({
      where: { id: appId, userId: user.id },
    });

    if (!app) {
      return c.json({ error: 'App not found' }, 404);
    }

    // Update status to deploying
    await prisma.generatedApp.update({
      where: { id: appId },
      data: { status: 'deploying' },
    });

    // In production, trigger actual deployment (Railway, Vercel, etc.)
    // For now, simulate deployment
    const deploymentUrl = `https://${appId}.gnidoc.xyz`;

    // Update with deployment info
    await prisma.generatedApp.update({
      where: { id: appId },
      data: { 
        status: 'deployed',
        deploymentUrl,
        deployedAt: new Date(),
      },
    });

    return c.json({
      success: true,
      deploymentUrl,
      platform: platform || 'vercel',
    });
  } catch (error) {
    console.error('[AppGen] Deployment error:', error);
    
    // Update status to failed
    await prisma.generatedApp.update({
      where: { id: appId },
      data: { status: 'failed' },
    });

    return c.json({ error: 'Deployment failed' }, 500);
  }
});

// GET /api/app-generator/download/:appId - Download app as ZIP
appGen.get('/download/:appId', authMiddleware, async (c) => {
  const user = c.get('user');
  const appId = c.req.param('appId');

  try {
    const app = await prisma.generatedApp.findUnique({
      where: { id: appId, userId: user.id },
    });

    if (!app) {
      return c.json({ error: 'App not found' }, 404);
    }

    // Create ZIP archive
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    // Add files to archive
    archive.append(app.backend, { name: 'server/index.ts' });
    archive.append(app.database, { name: 'prisma/schema.prisma' });
    archive.append(app.design, { name: 'app/index.tsx' });
    archive.append(app.deployment, { name: 'Dockerfile' });
    archive.append(
      JSON.stringify({ name: app.name, description: app.description }, null, 2),
      { name: 'package.json' }
    );

    archive.finalize();

    // Set headers for download
    c.header('Content-Type', 'application/zip');
    c.header('Content-Disposition', `attachment; filename="${app.name.replace(/\s/g, '-')}.zip"`);

    // Return the archive as a stream
    return c.body(Readable.from(archive as any));
  } catch (error) {
    console.error('[AppGen] Download error:', error);
    return c.json({ error: 'Failed to create download' }, 500);
  }
});

// DELETE /api/app-generator/apps/:appId - Delete app
appGen.delete('/apps/:appId', authMiddleware, async (c) => {
  const user = c.get('user');
  const appId = c.req.param('appId');

  try {
    await prisma.generatedApp.delete({
      where: { id: appId, userId: user.id },
    });

    return c.json({ success: true });
  } catch (error) {
    console.error('[AppGen] Delete error:', error);
    return c.json({ error: 'Failed to delete app' }, 500);
  }
});

export default appGen;