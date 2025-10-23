export type ArtifactFile = { path: string; content: string };

export function postProcessAICode(files: ArtifactFile[]): ArtifactFile[] {
  try {
    return files.map((file) => {
      try {
        const shouldProcess = file.path.endsWith(".tsx") || file.path.endsWith(".jsx");
        if (!shouldProcess) return file;
        const content = ensureExpoCompatibility(file.content);
        return { ...file, content };
      } catch (err) {
        console.log("postProcessAICode: failed processing file", file.path, err);
        return file;
      }
    });
  } catch (err) {
    console.log("postProcessAICode: unexpected error", err);
    return files;
  }
}

function ensureExpoCompatibility(code: string): string {
  let updated = code;

  const hasReactImport = /from\s+['"]react['"]|require\(['"]react['"]\)/.test(updated);
  const hasJSX = /<([A-Za-z][\w.:]*)\b[^>]*>/.test(updated);

  if (hasJSX && !hasReactImport) {
    updated = `import React from 'react';\n${updated}`;
  }

  return updated;
}
