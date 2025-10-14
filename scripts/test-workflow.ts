#!/usr/bin/env bun

import { runAllTests } from '../__tests__/run-all-tests';

async function main() {
  try {
    const report = await runAllTests();
    
    const fs = await import('fs');
    const path = await import('path');
    
    const reportPath = path.join(process.cwd(), 'WORKFLOW_TEST_REPORT.md');
    fs.writeFileSync(reportPath, report, 'utf-8');
    
    console.log(`\n📄 Full report saved to: ${reportPath}`);
    console.log('\n✅ All tests completed successfully!');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test execution failed:', error);
    process.exit(1);
  }
}

main();
