import { request, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables from .env

export class activateJwtToken {
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

  public async getJwtToken(testInfo: any): Promise<Record<string, string>> {
    const config = this.loadConfig();
    const { base64Token, oktaUrl, ['okta-audience']: oktaAudience } = config;

    const headers = {
      Authorization: `Basic ${base64Token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    };

    let audience = 'wolverine-s2.dev.sabre-gcp.com';
    if (this.environment.toLowerCase() === 'cert') {
      audience = oktaAudience;
    }
    if (this.tenant.toLowerCase() === 'b2') {
      audience = 'wolverine-b2.dev.sabre-gcp.com';
    }

    const form = {
      grant_type: 'client_credentials',
      scope: 'api',
      audience,
    };

    const apiRequestContext = await request.newContext();
    const response = await apiRequestContext.post(oktaUrl, {
      headers,
      form,
    });

    expect(response.status()).toBe(200);
    const jwtResponse = await response.json();

    return {
      'x-sabre-auth-token': jwtResponse.access_token,
      'x-request-id': uuidv4(),
      'x-correlation-id': `E2E-AUTO-${uuidv4()}`,
    };
  }
}
