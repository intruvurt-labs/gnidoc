# Enhanced App Generator Implementation

## Overview
Multi-model app generation workflow with 4 distinct stages, strict validation, and resumable state management.

## Architecture

### Backend API Routes (tRPC)

#### 1. **Scan & Infer** (`generation.scanInfer`)
```typescript
Input: { prompt: string, context?: string }
Output: { inference, rawOutput, tokensUsed, responseTime }
```
- Analyzes user prompt with GPT-4o
- Infers app type, features, tech stack, complexity
- Identifies required API keys and integrations
- Returns structured JSON inference

#### 2. **Dry Run** (`generation.dryRun`)
```typescript
Input: { prompt, inference, context? }
Output: { plan, nonce, rawOutput, tokensUsed, responseTime }
```
- Creates detailed project structure plan
- Lists files, folders, dependencies
- Identifies environment variables needed
- Generates security nonce for next step
- Returns plan with estimated scope

#### 3. **Specifications** (`generation.spec`)
```typescript
Input: { prompt, inference, plan, nonce, context? }
Output: { specifications, buildNonce, models, totalTokens }
```
- Validates nonce from dry-run
- Orchestrates 3 models in parallel (GPT-4o, Claude 3.5, Gemini 1.5)
- Generates detailed specs for each file
- Includes components, functions, types, API endpoints
- Merges and deduplicates results
- Returns build nonce for final step

#### 4. **Build** (`generation.build`)
```typescript
Input: { prompt, specifications, buildNonce, plan }
Output: { success, buildSuccess, zipPath, zipSize, filesCreated, message }
```
- Validates build nonce from spec step
- Generates production code for each file using GPT-4o
- Creates complete project with:
  - All source files
  - package.json
  - README.md
- Installs dependencies
- Runs lint (non-fatal)
- Runs tests (non-fatal)
- Builds project
- Creates ZIP archive
- Cleans up temp files

## State Management

### Zustand Store (`useAppGeneratorStore`)
```typescript
State: {
  currentStep: "idle" | "scanning" | "dryrun" | "spec" | "building" | "complete" | "error"
  prompt: string
  context?: string
  inference?: any
  plan?: any
  specifications?: any
  buildResult?: any
  nonce?: string
  buildNonce?: string
  error?: string
  isLoading: boolean
  progress: number (0-100)
}

Actions: {
  start(prompt, context?): Promise<void>
  reset(): void
  retry(): void
}
```

### Flow Control
- Sequential execution with automatic state transitions
- Progress tracking (10% → 30% → 50% → 70% → 100%)
- Error handling with retry capability
- Rollback on failure (state preserved for retry)

## UI Components (`/app-generator-enhanced`)

### Features
- **Prompt validation**: Minimum 10 characters
- **Real-time progress**: Visual progress bar + step indicators
- **Step status indicators**:
  - ✓ Complete (green)
  - ⟳ Active/Loading (blue)
  - ⚠ Error (red)
  - ○ Pending (gray)
- **Live feedback**: Shows inference, plan, specs during generation
- **Results screen**:
  - Success/failure status
  - File count and ZIP size
  - Build status (success/warning)
  - Download button
  - "Generate Another" reset
- **Error handling**: Clear error messages + retry button

## Security Features

### Nonce System
1. **Dry-run nonce**: `dry_${timestamp}_${random}`
   - Required to proceed to spec step
   - Prevents skipping dry-run

2. **Build nonce**: `build_${timestamp}_${random}`
   - Required to proceed to build step
   - Prevents unauthorized builds

### Validation
- Input validation with Zod schemas
- Auth required (protectedProcedure)
- Rate limiting enabled
- Token validation

## Multi-Model Orchestration

### Scan & Infer
- **Model**: GPT-4o
- **Temperature**: 0.3 (deterministic)
- **Purpose**: Reliable inference

### Dry Run
- **Model**: GPT-4o
- **Temperature**: 0.2 (very deterministic)
- **Purpose**: Consistent planning

### Specifications
- **Models**: GPT-4o + Claude 3.5 + Gemini 1.5
- **Parallel execution**: 2 at a time
- **Temperature**: 0.2
- **Purpose**: Diverse, high-quality specs
- **Consensus**: Merge + deduplicate results

### Build
- **Model**: GPT-4o
- **Temperature**: 0.1 (most deterministic)
- **Purpose**: Clean, production-ready code

## Error Handling

### Edge Cases Fixed
1. **No prompt**: Button disabled, tooltip shown
2. **Short prompt**: Alert shown, generation blocked
3. **Invalid nonce**: Error thrown, user informed
4. **Network failure**: Error caught, state preserved, retry available
5. **Build failure**: Non-fatal, ZIP still created, warning shown
6. **Parse errors**: Logged, fallback handling

### Recovery
- State persisted on error
- Retry button restarts from beginning (fresh state)
- Reset button clears all state
- No partial/corrupted data

## File Generation Process

1. **Create temp directory**: `/tmp/project_{userId}_{timestamp}`
2. **Generate files**: One by one with model calls
3. **Write files**: Create directories as needed
4. **Generate package.json**: From dependencies in plan
5. **Create README**: With setup instructions
6. **Install deps**: `npm install` (pipe output)
7. **Lint**: `npm run lint` (non-fatal)
8. **Test**: `npm run test --passWithNoTests` (non-fatal)
9. **Build**: `npm run build` (marks success/failure)
10. **Archive**: Create ZIP at max compression
11. **Cleanup**: Remove temp directory
12. **Return**: ZIP path + metadata

## Usage

```typescript
import { useAppGeneratorStore } from '@/lib/appGeneratorStore';

function MyComponent() {
  const { currentStep, progress, error, start, reset } = useAppGeneratorStore();
  
  const handleGenerate = () => {
    start(
      "Build a task management app with authentication and real-time sync",
      "Use Firebase for backend, React for frontend"
    );
  };
  
  return (
    <View>
      <Button onPress={handleGenerate}>Generate</Button>
      <Text>Progress: {progress}%</Text>
      <Text>Step: {currentStep}</Text>
      {error && <Text>Error: {error}</Text>}
    </View>
  );
}
```

## Performance

- **Scan**: ~5-10 seconds
- **Dry Run**: ~8-15 seconds
- **Spec**: ~15-30 seconds (3 models)
- **Build**: ~30-120 seconds (depends on project size)
- **Total**: ~1-3 minutes for typical app

## Limitations

- Build requires Node.js environment on server
- Some builds may fail (wrong dependencies, syntax errors)
- ZIP download requires file serving endpoint
- No streaming (all-or-nothing per step)

## Future Enhancements

1. Stream build logs to client
2. Partial file generation (cancel/resume)
3. Custom model selection
4. Template library
5. Direct GitHub deployment
6. Live preview before download
