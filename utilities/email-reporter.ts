import type { FullResult, Reporter, TestCase, TestResult } from '@playwright/test/reporter';
import nodemailer from 'nodemailer';
import { LoggerFactory } from '../utilities/logger';

const logger = LoggerFactory.getLogger(__filename);

class EmailReporter implements Reporter {
  private projectStats: Record<string, { passed: number; failed: number; skipped: number }> = {};

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
    else if (result.status === 'failed') this.projectStats[projectName].failed++;
    else if (result.status === 'skipped') this.projectStats[projectName].skipped++;
  }

  async onEnd(result: FullResult) {
    const summaryHtml = this.formatSummaryTable(this.projectStats);
    logger.info('\n' + summaryHtml);
    await this.sendEmail(summaryHtml);
  }

  formatSummaryTable(stats: Record<string, { passed: number; failed: number; skipped: number }>): string {
    const rows = Object.entries(stats).map(([project, { passed, failed, skipped }]) => {
      const total = passed + failed + skipped;
      return `
        <tr>
          <td>${project}</td>
          <td style="color:green;">${passed}</td>
          <td style="color:red;">${failed}</td>
          <td style="color:orange;">${skipped}</td>
          <td><strong>${total}</strong></td>
        </tr>
      `;
    }).join('');

    return `
      <h2>📊 Playwright Test Execution Summary</h2>
      <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; font-family: Arial, sans-serif;">
        <thead style="background-color: #f2f2f2;">
          <tr>
            <th>Project</th>
            <th>Passed</th>
            <th>Failed</th>
            <th>Skipped</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;
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