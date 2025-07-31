import { request, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables from .env

export async function activateJwtToken(testInfo: any) {
  const ENVIRONMENT = process.env.ENVIRONMENT;
  const SUBENVIRONMENT = process.env.SUBENVIRONMENT;
  const TENANT = process.env.TENANT;

  if (!ENVIRONMENT || !SUBENVIRONMENT || !TENANT) {
    throw new Error('Missing ENVIRONMENT, SUBENVIRONMENT, or TENANT environment variable.');
  }

  // Construct lowercase folder path
  const testDataPath = path.join(
    __dirname,
    '..',
    'testdata',
    ENVIRONMENT.toLowerCase(),
    SUBENVIRONMENT.toLowerCase(),
    TENANT.toLowerCase(),
    'url-and-accounts.json'
  );

  if (!fs.existsSync(testDataPath)) {
    throw new Error(`Test data file not found at path: ${testDataPath}`);
  }

  const config = JSON.parse(fs.readFileSync(testDataPath, 'utf-8'));

  // Use SUBENVIRONMENT as-is to access the correct config block
  const subenvConfig = config[SUBENVIRONMENT];
  if (!subenvConfig) {
    throw new Error(`Subenvironment '${SUBENVIRONMENT}' not found in config.`);
  }

  const base64Token = subenvConfig.base64Token;
  const oktaUrl = subenvConfig.oktaUrl;
  const oktaAudience = subenvConfig['okta-audience'];

  const headers = {
    Authorization: `Basic ${base64Token}`,
    'Content-Type': 'application/x-www-form-urlencoded',
    Accept: 'application/json',
  };

  let audience = 'wolverine-s2.dev.sabre-gcp.com';
  if (ENVIRONMENT.toLowerCase() === 'cert') {
    audience = oktaAudience;
  }
  if (TENANT.toLowerCase() === 'b2') {
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
