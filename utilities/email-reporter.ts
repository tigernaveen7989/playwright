import type { FullResult, Reporter, TestCase, TestResult, Suite } from '@playwright/test/reporter';
import nodemailer from 'nodemailer';
import { LoggerFactory } from '../utilities/logger';

const logger = LoggerFactory.getLogger(__filename);

class EmailReporter implements Reporter {
  private projectStats: Record<string, { passed: number; failed: number; skipped: number }> = {};
  private failureReasons: Record<string, Record<string, number>> = {};
  private featureStats: Record<string, Record<string, { passed: number; failed: number; skipped: number; broken: number }>> = {};
  private startTime: Date | null = null;
  private endTime: Date | null = null;

  onBegin() {
    this.startTime = new Date();
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const filePath = test.location.file;
    let projectName = 'unknown';

    if (filePath.includes('call-center-tests')) projectName = 'call-center';
    else if (filePath.includes('dwres-tests')) projectName = 'dwres';
    else if (filePath.includes('dx-vasm-tests')) projectName = 'dx-vasm';
    else if (filePath.includes('xml-api-tests')) projectName = 'xml-api';
    else if (filePath.includes('json-api-tests')) projectName = 'json-api';

    if (!this.projectStats[projectName]) {
      this.projectStats[projectName] = { passed: 0, failed: 0, skipped: 0 };
    }

    if (result.status === 'passed') this.projectStats[projectName].passed++;
    else if (result.status === 'failed') {
      this.projectStats[projectName].failed++;

      const rawError = result.errors?.[0]?.message || 'Unknown Error';
      const errorType = this.classifyErrorType(rawError);

      if (!this.failureReasons[projectName]) this.failureReasons[projectName] = {};
      if (!this.failureReasons[projectName][errorType]) this.failureReasons[projectName][errorType] = 0;
      this.failureReasons[projectName][errorType]++;
    } else if (result.status === 'skipped') {
      this.projectStats[projectName].skipped++;
    }

    // Feature tagging
    let current: Suite | undefined = test.parent;
    const featureTags: string[] = [];

    while (current) {
      const matches = current.title.match(/@allure\.label\.feature:([^\s]+)/g);
      if (matches) {
        matches.forEach((match) => {
          const feature = match.split(':')[1];
          featureTags.push(feature);
        });
      }
      current = current.parent;
    }

    featureTags.forEach((feature) => {
      if (!this.featureStats[projectName]) this.featureStats[projectName] = {};
      if (!this.featureStats[projectName][feature]) {
        this.featureStats[projectName][feature] = { passed: 0, failed: 0, skipped: 0, broken: 0 };
      }

      if (result.status === 'passed') this.featureStats[projectName][feature].passed++;
      else if (result.status === 'failed') this.featureStats[projectName][feature].failed++;
      else if (result.status === 'skipped') this.featureStats[projectName][feature].skipped++;
      else if (result.status === 'interrupted') this.featureStats[projectName][feature].broken++;
    });
  }

  async onEnd(result: FullResult) {
    this.endTime = new Date();
    const html = this.generateStyledHtml();
    await this.sendEmail(html);
  }

