const fs = require('fs');
const path = require('path');

const CHANGED_FILES_PATH = path.resolve('changed-files.txt');
const REVIEW_REPORT_PATH = path.resolve('review-report.md');
const AGENT_MARKDOWN_PATH = path.resolve('.github/agents/code-reviewer.agent.md');
const AGENT_INSTRUCTIONS_PATH = path.resolve('architecture/AGENT_INSTRUCTIONS.md');

const SEVERITY_WEIGHT = {
  high: 3,
  medium: 2,
  low: 1
};

function readChangedFiles() {
  if (!fs.existsSync(CHANGED_FILES_PATH)) {
    return [];
  }

  const content = fs.readFileSync(CHANGED_FILES_PATH, 'utf8');
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function hasFile(filePath) {
  return fs.existsSync(path.resolve(filePath));
}

function isReviewableFile(filePath) {
  return /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(filePath) && hasFile(filePath);
}

function findLineNumbers(content, regex) {
  const lines = content.split(/\r?\n/);
  const matches = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (regex.test(lines[i])) {
      matches.push({
        line: i + 1,
        snippet: lines[i].trim()
      });
    }
  }
  return matches;
}

function pushFindingsForPattern(findings, filePath, content, options) {
  const {
    regex,
    severity,
    message,
    maxPerRule = 20
  } = options;

  const matches = findLineNumbers(content, regex).slice(0, maxPerRule);
  matches.forEach((match) => {
    findings.push({
      severity,
      file: filePath,
      line: match.line,
      message,
      snippet: match.snippet
    });
  });
}

function getExpectedFeaturePrefixForSpec(filePath) {
  if (filePath.includes('/tests/dwres-tests/') || filePath.includes('\\tests\\dwres-tests\\')) {
    return 'DWRES-';
  }
  if (filePath.includes('/tests/dx-vasm-tests/') || filePath.includes('\\tests\\dx-vasm-tests\\')) {
    return 'DXVASM-';
  }
  if (filePath.includes('/tests/call-center-tests/') || filePath.includes('\\tests\\call-center-tests\\')) {
    return 'CALLCENTER-';
  }
  if (filePath.includes('/tests/json-api-tests/') || filePath.includes('\\tests\\json-api-tests\\')) {
    return 'JSONAPI-';
  }
  if (filePath.includes('/tests/xml-api-tests/') || filePath.includes('\\tests\\xml-api-tests\\')) {
    return 'XMLAPI-';
  }
  return null;
}

function pushFeaturePrefixFindings(findings, filePath, content) {
  const expectedPrefix = getExpectedFeaturePrefixForSpec(filePath);
  if (!expectedPrefix) {
    return;
  }

  const matches = findLineNumbers(content, /@allure\.label\.feature:([A-Za-z0-9_-]+)/g);
  if (matches.length === 0) {
    findings.push({
      severity: 'medium',
      file: filePath,
      line: 1,
      message: `Missing Allure feature label. Expected prefix: @allure.label.feature:${expectedPrefix}...`,
      snippet: ''
    });
    return;
  }

  matches.forEach((match) => {
    const featureLabelMatch = /@allure\.label\.feature:([A-Za-z0-9_-]+)/.exec(match.snippet);
    const featureLabel = featureLabelMatch?.[1] || '';
    if (!featureLabel.startsWith(expectedPrefix)) {
      findings.push({
        severity: 'medium',
        file: filePath,
        line: match.line,
        message: `Allure feature label must start with '${expectedPrefix}' for this project.`,
        snippet: match.snippet
      });
    }
  });
}

