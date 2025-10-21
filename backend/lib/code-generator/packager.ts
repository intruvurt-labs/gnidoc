import { Readable } from 'stream';
import archiver from 'archiver';
import type { GeneratedApp } from '../providers/types';

export async function packageAsZip(app: GeneratedApp): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.on('data', (chunk: Buffer) => chunks.push(chunk));
    archive.on('end', () => resolve(Buffer.concat(chunks)));
    archive.on('error', reject);

    for (const file of app.files) {
      archive.append(file.content, { name: file.path });
    }

    archive.append(app.setupInstructions, { name: 'README.md' });

    if (Object.keys(app.dependencies).length > 0) {
      const packageJson = JSON.stringify(
        {
          name: app.name,
          version: '1.0.0',
          description: app.description,
          dependencies: app.dependencies,
          scripts: {
            dev: 'npm run start:dev',
            build: 'npm run build',
            start: 'npm run start:prod',
          },
        },
        null,
        2
      );
      archive.append(packageJson, { name: 'package.json' });
    }

    if (app.envVars.length > 0) {
      const envExample = app.envVars.map(v => `${v}=`).join('\n');
      archive.append(envExample, { name: '.env.example' });
    }

    const metaJson = JSON.stringify(app.meta, null, 2);
    archive.append(metaJson, { name: '.meta.json' });

    archive.finalize();
  });
}

export function createZipStream(app: GeneratedApp): Readable {
  const archive = archiver('zip', { zlib: { level: 9 } });

  for (const file of app.files) {
    archive.append(file.content, { name: file.path });
  }

  archive.append(app.setupInstructions, { name: 'README.md' });

  if (Object.keys(app.dependencies).length > 0) {
    const packageJson = JSON.stringify(
      {
        name: app.name,
        version: '1.0.0',
        description: app.description,
        dependencies: app.dependencies,
        scripts: {
          dev: 'npm run start:dev',
          build: 'npm run build',
          start: 'npm run start:prod',
        },
      },
      null,
      2
    );
    archive.append(packageJson, { name: 'package.json' });
  }

  if (app.envVars.length > 0) {
    const envExample = app.envVars.map(v => `${v}=`).join('\n');
    archive.append(envExample, { name: '.env.example' });
  }

  const metaJson = JSON.stringify(app.meta, null, 2);
  archive.append(metaJson, { name: '.meta.json' });

  archive.finalize();

  return archive;
}

export interface ProgressEvent {
  stage: 'initializing' | 'generating' | 'validating' | 'packaging' | 'complete';
  progress: number;
  message: string;
  data?: any;
}

export function createProgressStream(): {
  stream: Readable;
  emit: (event: ProgressEvent) => void;
  end: () => void;
} {
  const stream = new Readable({
    read() {},
  });

  const emit = (event: ProgressEvent) => {
    stream.push(`data: ${JSON.stringify(event)}\n\n`);
  };

  const end = () => {
    stream.push(null);
  };

  return { stream, emit, end };
}
