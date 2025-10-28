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
    const lowerMsg = errorMessage.toLowerCase();
    if (lowerMsg.includes('expect') || lowerMsg.includes('tobe') || lowerMsg.includes('assert')) return 'AssertionError';
    if (lowerMsg.includes('locator') || lowerMsg.includes('element not found')) return 'LocatorError';
    if (lowerMsg.includes('invalid data') || lowerMsg.includes('testdata') || lowerMsg.includes('data mismatch')) return 'TestDataError';
    if (lowerMsg.includes('timeout') || lowerMsg.includes('exceeded') || lowerMsg.includes('waiting for')) return 'TimeOutError';
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
          <td>${project}</td>
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
        <h3>❌ ${project} Failures</h3>
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
            <td>${feature}</td>
            <td style="color:#2e7d32;"><b>${stats.passed}</b></td>
            <td style="color:#c62828;"><b>${stats.failed}</b></td>
            <td style="color:#ef6c00;"><b>${stats.skipped}</b></td>
            <td style="color:#6a1b9a;"><b>${stats.broken}</b></td>
            <td><b>${total}</b></td>
          </tr>
        `;
      }).join('');
      return `
        <h3>🧩 ${project} Features</h3>
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
          body { font-family: Arial, sans-serif; background:#fafafa; margin:0; padding:15px; font-size:13px; }
          .container { max-width:750px; margin:auto; background:#fff; border-radius:10px; box-shadow:0 0 10px rgba(0,0,0,0.08); padding:20px; }
          h2, h3 { color:#333; text-align:center; margin:10px 0; }
          table { width:70%; border-collapse:collapse; margin:10px auto; font-size:13px; border:1px solid #ccc; text-align:center; } /* ✅ Centered tables */
          th, td { padding:6px 10px; border:1px solid #ccc; vertical-align:middle; }
          th { color:#fff; font-weight:600; text-align:center; }
          tr:nth-child(even) { background:#f9f9f9; }

          .summary-table th { background:#2e7d32; }
          .failed-table th { background:#c62828; }
          .feature-table th { background:#1565c0; }
          .time-table th { background:#6a1b9a; }

          .pie-chart {
            width: 120px;
            height: 120px;
            border-radius: 50%;
            margin: 10px auto;
            ${pieChartStyle}
          }
          .chart-labels {
            text-align: center;
            font-size: 12px;
            margin-top: 5px;
          }
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

          <h3>🕒 Execution Time</h3>
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
      host: 'securemailgcp-cert.sabre.com',
      port: 25,
      secure: false,
      tls: { rejectUnauthorized: false },
    });

    await transporter.sendMail({
      from: 'wlv_e2e_qa_team@sabre.com',
      to: 'naveenx.kumar.ctr@sabre.com',
      subject: '📧 Playwright Test Summary',
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