  private classifyErrorType(errorMessage: string): string {
    const msg = errorMessage.toLowerCase();

    // F-06 AuthenticationError — check before timeout (401 inside timeout msg is auth, not timeout)
    if (msg.includes('401') || msg.includes('403') || msg.includes('unauthorized') ||
        msg.includes('forbidden') || msg.includes('jwt') || msg.includes('token expired') ||
        msg.includes('invalid credentials') || msg.includes('session expired')) return 'AuthenticationError';

    // F-01 AssertionError
    if (msg.includes('expect') || msg.includes('tobe') || msg.includes('toequal') ||
        msg.includes('tocontain') || msg.includes('tohavetext') || msg.includes('assert') ||
        msg.includes('received') || msg.includes('expected')) return 'AssertionError';

    // F-02 LocatorError
    if (msg.includes('locator') || msg.includes('element not found') ||
        msg.includes('no element matches') || msg.includes('strict mode violation') ||
        msg.includes('selector') || msg.includes('resolved to')) return 'LocatorError';

    // F-08 APIError — check before timeout (500 inside timeout msg is API, not timeout)
    if (msg.includes('status code') || msg.includes('bad request') ||
        msg.includes('internal server error') || msg.includes('service unavailable') ||
        /\b(400|404|500|502|503|504)\b/.test(msg)) return 'APIError';

    // F-03 TimeOutError
    if (msg.includes('timeout') || msg.includes('exceeded') || msg.includes('timed out') ||
        msg.includes('waiting for') || msg.includes('waitforselector') ||
        msg.includes('waitforloadstate')) return 'TimeOutError';

    // F-04 TestDataError
    if (msg.includes('testdata') || msg.includes('data mismatch') ||
        msg.includes('is not defined') || msg.includes('cannot read properties of') ||
        msg.includes('undefined') || msg.includes('fixture')) return 'TestDataError';

    // F-05 NetworkError
    if (msg.includes('econnrefused') || msg.includes('econnreset') ||
        msg.includes('etimedout') || msg.includes('enotfound') ||
        msg.includes('fetch failed') || msg.includes('net::err_') ||
        msg.includes('socket hang up') || msg.includes('dns')) return 'NetworkError';

    // F-07 NavigationError
    if (msg.includes('navigation') || msg.includes('page.goto') ||
        msg.includes('err_name_not_resolved') || msg.includes('frame detached') ||
        msg.includes('page crashed') || msg.includes('context closed')) return 'NavigationError';

    // F-09 BrowserError
    if (msg.includes('browser') || msg.includes('target closed') ||
        msg.includes('browser has been closed') || msg.includes('protocol error') ||
        msg.includes('cdpsession')) return 'BrowserError';

    // F-10 ConfigurationError
    if (msg.includes('process.env') || msg.includes('missing variable') ||
        msg.includes('loadconfig') || msg.includes('dotenv')) return 'ConfigurationError';

    // F-99 UnknownError
    return 'UnknownError';
  }

