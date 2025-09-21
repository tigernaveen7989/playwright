// email-reporter.ts
import type { FullResult, Reporter } from '@playwright/test/reporter';
import nodemailer from 'nodemailer';
import { LoggerFactory } from '../utilities/logger';
const logger = LoggerFactory.getLogger(__filename);

class EmailReporter implements Reporter {
  private passed = 0;
  private failed = 0;
  private skipped = 0;

  onTestEnd(_, result) {
    if (result.status === 'passed') this.passed++;
    else if (result.status === 'failed') this.failed++;
    else if (result.status === 'skipped') this.skipped++;
  }

  async onEnd(result: FullResult) {
    const total = this.passed + this.failed + this.skipped;

    const summary = `
Playwright Test Execution Summary:

✅ Passed  : ${this.passed}
❌ Failed  : ${this.failed}
⏭️ Skipped : ${this.skipped}
📊 Total   : ${total}
`;

    logger.info(summary);

    await this.sendEmail(summary);
  }

  async sendEmail(summary: string) {
    const transporter = nodemailer.createTransport({
      host: 'mail.sabre.com', // ✅ replace if different
      port: 25,
      secure: false,          // Port 25 is not secure
      tls: {
        rejectUnauthorized: false, // Optional if self-signed certs
      },
    });

    await transporter.sendMail({
      from: 'WLV_E2E_QA@sabre.com',
      to: 'naveenx.kumar.ctr@sabre.com',  // 🔁 change this to real recipient(s)
      subject: '📧 Playwright Test Summary',
      text: summary,
    });

    logger.info('✅ Test summary email sent successfully.');
  }
}

export default EmailReporter;
