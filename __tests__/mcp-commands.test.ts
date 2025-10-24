import { listSupportedCommands, executeMCPCommand } from '../lib/mcp/commands';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

interface TestSuite {
  name: string;
  tests: TestResult[];
  passed: number;
  failed: number;
  totalDuration: number;
}

async function runTest(name: string, testFn: () => Promise<void> | void): Promise<TestResult> {
  const start = Date.now();
  try {
    await testFn();
    return { name, passed: true, duration: Date.now() - start };
  } catch (error) {
    return { name, passed: false, error: error instanceof Error ? error.message : String(error), duration: Date.now() - start };
  }
}

async function runMCPCommandsTests(): Promise<TestSuite> {
  const tests: TestResult[] = [];
  const suiteName = 'MCP Commands Basic Tests';

  tests.push(await runTest('Supported map includes expo-file-system', () => {
    const map = listSupportedCommands();
    if (!map['expo-file-system']) throw new Error('expo-file-system missing');
    const cmds = map['expo-file-system'];
    if (!cmds.includes('listFiles') || !cmds.includes('readFile')) throw new Error('Missing fs commands');
  }));

  tests.push(await runTest('Supported map includes expo-device', () => {
    const map = listSupportedCommands();
    if (!map['expo-device']) throw new Error('expo-device missing');
    const cmds = map['expo-device'];
    if (!cmds.includes('getGyroscopeSample') || !cmds.includes('requestCameraPermission')) throw new Error('Missing device commands');
  }));

  tests.push(await runTest('Supported map includes ai-code-mcp', () => {
    const map = listSupportedCommands();
    if (!map['ai-code-mcp']) throw new Error('ai-code-mcp missing');
    if (!map['ai-code-mcp'].includes('generateCode')) throw new Error('Missing generateCode');
  }));

  tests.push(await runTest('executeMCPCommand errors on unknown server', async () => {
    const res = await executeMCPCommand('unknown-server', 'noop', {});
    if ((res as any).ok) throw new Error('Expected error for unknown server');
  }));

  tests.push(await runTest('executeMCPCommand errors on unknown command (expo-file-system)', async () => {
    const res = await executeMCPCommand('expo-file-system', 'unknown', {});
    if ((res as any).ok) throw new Error('Expected error for unknown command');
  }));

  const passed = tests.filter(t => t.passed).length;
  const failed = tests.length - passed;
  const totalDuration = tests.reduce((a, b) => a + b.duration, 0);

  return { name: suiteName, tests, passed, failed, totalDuration };
}

export async function generateMCPCommandsReport(): Promise<string> {
  console.log('🧩 Starting MCP Commands Test Suite...\n');
  const suite = await runMCPCommandsTests();
  let report = '';
  report += '═══════════════════════════════════════════════════════════════\n';
  report += '  MCP COMMANDS TEST REPORT\n';
  report += `  Generated: ${new Date().toISOString()}\n`;
  report += '═══════════════════════════════════════════════════════════════\n\n';
  report += `Suite: ${suite.name}\n`;
  report += `Total Tests: ${suite.tests.length}\n`;
  report += `✅ Passed: ${suite.passed}\n`;
  report += `❌ Failed: ${suite.failed}\n`;
  report += `⏱️  Total Duration: ${suite.totalDuration}ms\n\n`;

  suite.tests.forEach((t, i) => {
    const status = t.passed ? '✅ PASS' : '❌ FAIL';
    report += `${i + 1}. ${status} - ${t.name} (${t.duration}ms)\n`;
    if (!t.passed && t.error) report += `   Error: ${t.error}\n`;
  });
  report += '\nSupported Commands:\n';
  const map = listSupportedCommands();
  Object.keys(map).forEach((k) => {
    report += `• ${k}: ${map[k].join(', ')}\n`;
  });
  return report;
}

if (typeof process !== 'undefined' && require.main === module) {
  generateMCPCommandsReport().then((r) => {
    console.log(r);
    process.exit(0);
  }).catch((e) => {
    console.error('Test suite failed:', e);
    process.exit(1);
  });
}
