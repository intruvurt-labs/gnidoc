export type DemoFinding = {
  line: number;
  text: string;
  rule: string;
  severity: 'high' | 'medium' | 'low';
};

export type DemoScanResult = {
  totalLines: number;
  offendingLines: number;
  findings: DemoFinding[];
  confidence: number;
};

const RX = {
  obvious: [
    /\bplaceholder\b/i,
    /\bdummy\b/i,
    /\bmock(ed|ing)?\b/i,
    /\bdemo\b/i,
    /\bexample\b\s*(code|only)?/i,
    /lorem\s+ipsum/i,
  ],
  patterns: [
    /\/\/\s*TODO\b/i,
    /#\s*TODO\b/i,
    /<!--\s*TODO\b/i,
    /\bfoo(bar)?\b/i,
    /\b(\w+)\.example\.com\b/i,
    /\bmock[A-Z]\w*\(/,
    /\bfake[A-Z]\w*\(/,
    /\bconsole\.log\(['"]hello world/i,
    /apiKey\s*[:=]\s*['"]sk_demo/i,
    /API_KEY\s*=\s*['"]demo/i,
  ],
  scaffolds: [
    /\bYour\s+code\s+here\b/i,
    /\bfill\s+in\s+implementation\b/i,
    /\bstub\b/i,
    /\bnot\s+implemented\b/i,
  ],
};

export function scanForDemoCode(code: string): DemoScanResult {
  const lines = code.split(/\r?\n/);
  const findings: DemoFinding[] = [];
  
  lines.forEach((text, i) => {
    const line = i + 1;
    for (const r of RX.obvious) {
      if (r.test(text)) {
        findings.push({ line, text, rule: r.source, severity: 'high' });
      }
    }
    for (const r of RX.patterns) {
      if (r.test(text)) {
        findings.push({ line, text, rule: r.source, severity: 'medium' });
      }
    }
    for (const r of RX.scaffolds) {
      if (r.test(text)) {
        findings.push({ line, text, rule: r.source, severity: 'low' });
      }
    }
  });

  const unique = new Map<number, DemoFinding>();
  for (const f of findings) {
    if (!unique.has(f.line)) {
      unique.set(f.line, f);
    }
  }

  const offending = unique.size;
  const confidence =
    offending === 0
      ? 1
      : Math.min(
          1,
          Array.from(unique.values()).filter((f) => f.severity !== 'low').length * 0.2 + 0.4
        );

  return {
    totalLines: lines.length,
    offendingLines: offending,
    findings: Array.from(unique.values()),
    confidence,
  };
}

export function calculateBixCredits(
  offendingLines: number,
  creditPerLine: number,
  multiplier: number = 1
): number {
  return Math.ceil(offendingLines * creditPerLine * multiplier);
}