function analyzeChangedFiles(changedFiles) {
  const findings = [];

  changedFiles.filter(isReviewableFile).forEach((filePath) => {
    let content = '';
    try {
      content = fs.readFileSync(path.resolve(filePath), 'utf8');
    } catch (error) {
      findings.push({
        severity: 'low',
        file: filePath,
        line: 1,
        message: `File could not be parsed by reviewer script: ${error.message}`,
        snippet: ''
      });
      return;
    }

    pushFindingsForPattern(findings, filePath, content, {
      regex: /\b(?:test|it|describe)\.only\s*\(/,
      severity: 'high',
      message: 'Focused tests found. Remove .only before merging.'
    });

    pushFindingsForPattern(findings, filePath, content, {
      regex: /\bwaitForTimeout\s*\(/,
      severity: 'medium',
      message: 'Hard waits found. Prefer explicit waits/assertions for stability.'
    });

    pushFindingsForPattern(findings, filePath, content, {
      regex: /\bconsole\.log\s*\(/,
      severity: 'medium',
      message: 'console.log found. Use centralized logger utility for consistent reporting.'
    });

    pushFindingsForPattern(findings, filePath, content, {
      regex: /\b(?:AKIA[0-9A-Z]{16}|xox[baprs]-[A-Za-z0-9-]+|-----BEGIN (?:RSA|EC|DSA|OPENSSH) PRIVATE KEY-----)\b/,
      severity: 'high',
      message: 'Possible secret pattern detected. Ensure credentials are not committed.'
    });

    if (filePath.includes('pageobjects/') && filePath.endsWith('.ts')) {
      pushFindingsForPattern(findings, filePath, content, {
        regex: /\bpage\.(?:locator|getBy[A-Za-z]+|click|fill|press|check|uncheck|selectOption|waitForSelector|waitForTimeout|goto)\s*\(/,
        severity: 'medium',
        message: 'Raw Playwright page usage in page object. Prefer BlackPanther wrapper methods.'
      });
    }

    if (filePath.endsWith('.spec.ts')) {
      pushFindingsForPattern(findings, filePath, content, {
        regex: /\btest\.skip\s*\(/,
        severity: 'low',
        message: 'Skipped test detected. Confirm this is intentional before merging.'
      });

      pushFeaturePrefixFindings(findings, filePath, content);
    }
  });

  return findings.sort((a, b) => {
    const severityDelta = (SEVERITY_WEIGHT[b.severity] || 0) - (SEVERITY_WEIGHT[a.severity] || 0);
    if (severityDelta !== 0) {
      return severityDelta;
    }
    if (a.file !== b.file) {
      return a.file.localeCompare(b.file);
    }
    return a.line - b.line;
  });
}

function renderReport(changedFiles) {
  const totalFiles = changedFiles.length;
  const tsFiles = changedFiles.filter((file) => file.endsWith('.ts'));
  const specFiles = changedFiles.filter((file) => file.endsWith('.spec.ts'));
  const pageObjectFiles = changedFiles.filter((file) => file.includes('pageobjects/'));
  const findings = analyzeChangedFiles(changedFiles);
  const highCount = findings.filter((f) => f.severity === 'high').length;
  const mediumCount = findings.filter((f) => f.severity === 'medium').length;
  const lowCount = findings.filter((f) => f.severity === 'low').length;

  const lines = [];
  lines.push('## AI Code Review Report');
  lines.push('');
  lines.push('Automated PR checks completed with rule-based findings from changed files.');
  lines.push('');
  lines.push('### Review Context');
  lines.push(`- Changed files detected: ${totalFiles}`);
  lines.push(`- TypeScript files: ${tsFiles.length}`);
  lines.push(`- Spec files: ${specFiles.length}`);
  lines.push(`- Page object files: ${pageObjectFiles.length}`);
  lines.push(`- Findings: ${findings.length} (high: ${highCount}, medium: ${mediumCount}, low: ${lowCount})`);
  lines.push(`- Agent definition loaded: ${hasFile('.github/agents/code-reviewer.agent.md') ? 'yes' : 'no'}`);
  lines.push(`- Framework instructions loaded: ${hasFile('architecture/AGENT_INSTRUCTIONS.md') ? 'yes' : 'no'}`);
  lines.push('');

  if (totalFiles === 0) {
    lines.push('### Findings');
    lines.push('- No changed files found for this PR diff.');
  } else if (findings.length === 0) {
    lines.push('### Findings');
    lines.push('- No rule violations detected in reviewable changed files.');
  } else {
    lines.push('### Findings');
    findings.slice(0, 200).forEach((finding) => {
      const icon = finding.severity === 'high' ? 'HIGH' : finding.severity === 'medium' ? 'MEDIUM' : 'LOW';
      lines.push(`- [${icon}] ${finding.file}:${finding.line} - ${finding.message}`);
      if (finding.snippet) {
        lines.push(`  - Snippet: ${finding.snippet}`);
      }
    });
    if (findings.length > 200) {
      lines.push(`- ...and ${findings.length - 200} more findings`);
    }
    lines.push('');
    lines.push('### Changed Files');
    changedFiles.slice(0, 200).forEach((file) => {
      lines.push(`- ${file}`);
    });
    if (changedFiles.length > 200) {
      lines.push(`- ...and ${changedFiles.length - 200} more files`);
    }
  }

  lines.push('');
  lines.push('### Notes');
  lines.push(`- Source: ${AGENT_MARKDOWN_PATH}`);
  lines.push(`- Rules reference: ${AGENT_INSTRUCTIONS_PATH}`);

  return `${lines.join('\n')}\n`;
}

function main() {
  const changedFiles = readChangedFiles();
  const report = renderReport(changedFiles);
  fs.writeFileSync(REVIEW_REPORT_PATH, report, 'utf8');
  console.log(`Review report generated at ${REVIEW_REPORT_PATH}`);
}

main();