  private generateStyledHtml(): string {
    const start = this.startTime?.toLocaleString() || 'N/A';
    const end = this.endTime?.toLocaleString() || 'N/A';

    let totalPassed = 0, totalFailed = 0, totalSkipped = 0;
    Object.values(this.projectStats).forEach(s => {
      totalPassed += s.passed;
      totalFailed += s.failed;
      totalSkipped += s.skipped;
    });
    const totalTests = totalPassed + totalFailed + totalSkipped;

    const passPercent = totalTests ? (totalPassed / totalTests) * 100 : 0;
    const failPercent = totalTests ? (totalFailed / totalTests) * 100 : 0;
    const skipPercent = 100 - passPercent - failPercent;

    const pieChartStyle = `
      background: conic-gradient(
        #2e7d32 0% ${passPercent}%,
        #c62828 ${passPercent}% ${passPercent + failPercent}%,
        #ef6c00 ${passPercent + failPercent}% 100%
      );
    `;

    const summaryRows = Object.entries(this.projectStats).map(([project, { passed, failed, skipped }]) => {
      const total = passed + failed + skipped;
      const passRate = total > 0 ? ((passed / total) * 100).toFixed(2) + '%' : '0%';
      return `
        <tr>
          <td>${project.toUpperCase()}</td>
          <td style="color:#2e7d32;"><b>${passed}</b></td>
          <td style="color:#c62828;"><b>${failed}</b></td>
          <td style="color:#ef6c00;"><b>${skipped}</b></td>
          <td><b>${total}</b></td>
          <td>${passRate}</td>
        </tr>
      `;
    }).join('');

    const failureHtml = Object.entries(this.failureReasons).map(([project, reasons]) => {
      const rows = Object.entries(reasons).map(([reason, count]) => `
        <tr><td>${reason}</td><td><b>${count}</b></td></tr>
      `).join('');
      return `
        <h3 class="section-header">❌ ${project.toUpperCase()} Failures</h3>
        <table class="failed-table">
          <thead><tr><th>Failure Type</th><th>Count</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      `;
    }).join('');

    const featureHtml = Object.entries(this.featureStats).map(([project, features]) => {
      const rows = Object.entries(features).map(([feature, stats]) => {
        const total = stats.passed + stats.failed + stats.skipped + stats.broken;
        return `
          <tr>
            <td>${feature.toUpperCase()}</td>
            <td style="color:#2e7d32;"><b>${stats.passed}</b></td>
            <td style="color:#c62828;"><b>${stats.failed}</b></td>
            <td style="color:#ef6c00;"><b>${stats.skipped}</b></td>
            <td style="color:#6a1b9a;"><b>${stats.broken}</b></td>
            <td><b>${total}</b></td>
          </tr>
        `;
      }).join('');
      return `
        <h3 class="section-header">🧩 ${project.toUpperCase()} Features</h3>
        <table class="feature-table">
          <thead><tr><th>Feature</th><th>Passed</th><th>Failed</th><th>Skipped</th><th>Broken</th><th>Total</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      `;
    }).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8" />
        <title>Playwright Report</title>
        <style>
          body { font-family: Arial, sans-serif; background:#fafafa; margin:0; padding:15px; font-size:13px; display:flex; justify-content:center; }
          .container { width: 80%; background:#fff; border-radius:10px; box-shadow:0 0 10px rgba(0,0,0,0.08); padding:20px; }
          h2 { color:#333; text-align:left; margin-left:25%; }
          .section-header, h3 { color:#333; text-align:left; margin-left:25%; margin-top:20px; }
          table { width:70%; border-collapse:collapse; margin:15px auto; font-size:13px; border:1px solid #ccc; text-align:center; }
          th, td { padding:6px 10px; border:1px solid #ccc; vertical-align:middle; }
          th { color:#fff; font-weight:600; text-align:center; }
          tr:nth-child(even) { background:#f9f9f9; }
          .summary-table th { background:#2e7d32; }
          .failed-table th { background:#c62828; }
          .feature-table th { background:#1565c0; }
          .time-table th { background:#6a1b9a; }
          .pie-chart { width:120px; height:120px; border-radius:50%; margin:10px auto; ${pieChartStyle} }
          .chart-labels { text-align:center; font-size:12px; margin-top:5px; }
          .footer { text-align:center; font-size:11px; color:#888; margin-top:10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>📊 Playwright Test Summary</h2>

          <div class="pie-chart"></div>
          <div class="chart-labels">
            ✅ Pass: ${totalPassed} &nbsp;&nbsp; ❌ Fail: ${totalFailed} &nbsp;&nbsp; ⚠️ Skipped: ${totalSkipped}
          </div>

          <table class="summary-table">
            <thead><tr><th>Project</th><th>Passed</th><th>Failed</th><th>Skipped</th><th>Total</th><th>Pass Rate</th></tr></thead>
            <tbody>${summaryRows}</tbody>
          </table>

          <h3 class="section-header">🕒 Execution Time</h3>
          <table class="time-table">
            <tr><th>Start Time</th><td>${start}</td></tr>
            <tr><th>End Time</th><td>${end}</td></tr>
          </table>

          ${failureHtml}
          ${featureHtml}

          <div class="footer">Generated automatically by Playwright CI | © 2025</div>
        </div>
      </body>
      </html>
    `;
  }

  async sendEmail(htmlContent: string) {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      secure: false,
      tls: { rejectUnauthorized: false },
    });

    const env = (process.env.ENVIRONMENT || '').toUpperCase();
    const subenv = (process.env.SUBENVIRONMENT || '').toUpperCase();
    const tenant = (process.env.TENANT || '').toUpperCase();
    const projects = Object.keys(this.projectStats).join(' ').toUpperCase();
    const subject = `🔍 ${env} ${subenv} ${tenant} ${projects} TEST REPORT`.trim().replace(/\s+/g, ' ');

    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: process.env.EMAIL_TO,
      subject,
      html: htmlContent,
      attachments: [
        {
          filename: 'test-report.html',
          path: 'playwright-report/index.html',
          contentType: 'text/html',
        },
      ],
    });

    logger.info('✅ Test summary email sent successfully.');
  }
}

export default EmailReporter;
