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

    if (result.status === 'passed') {
      this.projectStats[projectName].passed++;
    } else if (result.status === 'failed') {
      this.projectStats[projectName].failed++;

      const rawError = result.errors?.[0]?.message || 'Unknown Error';
      const errorType = this.classifyErrorType(rawError);

      if (!this.failureReasons[projectName]) {
        this.failureReasons[projectName] = {};
      }

      if (!this.failureReasons[projectName][errorType]) {
        this.failureReasons[projectName][errorType] = 0;
      }

      this.failureReasons[projectName][errorType]++;
    } else if (result.status === 'skipped') {
      this.projectStats[projectName].skipped++;
    }

    // Traverse parent hierarchy to extract feature tags
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
      if (!this.featureStats[projectName]) {
        this.featureStats[projectName] = {};
      }
      if (!this.featureStats[projectName][feature]) {
        this.featureStats[projectName][feature] = { passed: 0, failed: 0, skipped: 0, broken: 0 };
      }

      if (result.status === 'passed') {
        this.featureStats[projectName][feature].passed++;
      } else if (result.status === 'failed') {
        this.featureStats[projectName][feature].failed++;
      } else if (result.status === 'skipped') {
        this.featureStats[projectName][feature].skipped++;
      } else if (result.status === 'interrupted') {
        this.featureStats[projectName][feature].broken++;
      }
    });
  }

  async onEnd(result: FullResult) {
    this.endTime = new Date();

    const timeHtml = this.formatTimeTable();
    const summaryHtml = this.formatSummaryTable(this.projectStats);
    const failureHtml = this.formatFailureTables();
    const featureHtml = this.formatFeatureTables();

    const fullHtml = timeHtml + '<br/>' + summaryHtml + '<br/><br/>' + failureHtml + '<br/><br/>' + featureHtml;

    await this.sendEmail(fullHtml);
  }

  private classifyErrorType(errorMessage: string): string {
    const lowerMsg = errorMessage.toLowerCase();

    if (lowerMsg.includes('expect') || lowerMsg.includes('tobe') || lowerMsg.includes('assert')) {
      return 'AssertionError';
    }
    if (lowerMsg.includes('locator') || lowerMsg.includes('element not found')) {
      return 'LocatorError';
    }
    if (lowerMsg.includes('invalid data') || lowerMsg.includes('testdata') || lowerMsg.includes('data mismatch')) {
      return 'TestDataError';
    }
    if (lowerMsg.includes('timeout') || lowerMsg.includes('exceeded') || lowerMsg.includes('waiting for')) {
      return 'TimeOutError';
    }

    return 'UnknownError';
  }

  private formatTimeTable(): string {
    const start = this.startTime?.toLocaleString() || 'N/A';
    const end = this.endTime?.toLocaleString() || 'N/A';
    return `
      <h2>🕒 Test Execution Time</h2>
      <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; font-family: Arial, sans-serif;">
        <tr><td><strong>Start Time</strong></td><td>${start}</td></tr>
        <tr><td><strong>End Time</strong></td><td>${end}</td></tr>
      </table>
    `;
  }

  private formatSummaryTable(stats: Record<string, { passed: number; failed: number; skipped: number }>): string {
    const rows = Object.entries(stats).map(([project, { passed, failed, skipped }]) => {
      const total = passed + failed + skipped;
      const passRate = total > 0 ? ((passed / total) * 100).toFixed(2) + '%' : '0%';
      return `
        <tr>
          <td>${project}</td>
          <td style="color:green;">${passed}</td>
          <td style="color:red;">${failed}</td>
          <td style="color:orange;">${skipped}</td>
          <td><strong>${total}</strong></td>
          <td>${passRate}</td>
        </tr>
      `;
    }).join('');

    return `
      <h2>📊 Test Execution Summary</h2>
      <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; font-family: Arial, sans-serif;">
        <thead style="background-color: #f2f2f2;">
          <tr>
            <th>Project</th>
            <th>Passed</th>
            <th>Failed</th>
            <th>Skipped</th>
            <th>Total</th>
            <th>Pass Rate</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;
  }

  private formatFailureTables(): string {
    return Object.entries(this.failureReasons).map(([project, reasons]) => {
      const rows = Object.entries(reasons).map(([reason, count]) => `
        <tr>
          <td>${reason}</td>
          <td><strong>${count}</strong></td>
        </tr>
      `).join('');

      return `
        <h3>❌ ${project} Failures</h3>
        <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; font-family: Arial, sans-serif;">
          <thead style="background-color: #f2f2f2;">
            <tr>
              <th>Failure Type</th>
              <th>Count</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      `;
    }).join('<br/>');
  }

  private formatFeatureTables(): string {
    return Object.entries(this.featureStats).map(([project, features]) => {
      const rows = Object.entries(features).map(([feature, stats]) => {
        const total = stats.passed + stats.failed + stats.skipped + stats.broken;
        return `
          <tr>
            <td>${feature}</td>
            <td style="color:green;">${stats.passed}</td>
            <td style="color:red;">${stats.failed}</td>
            <td style="color:orange;">${stats.skipped}</td>
            <td style="color:purple;">${stats.broken}</td>
            <td><strong>${total}</strong></td>
          </tr>
        `;
      }).join('');

      return `
        <h3>🧩 ${project} Features</h3>
        <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; font-family: Arial, sans-serif;">
          <thead style="background-color: #f2f2f2;">
            <tr>
              <th>Feature Name</th>
              <th>Passed</th>
              <th>Failed</th>
              <th>Skipped</th>
              <th>Broken</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      `;
    }).join('<br/>');
  }

  async sendEmail(summaryHtml: string) {
    const transporter = nodemailer.createTransport({
      host: 'securemailgcp-cert.sabre.com',
      port: 25,
      secure: false,
      debug: true,
      tls: {
        rejectUnauthorized: false,
      },
    });

    await transporter.sendMail({
      from: 'wlv_e2e_qa_team@sabre.com',
      to: 'naveenx.kumar.ctr@sabre.com',
      subject: '📧 Playwright Test Summary',
      html: summaryHtml,
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