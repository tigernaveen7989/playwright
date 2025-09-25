import path from 'path';
import fs from 'fs';

export class BlackPanther {

  private environment: string;
  private subenvironment: string;
  private tenant: string;

  constructor() {
    this.environment = process.env.ENVIRONMENT || '';
    this.subenvironment = process.env.SUBENVIRONMENT || '';
    this.tenant = process.env.TENANT || '';

    if (!this.environment || !this.subenvironment || !this.tenant) {
      throw new Error('Missing ENVIRONMENT, SUBENVIRONMENT, or TENANT environment variable.');
    }
  }

  private getTestDataPath(): string {
      return path.join(
        __dirname,
        '..',
        'testdata',
        this.environment.toLowerCase(),
        this.subenvironment.toLowerCase(),
        this.tenant.toLowerCase(),
        'url-and-accounts.json'
      );
    }
  
    public loadConfig(): any {
      const testDataPath = this.getTestDataPath();
  
      if (!fs.existsSync(testDataPath)) {
        throw new Error(`Test data file not found at path: ${testDataPath}`);
      }
  
      const config = JSON.parse(fs.readFileSync(testDataPath, 'utf-8'));
      const subenvConfig = config[this.subenvironment];
  
      if (!subenvConfig) {
        throw new Error(`Subenvironment '${this.subenvironment}' not found in config.`);
      }
  
      return subenvConfig;
    }
}
