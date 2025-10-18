#!/usr/bin/env bun
/**
 * End-to-End Smoke Test Suite for gnidoC terceS
 * Tests critical user flows, API endpoints, and system integration
 */

import { trpcClient } from '@/lib/trpc';

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'skip';
  duration: number;
  error?: string;
}

interface TestSuite {
  name: string;
  tests: TestResult[];
  duration: number;
}

const results: TestSuite[] = [];
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
let skippedTests = 0;

async function runTest(name: string, testFn: () => Promise<void>): Promise<TestResult> {
  const start = Date.now();
  totalTests++;
  
  try {
    await testFn();
    passedTests++;
    return { name, status: 'pass', duration: Date.now() - start };
  } catch (error) {
    failedTests++;
    return {
      name,
      status: 'fail',
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function printHeader() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                                                               ║');
  console.log('║         gnidoC terceS - END-TO-END SMOKE TEST SUITE           ║');
  console.log('║                                                               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
}

function printSuiteHeader(name: string) {
  console.log(`\n${'='.repeat(65)}`);
  console.log(`  ${name}`);
  console.log(`${'='.repeat(65)}\n`);
}

function printTestResult(result: TestResult) {
  const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⏭️';
  const duration = `${result.duration}ms`;
  console.log(`${icon} ${result.name.padEnd(50)} ${duration.padStart(8)}`);
  if (result.error) {
    console.log(`   └─ Error: ${result.error}`);
  }
}

function printSummary() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                                                               ║');
  console.log('║                      TEST SUMMARY                             ║');
  console.log('║                                                               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  
  const totalDuration = results.reduce((sum, suite) => sum + suite.duration, 0);
  
  console.log(`📊 Total Tests:     ${totalTests}`);
  console.log(`✅ Passed:          ${passedTests}`);
  console.log(`❌ Failed:          ${failedTests}`);
  console.log(`⏭️  Skipped:         ${skippedTests}`);
  console.log(`⏱️  Total Duration:  ${totalDuration}ms`);
  console.log(`📈 Pass Rate:       ${((passedTests / totalTests) * 100).toFixed(2)}%\n`);
  
  if (failedTests === 0) {
    console.log('🎉 ALL TESTS PASSED - SYSTEM IS HEALTHY! 🎉\n');
  } else {
    console.log('⚠️  SOME TESTS FAILED - REVIEW ERRORS ABOVE ⚠️\n');
  }
}

// ============================================================================
// TEST SUITES
// ============================================================================

async function testAuthenticationFlow() {
  const suiteStart = Date.now();
  printSuiteHeader('1. Authentication Flow');
  
  const tests: TestResult[] = [];
  let testUser: any = null;
  let testToken: string | null = null;
  
  tests.push(await runTest('User signup with email/password', async () => {
    const email = `test-${Date.now()}@example.com`;
    const result = await trpcClient.auth.signup.mutate({
      email,
      password: 'Test123!@#',
      name: `Test User ${Date.now()}`,
    });
    
    if (!result.token || !result.user) {
      throw new Error('Signup did not return token or user');
    }
    
    testUser = result.user;
    testToken = result.token;
  }));
  
  tests.push(await runTest('User login with credentials', async () => {
    if (!testUser) throw new Error('No test user available');
    
    const result = await trpcClient.auth.login.mutate({
      email: testUser.email,
      password: 'Test123!@#',
    });
    
    if (!result.token) {
      throw new Error('Login did not return token');
    }
  }));
  
  tests.push(await runTest('Get authenticated user profile', async () => {
    if (!testToken) throw new Error('No test token available');
    
    const user = await trpcClient.auth.me.query();
    
    if (!user || !user.id) {
      throw new Error('Failed to fetch current user');
    }
  }));
  
  tests.push(await runTest('Update user profile', async () => {
    if (!testToken) throw new Error('No test token available');
    
    const updated = await trpcClient.auth.profile.mutate({
      name: `Updated User ${Date.now()}`,
      bio: 'Test bio',
    });
    
    if (!updated.success) {
      throw new Error('Profile update failed');
    }
  }));
  
  tests.forEach(printTestResult);
  
  results.push({
    name: 'Authentication Flow',
    tests,
    duration: Date.now() - suiteStart,
  });
}

async function testDeploymentFlow() {
  const suiteStart = Date.now();
  printSuiteHeader('2. Deployment Flow');
  
  const tests: TestResult[] = [];
  let deploymentId: string | null = null;
  
  tests.push(await runTest('Create new deployment', async () => {
    const result = await trpcClient.deploy.create.mutate({
      projectId: 'test-project',
      projectName: 'Test Project',
      subdomain: `test-${Date.now()}`,
      buildOutput: '{"files":[]}',
      tier: 'free',
    });
    
    if (!result.id) {
      throw new Error('Deployment creation failed');
    }
    
    deploymentId = result.id;
  }));
  
  tests.push(await runTest('List user deployments', async () => {
    const deployments = await trpcClient.deploy.list.query({ limit: 10 });
    
    if (!Array.isArray(deployments)) {
      throw new Error('Failed to fetch deployments');
    }
  }));
  
  tests.push(await runTest('Generate SEO content for deployment', async () => {
    const seo = await trpcClient.deploy.generateSEO.mutate({
      projectName: 'Test Project',
      projectDescription: 'A test project for smoke tests',
      features: ['feature1', 'feature2'],
      targetAudience: 'developers',
    });
    
    if (!seo.title || !seo.description) {
      throw new Error('SEO generation incomplete');
    }
  }));
  
  tests.push(await runTest('Delete deployment', async () => {
    if (!deploymentId) throw new Error('No deployment ID available');
    
    await trpcClient.deploy.delete.mutate({ deploymentId });
  }));
  
  tests.forEach(printTestResult);
  
  results.push({
    name: 'Deployment Flow',
    tests,
    duration: Date.now() - suiteStart,
  });
}

async function testResearchFlow() {
  const suiteStart = Date.now();
  printSuiteHeader('3. Research Flow');
  
  const tests: TestResult[] = [];
  let researchId: string | null = null;
  
  tests.push(await runTest('Conduct multi-model research', async () => {
    const result = await trpcClient.research.conduct.mutate({
      query: 'Latest trends in AI development',
      category: 'technology',
      depth: 'quick',
    });
    
    if (!result.researchId) {
      throw new Error('Research failed to generate ID');
    }
    
    researchId = result.researchId;
  }));
  
  tests.push(await runTest('Fetch research history', async () => {
    const history = await trpcClient.research.history.query({ limit: 10 });
    
    if (!Array.isArray(history)) {
      throw new Error('Failed to fetch research history');
    }
  }));
  
  tests.push(await runTest('Export research to markdown', async () => {
    if (!researchId) throw new Error('No research ID available');
    
    const exported = await trpcClient.research.export.query({
      researchId,
      format: 'markdown',
    });
    
    if (!exported.content) {
      throw new Error('Research export failed');
    }
  }));
  
  tests.push(await runTest('Delete research', async () => {
    if (!researchId) throw new Error('No research ID available');
    
    await trpcClient.research.delete.mutate({ researchId });
  }));
  
  tests.forEach(printTestResult);
  
  results.push({
    name: 'Research Flow',
    tests,
    duration: Date.now() - suiteStart,
  });
}

async function testDatabaseFlow() {
  const suiteStart = Date.now();
  printSuiteHeader('4. Database Management Flow');
  
  const tests: TestResult[] = [];
  
  const testConnection = {
    id: 'test-conn',
    name: 'Test Connection',
    host: process.env.EXPO_PUBLIC_DB_HOST || 'localhost',
    port: parseInt(process.env.EXPO_PUBLIC_DB_PORT || '5432'),
    database: process.env.EXPO_PUBLIC_DB_NAME || 'testdb',
    username: process.env.EXPO_PUBLIC_DB_USER || 'testuser',
    password: process.env.EXPO_PUBLIC_DB_PASS || 'testpass',
    ssl: false,
  };
  
  tests.push(await runTest('Test database connection', async () => {
    try {
      await trpcClient.database.testConnection.mutate(testConnection);
    } catch (error) {
      throw new Error(`Connection test failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }));
  
  tests.push(await runTest('Execute safe SELECT query', async () => {
    const result = await trpcClient.database.execute.mutate({
      connection: testConnection,
      query: 'SELECT 1 as test',
    });
    
    if (!result.rows) {
      throw new Error('Query execution failed');
    }
  }));
  
  tests.push(await runTest('Block dangerous DROP query', async () => {
    try {
      await trpcClient.database.execute.mutate({
        connection: testConnection,
        query: 'DROP TABLE users',
      });
      throw new Error('Dangerous query was not blocked');
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes('dangerous')) {
        throw error;
      }
    }
  }));
  
  tests.push(await runTest('List database tables', async () => {
    const tables = await trpcClient.database.listTables.query(testConnection);
    
    if (!Array.isArray(tables)) {
      throw new Error('Failed to list tables');
    }
  }));
  
  tests.forEach(printTestResult);
  
  results.push({
    name: 'Database Management Flow',
    tests,
    duration: Date.now() - suiteStart,
  });
}

async function testOrchestrationFlow() {
  const suiteStart = Date.now();
  printSuiteHeader('5. Multi-Model Orchestration Flow');
  
  const tests: TestResult[] = [];
  
  tests.push(await runTest('Generate code with multi-model orchestration', async () => {
    const result = await trpcClient.orchestration.generate.mutate({
      prompt: 'Create a function that calculates fibonacci numbers',
      models: ['gpt-4-turbo', 'claude-3-opus'],
      selectionStrategy: 'quality',
    });
    
    if (!result.id || !result.selectedResponse) {
      throw new Error('Code generation failed');
    }
  }));
  
  tests.push(await runTest('Compare multiple AI models', async () => {
    const comparison = await trpcClient.orchestration.compare.mutate({
      prompt: 'Explain recursion',
      modelIds: ['gpt-4-turbo', 'claude-3-opus', 'gemini-pro'],
    });
    
    if (!comparison.results || comparison.results.length < 2) {
      throw new Error('Model comparison failed');
    }
  }));
  
  tests.push(await runTest('Fetch orchestration statistics', async () => {
    const stats = await trpcClient.orchestration.stats.query({ timeRange: 'all' });
    
    if (!stats || typeof stats.totalOrchestrations !== 'number') {
      throw new Error('Failed to fetch orchestration stats');
    }
  }));
  
  tests.push(await runTest('Fetch orchestration history', async () => {
    const history = await trpcClient.orchestration.history.query({ limit: 10 });
    
    if (!Array.isArray(history)) {
      throw new Error('Failed to fetch orchestration history');
    }
  }));
  
  tests.forEach(printTestResult);
  
  results.push({
    name: 'Multi-Model Orchestration Flow',
    tests,
    duration: Date.now() - suiteStart,
  });
}

async function testProjectFlow() {
  const suiteStart = Date.now();
  printSuiteHeader('6. Project Management Flow');
  
  const tests: TestResult[] = [];
  let projectId: string | null = null;
  
  tests.push(await runTest('Create new project', async () => {
    const result = await trpcClient.projects.create.mutate({
      type: 'react-native',
      name: `Test Project ${Date.now()}`,
      slug: `test-project-${Date.now()}`,
      template: 'blank',
    });
    
    if (!result.projectId) {
      throw new Error('Project creation failed');
    }
    
    projectId = result.projectId;
  }));
  
  tests.push(await runTest('Initialize git repository', async () => {
    if (!projectId) throw new Error('No project ID available');
    
    await trpcClient.projects.git.init.mutate({ projectId });
  }));
  
  tests.push(await runTest('Export project as ZIP', async () => {
    if (!projectId) throw new Error('No project ID available');
    
    const result = await trpcClient.projects.export.zip.mutate({ projectId });
    
    if (!result.url) {
      throw new Error('Project export failed');
    }
  }));
  
  tests.forEach(printTestResult);
  
  results.push({
    name: 'Project Management Flow',
    tests,
    duration: Date.now() - suiteStart,
  });
}

async function testPolicyFlow() {
  const suiteStart = Date.now();
  printSuiteHeader('7. Policy & Compliance Flow');
  
  const tests: TestResult[] = [];
  
  tests.push(await runTest('Check code for policy violations', async () => {
    const result = await trpcClient.policy.checkCode.mutate({
      code: 'const app = () => { return <View><Text>Hello</Text></View>; }',
      tier: 3,
    });
    
    if (!result || typeof result.allowed !== 'boolean') {
      throw new Error('Code check failed');
    }
  }));
  
  tests.push(await runTest('Award credits to user', async () => {
    await trpcClient.policy.awardCredits.mutate({
      amount: 100,
      reason: 'smoke test',
    });
  }));
  
  tests.push(await runTest('Report policy violation manually', async () => {
    await trpcClient.policy.manualFlag.mutate({
      code: 'bad code with violations',
      tier: 5,
      userNotes: 'Test violation for smoke test',
    });
  }));
  
  tests.forEach(printTestResult);
  
  results.push({
    name: 'Policy & Compliance Flow',
    tests,
    duration: Date.now() - suiteStart,
  });
}

async function testSystemIntegration() {
  const suiteStart = Date.now();
  printSuiteHeader('8. System Integration Tests');
  
  const tests: TestResult[] = [];
  
  tests.push(await runTest('API health check', async () => {
    const response = await fetch(`${process.env.EXPO_PUBLIC_API_BASE}/health`);
    if (!response.ok) {
      throw new Error('API health check failed');
    }
  }));
  
  tests.push(await runTest('tRPC connection test', async () => {
    const result = await trpcClient.example.hi.mutate({ name: 'smoke-test' });
    if (!result || !result.hello) {
      throw new Error('tRPC connection failed');
    }
  }));
  
  tests.push(await runTest('WebSocket connection test', async () => {
    const wsBase = process.env.EXPO_PUBLIC_API_BASE?.replace(/^http/, 'ws');
    if (!wsBase) throw new Error('No API base URL configured');
    
    const ws = new WebSocket(`${wsBase}/ws`);
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('WebSocket connection timeout'));
      }, 5000);
      
      ws.onopen = () => {
        clearTimeout(timeout);
        ws.close();
        resolve();
      };
      
      ws.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('WebSocket connection failed'));
      };
    });
  }));
  
  tests.forEach(printTestResult);
  
  results.push({
    name: 'System Integration Tests',
    tests,
    duration: Date.now() - suiteStart,
  });
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  printHeader();
  
  const globalStart = Date.now();
  
  try {
    await testAuthenticationFlow();
    await testDeploymentFlow();
    await testResearchFlow();
    await testDatabaseFlow();
    await testOrchestrationFlow();
    await testProjectFlow();
    await testPolicyFlow();
    await testSystemIntegration();
    
    printSummary();
    
    const globalDuration = Date.now() - globalStart;
    console.log(`⏱️  Total Execution Time: ${globalDuration}ms\n`);
    
    if (failedTests > 0) {
      process.exit(1);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ CRITICAL ERROR DURING TEST EXECUTION:\n');
    console.error(error);
    process.exit(1);
  }
}

if (typeof process !== 'undefined' && require.main === module) {
  main();
}

export { main as runSmokeTests };
